import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, CreditCard, Trash2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useCreditCards } from '@/hooks/useCreditCards';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';

export default function Cards() {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [limit, setLimit] = useState('');
  const [closingDay, setClosingDay] = useState('');
  const [dueDay, setDueDay] = useState('');

  const { cards, createCard, deleteCard } = useCreditCards();
  const { isPremium, creditCardLimit } = useProfile();

  const canAddCard = isPremium || cards.length < creditCardLimit;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAddCard) {
      toast.error('Limite de cartões atingido. Faça upgrade para Premium!');
      return;
    }
    await createCard.mutateAsync({
      name,
      card_limit: parseFloat(limit),
      closing_day: parseInt(closingDay),
      due_day: parseInt(dueDay),
    });
    setShowForm(false);
    setName(''); setLimit(''); setClosingDay(''); setDueDay('');
  };

  const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-display font-bold">Cartões de Crédito</h1>
            <p className="text-muted-foreground">Gerencie seus cartões</p>
          </div>
          <button onClick={() => setShowForm(true)} className="btn-finance-primary" disabled={!canAddCard}>
            <Plus size={20} />
            Novo Cartão
          </button>
        </div>

        {!isPremium && (
          <div className="p-3 rounded-lg bg-warning/10 text-warning text-sm">
            {cards.length} de {creditCardLimit} cartão usado. Seja Premium para ilimitado!
          </div>
        )}

        {showForm && (
          <motion.form
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleSubmit}
            className="card-finance space-y-4"
          >
            <h3 className="font-semibold">Adicionar Cartão</h3>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do cartão" className="input-finance" required />
            <input type="number" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="Limite (R$)" className="input-finance" required />
            <div className="grid grid-cols-2 gap-4">
              <input type="number" value={closingDay} onChange={(e) => setClosingDay(e.target.value)} placeholder="Dia fechamento" min="1" max="31" className="input-finance" required />
              <input type="number" value={dueDay} onChange={(e) => setDueDay(e.target.value)} placeholder="Dia vencimento" min="1" max="31" className="input-finance" required />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-finance-primary flex-1">Salvar</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-finance-ghost">Cancelar</button>
            </div>
          </motion.form>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {cards.map((card, index) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-6 rounded-2xl gradient-hero text-primary-foreground relative overflow-hidden"
            >
              <div className="absolute top-4 right-4">
                <button onClick={() => deleteCard.mutate(card.id)} className="p-2 rounded-lg bg-primary-foreground/20 hover:bg-primary-foreground/30">
                  <Trash2 size={16} />
                </button>
              </div>
              <CreditCard size={32} className="mb-4 opacity-80" />
              <p className="text-xl font-bold">{card.name}</p>
              <p className="text-sm opacity-80 mt-1">Limite: {formatCurrency(Number(card.card_limit))}</p>
              <div className="flex gap-4 mt-4 text-sm opacity-80">
                <span>Fecha: dia {card.closing_day}</span>
                <span>Vence: dia {card.due_day}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {cards.length === 0 && !showForm && (
          <div className="text-center py-12 text-muted-foreground">
            <CreditCard size={48} className="mx-auto mb-4 opacity-50" />
            <p>Nenhum cartão cadastrado</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
