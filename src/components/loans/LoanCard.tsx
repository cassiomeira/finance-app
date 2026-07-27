import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';
import { Loan } from '@/types/loan';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    TrendingDown,
    TrendingUp,
    Trash2,
    ChevronDown,
    ChevronUp,
    Plus,
    Calculator,
    CalendarIcon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { calculateLedger, projectPayoff } from '@/utils/loanCalculations';

const brl = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

interface LoanCardProps {
    loan: Loan;
    onRegisterPayment: (loanId: string, data: { amount: number; date: Date; note?: string | null }) => void;
    onDeletePayment: (loanId: string, paymentId: string) => void;
    onDelete?: (loanId: string) => void;
    onToggleIntegration?: (loanId: string, checked: boolean) => void;
}

export function LoanCard({ loan, onRegisterPayment, onDeletePayment, onDelete, onToggleIntegration }: LoanCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isPayOpen, setIsPayOpen] = useState(false);
    const [payAmount, setPayAmount] = useState('');
    const [payDate, setPayDate] = useState<Date>(new Date());
    const [planMonthly, setPlanMonthly] = useState('');

    const ledger = useMemo(() => calculateLedger(loan), [loan]);

    const isBorrowed = loan.type === 'borrowed';
    const balance = ledger.currentBalance;
    const cleared = ledger.totalPaid;
    const progress = cleared + balance > 0 ? Math.min(100, (cleared / (cleared + balance)) * 100) : 0;
    const isSettled = balance <= 0.5;

    const projection = useMemo(() => {
        const m = parseFloat(planMonthly.replace(',', '.'));
        if (!m || m <= 0) return null;
        return projectPayoff(balance, loan.interestRate, loan.interestPeriod, m);
    }, [planMonthly, balance, loan.interestRate, loan.interestPeriod]);

    const handleSubmitPayment = (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(payAmount.replace(',', '.'));
        if (amount > 0 && !isNaN(payDate.getTime())) {
            onRegisterPayment(loan.id, { amount, date: payDate, note: null });
            setPayAmount('');
            setPayDate(new Date());
            setIsPayOpen(false);
        }
    };

    return (
        <Card className={isExpanded ? 'col-span-full border-primary/20 shadow-lg' : 'hover:shadow-md transition-shadow'}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="flex items-center gap-2 min-w-0">
                    <CardTitle className="text-base font-medium truncate">{loan.name}</CardTitle>
                    <span
                        className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            isBorrowed
                                ? 'bg-destructive/10 text-destructive'
                                : 'bg-green-500/10 text-green-600'
                        }`}
                    >
                        {isBorrowed ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                        {isBorrowed ? 'Peguei' : 'Emprestei'}
                    </span>
                </div>
                {onDelete && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => {
                            if (confirm('Excluir este empréstimo e todos os seus pagamentos?')) onDelete(loan.id);
                        }}
                    >
                        <Trash2 size={14} />
                    </Button>
                )}
            </CardHeader>

            <CardContent>
                <p className="text-xs text-muted-foreground">
                    {isSettled ? 'Quitado' : isBorrowed ? 'Ainda devo' : 'Falta receber'}
                </p>
                <div className="text-2xl font-bold">{brl(balance)}</div>

                <div className="mt-4 space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Já {isBorrowed ? 'paguei' : 'recebi'} {brl(cleared)}</span>
                        <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-muted/50 p-2">
                        <p className="text-muted-foreground">Valor original</p>
                        <p className="font-medium">{brl(ledger.principal)}</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-2">
                        <p className="text-muted-foreground">Juros acumulados</p>
                        <p className="font-medium text-destructive">{brl(ledger.totalInterest)}</p>
                    </div>
                </div>

                <div className="mt-4 flex gap-2">
                    <Dialog open={isPayOpen} onOpenChange={setIsPayOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm" className="flex-1 gap-1" disabled={isSettled}>
                                <Plus className="h-4 w-4" />
                                Registrar pagamento
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Registrar pagamento — {loan.name}</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubmitPayment} className="space-y-4 pt-2">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Valor pago</label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        inputMode="decimal"
                                        placeholder="0,00"
                                        value={payAmount}
                                        onChange={(e) => setPayAmount(e.target.value)}
                                        autoFocus
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Data do pagamento</label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className="w-full justify-start font-normal">
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {format(payDate, 'PPP', { locale: ptBR })}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={payDate}
                                                onSelect={(d) => d && setPayDate(d)}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Pode registrar quantos pagamentos quiser no mês. O saldo e os juros são
                                    recalculados automaticamente pela data de cada um.
                                </p>
                                <Button type="submit" className="w-full">
                                    Salvar pagamento
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>

                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => setIsExpanded((v) => !v)}
                    >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        Detalhes
                    </Button>
                </div>

                <AnimatePresence initial={false}>
                    {isExpanded && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-6 space-y-6 overflow-hidden border-t pt-6"
                        >
                            {/* ── Integração com o dashboard ───────────────────────── */}
                            {onToggleIntegration && (
                                <div className="flex items-center justify-between rounded-lg border p-3">
                                    <div className="pr-3">
                                        <p className="text-sm font-medium">Lançar no dashboard</p>
                                        <p className="text-xs text-muted-foreground">
                                            Cria transações do empréstimo e dos pagamentos nos seus lançamentos.
                                        </p>
                                    </div>
                                    <Switch
                                        checked={!!loan.integrate_in_dashboard}
                                        onCheckedChange={(c) => onToggleIntegration(loan.id, c)}
                                    />
                                </div>
                            )}

                            {/* ── Previsão ─────────────────────────────────────────── */}
                            <div>
                                <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                                    <Calculator className="h-4 w-4" />
                                    Previsão de quitação
                                </h4>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground">Pretendo pagar</span>
                                    <div className="relative">
                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                            R$
                                        </span>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            inputMode="decimal"
                                            placeholder="0,00"
                                            className="h-9 w-32 pl-7"
                                            value={planMonthly}
                                            onChange={(e) => setPlanMonthly(e.target.value)}
                                        />
                                    </div>
                                    <span className="text-sm text-muted-foreground">por mês</span>
                                </div>

                                {projection && (
                                    <div className="mt-3 rounded-lg bg-muted/50 p-3 text-sm">
                                        {!projection.feasible ? (
                                            <p className="text-destructive">
                                                Esse valor não cobre nem os juros do mês (~
                                                {brl(projection.monthlyInterestNow)}). O saldo nunca zera — aumente o
                                                valor mensal.
                                            </p>
                                        ) : (
                                            <div className="space-y-1">
                                                <p>
                                                    Quita em{' '}
                                                    <strong>
                                                        {projection.months}{' '}
                                                        {projection.months === 1 ? 'mês' : 'meses'}
                                                    </strong>
                                                    {projection.payoffDate && (
                                                        <>
                                                            {' '}(até{' '}
                                                            {format(projection.payoffDate, 'MMM/yyyy', { locale: ptBR })})
                                                        </>
                                                    )}
                                                    .
                                                </p>
                                                <p className="text-muted-foreground">
                                                    Juros restantes ~{brl(projection.totalInterest)} · total a pagar ~
                                                    {brl(projection.totalToPay)}.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* ── Extrato ──────────────────────────────────────────── */}
                            <div>
                                <h4 className="mb-2 text-sm font-semibold">Extrato de pagamentos</h4>
                                {ledger.rows.length === 0 ? (
                                    <p className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                                        Nenhum pagamento ainda. Use “Registrar pagamento” para abater o saldo — pode
                                        lançar vários no mês.
                                    </p>
                                ) : (
                                    <div className="overflow-x-auto rounded-lg border">
                                        <table className="w-full min-w-[440px] text-sm">
                                            <thead className="bg-muted/50 text-xs text-muted-foreground">
                                                <tr>
                                                    <th className="px-3 py-2 text-left font-medium">Data</th>
                                                    <th className="px-3 py-2 text-right font-medium">Pago</th>
                                                    <th className="px-3 py-2 text-right font-medium">Juros</th>
                                                    <th className="px-3 py-2 text-right font-medium">Abateu</th>
                                                    <th className="px-3 py-2 text-right font-medium">Saldo</th>
                                                    <th className="px-2 py-2" />
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                <tr className="text-muted-foreground">
                                                    <td className="px-3 py-2">
                                                        {format(ledger.startDate, 'dd/MM/yy', { locale: ptBR })}
                                                    </td>
                                                    <td className="px-3 py-2 text-right">—</td>
                                                    <td className="px-3 py-2 text-right">—</td>
                                                    <td className="px-3 py-2 text-right">—</td>
                                                    <td className="px-3 py-2 text-right font-medium">
                                                        {brl(ledger.principal)}
                                                    </td>
                                                    <td className="px-2 py-2" />
                                                </tr>
                                                {ledger.rows.map((row, i) => (
                                                    <tr key={row.paymentId || i} className="hover:bg-muted/20">
                                                        <td className="px-3 py-2">
                                                            {format(row.date, 'dd/MM/yy', { locale: ptBR })}
                                                        </td>
                                                        <td className="px-3 py-2 text-right font-medium text-green-600">
                                                            {brl(row.amount)}
                                                        </td>
                                                        <td className="px-3 py-2 text-right text-destructive">
                                                            {brl(row.interest)}
                                                        </td>
                                                        <td className="px-3 py-2 text-right">{brl(row.principal)}</td>
                                                        <td className="px-3 py-2 text-right font-medium">
                                                            {brl(row.balanceAfter)}
                                                        </td>
                                                        <td className="px-2 py-2 text-right">
                                                            {row.paymentId && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                                    title="Excluir pagamento"
                                                                    onClick={() => {
                                                                        if (confirm('Excluir este pagamento?'))
                                                                            onDeletePayment(loan.id, row.paymentId!);
                                                                    }}
                                                                >
                                                                    <Trash2 size={13} />
                                                                </Button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot className="border-t bg-muted/50 text-xs font-semibold">
                                                <tr>
                                                    <td className="px-3 py-2">Totais</td>
                                                    <td className="px-3 py-2 text-right text-green-600">
                                                        {brl(ledger.totalPaid)}
                                                    </td>
                                                    <td className="px-3 py-2 text-right text-destructive">
                                                        {brl(ledger.totalInterest)}
                                                    </td>
                                                    <td className="px-3 py-2 text-right">—</td>
                                                    <td className="px-3 py-2 text-right">{brl(balance)}</td>
                                                    <td className="px-2 py-2" />
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                )}
                                <p className="mt-2 text-xs text-muted-foreground">
                                    Os juros de cada linha são calculados pelos dias desde o pagamento anterior, sobre o
                                    saldo devedor.
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </CardContent>
        </Card>
    );
}
