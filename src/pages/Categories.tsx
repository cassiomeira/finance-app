import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useCategories } from '@/hooks/useCategories';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Category } from '@/types/finance';
import { cn } from '@/lib/utils';

const AVAILABLE_ICONS = [
    'Briefcase', 'Laptop', 'TrendingUp', 'PiggyBank', 'Plus',
    'UtensilsCrossed', 'Car', 'Gamepad2', 'Heart', 'FileText',
    'GraduationCap', 'Home', 'ShoppingBag', 'CreditCard', 'MoreHorizontal',
    'Circle', 'Wallet', 'Target', 'Settings', 'ArrowUpDown'
];

const AVAILABLE_COLORS = [
    '#EF4444', // Red (Despesa default)
    '#22C55E', // Green (Receita default)
    '#3B82F6', // Blue
    '#EAB308', // Yellow
    '#A855F7', // Purple
    '#EC4899', // Pink
    '#F97316', // Orange
    '#14B8A6', // Teal
    '#6366F1', // Indigo
    '#64748B', // Slate
];

export default function Categories() {
    const { categories, incomeCategories, expenseCategories, createCategory, updateCategory, deleteCategory } = useCategories();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);

    // Form State
    const [name, setName] = useState('');
    const [icon, setIcon] = useState('Circle');
    const [color, setColor] = useState('#64748B');
    const [type, setType] = useState<'income' | 'expense'>('expense');

    const handleOpenCreate = () => {
        setEditingCategory(null);
        setName('');
        setIcon('Circle');
        setColor(type === 'income' ? '#22C55E' : '#EF4444');
        // Maintain current type tab
        setIsModalOpen(true);
    };

    const handleOpenEdit = (category: Category) => {
        setEditingCategory(category);
        setName(category.name);
        setIcon(category.icon);
        setColor(category.color);
        setType(category.type);
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const categoryData = {
            name,
            icon,
            color,
            type
        };

        if (editingCategory) {
            await updateCategory.mutateAsync({
                id: editingCategory.id,
                ...categoryData
            });
        } else {
            await createCategory.mutateAsync(categoryData);
        }

        setIsModalOpen(false);
    };

    const handleDelete = async (id: string, name: string) => {
        if (confirm(`Tem certeza que deseja excluir a categoria "${name}"?`)) {
            await deleteCategory.mutateAsync(id);
        }
    };

    return (
        <AppLayout>
            <div className="space-y-6 max-w-4xl mx-auto">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Link to="/settings" className="p-2 hover:bg-muted rounded-full">
                            <ArrowLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-2xl lg:text-3xl font-display font-bold">Categorias</h1>
                            <p className="text-muted-foreground">Gerencie suas categorias de receitas e despesas</p>
                        </div>
                    </div>
                    <Button onClick={handleOpenCreate} className="btn-finance-primary">
                        <Plus size={20} className="mr-2" />
                        Nova Categoria
                    </Button>
                </div>

                <Tabs defaultValue="expense" value={type} onValueChange={(v) => setType(v as 'income' | 'expense')} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-6">
                        <TabsTrigger value="expense">Despesas</TabsTrigger>
                        <TabsTrigger value="income">Receitas</TabsTrigger>
                    </TabsList>

                    <TabsContent value="expense" className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {expenseCategories.map((cat) => (
                                <CategoryCard
                                    key={cat.id}
                                    category={cat}
                                    onEdit={() => handleOpenEdit(cat)}
                                    onDelete={() => handleDelete(cat.id, cat.name)}
                                />
                            ))}
                        </div>
                    </TabsContent>

                    <TabsContent value="income" className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {incomeCategories.map((cat) => (
                                <CategoryCard
                                    key={cat.id}
                                    category={cat}
                                    onEdit={() => handleOpenEdit(cat)}
                                    onDelete={() => handleDelete(cat.id, cat.name)}
                                />
                            ))}
                        </div>
                    </TabsContent>
                </Tabs>

                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                    <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{editingCategory ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-6 py-4">

                            <div className="space-y-2">
                                <Label>Nome</Label>
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Ex: Alimentação"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Ícone</Label>
                                <div className="grid grid-cols-5 gap-2 p-2 border rounded-lg max-h-[150px] overflow-y-auto">
                                    {AVAILABLE_ICONS.map((iconName) => (
                                        <button
                                            key={iconName}
                                            type="button"
                                            onClick={() => setIcon(iconName)}
                                            className={cn(
                                                "p-2 rounded-lg flex items-center justify-center transition-all hover:bg-muted",
                                                icon === iconName ? "bg-primary/20 ring-2 ring-primary" : ""
                                            )}
                                        >
                                            <CategoryIcon name={iconName} color={icon === iconName ? color : undefined} size={24} />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Cor</Label>
                                <div className="flex flex-wrap gap-3">
                                    {AVAILABLE_COLORS.map((c) => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => setColor(c)}
                                            className={cn(
                                                "w-8 h-8 rounded-full border-2 transition-all",
                                                color === c ? "border-black scale-110" : "border-transparent"
                                            )}
                                            style={{ backgroundColor: c }}
                                        />
                                    ))}
                                    <input
                                        type="color"
                                        value={color}
                                        onChange={(e) => setColor(e.target.value)}
                                        className="w-8 h-8 rounded-full overflow-hidden cursor-pointer"
                                    />
                                </div>
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                                <Button type="submit" disabled={createCategory.isPending || updateCategory.isPending}>
                                    {createCategory.isPending || updateCategory.isPending ? 'Salvando...' : 'Salvar'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}

function CategoryCard({ category, onEdit, onDelete }: { category: Category, onEdit: () => void, onDelete: () => void }) {
    // Check if it's a default category (assuming user_id is null for defaults or is_default flag)
    // But our useCategories logic brings custom and defaults.
    // We should prefer check if we can delete. 
    // Let's assume defaults (is_default) cannot be deleted/edited, or check requirements. 
    // User asked for "create, edit, delete", implying full control over THEIR categories.
    // Default ones might be locked.

    const isDefault = category.is_default;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 rounded-xl bg-card border shadow-sm flex items-center justify-between"
        >
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted/50">
                    <CategoryIcon name={category.icon} color={category.color} size={24} />
                </div>
                <span className="font-medium">{category.name}</span>
            </div>

            {!isDefault && (
                <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={onEdit}>
                        <Edit2 size={16} className="text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={onDelete} className="hover:text-red-500 hover:bg-red-50">
                        <Trash2 size={16} />
                    </Button>
                </div>
            )}
            {isDefault && (
                <span className="text-xs text-muted-foreground italic px-2">Padrão</span>
            )}
        </motion.div>
    );
}
