import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, TrendingUp, TrendingDown, Plus } from 'lucide-react';
import { useCategories } from '@/hooks/useCategories';
import { useTransactions } from '@/hooks/useTransactions';
import { useCreditCards } from '@/hooks/useCreditCards';
import { useProfile } from '@/hooks/useProfile';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { TransactionType, PaymentMethod, Frequency } from '@/types/finance';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface TransactionFormProps {
  onClose: () => void;
  defaultType?: TransactionType;
  initialData?: {
    amount?: number;
    description?: string;
    date?: string;
    category_id?: string;
    type?: TransactionType;
    id?: string;
    payment_method?: PaymentMethod;
    card_id?: string;
    status?: 'paid' | 'pending';
  };
}

const paymentMethods: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Dinheiro' },
  { value: 'debit', label: 'Débito' },
  { value: 'credit', label: 'Crédito' },
  { value: 'pix', label: 'PIX' },
  { value: 'transfer', label: 'Transferência' },
];

export function TransactionForm({ onClose, defaultType = 'expense', initialData }: TransactionFormProps) {
  const [type, setType] = useState<TransactionType>(initialData?.type || defaultType);
  const [categoryId, setCategoryId] = useState(initialData?.category_id || '');
  const [amount, setAmount] = useState(initialData?.amount?.toString() || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(initialData?.payment_method || 'cash');
  const [cardId, setCardId] = useState(initialData?.card_id || '');
  const [status, setStatus] = useState<'paid' | 'pending'>(initialData?.status || 'paid');

  // Update form when initialData changes
  useEffect(() => {
    if (initialData) {
      setType(initialData.type || defaultType);
      setCategoryId(initialData.category_id || '');
      setAmount(initialData.amount?.toString() || '');
      setDescription(initialData.description || '');
      setDate(initialData.date || new Date().toISOString().split('T')[0]);
      setPaymentMethod(initialData.payment_method || 'cash');
      setCardId(initialData.card_id || '');
      setStatus(initialData.status || 'paid');
    }
  }, [initialData, defaultType]);

  // Create Category State
  const [isCreateCategoryOpen, setIsCreateCategoryOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('Circle');
  const [newCatColor, setNewCatColor] = useState('#64748B');

  const { incomeCategories, expenseCategories, createCategory } = useCategories();
  const { createTransaction, updateTransaction } = useTransactions();
  const { cards } = useCreditCards();
  const { canAddTransaction, isPremium, transactionLimit, profile } = useProfile();

  const categories = type === 'income' ? incomeCategories : expenseCategories;

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newCat = await createCategory.mutateAsync({
        name: newCatName,
        icon: newCatIcon,
        color: newCatColor,
        type: type
      });
      setCategoryId(newCat.id);
      setIsCreateCategoryOpen(false);
      // Reset form
      setNewCatName('');
      setNewCatIcon('Circle');
      setNewCatColor(type === 'income' ? '#22C55E' : '#EF4444');
    } catch (error) {
      console.error(error);
    }
  };

  const AVAILABLE_ICONS = [
    'Briefcase', 'Laptop', 'TrendingUp', 'PiggyBank', 'Plus',
    'UtensilsCrossed', 'Car', 'Gamepad2', 'Heart', 'FileText',
    'GraduationCap', 'Home', 'ShoppingBag', 'CreditCard', 'MoreHorizontal',
    'Circle', 'Wallet', 'Target', 'Settings', 'ArrowUpDown'
  ];

  const AVAILABLE_COLORS = [
    '#EF4444', '#22C55E', '#3B82F6', '#EAB308', '#A855F7',
    '#EC4899', '#F97316', '#14B8A6', '#6366F1', '#64748B'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // ... existing logic ...
    if (!canAddTransaction) {
      toast.error(`Limite de ${transactionLimit} transações mensais atingido. Faça upgrade para Premium!`);
      return;
    }

    if (!categoryId || !amount || !date) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const transactionData = {
      type,
      category_id: categoryId,
      amount: parseFloat(amount),
      description: description || undefined,
      date,
      payment_method: paymentMethod,
      card_id: paymentMethod === 'credit' && cardId ? cardId : undefined,
      is_recurring: isRecurring,
      recurring_frequency: isRecurring ? frequency : undefined,
      recurring_end_date: isRecurring && endDate ? endDate : undefined,
      status,
    };

    if (initialData?.id) {
      await updateTransaction.mutateAsync({
        id: initialData.id,
        ...transactionData
      });
    } else {
      await createTransaction.mutateAsync(transactionData);
    }

    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-end lg:items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Create Category Modal Overlay */}
      {isCreateCategoryOpen && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-4"
          >
            <h3 className="font-bold text-lg">Nova Categoria</h3>
            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground">Nome</label>
                <input
                  className="input-finance w-full mt-1"
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  placeholder="Ex: Assinaturas"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground">Ícone</label>
                <div className="grid grid-cols-5 gap-2 mt-1 h-32 overflow-y-auto p-2 border rounded-lg">
                  {AVAILABLE_ICONS.map(icon => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setNewCatIcon(icon)}
                      className={cn("p-2 rounded hover:bg-muted flex items-center justify-center", newCatIcon === icon ? "bg-primary/20 ring-1 ring-primary" : "")}
                    >
                      <CategoryIcon name={icon} size={20} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground">Cor</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {AVAILABLE_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewCatColor(c)}
                      className={cn("w-6 h-6 rounded-full border-2", newCatColor === c ? "border-black scale-110" : "border-transparent")}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsCreateCategoryOpen(false)} className="flex-1 btn-finance-ghost">Cancelar</button>
                <button type="submit" className="flex-1 btn-finance-primary">Criar</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="w-full max-w-lg bg-card rounded-t-3xl lg:rounded-3xl p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-display font-bold">{initialData?.id ? 'Editar Lançamento' : 'Novo Lançamento'}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {!isPremium && (
          <div className="mb-4 p-3 rounded-lg bg-warning/10 text-warning text-sm">
            {profile?.monthly_transaction_count ?? 0} de {transactionLimit} lançamentos usados este mês
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Type Toggle */}
          <div className="flex gap-2 p-1 bg-muted rounded-xl">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all",
                type === 'expense'
                  ? 'bg-destructive text-destructive-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <TrendingDown size={18} />
              Despesa
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all",
                type === 'income'
                  ? 'bg-success text-success-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <TrendingUp size={18} />
              Receita
            </button>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium mb-2">Valor *</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                R$
              </span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
                step="0.01"
                min="0"
                className="input-finance pl-12 text-2xl font-bold"
                required
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium mb-2">Categoria *</label>
            <div className="grid grid-cols-4 gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryId(cat.id)}
                  className={cn(
                    "p-3 rounded-xl flex flex-col items-center gap-1 transition-all",
                    categoryId === cat.id
                      ? 'ring-2 ring-primary bg-primary/5'
                      : 'bg-muted hover:bg-muted/80'
                  )}
                >
                  <CategoryIcon name={cat.icon} color={cat.color} size={24} />
                  <span className="text-xs truncate w-full text-center">{cat.name}</span>
                </button>
              ))}
              {/* Add New Category Button */}
              <button
                type="button"
                onClick={() => setIsCreateCategoryOpen(true)}
                className="p-3 rounded-xl flex flex-col items-center gap-1 transition-all bg-muted hover:bg-muted/80 border-2 border-dashed border-muted-foreground/20"
              >
                <div className="w-6 h-6 rounded-full bg-muted-foreground/20 flex items-center justify-center">
                  <Plus size={16} className="text-muted-foreground" />
                </div>
                <span className="text-xs truncate w-full text-center text-muted-foreground font-medium">Nova</span>
              </button>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">Descrição</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Almoço no restaurante"
              className="input-finance"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium mb-2">Data *</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input-finance"
              required
            />
          </div>

          {/* Recurring Option */}
          <div className="p-4 bg-muted/50 rounded-xl space-y-4 border border-border/50">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="recurring" className="text-base">Repetir lançamento</Label>
                <p className="text-xs text-muted-foreground">
                  Criar automaticamente nos próximos períodos
                </p>
              </div>
              <Switch
                id="recurring"
                checked={isRecurring}
                onCheckedChange={setIsRecurring}
              />
            </div>

            {isRecurring && (
              <div className="grid grid-cols-2 gap-4 pt-2 animate-in fade-in slide-in-from-top-2">
                <div>
                  <Label className="text-xs mb-1.5 block">Frequência</Label>
                  <select
                    className="input-finance w-full text-sm py-2"
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as Frequency)}
                  >
                    <option value="weekly">Semanal</option>
                    <option value="monthly">Mensal</option>
                    <option value="yearly">Anual</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">Data Final (Opcional)</Label>
                  <input
                    type="date"
                    className="input-finance w-full text-sm py-2"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={date}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium mb-2">Forma de Pagamento</label>
            <div className="flex flex-wrap gap-2">
              {paymentMethods.map((method) => (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => setPaymentMethod(method.value)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    paymentMethod === method.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  {method.label}
                </button>
              ))}
            </div>
          </div>

          {/* Credit Card Selection */}
          {paymentMethod === 'credit' && cards.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2">Cartão de Crédito</label>
              <select
                value={cardId}
                onChange={(e) => setCardId(e.target.value)}
                className="input-finance"
              >
                <option value="">Selecione um cartão</option>
                {cards.map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Status Selection */}
          <div className="p-4 bg-muted/30 rounded-xl border border-border/50">
            <label className="block text-sm font-medium mb-2">Status do Pagamento</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStatus('paid')}
                className={cn(
                  "flex-1 py-2 rounded-lg text-sm font-medium transition-all border",
                  status === 'paid'
                    ? 'bg-green-100 text-green-700 border-green-200'
                    : 'bg-background border-border text-muted-foreground hover:bg-muted'
                )}
              >
                Pago
              </button>
              <button
                type="button"
                onClick={() => setStatus('pending')}
                className={cn(
                  "flex-1 py-2 rounded-lg text-sm font-medium transition-all border",
                  status === 'pending'
                    ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
                    : 'bg-background border-border text-muted-foreground hover:bg-muted'
                )}
              >
                A Pagar
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={createTransaction.isPending}
            className="w-full btn-finance-primary py-4 text-lg"
          >
            {createTransaction.isPending || updateTransaction.isPending ? 'Salvando...' : (initialData?.id ? 'Atualizar Lançamento' : 'Salvar Lançamento')}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}
