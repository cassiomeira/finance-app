import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loan } from '@/types/loan';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingDown, TrendingUp, Calendar, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { calculateCurrentDebt } from '@/utils/loanCalculations';

interface LoanCardProps {
    loan: Loan;
    onAmortize: (loanId: string, amount: number) => void;
}

export function LoanCard({ loan, onAmortize }: LoanCardProps) {
    const [isAmortizeOpen, setIsAmortizeOpen] = useState(false);
    const [amortizeAmount, setAmortizeAmount] = useState('');

    const { currentBalance, totalInterestAccrued } = calculateCurrentDebt(loan);

    const paidInstallments = loan.installments.filter(i => i.status === 'paid').length;
    const totalInstallments = loan.numberOfInstallments || 0;

    let progress = 0;
    if (totalInstallments > 0) {
        progress = (paidInstallments / totalInstallments) * 100;
    } else {
        const principalPaid = Math.max(0, loan.principalAmount - currentBalance);
        progress = (principalPaid / loan.principalAmount) * 100;
    }

    const handleAmortize = () => {
        const amount = parseFloat(amortizeAmount);
        if (amount > 0) {
            onAmortize(loan.id, amount);
            setIsAmortizeOpen(false);
            setAmortizeAmount('');
        }
    };

    const nextInstallment = loan.installments.find(i => i.status !== 'paid');

    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    {loan.name}
                </CardTitle>
                {loan.type === 'borrowed' ? (
                    <TrendingDown className="h-4 w-4 text-destructive" />
                ) : (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                )}
            </CardHeader>
            <CardContent>
                <div className="flex justify-between items-end mb-2">
                    <div>
                        <p className="text-xs text-muted-foreground">Saldo Atual (com juros)</p>
                        <div className="text-2xl font-bold">
                            {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                            }).format(currentBalance)}
                        </div>
                    </div>
                    {totalInterestAccrued > 0 && (
                        <div className="text-right">
                            <p className="text-xs text-muted-foreground">Juros Acumulados</p>
                            <p className="text-sm font-medium text-destructive">
                                +{new Intl.NumberFormat('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL',
                                }).format(totalInterestAccrued)}
                            </p>
                        </div>
                    )}
                </div>

                <p className="text-xs text-muted-foreground mb-4">
                    Original: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(loan.principalAmount)}
                    {' • '}
                    {loan.numberOfInstallments ? (
                        `${loan.numberOfInstallments}x de ${new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                        }).format(loan.monthlyPayment || 0)}`
                    ) : (
                        'Prazo Indeterminado'
                    )}
                </p>

                <div className="mb-4">
                    <Dialog open={isAmortizeOpen} onOpenChange={setIsAmortizeOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="w-full gap-2">
                                <Wallet className="h-4 w-4" />
                                Amortizar / Pagar
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Amortizar Empréstimo</DialogTitle>
                                <DialogDescription>
                                    Faça um pagamento para reduzir o saldo devedor.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="amount">Valor do Pagamento (R$)</Label>
                                    <Input
                                        id="amount"
                                        type="number"
                                        placeholder="0,00"
                                        value={amortizeAmount}
                                        onChange={(e) => setAmortizeAmount(e.target.value)}
                                    />
                                </div>
                                <Button onClick={handleAmortize} className="w-full">
                                    Confirmar Pagamento
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                        <span>Progresso (Principal Pago)</span>
                        <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                </div>

                {nextInstallment && (
                    <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>
                            Próxima: {format(nextInstallment.dueDate, "dd 'de' MMM", { locale: ptBR })}
                        </span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
