import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Crown, ArrowLeft, Loader2, Shield } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const features = {
  free: ['50 lançamentos/mês', '1 cartão de crédito', 'Dashboard básico', 'Categorias padrão'],
  premium: ['Lançamentos ilimitados', 'Cartões ilimitados', 'Dashboard avançado', 'Exportação PDF/CSV', 'Metas ilimitadas', 'Suporte prioritário'],
};

export default function Subscription() {
  const { isPremium, isAdmin } = useProfile();
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();

  // Show message based on URL params
  if (searchParams.get('canceled') === 'true') {
    toast.info('Assinatura cancelada. Você pode tentar novamente quando quiser.');
  }

  const handleSubscribe = async () => {
    if (isAdmin) {
      toast.info('Você já tem acesso total como administrador!');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { origin: window.location.origin },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error('Erro ao iniciar checkout. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft size={20} />
          Voltar ao Dashboard
        </Link>

        <div className="text-center mb-12">
          <h1 className="text-3xl lg:text-4xl font-display font-bold mb-4">Escolha seu plano</h1>
          <p className="text-muted-foreground">Desbloqueie todo o potencial do seu controle financeiro</p>
        </div>

        {isAdmin && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-4 rounded-lg bg-primary/10 border border-primary/20 flex items-center gap-3"
          >
            <Shield className="text-primary" size={24} />
            <div>
              <p className="font-semibold text-primary">Acesso Administrativo</p>
              <p className="text-sm text-muted-foreground">Você tem acesso total a todos os recursos como administrador.</p>
            </div>
          </motion.div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Free Plan */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-finance"
          >
            <h3 className="text-xl font-bold mb-2">Gratuito</h3>
            <p className="text-3xl font-display font-bold mb-6">R$ 0<span className="text-base font-normal text-muted-foreground">/mês</span></p>
            <ul className="space-y-3 mb-6">
              {features.free.map((f, i) => (
                <li key={i} className="flex items-center gap-2">
                  <Check size={18} className="text-primary" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <button disabled className="w-full py-3 rounded-lg bg-muted text-muted-foreground">
              {isPremium ? 'Plano Básico' : 'Plano Atual'}
            </button>
          </motion.div>

          {/* Premium Plan */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card-finance ring-2 ring-primary relative"
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full gradient-primary text-primary-foreground text-sm font-medium">
              Recomendado
            </div>
            <div className="flex items-center gap-2 mb-2">
              <Crown size={24} className="text-warning" />
              <h3 className="text-xl font-bold">Premium</h3>
            </div>
            <p className="text-3xl font-display font-bold mb-6">R$ 19,90<span className="text-base font-normal text-muted-foreground">/mês</span></p>
            <ul className="space-y-3 mb-6">
              {features.premium.map((f, i) => (
                <li key={i} className="flex items-center gap-2">
                  <Check size={18} className="text-primary" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <button 
              className="w-full btn-finance-primary py-3 flex items-center justify-center gap-2 disabled:opacity-50"
              onClick={handleSubscribe}
              disabled={loading || isPremium}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Processando...
                </>
              ) : isPremium ? (
                isAdmin ? 'Acesso Admin Ativo' : 'Assinatura Ativa'
              ) : (
                'Assinar Premium'
              )}
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
