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
import { api } from '@/lib/api';
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
            const loansData = await api.loans.getAll();

            const loansWithDetails = loansData.map((loan: any) => {
                try {
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
                        startDate: new Date(loan.start_date || new Date()),
                        numberOfInstallments: loan.number_of_installments,
                        status: loan.status,
                        createdAt: new Date(loan.created_at),
                        updatedAt: new Date(loan.updated_at),
                        integrate_in_dashboard: loan.integrate_in_dashboard,
                        payments: (loan.payments || []).map((p: any) => ({
                            id: p.id,
                            loanId: p.loan_id,
                            amount: Number(p.amount),
                            date: new Date(p.date),
                            note: p.note,
                            installmentNumber: p.installment_number
                        })),
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
                        currentBalance: dynamicData.currentBalance,
                        totalPaid: dynamicData.totalPaid,
                        monthlyPayment: dynamicData.monthlyPayment,
                        totalAmount: dynamicData.installments.reduce((sum, i) => sum + i.amount, 0)
                    };
                } catch (err) {
                    console.error(`Error processing loan ${loan.id}:`, err);
                    return null;
                }
            });

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
            const loanData = await api.loans.create({
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

            // 2. Se houver overrides, salvar como pagamentos simulados
            if (overrides && Object.keys(overrides).length > 0) {
                const paymentsToInsert = Object.entries(overrides).map(([index, ov]) => {
                    const inst = simulatedInstallments?.find(i => i.number === Number(index));
                    if (!inst) return null;

                    return {
                        amount: ov.amount ?? inst.amount,
                        date: (ov.date ?? inst.dueDate).toISOString(),
                        note: 'Agendamento Simulado',
                        installment_number: Number(index)
                    };
                }).filter(Boolean);

                if (paymentsToInsert.length > 0) {
                    try {
                        await api.loans.batchPayments(loanData.id, paymentsToInsert);
                    } catch (batchError) {
                        console.error("Erro ao salvar simulação", batchError);
                    }
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
            await api.loans.delete(loanId);

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
        // 1. Fetch fresh loan data with payments (API returns loan with nested payments)
        const allLoans = await api.loans.getAll();
        const loanData = allLoans.find((l: any) => l.id === loanId);

        if (!loanData) throw new Error("Loan not found");

        // Skip if not integrated
        if (!loanData.integrate_in_dashboard) return;

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
            integrate_in_dashboard: loanData.integrate_in_dashboard,
            payments: (loanData.payments || []).map((p: any) => ({
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
            amount: mappedLoan.principalAmount,
            type: mappedLoan.type === 'borrowed' ? 'income' : 'expense',
            description: `Empréstimo: ${mappedLoan.name}`,
            date: format(mappedLoan.startDate, 'yyyy-MM-dd'),
            category_id: null,
            payment_method: 'transfer',
            status: 'paid'
        });

        // 4.2 Realized Payments (PAID)
        mappedLoan.payments.forEach(p => {
            transactions.push({
                amount: p.amount,
                type: mappedLoan.type === 'borrowed' ? 'expense' : 'income',
                description: `Pagamento Empréstimo: ${mappedLoan.name}`,
                date: format(p.date, 'yyyy-MM-dd'),
                payment_method: 'transfer',
                status: 'paid'
            });
        });

        // 4.3 Pending Installments (PENDING)
        if (mappedLoan.status === 'active') {
            pendingInstallments.forEach(inst => {
                transactions.push({
                    amount: inst.amount,
                    type: mappedLoan.type === 'borrowed' ? 'expense' : 'income',
                    description: `Parcela ${inst.number} - ${mappedLoan.name}`,
                    date: format(inst.dueDate, 'yyyy-MM-dd'),
                    payment_method: 'transfer',
                    status: 'pending'
                });
            });
        }

        // 5. Atomic Replace via API
        await api.loans.syncTransactions(loanId, transactions);
    };

    const handleToggleIntegration = async (loanId: string, checked: boolean) => {
        try {
            await api.loans.toggleIntegration(loanId, checked);

            if (checked && user) {
                await syncLoanToDashboard(loanId, user.id);
                toast({ title: "Integrado!", description: "Transações e parcelas futuras sincronizadas." });
            } else {
                // When disabling, sync with empty transactions to clear them
                await api.loans.syncTransactions(loanId, []);
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
            await api.loans.createPayment(loanId, {
                amount: amount,
                date: new Date().toISOString(),
                note: 'Amortização manual'
            });

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
            // Replace all payments atomically via API
            const insertedData = await api.loans.replacePayments(loanId, payments.map(p => ({
                amount: p.amount,
                date: p.date.toISOString(),
                note: p.note || null,
                installment_number: p.installmentNumber
            })));

            console.log('Inserted payments debug:', insertedData);

            // Sync with dashboard
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
