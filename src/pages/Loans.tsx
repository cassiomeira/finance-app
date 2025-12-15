import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { AppLayout } from '@/components/layout/AppLayout';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { LoanForm } from '@/components/loans/LoanForm';
import { LoanList } from '@/components/loans/LoanList';
import { Loan } from '@/types/loan';
import { calculateLoan, calculateCurrentDebt, calculateDynamicSchedule } from '@/utils/loanCalculations';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export default function Loans() {
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const [loans, setLoans] = useState<Loan[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const fetchLoans = async () => {
        if (!user) return;

        try {
            setIsLoading(true);
            const { data: loansData, error: loansError } = await supabase
                .from('loans')
                .select('*')
                .order('created_at', { ascending: false });

            if (loansError) throw loansError;

            const loansWithDetails = await Promise.all(loansData.map(async (loan: any) => {
                try {
                    const { data: paymentsData, error: paymentsError } = await supabase
                        .from('loan_payments')
                        .select('*')
                        .eq('loan_id', loan.id)
                        .order('date', { ascending: true });

                    if (paymentsError) throw paymentsError;

                    // Mapear snake_case do banco para camelCase do frontend
                    const mappedLoan: Loan = {
                        id: loan.id,
                        userId: loan.user_id,
                        name: loan.name,
                        type: loan.type,
                        principalAmount: Number(loan.principal_amount),
                        interestRate: Number(loan.interest_rate),
                        interestPeriod: loan.interest_period,
                        interestType: loan.interest_type,
                        startDate: new Date(loan.start_date || new Date()), // Fallback safety
                        numberOfInstallments: loan.number_of_installments,
                        status: loan.status,
                        createdAt: new Date(loan.created_at),
                        updatedAt: new Date(loan.updated_at),
                        integrate_in_dashboard: loan.integrate_in_dashboard,
                        payments: paymentsData.map((p: any) => ({
                            id: p.id,
                            loanId: p.loan_id,
                            amount: Number(p.amount),
                            date: new Date(p.date),
                            note: p.note,
                            installmentNumber: p.installment_number
                        })),
                        // Inicializa com array vazio, será preenchido pelo calculateDynamicSchedule
                        installments: [],
                        totalAmount: 0
                    };

                    // Calcular cronograma dinâmico para parcelas
                    const dynamicData = calculateDynamicSchedule(mappedLoan, mappedLoan.payments);

                    // Calcular saldo devedor ATUAL (Hoje)
                    const currentDebtData = calculateCurrentDebt(mappedLoan);

                    return {
                        ...mappedLoan,
                        installments: dynamicData.installments,
                        currentBalance: dynamicData.currentBalance, // Use dynamic for consistency
                        totalPaid: dynamicData.totalPaid, // Use dynamic for consistency with table
                        monthlyPayment: dynamicData.monthlyPayment,
                        // Total amount projetado é a soma das parcelas (já inclui juros)
                        totalAmount: dynamicData.installments.reduce((sum, i) => sum + i.amount, 0)
                    };
                } catch (err) {
                    console.error(`Error processing loan ${loan.id}:`, err);
                    return null;
                }
            }));

            setLoans(loansWithDetails.filter(Boolean) as Loan[]);
        } catch (error) {
            console.error('Erro ao buscar empréstimos:', error);
            toast({
                title: "Erro",
                description: "Não foi possível carregar seus empréstimos.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (authLoading) return; // Aguarda auth carregar

        if (!user) {
            setIsLoading(false); // Se não tiver user, para de carregar
            return;
        }

        fetchLoans();
    }, [user, authLoading]);

    const handleCreateLoan = async (
        data: any,
        overrides?: Record<number, { amount?: number, date?: Date }>,
        simulatedInstallments?: any[]
    ) => {
        if (!user) return;

        try {
            // 1. Criar o empréstimo
            const { data: loanData, error } = await supabase.from('loans').insert({
                user_id: user.id,
                name: data.name,
                type: data.type,
                principal_amount: data.principalAmount,
                interest_rate: data.interestRate,
                interest_period: data.interestPeriod,
                interest_type: data.interestType,
                start_date: data.startDate.toISOString(),
                number_of_installments: data.isIndefinite ? null : data.numberOfInstallments,
                status: 'active'
            }).select().single();

            if (error) throw error;

            // 2. Se houver overrides/customizações, salvar como pagamentos iniciais?
            // O usuário quer que o empréstimo comece JÁ com aquele plano.
            // Se salvarmos como pagamentos, eles serão abatidos.
            // Mas o usuário pode ter apenas REAGENDADO (mudado data) ou mudado valor da parcela futura.
            // Se mudou valor da parcela futura, NÃO é pagamento realizado. É PROJEÇÃO.
            // MAS nosso sistema de 'loan_payments' é apenas para REALIZADOS.

            // SOLUÇÃO: Não temos tabela de 'installments' customizada. Tudo é calculado dinâmica.
            // SE o usuário customizou a simulação (ex: mudou datas ou valores), e quer 'Salvar' isso...
            // Precisaríamos salvar 'overrides' no banco (ex: coluna JSONB 'schedule_overrides').

            // Como não temos schema change agora, vamos usar 'loan_payments' APENAS se o usuário marcou como 'Pago'?
            // Não, o usuário disse 'Simulação'.

            // Se eu não salvar, o usuário perde a edição.
            // PROPOSTA: Salvar os overrides como 'scheduled' payments? Não existe status.
            // Vou salvar como pagamentos com nota 'Agendado'?
            // O `calculateDynamicSchedule` trata pagamentos como Realizados.

            // Mas espere: O usuário quer que a tabela FIQUE IGUAL.
            // Se a tabela simulada tem valores diferentes, é porque o usuário mudou.
            // Se eu não persistir, volta ao padrão.
            // Vou persistir como pagamentos COM DATA FUTURA.
            // Assim, o `calculateDynamicSchedule` vai consumi-los nas datas corretas e gerar os valores corretos.

            // Vou iterar sobre os `simulatedInstallments` e criar pagamentos para aqueles que diferem do padrão?
            // Melhor: Se houver overrides, criar pagamentos correspondentes.

            if (overrides && Object.keys(overrides).length > 0) {
                const initialPayments = [];

                // Precisamos saber QUAIS pagamentos criar.
                // Se o usuário mudou a data da parcela 1, criamos um pagamento na nova data com valor da parcela?
                // Se criarmos um pagamento, o sistema considera status 'Paid' (ou futuro).
                // Isso pode confundir se o usuário achar que já pagou.
                // Mas visualmente vai bater a tabela.

                // Vamos criar pagamentos para TODAS as parcelas que tiverem override ou para todas da simulação?
                // Se criarmos para todas, o usuário terá que deletar para marcar como não pago? Não.

                // O usuário reclamou: "não consigo editar o vencimento depois que crio".
                // Isso implica que ele quer manter a DATA personalizada.
                // Como não tenho campo 'due_date_override' por parcela...
                // Vou usar o hack de criar um pagamento com valor 0 ou algo assim? Não.

                // Vou salvar apenas pagamentos que o usuário EXPLÍCITAMENTE definir (se houvesse checkbox 'pago').
                // Mas ele só editou a simulação.

                // Se eu não posso alterar o Schema, e preciso persistir datas/valores customizados...
                // Não há como fazer isso sem tabela de installments ou coluna JSON.

                // VOU INSERIR UM PAGAMENTO DE $0.00 CORRIGINDO A DATA? 
                // Não, valor 0 deleta pagamento na minha lógica de edição.

                // VOU TENTAR UMA ALTERNATIVA VIÁVEL:
                // Inserir pagamentos com nota 'Simulação'.
                // O usuário poderá editá-los depois na tela de detalhes (que agora suporta edição).

                // Filtrar apenas overrides e criar pagamentos.
                const paymentsToInsert = Object.entries(overrides).map(([index, ov]) => {
                    // Precisamos da data original para saber se mudou?
                    // Pegamos do simulatedInstallments
                    const inst = simulatedInstallments?.find(i => i.number === Number(index));
                    if (!inst) return null;

                    return {
                        loan_id: loanData.id,
                        amount: ov.amount ?? inst.amount, // Valor customizado ou original
                        date: (ov.date ?? inst.dueDate).toISOString(), // Data customizada ou original
                        note: 'Agendamento Simulado',
                        installment_number: Number(index) // FIX: Tag payment to installment
                    };
                }).filter(Boolean); // Remove nulls

                if (paymentsToInsert.length > 0) {
                    const { error: batchError } = await supabase
                        .from('loan_payments')
                        .insert(paymentsToInsert as any[]);

                    if (batchError) console.error("Erro ao salvar simulação", batchError);
                }
            }

            toast({
                title: "Sucesso",
                description: "Empréstimo criado com sucesso!",
            });

            setIsDialogOpen(false);
            fetchLoans();
        } catch (error) {
            console.error('Erro ao criar empréstimo:', error);
            toast({
                title: "Erro",
                description: "Erro ao criar empréstimo.",
                variant: "destructive"
            });
        }
    };

    const handleDeleteLoan = async (loanId: string) => {
        try {
            const { error } = await supabase.from('loans').delete().eq('id', loanId);

            if (error) throw error;

            toast({
                title: "Sucesso",
                description: "Empréstimo excluído com sucesso!",
            });

            fetchLoans();
        } catch (error) {
            console.error('Erro ao excluir empréstimo:', error);
            toast({
                title: "Erro",
                description: "Erro ao excluir empréstimo.",
                variant: "destructive"
            });
        }
    };

    // Helper to sync loan state to transactions
    const syncLoanToDashboard = async (loanId: string, userId: string) => {
        // 1. Fetch fresh loan data with payments
        const { data: loanData, error: loanError } = await supabase
            .from('loans')
            .select('*')
            .eq('id', loanId)
            .single();

        if (loanError || !loanData) throw loanError || new Error("Loan not found");

        const { data: paymentsData, error: paymentsError } = await supabase
            .from('loan_payments')
            .select('*')
            .eq('loan_id', loanId)
            .order('date', { ascending: true });

        if (paymentsError) throw paymentsError;

        // Skip if not integrated
        if (!(loanData as any).integrate_in_dashboard) return;

        // 2. Map logic (same as fetchLoans)
        const mappedLoan: Loan = {
            id: loanData.id,
            userId: loanData.user_id,
            name: loanData.name,
            type: loanData.type,
            principalAmount: Number(loanData.principal_amount),
            interestRate: Number(loanData.interest_rate),
            interestPeriod: loanData.interest_period,
            interestType: loanData.interest_type,
            startDate: new Date(loanData.start_date || new Date()),
            numberOfInstallments: loanData.number_of_installments,
            status: loanData.status,
            createdAt: new Date(loanData.created_at),
            updatedAt: new Date(loanData.updated_at),
            integrate_in_dashboard: (loanData as any).integrate_in_dashboard,
            payments: (paymentsData || []).map((p: any) => ({
                id: p.id,
                loanId: p.loan_id,
                amount: Number(p.amount),
                date: new Date(p.date),
                note: p.note
            })),
            installments: [],
            totalAmount: 0
        };

        // 3. Calculate Schedule to get PENDING installments
        const dynamicData = calculateDynamicSchedule(mappedLoan, mappedLoan.payments);
        const pendingInstallments = dynamicData.installments.filter(i => i.status !== 'paid');

        // 4. Prepare Transactions
        const transactions = [];

        // 4.1 Principal
        transactions.push({
            user_id: userId,
            amount: mappedLoan.principalAmount,
            type: mappedLoan.type === 'borrowed' ? 'income' : 'expense',
            description: `Empréstimo: ${mappedLoan.name}`,
            date: format(mappedLoan.startDate, 'yyyy-MM-dd'),
            category_id: null,
            payment_method: 'transfer',
            loan_id: loanId,
            status: 'paid'
        });

        // 4.2 Realized Payments (PAID)
        mappedLoan.payments.forEach(p => {
            transactions.push({
                user_id: userId,
                amount: p.amount,
                type: mappedLoan.type === 'borrowed' ? 'expense' : 'income',
                description: `Pagamento Empréstimo: ${mappedLoan.name}`,
                date: format(p.date, 'yyyy-MM-dd'),
                payment_method: 'transfer',
                loan_id: loanId,
                status: 'paid'
            });
        });

        // 4.3 Pending Installments (PENDING)
        // Only if loan is active
        if (mappedLoan.status === 'active') {
            pendingInstallments.forEach(inst => {
                transactions.push({
                    user_id: userId,
                    amount: inst.amount,
                    type: mappedLoan.type === 'borrowed' ? 'expense' : 'income',
                    // Borrowed -> Pay Installment (Expense). Lent -> Receive Installment (Income).
                    description: `Parcela ${inst.number} - ${mappedLoan.name}`,
                    date: format(inst.dueDate, 'yyyy-MM-dd'),
                    payment_method: 'transfer',
                    loan_id: loanId,
                    status: 'pending'
                });
            });
        }

        // 5. Atomic Replace
        // Delete all
        await supabase.from('transactions').delete().eq('loan_id', loanId);

        // Insert new
        if (transactions.length > 0) {
            await supabase.from('transactions').insert(transactions as any);
        }
    };

    const handleToggleIntegration = async (loanId: string, checked: boolean) => {
        try {
            const { error } = await supabase
                .from('loans')
                .update({ integrate_in_dashboard: checked } as any)
                .eq('id', loanId);

            if (error) throw error;

            if (checked && user) {
                await syncLoanToDashboard(loanId, user.id);
                toast({ title: "Integrado!", description: "Transações e parcelas futuras sincronizadas." });
            } else {
                await supabase.from('transactions').delete().eq('loan_id', loanId);
                toast({ title: "Desvinculado", description: "Transações removidas do Dashboard." });
            }

            fetchLoans();
        } catch (error) {
            console.error(error);
            toast({
                title: "Erro",
                description: "Falha ao atualizar integração.",
                variant: "destructive"
            });
        }
    };

    const handleAmortize = async (loanId: string, amount: number) => {
        try {
            const { error } = await supabase.from('loan_payments').insert({
                loan_id: loanId,
                amount: amount,
                date: new Date().toISOString(),
                note: 'Amortização manual'
            });

            if (error) throw error;

            if (user) await syncLoanToDashboard(loanId, user.id);

            toast({
                title: "Pagamento Registrado",
                description: "O valor foi abatido do saldo devedor.",
            });

            fetchLoans();
        } catch (error) {
            console.error('Erro ao amortizar:', error);
            toast({
                title: "Erro",
                description: "Não foi possível registrar o pagamento.",
                variant: "destructive"
            });
        }
    };

    const handleUpdatePayments = async (loanId: string, payments: { amount: number; date: Date; note?: string; installmentNumber?: number }[]) => {
        console.log('Received payments to update:', payments);
        try {
            // 1. Deletar pagamentos existentes
            const { error: deleteError } = await supabase
                .from('loan_payments')
                .delete()
                .eq('loan_id', loanId);

            if (deleteError) throw deleteError;

            // 2. Inserir novos pagamentos
            if (payments.length > 0) {
                const { data: insertedData, error: insertError } = await supabase
                    .from('loan_payments')
                    .insert(payments.map(p => ({
                        loan_id: loanId,
                        amount: p.amount,
                        date: p.date.toISOString(),
                        note: p.note || null,
                        installment_number: p.installmentNumber
                    })))
                    .select();

                console.log('Inserted payments debug:', insertedData);

                if (insertedData && insertedData.length > 0) {
                    const hasPersistence = insertedData.some((p: any) => p.installment_number != null);
                    if (!hasPersistence) {
                        console.error("CRITICAL: installment_number Missing in DB response!");
                        toast({
                            title: "Erro Crítico de Persistência",
                            description: "O banco de dados não salvou a ordem das parcelas. Verifique se você rodou o Script SQL 'add_installment_number.sql' no Supabase!",
                            variant: "destructive"
                        });
                    }
                }

                if (insertError) throw insertError;
            }

            // 3. Sync
            if (user) await syncLoanToDashboard(loanId, user.id);

            toast({
                title: "Sucesso",
                description: "Pagamentos atualizados com sucesso!",
            });

            fetchLoans();
        } catch (error) {
            console.error('Erro ao atualizar pagamentos:', error);
            toast({
                title: "Erro",
                description: "Erro ao salvar alterações.",
                variant: "destructive"
            });
        }
    };

    if (isLoading) {
        return (
            <div className="container py-8 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <AppLayout>
            <div className="space-y-8 animate-fade-in">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-bold tracking-tight">Empréstimos</h1>
                        <p className="text-muted-foreground">
                            Gerencie seus empréstimos e financiamentos.
                        </p>
                    </div>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2">
                                <Plus className="h-4 w-4" />
                                Novo Empréstimo
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-[95vw] w-full h-[95vh] max-h-[95vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Novo Empréstimo</DialogTitle>
                                <DialogDescription>
                                    Cadastre um novo empréstimo ou financiamento para acompanhar.
                                </DialogDescription>
                            </DialogHeader>
                            <LoanForm onSubmit={handleCreateLoan} />
                        </DialogContent>
                    </Dialog>
                </div>

                <LoanList
                    loans={loans}
                    onAmortize={handleAmortize}
                    onDelete={handleDeleteLoan}
                    onUpdatePayments={handleUpdatePayments}
                    onRefresh={fetchLoans}
                    onToggleIntegration={handleToggleIntegration}
                />
            </div>
        </AppLayout>
    );
}
