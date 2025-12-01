import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useTransactions } from '@/hooks/useTransactions';
import { ExpenseChart } from '@/components/dashboard/ExpenseChart';
import { TrendChart } from '@/components/dashboard/TrendChart';
import { format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Download, Printer, FileText } from 'lucide-react';
import { exportToCSV } from '@/utils/export';
import { toast } from 'sonner';

export default function Reports() {
    const [selectedMonth, setSelectedMonth] = useState(new Date());
    const month = selectedMonth.getMonth() + 1;
    const year = selectedMonth.getFullYear();

    const { transactions, totalIncome, totalExpense, balance } = useTransactions(month, year);

    // Dados para gráficos
    const expensesByCategory = useMemo(() => {
        const categoryMap = new Map<string, { amount: number; color: string; icon: string }>();

        transactions
            .filter(t => t.type === 'expense')
            .forEach(t => {
                const catName = t.category?.name || 'Outros';
                const current = categoryMap.get(catName) || { amount: 0, color: t.category?.color || '#64748b', icon: t.category?.icon || 'Circle' };
                categoryMap.set(catName, {
                    ...current,
                    amount: current.amount + Number(t.amount),
                });
            });

        return Array.from(categoryMap.entries())
            .map(([category, data]) => ({ category, ...data }))
            .sort((a, b) => b.amount - a.amount);
    }, [transactions]);

    const monthlyTrend = useMemo(() => {
        const months: { month: string; income: number; expense: number }[] = [];
        for (let i = 5; i >= 0; i--) {
            const date = subMonths(selectedMonth, i);
            const monthName = format(date, 'MMM', { locale: ptBR });
            months.push({ month: monthName, income: 0, expense: 0 });
        }
        months[5] = { month: months[5].month, income: totalIncome, expense: totalExpense };
        return months;
    }, [selectedMonth, totalIncome, totalExpense]);

    const handleExport = () => {
        if (transactions.length === 0) {
            toast.error('Não há dados para exportar neste mês.');
            return;
        }

        const dataToExport = transactions.map(t => ({
            Data: format(new Date(t.date), 'dd/MM/yyyy'),
            Descrição: t.description,
            Categoria: t.category?.name || 'Sem categoria',
            Tipo: t.type === 'income' ? 'Receita' : 'Despesa',
            Valor: t.amount,
            'Método de Pagamento': t.payment_method
        }));

        exportToCSV(dataToExport, `relatorio_financeiro_${month}_${year} `);
        toast.success('Relatório exportado com sucesso!');
    };

    const handlePrint = () => {
        window.print();
    };

    const navigateMonth = (direction: 'prev' | 'next') => {
        setSelectedMonth(prev => {
            const newDate = new Date(prev);
            if (direction === 'prev') {
                newDate.setMonth(newDate.getMonth() - 1);
            } else {
                newDate.setMonth(newDate.getMonth() + 1);
            }
            return newDate;
        });
    };

    return (
        <AppLayout>
            <div className="space-y-6 print:space-y-4">
                {/* Header - Hidden on print, shown custom header instead */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print">
                    <div>
                        <h1 className="text-2xl lg:text-3xl font-display font-bold">Relatórios</h1>
                        <p className="text-muted-foreground">Análise detalhada das suas finanças</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-card rounded-xl p-2 border border-border">
                            <button onClick={() => navigateMonth('prev')} className="p-2 rounded-lg hover:bg-muted transition-colors">
                                <ChevronLeft size={18} />
                            </button>
                            <span className="font-medium min-w-[120px] text-center">
                                {format(selectedMonth, "MMMM 'de' yyyy", { locale: ptBR })}
                            </span>
                            <button onClick={() => navigateMonth('next')} className="p-2 rounded-lg hover:bg-muted transition-colors">
                                <ChevronRight size={18} />
                            </button>
                        </div>

                        <button onClick={handlePrint} className="btn-finance-secondary">
                            <Printer size={20} />
                            <span className="hidden sm:inline">Imprimir / PDF</span>
                        </button>

                        <button onClick={handleExport} className="btn-finance-primary">
                            <Download size={20} />
                            <span className="hidden sm:inline">Exportar CSV</span>
                        </button>
                    </div>
                </div>

                {/* Print Header */}
                <div className="print-header hidden">
                    <h1 className="text-2xl font-bold">Relatório Financeiro</h1>
                    <p className="text-gray-500">{format(selectedMonth, "MMMM 'de' yyyy", { locale: ptBR })}</p>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="card-finance p-6 flex flex-col items-center justify-center text-center border-l-4 border-l-emerald-500">
                        <span className="text-sm text-muted-foreground mb-1">Receita Total</span>
                        <span className="text-2xl font-bold text-emerald-600">
                            {totalIncome.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                    </div>
                    <div className="card-finance p-6 flex flex-col items-center justify-center text-center border-l-4 border-l-red-500">
                        <span className="text-sm text-muted-foreground mb-1">Despesa Total</span>
                        <span className="text-2xl font-bold text-red-600">
                            {totalExpense.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                    </div>
                    <div className="card-finance p-6 flex flex-col items-center justify-center text-center border-l-4 border-l-blue-500">
                        <span className="text-sm text-muted-foreground mb-1">Saldo Líquido</span>
                        <span className={`text - 2xl font - bold ${balance >= 0 ? 'text-blue-600' : 'text-red-600'} `}>
                            {balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                    </div>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 break-inside-avoid">
                    <div className="card-finance">
                        <h3 className="font-display font-semibold text-lg mb-4">Distribuição de Despesas</h3>
                        {expensesByCategory.length > 0 ? (
                            <div className="h-[300px]">
                                <ExpenseChart data={expensesByCategory} />
                            </div>
                        ) : (
                            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                                Sem dados de despesas para este mês.
                            </div>
                        )}
                    </div>

                    <div className="card-finance">
                        <h3 className="font-display font-semibold text-lg mb-4">Tendência Financeira</h3>
                        <div className="h-[300px]">
                            <TrendChart data={monthlyTrend} />
                        </div>
                    </div>
                </div>

                {/* Detailed Transactions Table */}
                <div className="card-finance">
                    <h3 className="font-display font-semibold text-lg mb-4">Detalhamento de Lançamentos</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-3 rounded-tl-lg">Data</th>
                                    <th className="px-4 py-3">Descrição</th>
                                    <th className="px-4 py-3">Categoria</th>
                                    <th className="px-4 py-3 text-right rounded-tr-lg">Valor</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {transactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                                            Nenhum lançamento neste mês.
                                        </td>
                                    </tr>
                                ) : (
                                    transactions.map((t) => (
                                        <tr key={t.id} className="hover:bg-muted/20">
                                            <td className="px-4 py-3">{format(new Date(t.date), 'dd/MM/yyyy')}</td>
                                            <td className="px-4 py-3 font-medium">{t.description || 'Sem descrição'}</td>
                                            <td className="px-4 py-3">
                                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs bg-muted">
                                                    {t.category?.name || 'Outros'}
                                                </span>
                                            </td>
                                            <td className={`px - 4 py - 3 text - right font - medium ${t.type === 'income' ? 'text-emerald-600' : 'text-red-600'} `}>
                                                {t.type === 'income' ? '+' : '-'} {Number(t.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
