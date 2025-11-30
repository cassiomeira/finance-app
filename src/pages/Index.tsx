import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Wallet, TrendingUp, CreditCard, Target, ArrowRight, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const features = [
  { icon: TrendingUp, title: 'Dashboard Completo', desc: 'Visualize receitas, despesas e tendências' },
  { icon: CreditCard, title: 'Controle de Cartões', desc: 'Gerencie faturas e limites' },
  { icon: Target, title: 'Metas de Gastos', desc: 'Defina e acompanhe seus objetivos' },
];

export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate('/dashboard');
  }, [user, loading, navigate]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-pulse-soft">Carregando...</div></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero opacity-10" />
        <nav className="relative z-10 flex items-center justify-between p-6 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Wallet size={22} className="text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl">FinanceApp</span>
          </div>
          <Link to="/auth" className="btn-finance-primary">Entrar</Link>
        </nav>

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 lg:py-32">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl"
          >
            <h1 className="text-4xl lg:text-6xl font-display font-bold mb-6">
              Controle total das suas <span className="gradient-text">finanças pessoais</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Gerencie receitas, despesas, cartões de crédito e metas em um só lugar. 
              Dashboard intuitivo com gráficos e relatórios completos.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/auth" className="btn-finance-primary py-4 px-8 text-lg">
                Começar Grátis <ArrowRight size={20} />
              </Link>
            </div>
          </motion.div>
        </div>
      </header>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-display font-bold text-center mb-12">Recursos Principais</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="card-finance text-center"
              >
                <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4">
                  <f.icon size={28} className="text-primary-foreground" />
                </div>
                <h3 className="font-display font-bold text-lg mb-2">{f.title}</h3>
                <p className="text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="card-finance gradient-hero text-primary-foreground p-12">
            <h2 className="text-3xl font-display font-bold mb-4">Pronto para começar?</h2>
            <p className="text-lg opacity-90 mb-8">Crie sua conta gratuitamente e comece a organizar suas finanças hoje!</p>
            <Link to="/auth" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-primary-foreground text-primary font-semibold hover:opacity-90 transition-opacity">
              Criar Conta Grátis <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      </section>

      <footer className="py-8 px-6 border-t border-border text-center text-muted-foreground">
        <p>© 2024 FinanceApp. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
