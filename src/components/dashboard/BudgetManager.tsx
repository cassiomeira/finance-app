import { useState } from 'react';
import { useCategories } from '@/hooks/useCategories';
import { useBudgets } from '@/hooks/useBudgets';
import { useTransactions } from '@/hooks/useTransactions';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Edit2, Save } from 'lucide-react';
import { formatCurrency } from '@/utils/format';

export function BudgetManager() {
    const currentDate = new Date();
    const month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();

    const { expenseCategories } = useCategories();
    const { budgets, saveBudget } = useBudgets(month, year);
    const { transactions } = useTransactions(month, year);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editAmount, setEditAmount] = useState('');

    // Calcular gastos por categoria
    const expensesByCategory = transactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => {
            if (t.category_id) {
                acc[t.category_id] = (acc[t.category_id] || 0) + Number(t.amount);
            }
            return acc;
        }, {} as Record<string, number>);

    const handleSave = async (categoryId: string) => {
        await saveBudget.mutateAsync({
            category_id: categoryId,
            amount: parseFloat(editAmount)
        });
        setEditingId(null);
    };

    return (
        <div className="space-y-6">
            <div className="grid gap-4">
                {expenseCategories.map(category => {
                    const budget = budgets.find(b => b.category_id === category.id);
                    const spent = expensesByCategory[category.id] || 0;
                    const limit = budget?.amount || 0;
                    const percentage = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
                    const isEditing = editingId === category.id;

                    return (
                        <div key={category.id} className="bg-card p-4 rounded-xl border border-border/50 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-muted">
                                        <CategoryIcon name={category.icon} color={category.color} size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-medium">{category.name}</h4>
                                        <p className="text-sm text-muted-foreground">
                                            Gasto: {formatCurrency(spent)}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {isEditing ? (
                                        <div className="flex items-center gap-2">
                                            <Input
                                                type="number"
                                                value={editAmount}
                                                onChange={e => setEditAmount(e.target.value)}
                                                className="w-24 h-8"
                                                placeholder="Meta"
                                                autoFocus
                                            />
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleSave(category.id)}
                                                disabled={saveBudget.isPending}
                                            >
                                                <Save size={16} className="text-primary" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2" onClick={() => {
                                            setEditingId(category.id);
                                            setEditAmount(limit.toString());
                                        }}>
                                            <span className="text-sm font-medium">
                                                Meta: {limit > 0 ? formatCurrency(limit) : 'Definir'}
                                            </span>
                                            <Button size="icon" variant="ghost" className="h-6 w-6">
                                                <Edit2 size={12} className="text-muted-foreground" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {limit > 0 && (
                                <div className="space-y-1">
                                    <Progress value={percentage} className="h-2" indicatorClassName={
                                        percentage >= 100 ? 'bg-destructive' :
                                            percentage >= 80 ? 'bg-warning' :
                                                'bg-primary'
                                    } />
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>{percentage.toFixed(0)}% utilizado</span>
                                        <span>Restante: {formatCurrency(Math.max(limit - spent, 0))}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
