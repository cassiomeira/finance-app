import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Receipt,
  CreditCard,
  Settings,
  LogOut,
  Menu,
  X,
  Banknote,
  Target,
  Crown,
  Wallet,
  BarChart3,
  Tag,
  Calendar
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/transactions', icon: Receipt, label: 'Lançamentos' },
  { path: '/cards', icon: CreditCard, label: 'Cartões' },
  { path: '/goals', icon: Target, label: 'Metas' },
  { path: '/agenda', icon: Calendar, label: 'Agenda' },
  { path: '/reports', icon: BarChart3, label: 'Relatórios' },
  { path: '/loans', icon: Banknote, label: 'Empréstimos' },
  { path: '/categories', icon: Tag, label: 'Categorias' },
  { path: '/settings', icon: Settings, label: 'Configurações' },
];

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { profile, isPremium } = useProfile();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-card border-b border-border z-50 flex items-center justify-between px-4">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <Menu size={24} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
            <Wallet size={18} className="text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-lg">FinanceApp</span>
        </div>
        <div className="w-10" />
      </header>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-72 bg-card border-r border-border z-50 transition-transform duration-300 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
                <Wallet size={22} className="text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-display font-bold text-xl">FinanceApp</h1>
                <p className="text-xs text-muted-foreground">Controle financeiro</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* User Info */}
          <div className="px-4 mb-6">
            <div className="p-4 rounded-xl bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-medium">
                    {profile?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{profile?.name || 'Usuário'}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
              </div>
              {isPremium && (
                <div className="mt-3 flex items-center gap-2 text-xs text-warning">
                  <Crown size={14} />
                  <span className="font-medium">Premium</span>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3">
            <ul className="space-y-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                        isActive
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <item.icon size={20} />
                      <span>{item.label}</span>
                      {isActive && (
                        <motion.div
                          layoutId="activeNav"
                          className="ml-auto w-1.5 h-1.5 rounded-full bg-primary"
                        />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Premium CTA / Subscription Management */}
          <div className="px-4 mb-4">
            <Link
              to="/subscription"
              className={cn(
                "block p-4 rounded-xl",
                isPremium
                  ? "bg-warning/10 border border-warning/20"
                  : "gradient-hero text-primary-foreground"
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <Crown size={18} className={isPremium ? "text-warning" : ""} />
                <span className={cn("font-semibold", isPremium ? "text-warning" : "")}>
                  {isPremium ? "Premium Ativo" : "Seja Premium"}
                </span>
              </div>
              <p className={cn("text-sm", isPremium ? "text-muted-foreground" : "opacity-90")}>
                {isPremium ? "Gerenciar assinatura" : "Desbloqueie recursos ilimitados"}
              </p>
            </Link>
          </div>

          {/* Sign Out */}
          <div className="p-4 border-t border-border">
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
            >
              <LogOut size={20} />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-72 pt-16 lg:pt-0 min-h-screen">
        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
