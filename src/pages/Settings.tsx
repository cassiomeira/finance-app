import { AppLayout } from '@/components/layout/AppLayout';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { Crown, User, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Settings() {
  const { profile, isPremium } = useProfile();
  const { user } = useAuth();

  return (
    <AppLayout>
      <div className="space-y-6 max-w-2xl">
        <h1 className="text-2xl lg:text-3xl font-display font-bold">Configurações</h1>

        <div className="card-finance">
          <h3 className="font-semibold mb-4">Perfil</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <User size={20} className="text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Nome</p>
                <p className="font-medium">{profile?.name || 'Não informado'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Mail size={20} className="text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{user?.email}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card-finance">
          <h3 className="font-semibold mb-4">Plano</h3>
          <div className={`p-4 rounded-xl ${isPremium ? 'gradient-hero text-primary-foreground' : 'bg-muted'}`}>
            <div className="flex items-center gap-2 mb-2">
              <Crown size={20} />
              <span className="font-bold">{isPremium ? 'Premium' : 'Plano Gratuito'}</span>
            </div>
            <p className="text-sm opacity-90">
              {isPremium 
                ? 'Acesso ilimitado a todos os recursos'
                : 'Limite de 50 transações/mês e 1 cartão'}
            </p>
            {!isPremium && (
              <Link to="/subscription" className="mt-4 block text-center py-2 bg-primary text-primary-foreground rounded-lg font-medium">
                Fazer Upgrade
              </Link>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
