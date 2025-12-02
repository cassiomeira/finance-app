import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Target, Trash2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useSpendingGoals } from '@/hooks/useSpendingGoals';
import { useCategories } from '@/hooks/useCategories';
import { useTransactions } from '@/hooks/useTransactions';
import { CategoryIcon } from '@/components/ui/CategoryIcon';

export default function Goals() {
    const [showForm, setShowForm] = useState(false);
    const [amount, setAmount] = useState('');
    const [categoryId, setCategoryId] = useState('');

    const { goals, createGoal, deleteGoal } = useSpendingGoals();
    const { expenseCategories } = useCategories();
    const { transactions } = useTransactions();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await createGoal.mutateAsync({
            amount: parseFloat(amount),
            category_id: categoryId,
            // month e year são tratados no hook ou backend
        });
        setShowForm(false);
        setAmount(''); setCategoryId('');
    };

    const calculateSpent = (goal: typeof goals[0]) => {
        return transactions
            .filter(t =>
                t.type === 'expense' &&
                (goal.category_id ? t.category_id === goal.category_id : true)
            )
            .reduce((sum, t) => sum + Number(t.amount), 0);
    };

    const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    return (
        <AppLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl lg:text-3xl font-display font-bold">Metas de Gastos</h1>
                        <p className="text-muted-foreground">Controle seus limites mensais por categoria</p>
                    </div>
                    <button onClick={() => setShowForm(true)} className="btn-finance-primary">
                        <Plus size={20} />
                        Nova Meta
                    </button>
                </div>

                {showForm && (
                    <motion.form
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onSubmit={handleSubmit}
                        className="card-finance space-y-4"
                    >
                        <h3 className="font-semibold">Nova Meta</h3>

                        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="input-finance">
                            <option value="">Meta Geral (Todas as categorias)</option>
                            {expenseCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                        </select>

                        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Valor limite (R$)" className="input-finance" required />
                        <div className="flex gap-2">
                            <button type="submit" className="btn-finance-primary flex-1">Salvar</button>
                            <button type="button" onClick={() => setShowForm(false)} className="btn-finance-ghost">Cancelar</button>
                        </div>
                    </motion.form>
                )}

                <div className="grid gap-4">
                    {goals.map((goal, index) => {
                        const spent = calculateSpent(goal);
                        const percentage = Math.min((spent / Number(goal.amount)) * 100, 100);
                        const isOver = spent > Number(goal.amount);

                        return (
                            <motion.div
                                key={goal.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="card-finance"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        {goal.category ? (
                                            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${goal.category.color}20` }}>
                                                <CategoryIcon name={goal.category.icon} color={goal.category.color} />
                                            </div>
                                        ) : (
                                            <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
                                                <Target size={20} className="text-primary-foreground" />
                                            </div>
                                        )}
                                        <div>
                                            <p className="font-semibold">{goal.category?.name || 'Meta Geral'}</p>
                                            <p className="text-sm text-muted-foreground">{formatCurrency(spent)} / {formatCurrency(Number(goal.amount))}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => deleteGoal.mutate(goal.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-destructive">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${percentage}%` }}
                                        className={`h-full rounded-full ${isOver ? 'bg-destructive' : percentage >= 80 ? 'bg-warning' : 'gradient-primary'}`}
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">{percentage.toFixed(0)}% utilizado</p>
                            </motion.div>
                        );
                    })}
                </div>

                {goals.length === 0 && !showForm && (
                    <div className="text-center py-12 text-muted-foreground">
                        <Target size={48} className="mx-auto mb-4 opacity-50" />
                        <p>Nenhuma meta cadastrada</p>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
