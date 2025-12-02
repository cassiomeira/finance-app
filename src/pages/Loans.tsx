import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

            // Buscar pagamentos para cada empréstimo
            const loansWithDetails = await Promise.all(loansData.map(async (loan: any) => {
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
                    startDate: new Date(loan.start_date),
                    numberOfInstallments: loan.number_of_installments,
                    status: loan.status,
                    createdAt: new Date(loan.created_at),
                    updatedAt: new Date(loan.updated_at),
                    payments: paymentsData.map((p: any) => ({
                        id: p.id,
                        loanId: p.loan_id,
                        amount: Number(p.amount),
                        date: new Date(p.date),
                        note: p.note
                    })),
                    // Inicializa com array vazio, será preenchido pelo calculateDynamicSchedule
                    installments: [],
                    totalAmount: 0
                };

                // Calcular cronograma dinâmico
                const dynamicData = calculateDynamicSchedule(mappedLoan, mappedLoan.payments);

                return {
                    ...mappedLoan,
                    installments: dynamicData.installments,
                    currentBalance: dynamicData.currentBalance,
                    totalPaid: dynamicData.totalPaid,
                    // Total amount projetado é a soma das parcelas (já inclui juros)
                    totalAmount: dynamicData.installments.reduce((sum, i) => sum + i.amount, 0)
                };
            }));

            setLoans(loansWithDetails);
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

    const handleCreateLoan = async (data: any) => {
        if (!user) return;

        try {
            const { error } = await supabase.from('loans').insert({
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
            });

            if (error) throw error;

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

    const handleAmortize = async (loanId: string, amount: number) => {
        try {
            const { error } = await supabase.from('loan_payments').insert({
                loan_id: loanId,
                amount: amount,
                date: new Date().toISOString(),
                note: 'Amortização manual'
            });

            if (error) throw error;

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

    const handleUpdatePayments = async (loanId: string, payments: { amount: number; date: Date; note?: string }[]) => {
        try {
            // 1. Deletar pagamentos existentes deste empréstimo (simplificação para garantir sincronia)
            // *Nota*: Em produção, seria melhor fazer diff, mas para este app pessoal, replace é mais seguro para garantir consistência.
            const { error: deleteError } = await supabase
                .from('loan_payments')
                .delete()
                .eq('loan_id', loanId);

            if (deleteError) throw deleteError;

            // 2. Inserir novos pagamentos
            if (payments.length > 0) {
                const { error: insertError } = await supabase
                    .from('loan_payments')
                    .insert(payments.map(p => ({
                        loan_id: loanId,
                        amount: p.amount,
                        date: p.date.toISOString(),
                        note: p.note || 'Pagamento simulado/editado'
                    })));

                if (insertError) throw insertError;
            }

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
        <div className="container py-8 space-y-8 animate-fade-in">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <Button
                        variant="ghost"
                        className="pl-0 hover:bg-transparent hover:text-primary"
                        onClick={() => navigate('/dashboard')}
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Voltar ao Dashboard
                    </Button>
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
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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

            <LoanList loans={loans} onAmortize={handleAmortize} onDelete={handleDeleteLoan} onUpdatePayments={handleUpdatePayments} />
        </div>
    );
}
