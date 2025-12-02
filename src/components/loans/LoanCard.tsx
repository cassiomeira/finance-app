import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loan } from '@/types/loan';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingDown, TrendingUp, Calendar, DollarSign, Trash2, ChevronDown, ChevronUp, Save, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { calculateDynamicSchedule } from '@/utils/loanCalculations';

interface LoanCardProps {
    loan: Loan;
    onAmortize: (loanId: string, amount: number) => void;
    onDelete?: (loanId: string) => void;
    onUpdatePayments?: (loanId: string, payments: { amount: number; date: Date; note?: string }[]) => void;
}

export function LoanCard({ loan, onAmortize, onDelete, onUpdatePayments }: LoanCardProps) {
    const [isAmortizeOpen, setIsAmortizeOpen] = useState(false);
    const [amortizeAmount, setAmortizeAmount] = useState('');
    const [isExpanded, setIsExpanded] = useState(false);

    // State for simulation
    const [simulatedPayments, setSimulatedPayments] = useState<{ amount: number; date: Date; note?: string }[]>([]);
    const [hasChanges, setHasChanges] = useState(false);

    // Initialize simulation with actual payments when loan changes
    useEffect(() => {
        setSimulatedPayments(loan.payments || []);
        setHasChanges(false);
    }, [loan.payments]);

    // Calculate dynamic schedule based on simulated payments
    const { installments: simulatedInstallments, currentBalance: simulatedBalance, totalPaid: simulatedTotalPaid } = useMemo(() => {
        return calculateDynamicSchedule(loan, simulatedPayments);
    }, [loan, simulatedPayments]);

    const totalInstallments = loan.numberOfInstallments || 0;

    // Use simulated values for display if expanded, otherwise actual
    const displayBalance = isExpanded ? simulatedBalance : (loan.currentBalance ?? loan.principalAmount);
    const displayTotalPaid = isExpanded ? simulatedTotalPaid : (loan.totalPaid ?? 0);

    const totalReference = loan.numberOfInstallments
        ? loan.totalAmount
        : (displayBalance + displayTotalPaid);

    let progress = 0;
    if (totalReference > 0) {
        progress = (displayTotalPaid / totalReference) * 100;
    }

    const nextInstallment = simulatedInstallments.find(i => i.status !== 'paid');

    const handleAmortizeSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(amortizeAmount);
        if (amount > 0) {
            onAmortize(loan.id, amount);
            setIsAmortizeOpen(false);
            setAmortizeAmount('');
        }
    };

    const handleInstallmentChange = (installmentNumber: number, newAmount: string, dueDate: Date) => {
        const amount = parseFloat(newAmount);
        if (isNaN(amount)) return;

        setSimulatedPayments(prev => {
            // Find if there's already a payment for this installment (approximate date match)
            // Or we can use a more robust way if we had IDs. 
            // For simulation, we assume one payment per installment date for simplicity in this edit mode.

            const existingIndex = prev.findIndex(p =>
                p.date.toISOString().split('T')[0] === dueDate.toISOString().split('T')[0]
            );

            let newPayments = [...prev];
            if (existingIndex >= 0) {
                if (amount === 0) {
                    newPayments.splice(existingIndex, 1);
                } else {
                    newPayments[existingIndex] = { ...newPayments[existingIndex], amount };
                }
            } else {
                if (amount > 0) {
                    newPayments.push({ amount, date: dueDate, note: `Parcela ${installmentNumber}` });
                }
            }
            return newPayments;
        });
        setHasChanges(true);
    };

    const handleSaveChanges = () => {
        if (onUpdatePayments) {
            onUpdatePayments(loan.id, simulatedPayments);
            setHasChanges(false);
        }
    };

    const handleResetSimulation = () => {
        setSimulatedPayments(loan.payments || []);
        setHasChanges(false);
    };

    // Calculate Totals for Footer
    const totalInterest = simulatedInstallments.reduce((sum, i) => sum + i.interestAmount, 0);
    const totalPrincipal = simulatedInstallments.reduce((sum, i) => sum + i.principalAmount, 0);
    const totalScheduled = simulatedInstallments.reduce((sum, i) => sum + i.amount, 0);

    return (
        <Card
            className={`transition-all duration-300 ${isExpanded ? 'col-span-full shadow-lg border-primary/20' : 'hover:shadow-md'}`}
        >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-medium">
                        {loan.name}
                    </CardTitle>
                    {isExpanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                </div>
                <div className="flex items-center gap-2">
                    {loan.type === 'borrowed' ? (
                        <TrendingDown className="h-4 w-4 text-destructive" />
                    ) : (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                    )}
                    {onDelete && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('Tem certeza que deseja excluir este empréstimo?')) {
                                    onDelete(loan.id);
                                }
                            }}
                        >
                            <Trash2 size={14} />
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-1 mb-4 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                    <p className="text-xs text-muted-foreground">Saldo Atual {hasChanges && '(Simulado)'}</p>
                    <div className={`text-2xl font-bold ${hasChanges ? 'text-blue-600' : ''}`}>
                        {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                        }).format(displayBalance)}
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
                        <span>Pago: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(displayTotalPaid)}</span>
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

                    {!isExpanded && (
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
                    )}
                </div>

                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-6 pt-6 border-t overflow-hidden"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="font-semibold">Simulação e Pagamentos</h4>
                                {hasChanges && (
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="outline" onClick={handleResetSimulation} className="h-8">
                                            <RefreshCw size={14} className="mr-2" />
                                            Resetar
                                        </Button>
                                        <Button size="sm" onClick={handleSaveChanges} className="h-8 bg-blue-600 hover:bg-blue-700">
                                            <Save size={14} className="mr-2" />
                                            Salvar Alterações
                                        </Button>
                                    </div>
                                )}
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                                        <tr>
                                            <th className="px-3 py-2">#</th>
                                            <th className="px-3 py-2">Vencimento</th>
                                            <th className="px-3 py-2 text-right">Parcela (Editável)</th>
                                            <th className="px-3 py-2 text-right text-red-500">Juros</th>
                                            <th className="px-3 py-2 text-right text-green-600">Amortização</th>
                                            <th className="px-3 py-2 text-right">Saldo</th>
                                            <th className="px-3 py-2 text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {simulatedInstallments.map((inst) => {
                                            // Find payment amount for this installment date to show in input
                                            // Logic: If there is a payment on this date, show it. If not, show the scheduled amount?
                                            // Actually, the user wants to edit the PAYMENT amount.
                                            // If status is paid, the payment amount matches the installment amount (usually).

                                            // We need to show the value that was PAID or is SCHEDULED to be paid.
                                            // If it's pending, we show the scheduled amount as placeholder or value?
                                            // User said: "clicar no valor de cada parcela e alterar ele mesmo antes de clicar em pagar"

                                            // Let's show the scheduled amount in the input. If user changes, it becomes a payment.

                                            const isPaid = inst.status === 'paid';
                                            const payment = simulatedPayments.find(p => p.date.toISOString().split('T')[0] === inst.dueDate.toISOString().split('T')[0]);
                                            const inputValue = payment ? payment.amount : inst.amount;

                                            return (
                                                <tr key={inst.number} className="hover:bg-muted/20 group">
                                                    <td className="px-3 py-2 font-medium">{inst.number}</td>
                                                    <td className="px-3 py-2">{format(inst.dueDate, 'dd/MM/yy')}</td>
                                                    <td className="px-3 py-2 text-right">
                                                        <div className="flex justify-end items-center gap-2">
                                                            <span className="text-muted-foreground text-[10px]">R$</span>
                                                            <input
                                                                type="number"
                                                                className={`w-24 text-right bg-transparent border-b border-transparent hover:border-muted-foreground focus:border-primary focus:outline-none transition-colors font-medium ${isPaid ? 'text-green-600' : ''}`}
                                                                value={inputValue.toFixed(2)}
                                                                onChange={(e) => handleInstallmentChange(inst.number, e.target.value, inst.dueDate)}
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2 text-right text-red-500">
                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(inst.interestAmount)}
                                                    </td>
                                                    <td className="px-3 py-2 text-right text-green-600">
                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(inst.principalAmount)}
                                                    </td>
                                                    <td className="px-3 py-2 text-right text-muted-foreground">
                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(inst.balance)}
                                                    </td>
                                                    <td className="px-3 py-2 text-right">
                                                        {isPaid ? (
                                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                                Pago
                                                            </span>
                                                        ) : (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-7 text-xs"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    // Update simulation to pay this installment fully
                                                                    handleInstallmentChange(inst.number, inst.amount.toString(), inst.dueDate);
                                                                }}
                                                            >
                                                                Pagar
                                                            </Button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>

                                    <tfoot className="bg-muted/50 font-semibold text-xs">
                                        <tr>
                                            <td colSpan={3} className="px-3 py-3 text-right">TOTAIS</td>
                                            <td className="px-3 py-3 text-right text-red-600">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalInterest)}
                                            </td>
                                            <td className="px-3 py-3 text-right">
                                                {/* Amortização empty */}
                                            </td>
                                            <td className="px-3 py-3 text-right">
                                                {/* Saldo empty */}
                                            </td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </CardContent>
        </Card>
    );
}
