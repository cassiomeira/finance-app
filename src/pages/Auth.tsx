import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Wallet, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { z } from 'zod';

const authSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').optional(),
});

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validation = authSchema.safeParse({
        email,
        password,
        name: isLogin ? undefined : name,
      });

      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        setLoading(false);
        return;
      }

      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast.error('Email ou senha incorretos');
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success('Login realizado com sucesso!');
          navigate('/dashboard');
        }
      } else {
        const { error } = await signUp(email, password, name);
        if (error) {
          if (error.message.includes('already registered')) {
            toast.error('Este email já está cadastrado');
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success('Conta criada com sucesso!');
          navigate('/dashboard');
        }
      }
    } catch (error) {
      toast.error('Ocorreu um erro inesperado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
              <Wallet size={26} className="text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display font-bold text-2xl">FinanceApp</h1>
              <p className="text-sm text-muted-foreground">Controle financeiro inteligente</p>
            </div>
          </div>

          <h2 className="text-3xl font-display font-bold mb-2">
            {isLogin ? 'Bem-vindo de volta!' : 'Crie sua conta'}
          </h2>
          <p className="text-muted-foreground mb-8">
            {isLogin
              ? 'Entre para acessar seu painel financeiro'
              : 'Comece a controlar suas finanças hoje'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium mb-2">Nome</label>
                <div className="relative">
                  <User size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                    className="input-finance pl-12"
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <div className="relative">
                <Mail size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="input-finance pl-12"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Senha</label>
              <div className="relative">
                <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-finance pl-12 pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-finance-primary py-4 text-lg group"
            >
              {loading ? (
                <span className="animate-pulse">Carregando...</span>
              ) : (
                <>
                  {isLogin ? 'Entrar' : 'Criar conta'}
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <p className="text-center mt-6 text-muted-foreground">
            {isLogin ? 'Não tem uma conta?' : 'Já tem uma conta?'}{' '}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary font-medium hover:underline"
            >
              {isLogin ? 'Criar conta' : 'Fazer login'}
            </button>
          </p>
        </motion.div>
      </div>

      {/* Right Panel - Hero */}
      <div className="hidden lg:flex flex-1 gradient-hero items-center justify-center p-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center text-primary-foreground max-w-lg"
        >
          <div className="w-24 h-24 rounded-3xl bg-primary-foreground/20 flex items-center justify-center mx-auto mb-8">
            <Wallet size={48} />
          </div>
          <h2 className="text-4xl font-display font-bold mb-4">
            Controle total das suas finanças
          </h2>
          <p className="text-lg opacity-90 mb-8">
            Gerencie receitas, despesas, cartões de crédito e metas em um só lugar.
            Visualize sua evolução financeira com gráficos intuitivos.
          </p>
          <div className="flex justify-center gap-4">
            <div className="bg-primary-foreground/20 rounded-xl p-4">
              <p className="text-3xl font-bold">100%</p>
              <p className="text-sm opacity-80">Grátis para começar</p>
            </div>
            <div className="bg-primary-foreground/20 rounded-xl p-4">
              <p className="text-3xl font-bold">∞</p>
              <p className="text-sm opacity-80">Recursos Premium</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
