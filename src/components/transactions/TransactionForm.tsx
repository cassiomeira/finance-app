import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, TrendingUp, TrendingDown } from 'lucide-react';
import { useCategories } from '@/hooks/useCategories';
import { useTransactions } from '@/hooks/useTransactions';
import { useCreditCards } from '@/hooks/useCreditCards';
import { useProfile } from '@/hooks/useProfile';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { TransactionType, PaymentMethod } from '@/types/finance';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TransactionFormProps {
  onClose: () => void;
  defaultType?: TransactionType;
}

const paymentMethods: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Dinheiro' },
  { value: 'debit', label: 'Débito' },
  { value: 'credit', label: 'Crédito' },
  { value: 'pix', label: 'PIX' },
  { value: 'transfer', label: 'Transferência' },
];

export function TransactionForm({ onClose, defaultType = 'expense' }: TransactionFormProps) {
  const [type, setType] = useState<TransactionType>(defaultType);
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cardId, setCardId] = useState('');

  const { incomeCategories, expenseCategories } = useCategories();
  const { createTransaction } = useTransactions();
  const { cards } = useCreditCards();
  const { canAddTransaction, isPremium, transactionLimit, profile } = useProfile();

  const categories = type === 'income' ? incomeCategories : expenseCategories;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canAddTransaction) {
      toast.error(`Limite de ${transactionLimit} transações mensais atingido. Faça upgrade para Premium!`);
      return;
    }

    if (!categoryId || !amount || !date) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    await createTransaction.mutateAsync({
      type,
      category_id: categoryId,
      amount: parseFloat(amount),
      description: description || undefined,
      date,
      payment_method: paymentMethod,
      card_id: paymentMethod === 'credit' && cardId ? cardId : undefined,
    });

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
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="w-full max-w-lg bg-card rounded-t-3xl lg:rounded-3xl p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-display font-bold">Novo Lançamento</h2>
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

          {/* Submit */}
          <button
            type="submit"
            disabled={createTransaction.isPending}
            className="w-full btn-finance-primary py-4 text-lg"
          >
            {createTransaction.isPending ? 'Salvando...' : 'Salvar Lançamento'}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}
