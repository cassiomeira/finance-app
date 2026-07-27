import { Loan } from '@/types/loan';
import { LoanCard } from './LoanCard';

interface LoanListProps {
    loans: Loan[];
    onRegisterPayment: (loanId: string, data: { amount: number; date: Date; note?: string | null }) => void;
    onDeletePayment: (loanId: string, paymentId: string) => void;
    onDelete?: (loanId: string) => void;
}

export function LoanList({ loans, onRegisterPayment, onDeletePayment, onDelete }: LoanListProps) {
    if (loans.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-muted-foreground">Nenhum empréstimo cadastrado.</p>
            </div>
        );
    }

    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {loans.map((loan) => (
                <LoanCard
                    key={loan.id}
                    loan={loan}
                    onRegisterPayment={onRegisterPayment}
                    onDeletePayment={onDeletePayment}
                    onDelete={onDelete}
                />
            ))}
        </div>
    );
}
