```typescript
import { Loan } from '@/types/loan';
import { LoanCard } from './LoanCard';

interface LoanListProps {
    loans: Loan[];
    onAmortize: (loanId: string, amount: number) => void;
}

export function LoanList({ loans, onAmortize }: LoanListProps) {
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
                <LoanCard key={loan.id} loan={loan} onAmortize={onAmortize} />
            ))}
        </div>
    );
}
```
