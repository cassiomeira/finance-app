
import { useState } from 'react';
import { useCategories } from '@/hooks/useCategories';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { Category, TransactionType } from '@/types/finance';
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const AVAILABLE_ICONS = [
    'Briefcase', 'Laptop', 'TrendingUp', 'PiggyBank',
    'UtensilsCrossed', 'Car', 'Gamepad2', 'Heart', 'FileText',
    'GraduationCap', 'Home', 'ShoppingBag', 'CreditCard', 'MoreHorizontal',
    'Circle', 'Wallet', 'Target', 'Settings', 'ArrowUpDown', 'Plane',
    'Baby', 'Shirt', 'Coffee', 'Music', 'Video', 'Wifi', 'Zap',
    'Droplet', 'Hammer', 'Gift', 'Dog', 'Cat', 'Dumbbell'
];

const AVAILABLE_COLORS = [
    '#EF4444', '#F97316', '#F59E0B', '#EAB308',
    '#84CC16', '#22C55E', '#10B981', '#14B8A6',
    '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1',
    '#8B5CF6', '#A855F7', '#D946EF', '#EC4899',
    '#F43F5E', '#64748B'
];

export default function Categories() {
    const {
        incomeCategories,
        expenseCategories,
        createCategory,
        updateCategory,
        deleteCategory,
        isLoading
    } = useCategories();
    const { user } = useAuth();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [activeTab, setActiveTab] = useState<TransactionType>('expense');

    // Form State
    const [name, setName] = useState('');
    const [icon, setIcon] = useState('Circle');
    const [color, setColor] = useState('#64748B');

    const handleOpenCreate = () => {
        setEditingCategory(null);
        setName('');
        setIcon('Circle');
        setColor(activeTab === 'income' ? '#22C55E' : '#EF4444');
        setIsModalOpen(true);
    };

    const handleOpenEdit = (category: Category) => {
        setEditingCategory(category);
        setName(category.name);
        setIcon(category.icon);
        setColor(category.color);
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingCategory) {
                await updateCategory.mutateAsync({
                    id: editingCategory.id,
                    name,
                    icon,
                    color,
                    type: editingCategory.type // Keep original type
                });
            } else {
                await createCategory.mutateAsync({
                    name,
                    icon,
                    color,
                    type: activeTab
                });
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error(error);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Tem certeza que deseja excluir esta categoria?')) {
            await deleteCategory.mutateAsync(id);
        }
    };

    // Only show edit/delete for user's own categories
    const canModify = (cat: Category) => cat.user_id === user?.id;

    const CategoryList = ({ list }: { list: Category[] }) => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {list.map((cat) => (
                <motion.div
                    key={cat.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-card p-4 rounded-xl border border-border flex items-center justify-between group hover:shadow-md transition-all"
                >
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-sm"
                            style={{ backgroundColor: cat.color }}
                        >
                            <CategoryIcon name={cat.icon} size={20} className="text-white" />
                        </div>
                        <div>
                            <h3 className="font-medium">{cat.name}</h3>
                            {cat.is_default && <span className="text-[10px] uppercase bg-muted px-1.5 py-0.5 rounded text-muted-foreground">Padrão</span>}
                        </div>
                    </div>

                    {canModify(cat) ? (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleOpenEdit(cat)}>
                                <Pencil size={16} />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(cat.id)}>
                                <Trash2 size={16} />
                            </Button>
                        </div>
                    ) : (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-xs text-muted-foreground">Sistema</span>
                        </div>
                    )}
                </motion.div>
            ))}
            <button
                onClick={handleOpenCreate}
                className="border-2 border-dashed border-muted-foreground/20 rounded-xl p-4 flex items-center justify-center gap-2 text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all h-[88px]"
            >
                <Plus size={20} />
                <span>Nova Categoria</span>
            </button>
        </div>
    );

    return (
        <AppLayout>
            <div className="space-y-6 pb-20 lg:pb-0">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-display font-bold">Categorias</h1>
                        <p className="text-muted-foreground">Gerencie suas categorias de receitas e despesas</p>
                    </div>
                </div>

                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TransactionType)} className="w-full">
                    <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
                        <TabsTrigger value="expense">Despesas</TabsTrigger>
                        <TabsTrigger value="income">Receitas</TabsTrigger>
                    </TabsList>

                    <TabsContent value="expense" className="animate-in fade-in-50">
                        {isLoading ? <p>Carregando...</p> : <CategoryList list={expenseCategories} />}
                    </TabsContent>
                    <TabsContent value="income" className="animate-in fade-in-50">
                        {isLoading ? <p>Carregando...</p> : <CategoryList list={incomeCategories} />}
                    </TabsContent>
                </Tabs>

                {/* Create/Edit Modal */}
                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>{editingCategory ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSave} className="space-y-4 py-4">
                            <div>
                                <label className="text-sm font-medium mb-1.5 block">Nome</label>
                                <Input
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="Ex: Alimentação"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-1.5 block">Ícone</label>
                                <div className="grid grid-cols-6 gap-2 max-h-40 overflow-y-auto p-2 border rounded-lg">
                                    {AVAILABLE_ICONS.map((ic) => (
                                        <button
                                            key={ic}
                                            type="button"
                                            onClick={() => setIcon(ic)}
                                            className={cn(
                                                "p-2 rounded-lg hover:bg-muted flex items-center justify-center transition-colors",
                                                icon === ic ? "bg-primary/10 text-primary ring-2 ring-primary ring-offset-1" : "text-muted-foreground"
                                            )}
                                        >
                                            <CategoryIcon name={ic} size={20} />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-1.5 block">Cor</label>
                                <div className="flex flex-wrap gap-2">
                                    {AVAILABLE_COLORS.map((c) => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => setColor(c)}
                                            className={cn(
                                                "w-6 h-6 rounded-full border border-black/10 transition-transform",
                                                color === c ? "scale-125 ring-2 ring-offset-2 ring-black/50" : "hover:scale-110"
                                            )}
                                            style={{ backgroundColor: c }}
                                        />
                                    ))}
                                </div>
                            </div>

                            <DialogFooter className="pt-4">
                                <DialogClose asChild>
                                    <Button type="button" variant="ghost">Cancelar</Button>
                                </DialogClose>
                                <Button type="submit">{editingCategory ? 'Salvar Alterações' : 'Criar Categoria'}</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
