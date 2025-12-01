import { AppLayout } from '@/components/layout/AppLayout';
import { BudgetManager } from '@/components/dashboard/BudgetManager';
import { Target } from 'lucide-react';

export default function Budgets() {
    return (
        <AppLayout>
            <div className="space-y-6 animate-fade-in">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Target className="h-8 w-8 text-primary" />
                        Metas e Orçamentos
                    </h1>
                    <p className="text-muted-foreground">
                        Defina limites de gastos para cada categoria e acompanhe sua economia.
                    </p>
                </div>

                <div className="grid gap-6">
                    <BudgetManager />
                </div>
            </div>
        </AppLayout>
    );
}
