import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, CreditCard, Trash2, CheckCircle2, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useCreditCards } from '@/hooks/useCreditCards';
import { useTransactions } from '@/hooks/useTransactions';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Cards() {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [limit, setLimit] = useState('');
  const [closingDay, setClosingDay] = useState('');
  const [dueDay, setDueDay] = useState('');

  // State for expanded card view
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const { cards, createCard, deleteCard } = useCreditCards();
  const { payInvoice, transactions } = useTransactions(selectedDate.getMonth() + 1, selectedDate.getFullYear());
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
              layout
              className={`p-6 rounded-2xl relative overflow-hidden transition-all duration-300 ${expandedCardId === card.id
                  ? 'bg-card border-2 border-primary/20 shadow-xl col-span-full'
                  : 'gradient-hero text-primary-foreground group'
                }`}
              onClick={() => setExpandedCardId(expandedCardId === card.id ? null : card.id)}
            >
              <div className="absolute top-4 right-4 flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Deseja quitar todas as despesas pendentes deste cartão?')) {
                      // @ts-ignore
                      payInvoice.mutate(card.id);
                    }
                  }}
                  className={`p-2 rounded-lg transition-opacity ${expandedCardId === card.id
                      ? 'bg-primary/10 hover:bg-primary/20 text-primary'
                      : 'bg-primary-foreground/20 hover:bg-primary-foreground/30 opacity-0 group-hover:opacity-100 text-primary-foreground'
                    }`}
                  title="Pagar Fatura"
                >
                  <CheckCircle2 size={16} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Tem certeza que deseja excluir este cartão?')) {
                      deleteCard.mutate(card.id);
                    }
                  }}
                  className={`p-2 rounded-lg transition-opacity ${expandedCardId === card.id
                      ? 'bg-destructive/10 hover:bg-destructive/20 text-destructive'
                      : 'bg-primary-foreground/20 hover:bg-primary-foreground/30 opacity-0 group-hover:opacity-100 text-primary-foreground'
                    }`}
                  title="Excluir Cartão"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="flex items-center gap-4">
                <CreditCard size={32} className={`mb-4 ${expandedCardId === card.id ? 'text-primary' : 'opacity-80'}`} />
                {expandedCardId === card.id && <h3 className="text-xl font-bold mb-4">Detalhes do Cartão</h3>}
              </div>

              <p className={`text-xl font-bold ${expandedCardId === card.id ? 'text-foreground' : ''}`}>{card.name}</p>

              <div className="mt-4 space-y-2">
                <div className={`flex justify-between text-sm ${expandedCardId === card.id ? 'text-muted-foreground' : 'opacity-90'}`}>
                  <span>Utilizado: {formatCurrency((card as any).used_limit || 0)}</span>
                  <span>Limite: {formatCurrency(Number(card.card_limit))}</span>
                </div>
                <div className={`h-2 rounded-full overflow-hidden ${expandedCardId === card.id ? 'bg-muted' : 'bg-black/20'}`}>
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${expandedCardId === card.id ? 'bg-primary' : 'bg-white/90'}`}
                    style={{ width: `${Math.min((((card as any).used_limit || 0) / Number(card.card_limit)) * 100, 100)}%` }}
                  />
                </div>
              </div>

              <div className={`flex gap-4 mt-4 text-sm ${expandedCardId === card.id ? 'text-muted-foreground' : 'opacity-80'}`}>
                <span>Fecha: dia {card.closing_day}</span>
                <span>Vence: dia {card.due_day}</span>
              </div>

              <AnimatePresence>
                {expandedCardId === card.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-6 pt-6 border-t"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Calendar size={18} />
                        Fatura de {format(selectedDate, 'MMMM/yyyy', { locale: ptBR })}
                      </h4>
                      <input
                        type="month"
                        className="p-2 rounded-md border bg-background text-sm"
                        value={format(selectedDate, 'yyyy-MM')}
                        onChange={(e) => {
                          const [y, m] = e.target.value.split('-');
                          setSelectedDate(new Date(parseInt(y), parseInt(m) - 1));
                        }}
                      />
                    </div>

                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                      {transactions
                        .filter(t => t.card_id === card.id)
                        .length === 0 ? (
                        <p className="text-center text-muted-foreground py-4">Nenhuma compra neste mês.</p>
                      ) : (
                        transactions
                          .filter(t => t.card_id === card.id)
                          .map(t => (
                            <div key={t.id} className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                              <div>
                                <p className="font-medium">{t.description}</p>
                                <p className="text-xs text-muted-foreground">{format(new Date(t.date), 'dd/MM/yyyy')}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-red-500">- {formatCurrency(Number(t.amount))}</p>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${t.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                  {t.status === 'paid' ? 'Pago' : 'A Pagar'}
                                </span>
                              </div>
                            </div>
                          ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {expandedCardId !== card.id && (
                <div className="absolute bottom-4 right-4 opacity-50">
                  <ChevronDown size={20} />
                </div>
              )}
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
