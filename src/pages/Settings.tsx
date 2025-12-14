import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { useTransactions } from '@/hooks/useTransactions';
import { Crown, User, Mail, Trash2, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function Settings() {
  const { profile, isPremium } = useProfile();
  const { user } = useAuth();
  const { clearMonthTransactions, clearAllTransactions } = useTransactions();

  const [isResetMonthOpen, setIsResetMonthOpen] = useState(false);
  const [isResetAllOpen, setIsResetAllOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  const handleResetMonth = async () => {
    const today = new Date();
    await clearMonthTransactions.mutateAsync({
      month: today.getMonth() + 1,
      year: today.getFullYear()
    });
    setIsResetMonthOpen(false);
  };

  const handleResetAll = async () => {
    if (deleteConfirmation === 'DELETAR') {
      await clearAllTransactions.mutateAsync();
      setIsResetAllOpen(false);
      setDeleteConfirmation('');
    }
  };

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


        <div className="card-finance border-red-200 bg-red-50/50">
          <div className="flex items-center gap-2 mb-4 text-red-600">
            <AlertTriangle size={20} />
            <h3 className="font-semibold">Zona de Perigo</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-100">
              <div>
                <p className="font-medium text-red-900">Zerar Mês Atual</p>
                <p className="text-xs text-red-700">Remove todos os lançamentos deste mês</p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setIsResetMonthOpen(true)}
              >
                Zerar Mês
              </Button>
            </div>

            <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-100">
              <div>
                <p className="font-medium text-red-900">Zerar Tudo</p>
                <p className="text-xs text-red-700">Remove TODOS os dados da conta</p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setIsResetAllOpen(true)}
              >
                Zerar Tudo
              </Button>
            </div>
          </div>
        </div>

        {/* Dialog Zerar Mês */}
        <Dialog open={isResetMonthOpen} onOpenChange={setIsResetMonthOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Zerar Mês Atual?</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja apagar todos os lançamentos deste mês? Esta ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsResetMonthOpen(false)}>Cancelar</Button>
              <Button variant="destructive" onClick={handleResetMonth}>Confirmar Exclusão</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog Zerar Tudo */}
        <Dialog open={isResetAllOpen} onOpenChange={setIsResetAllOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Zerar TUDO?</DialogTitle>
              <DialogDescription>
                Esta ação apagará PERMANENTEMENTE todos os seus lançamentos, metas e histórico.
                Digite <strong>DELETAR</strong> abaixo para confirmar.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="Digite DELETAR"
                className="border-red-300 focus-visible:ring-red-500"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsResetAllOpen(false);
                setDeleteConfirmation('');
              }}>Cancelar</Button>
              <Button
                variant="destructive"
                onClick={handleResetAll}
                disabled={deleteConfirmation !== 'DELETAR'}
              >
                Apagar Tudo
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
