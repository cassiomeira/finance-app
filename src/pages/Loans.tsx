import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { Plus } from 'lucide-react';
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
import { calculateLedger } from '@/utils/loanCalculations';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const brl = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const mapLoan = (loan: any): Loan => ({
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
        kind: p.kind === 'disbursement' ? 'disbursement' : 'payment',
    })),
    installments: [],
    totalAmount: 0,
});

export default function Loans() {
    const { user, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const [loans, setLoans] = useState<Loan[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const fetchLoans = async (): Promise<Loan[]> => {
        if (!user) return [];
        try {
            setIsLoading(true);
            const loansData = await api.loans.getAll();
            const mapped = loansData.map(mapLoan);
            setLoans(mapped);
            return mapped;
        } catch (error) {
            console.error('Erro ao buscar empréstimos:', error);
            toast({
                title: 'Erro',
                description: 'Não foi possível carregar seus empréstimos.',
                variant: 'destructive',
            });
            return [];
        } finally {
            setIsLoading(false);
        }
    };

    // Monta as transações que representam o empréstimo no dashboard:
    // principal (na data de início) + cada pagamento real.
    const buildLoanTransactions = (loan: Loan) => {
        const txns = [
            {
                amount: loan.principalAmount,
                type: loan.type === 'borrowed' ? 'income' : 'expense',
                description: `Empréstimo: ${loan.name}`,
                date: format(loan.startDate, 'yyyy-MM-dd'),
                payment_method: 'transfer',
                status: 'paid',
            },
        ];
        (loan.payments || []).forEach((p) => {
            const isDisbursement = p.kind === 'disbursement';
            txns.push({
                amount: p.amount,
                // Aporte = mais valor pego (mesmo fluxo do principal). Pagamento = fluxo inverso.
                type: isDisbursement
                    ? (loan.type === 'borrowed' ? 'income' : 'expense')
                    : (loan.type === 'borrowed' ? 'expense' : 'income'),
                description: isDisbursement
                    ? `Novo valor empréstimo: ${loan.name}`
                    : `Pagamento empréstimo: ${loan.name}`,
                date: format(p.date, 'yyyy-MM-dd'),
                payment_method: 'transfer',
                status: 'paid',
            });
        });
        return txns;
    };

    // Re-sincroniza um empréstimo com o dashboard, se a integração estiver ligada.
    const resyncIfIntegrated = async (loanId: string, fresh: Loan[]) => {
        const loan = fresh.find((l) => l.id === loanId);
        if (loan?.integrate_in_dashboard) {
            await api.loans.syncTransactions(loanId, buildLoanTransactions(loan));
        }
    };

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            setIsLoading(false);
            return;
        }
        fetchLoans();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, authLoading]);

    const summary = useMemo(() => {
        let owed = 0;
        let receivable = 0;
        for (const loan of loans) {
            const { currentBalance } = calculateLedger(loan);
            if (loan.type === 'borrowed') owed += currentBalance;
            else receivable += currentBalance;
        }
        return { owed, receivable };
    }, [loans]);

    const handleCreateLoan = async (data: any) => {
        if (!user) return;
        try {
            await api.loans.create({
                name: data.name,
                type: data.type,
                principal_amount: data.principalAmount,
                interest_rate: data.interestRate,
                interest_period: data.interestPeriod,
                interest_type: data.interestType,
                start_date: data.startDate.toISOString(),
                number_of_installments: data.isIndefinite ? null : data.numberOfInstallments,
                status: 'active',
            });
            toast({ title: 'Sucesso', description: 'Empréstimo criado com sucesso!' });
            setIsDialogOpen(false);
            fetchLoans();
        } catch (error) {
            console.error('Erro ao criar empréstimo:', error);
            toast({ title: 'Erro', description: 'Erro ao criar empréstimo.', variant: 'destructive' });
        }
    };

    const handleDeleteLoan = async (loanId: string) => {
        try {
            await api.loans.delete(loanId);
            toast({ title: 'Sucesso', description: 'Empréstimo excluído com sucesso!' });
            fetchLoans();
        } catch (error) {
            console.error('Erro ao excluir empréstimo:', error);
            toast({ title: 'Erro', description: 'Erro ao excluir empréstimo.', variant: 'destructive' });
        }
    };

    const handleRegisterPayment = async (
        loanId: string,
        data: { amount: number; date: Date; note?: string | null; kind?: 'payment' | 'disbursement' }
    ) => {
        const isDisbursement = data.kind === 'disbursement';
        try {
            await api.loans.createPayment(loanId, {
                amount: data.amount,
                date: data.date.toISOString(),
                note: data.note ?? null,
                kind: data.kind ?? 'payment',
            });
            toast({
                title: isDisbursement ? 'Novo valor registrado' : 'Pagamento registrado',
                description: 'O saldo foi recalculado.',
            });
            const fresh = await fetchLoans();
            await resyncIfIntegrated(loanId, fresh);
        } catch (error) {
            console.error('Erro ao registrar evento:', error);
            toast({ title: 'Erro', description: 'Não foi possível registrar.', variant: 'destructive' });
        }
    };

    const handleDeletePayment = async (loanId: string, paymentId: string) => {
        try {
            const loan = loans.find((l) => l.id === loanId);
            const remaining = (loan?.payments || [])
                .filter((p) => p.id !== paymentId)
                .map((p) => ({
                    amount: p.amount,
                    date: p.date.toISOString(),
                    note: p.note ?? null,
                    kind: p.kind ?? 'payment',
                }));
            await api.loans.replacePayments(loanId, remaining);
            toast({ title: 'Pagamento excluído', description: 'O saldo foi recalculado.' });
            const fresh = await fetchLoans();
            await resyncIfIntegrated(loanId, fresh);
        } catch (error) {
            console.error('Erro ao excluir pagamento:', error);
            toast({ title: 'Erro', description: 'Não foi possível excluir o pagamento.', variant: 'destructive' });
        }
    };

    const handleToggleIntegration = async (loanId: string, checked: boolean) => {
        try {
            await api.loans.toggleIntegration(loanId, checked);
            if (checked) {
                const loan = loans.find((l) => l.id === loanId);
                if (loan) {
                    await api.loans.syncTransactions(
                        loanId,
                        buildLoanTransactions({ ...loan, integrate_in_dashboard: true })
                    );
                }
                toast({ title: 'Integrado', description: 'Empréstimo lançado no dashboard.' });
            } else {
                await api.loans.syncTransactions(loanId, []);
                toast({ title: 'Desvinculado', description: 'Transações removidas do dashboard.' });
            }
            fetchLoans();
        } catch (error) {
            console.error('Erro ao atualizar integração:', error);
            toast({ title: 'Erro', description: 'Falha ao atualizar a integração.', variant: 'destructive' });
        }
    };

    if (isLoading) {
        return (
            <AppLayout>
                <div className="container py-8 flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <div className="space-y-6 animate-fade-in">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-bold tracking-tight">Empréstimos</h1>
                        <p className="text-muted-foreground">
                            Acompanhe saldos devedores com vários abatimentos ao longo do mês.
                        </p>
                    </div>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2">
                                <Plus className="h-4 w-4" />
                                Novo Empréstimo
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg w-full max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Novo Empréstimo</DialogTitle>
                                <DialogDescription>
                                    Cadastre o empréstimo. Depois é só registrar os pagamentos que o saldo se atualiza.
                                </DialogDescription>
                            </DialogHeader>
                            <LoanForm onSubmit={handleCreateLoan} />
                        </DialogContent>
                    </Dialog>
                </div>

                {loans.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="rounded-xl border bg-card p-4">
                            <p className="text-sm text-muted-foreground">Devo no total</p>
                            <p className="text-2xl font-bold text-destructive">{brl(summary.owed)}</p>
                        </div>
                        <div className="rounded-xl border bg-card p-4">
                            <p className="text-sm text-muted-foreground">Tenho a receber</p>
                            <p className="text-2xl font-bold text-green-600">{brl(summary.receivable)}</p>
                        </div>
                    </div>
                )}

                <LoanList
                    loans={loans}
                    onRegisterPayment={handleRegisterPayment}
                    onDeletePayment={handleDeletePayment}
                    onDelete={handleDeleteLoan}
                    onToggleIntegration={handleToggleIntegration}
                />
            </div>
        </AppLayout>
    );
}
