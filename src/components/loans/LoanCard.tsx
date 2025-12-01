import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loan } from '@/types/loan';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingDown, TrendingUp, Calendar, DollarSign } from 'lucide-react';

interface LoanCardProps {
    loan: Loan;
    onAmortize: (loanId: string, amount: number) => void;
}

export function LoanCard({ loan, onAmortize }: LoanCardProps) {
    const [isAmortizeOpen, setIsAmortizeOpen] = useState(false);
    const [amortizeAmount, setAmortizeAmount] = useState('');

    const totalInstallments = loan.numberOfInstallments || 0;
    const paidInstallments = loan.installments.filter(i => i.status === 'paid').length;

    // Se tivermos o saldo atual calculado (via banco), usamos ele.
    // Senão, usamos o cálculo simples.
    const currentBalance = loan.currentBalance ?? loan.principalAmount;
    const totalPaid = loan.totalPaid ?? 0;

    // Progresso financeiro real: Quanto já paguei do total esperado?
    // Se for indeterminado, o "total" é o principal + juros até agora (saldo + pago)
    const totalReference = loan.numberOfInstallments
        ? loan.totalAmount
        : (currentBalance + totalPaid);

    let progress = 0;
    if (totalReference > 0) {
        progress = (totalPaid / totalReference) * 100;
    }

    const nextInstallment = loan.installments.find(i => i.status !== 'paid');

    const handleAmortizeSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(amortizeAmount);
        if (amount > 0) {
            onAmortize(loan.id, amount);
            setIsAmortizeOpen(false);
            setAmortizeAmount('');
        }
    };

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
                <div className="space-y-1 mb-4">
                    <p className="text-xs text-muted-foreground">Saldo Atual</p>
                    <div className="text-2xl font-bold">
                        {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                        }).format(currentBalance)}
                    </div>
                </div>

                <p className="text-xs text-muted-foreground mb-4">
                    {loan.numberOfInstallments ? (
                        `${loan.numberOfInstallments}x de ${new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                        }).format(loan.monthlyPayment || 0)}`
                    ) : (
                        'Prazo Indeterminado'
                    )}
                </p>

                <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-xs">
                        <span>Pago: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPaid)}</span>
                        <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                </div>

                <div className="flex justify-between items-center mt-4">
                    {nextInstallment ? (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>
                                Próx: {format(nextInstallment.dueDate, "dd/MM", { locale: ptBR })}
                            </span>
                        </div>
                    ) : (
                        <div className="text-xs text-muted-foreground">
                            {loan.status === 'active' ? 'Em dia' : 'Quitado'}
                        </div>
                    )}

                    <Dialog open={isAmortizeOpen} onOpenChange={setIsAmortizeOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8">
                                <DollarSign className="h-3 w-3 mr-1" />
                                Pagar
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Amortizar / Pagar</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleAmortizeSubmit} className="space-y-4 pt-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Valor do Pagamento</label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="0,00"
                                        value={amortizeAmount}
                                        onChange={(e) => setAmortizeAmount(e.target.value)}
                                        required
                                    />
                                </div>
                                <Button type="submit" className="w-full">Confirmar Pagamento</Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardContent>
        </Card>
    );
}
