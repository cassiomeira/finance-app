import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Loan } from '@/types/loan';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingDown, TrendingUp, Calendar as CalendarIcon, DollarSign, Trash2, ChevronDown, ChevronUp, Save, RefreshCw, Wand2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { calculateDynamicSchedule } from '@/utils/loanCalculations';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface LoanCardProps {
    loan: Loan;
    onAmortize: (loanId: string, amount: number) => void;
    onDelete?: (loanId: string) => void;
    onUpdatePayments?: (loanId: string, payments: { amount: number; date: Date; note?: string }[]) => void;
    onRefresh?: () => void;
    onToggleIntegration?: (loanId: string, checked: boolean) => void;
}

export function LoanCard({ loan, onAmortize, onDelete, onUpdatePayments, onToggleIntegration }: LoanCardProps) {
    const [isAmortizeOpen, setIsAmortizeOpen] = useState(false);
    const [amortizeAmount, setAmortizeAmount] = useState('');
    const [isExpanded, setIsExpanded] = useState(false);

    // State for simulation
    const [simulatedPayments, setSimulatedPayments] = useState<{ amount: number; date: Date; note?: string; _simId?: string; installmentNumber?: number }[]>([]);
    const [hasChanges, setHasChanges] = useState(false);

    // Initialize simulation with actual payments when loan changes
    useEffect(() => {
        const paymentsWithIds = (loan.payments || []).map(p => ({
            ...p,
            _simId: p.id || crypto.randomUUID(),
            installmentNumber: p.installmentNumber // Persist if exists from DB
        }));
        setSimulatedPayments(paymentsWithIds);
        setHasChanges(false);
    }, [loan.payments]);

    // Calculate dynamic schedule based on simulated payments
    const { installments: simulatedInstallments, currentBalance: simulatedBalance, totalPaid: simulatedTotalPaid } = useMemo(() => {
        return calculateDynamicSchedule(loan, simulatedPayments);
    }, [loan, simulatedPayments]);

    const totalInstallments = loan.numberOfInstallments || 0;

    // Use simulated values for display if has changes, otherwise actual current balance (Today)
    const displayBalance = hasChanges ? simulatedBalance : (loan.currentBalance ?? loan.principalAmount);
    const displayTotalPaid = hasChanges ? simulatedTotalPaid : (loan.totalPaid ?? 0);

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

    const handleInstallmentChange = (paymentIndex: number, newAmount: string, newDate: Date, installmentNumber: number, markAsPaid: boolean) => {
        const amount = parseFloat(newAmount);
        if (isNaN(amount)) return;

        setSimulatedPayments(prev => {
            const newPayments = [...prev];
            const currentNote = paymentIndex >= 0 ? newPayments[paymentIndex].note : undefined;

            // Logic: If paying, clear note (undefined). If pending, ensure OVERRIDE tag.
            let finalNote: string | undefined = undefined;

            if (!markAsPaid) {
                const base = currentNote || `Parcela ${installmentNumber}`;
                finalNote = base.includes('OVERRIDE') ? base : `${base} OVERRIDE`;
            }
            // If markAsPaid is true, finalNote remains undefined

            if (paymentIndex >= 0 && paymentIndex < newPayments.length) {
                if (amount === 0) {
                    newPayments.splice(paymentIndex, 1);
                } else {
                    newPayments[paymentIndex] = {
                        ...newPayments[paymentIndex],
                        amount,
                        date: newDate, // Date update
                        note: finalNote,
                        installmentNumber // LOCK IT
                    };
                }
            } else {
                if (amount > 0) {
                    newPayments.push({
                        amount,
                        date: newDate,
                        note: finalNote,
                        _simId: crypto.randomUUID(),
                        installmentNumber // LOCK IT
                    });
                }
            }
            return newPayments;
        });
        setHasChanges(true);
    };

    const handleSaveChanges = () => {
        // Auto-correct: Grab only the payments actually used by the schedule (removes duplicates)
        const validPayments = simulatedInstallments
            .map(i => {
                if (!i.sourcePayment) return null;
                return {
                    ...i.sourcePayment,
                    installmentNumber: i.number // Enforce strict ID
                };
            })
            .filter((p): p is NonNullable<typeof p> => !!p);

        console.log('Saving cleaned payments:', validPayments);

        if (onUpdatePayments) {
            // Remove internal props
            const cleanPayments = validPayments.map(({ _simId, ...rest }) => rest);
            onUpdatePayments(loan.id, cleanPayments);

            // Sync local state to cleaned version
            setSimulatedPayments(validPayments);
            setHasChanges(false);
        }
    };

    const isIntegrated = (loan as any).integrate_in_dashboard || false;

    const handleToggleIntegration = (checked: boolean) => {
        if (onToggleIntegration) {
            onToggleIntegration(loan.id, checked);
        }
    };

    const handleResetSimulation = () => {
        const paymentsWithIds = (loan.payments || []).map(p => ({
            ...p,
            _simId: p.id || crypto.randomUUID()
        }));
        setSimulatedPayments(paymentsWithIds);
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
                            <CalendarIcon className="h-3 w-3" />
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
                                <div className="flex items-center gap-4">
                                    <h4 className="font-semibold">Simulação e Pagamentos</h4>
                                    <div className="flex items-center gap-2">
                                        <Switch
                                            checked={isIntegrated}
                                            onCheckedChange={handleToggleIntegration}
                                            id={`integrate-${loan.id}`}
                                        />
                                        <label htmlFor={`integrate-${loan.id}`} className="text-xs text-muted-foreground cursor-pointer">
                                            Integrar Dashboard
                                        </label>
                                    </div>
                                </div>
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
                                            <th className="px-3 py-2 text-center" title="Dias decorridos">Dias</th>
                                            <th className="px-3 py-2 text-right">Saldo Devedor</th>
                                            <th className="px-3 py-2 text-right">Pagamento</th>
                                            <th className="px-3 py-2 text-right text-red-500">Juros</th>
                                            <th className="px-3 py-2 text-right text-green-600">Amortização</th>
                                            <th className="px-3 py-2 text-right">Saldo Final</th>
                                            <th className="px-3 py-2 text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {simulatedInstallments.map((inst) => {
                                            const currentPaymentDate = inst.paidAt || inst.dueDate;

                                            // Robust finding by ID (Safe against reference changes)
                                            let paymentIndex = -1;
                                            if (inst.sourcePayment) {
                                                // Check ID
                                                if (inst.sourcePayment._simId) {
                                                    paymentIndex = simulatedPayments.findIndex(p => p._simId === inst.sourcePayment._simId);
                                                }
                                                // Fallback to Reference (Old way)
                                                if (paymentIndex === -1) {
                                                    paymentIndex = simulatedPayments.indexOf(inst.sourcePayment);
                                                }
                                            }

                                            const payment = paymentIndex >= 0 ? simulatedPayments[paymentIndex] : undefined;

                                            // Validate dates before formatting to prevent crash
                                            const isValidPaymentDate = payment?.date && !isNaN(payment.date.getTime());
                                            const isValidDueDate = inst.dueDate && !isNaN(inst.dueDate.getTime());
                                            const validDisplayDate = isValidPaymentDate ? payment!.date : (isValidDueDate ? inst.dueDate : new Date());

                                            const isPaid = inst.status === 'paid';

                                            const inputValue = payment ? payment.amount : inst.amount;

                                            return (
                                                <tr key={inst.number} className="hover:bg-muted/20 group">
                                                    <td className="px-3 py-2 font-medium">{inst.number}</td>
                                                    <td className="px-3 py-2">
                                                        <Popover>
                                                            <PopoverTrigger asChild>
                                                                <Button
                                                                    variant={"ghost"}
                                                                    className={cn(
                                                                        "w-full justify-start text-left font-normal h-8 px-1 text-xs",
                                                                        !inputValue && "text-muted-foreground"
                                                                    )}
                                                                >
                                                                    {format(validDisplayDate, "dd/MM/yy", { locale: ptBR })}
                                                                </Button>
                                                            </PopoverTrigger>
                                                            <PopoverContent className="w-auto p-0" align="start">
                                                                <Calendar
                                                                    mode="single"
                                                                    selected={payment?.date || inst.dueDate}
                                                                    onSelect={(date) => date && handleInstallmentChange(paymentIndex, inputValue.toString(), date, inst.number, isPaid)}
                                                                    initialFocus
                                                                />
                                                            </PopoverContent>
                                                        </Popover>
                                                        {payment?.note && (
                                                            <div className="text-[9px] text-blue-500 px-1 truncate max-w-[100px]" title={payment.note}>
                                                                {payment.note}
                                                            </div>
                                                        )}
                                                        {payment && (
                                                            <div className="text-[9px] text-red-500 px-1 font-bold">
                                                                #{payment.installmentNumber ?? '?'}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2 text-center text-muted-foreground text-xs">{inst.daysElapsed}d</td>
                                                    <td className="px-3 py-2 text-right text-xs">
                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(inst.balanceBeforePayment || 0)}
                                                    </td>
                                                    <td className="px-3 py-2 text-right">
                                                        <div className="flex justify-end items-center gap-2">
                                                            <span className="text-muted-foreground text-[10px]">R$</span>
                                                            <input
                                                                type="number"
                                                                className={`w-24 text-right bg-transparent border-b border-transparent hover:border-muted-foreground focus:border-primary focus:outline-none transition-colors font-medium ${isPaid ? 'text-green-600' : ''}`}
                                                                value={inputValue.toFixed(2)}
                                                                onChange={(e) => handleInstallmentChange(paymentIndex, e.target.value, validDisplayDate, inst.number, isPaid)}
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
                                                    <td className="px-3 py-2 text-right flex items-center justify-end gap-1">
                                                        {/* Show Trash if it's an override (exists but not paid) to allow reverting to default */}
                                                        {payment && !isPaid && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                                title="Reverter para o original"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleInstallmentChange(paymentIndex, "0", validDisplayDate, inst.number, false);
                                                                }}
                                                            >
                                                                <Trash2 size={12} />
                                                            </Button>
                                                        )}

                                                        {isPaid ? (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-7 px-2 hover:bg-red-100 hover:text-red-700 transition-colors"
                                                                title="Marcar como pendente (manter dados)"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    // Unmark Paid -> Mark as OVERRIDE (Pending)
                                                                    // Pass current amount to keep it
                                                                    handleInstallmentChange(paymentIndex, inputValue.toString(), validDisplayDate, inst.number, false);
                                                                }}
                                                            >
                                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 group-hover:bg-red-200 group-hover:text-red-800">
                                                                    Pago
                                                                </span>
                                                            </Button>
                                                        ) : (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-7 text-xs"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    // Pay with current value (preserve user's custom amount)
                                                                    handleInstallmentChange(paymentIndex, inputValue.toString(), validDisplayDate, inst.number, true);
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
                                            <td colSpan={5} className="px-3 py-3 text-right">TOTAIS</td>
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
