import { useState } from 'react';
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
import { calculateLoan } from '@/utils/loanCalculations';

export default function Loans() {
    const navigate = useNavigate();
    const [loans, setLoans] = useState<Loan[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const handleCreateLoan = (data: any) => {
        // Calcular detalhes finais antes de salvar
        const calculation = calculateLoan(
            data.principalAmount,
            data.interestRate,
            data.interestPeriod,
            data.interestType,
            data.isIndefinite ? undefined : data.numberOfInstallments,
            data.startDate
        );

        const newLoan: Loan = {
            id: crypto.randomUUID(),
            userId: 'user-id-placeholder', // Em produção, pegar do contexto de auth
            ...data,
            numberOfInstallments: data.isIndefinite ? undefined : data.numberOfInstallments,
            totalAmount: calculation.totalAmount,
            monthlyPayment: calculation.monthlyPayment,
            installments: calculation.installments,
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        setLoans([...loans, newLoan]);
        setIsDialogOpen(false);
    };

    const handleAmortize = (loanId: string, amount: number) => {
        setLoans(loans.map(loan => {
            if (loan.id === loanId) {
                const newPayment = {
                    id: crypto.randomUUID(),
                    loanId: loan.id,
                    amount: amount,
                    date: new Date(),
                };
                return {
                    ...loan,
                    payments: [...(loan.payments || []), newPayment],
                    lastPaymentDate: new Date(),
                };
            }
            return loan;
        }));
    };

    // Fallback simples de erro
    try {
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

                <LoanList loans={loans} onAmortize={handleAmortize} />
            </div>
        );
    } catch (error) {
        console.error("Erro ao renderizar Loans:", error);
        return (
            <div className="container py-8 text-center">
                <h2 className="text-xl font-bold text-destructive">Algo deu errado</h2>
                <p className="text-muted-foreground">Não foi possível carregar seus empréstimos.</p>
                <Button onClick={() => window.location.reload()} className="mt-4">
                    Recarregar Página
                </Button>
            </div>
        );
    }
}
