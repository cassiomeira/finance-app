import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto">
        <Link to="/settings" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft size={20} />
          Voltar
        </Link>

        <h1 className="text-3xl font-bold mb-8">Política de Privacidade</h1>
        
        <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
          <p><strong>Última atualização:</strong> {new Date().toLocaleDateString('pt-BR')}</p>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">1. Introdução</h2>
            <p>
              O FinanceApp ("nós", "nosso" ou "aplicativo") está comprometido em proteger sua privacidade. 
              Esta Política de Privacidade explica como coletamos, usamos, divulgamos e protegemos suas informações 
              quando você usa nosso aplicativo de gerenciamento financeiro pessoal.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">2. Informações que Coletamos</h2>
            <h3 className="text-lg font-medium text-foreground mt-4 mb-2">2.1 Informações fornecidas por você:</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Nome e endereço de e-mail (para criação de conta)</li>
              <li>Dados financeiros inseridos manualmente (transações, metas, orçamentos)</li>
              <li>Informações de cartões de crédito cadastrados no app (apenas nome e limite)</li>
            </ul>
            
            <h3 className="text-lg font-medium text-foreground mt-4 mb-2">2.2 Informações coletadas automaticamente:</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Dados de uso do aplicativo</li>
              <li>Informações do dispositivo (modelo, sistema operacional)</li>
              <li>Logs de erro para melhorar o serviço</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">3. Como Usamos suas Informações</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Fornecer e manter nossos serviços</li>
              <li>Processar transações e gerenciar sua assinatura</li>
              <li>Enviar notificações importantes sobre sua conta</li>
              <li>Melhorar e personalizar sua experiência</li>
              <li>Detectar e prevenir fraudes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">4. Compartilhamento de Dados</h2>
            <p>
              Não vendemos suas informações pessoais. Compartilhamos dados apenas com:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Stripe:</strong> Para processamento de pagamentos (não armazenamos dados de cartão de crédito para pagamento)</li>
              <li><strong>Supabase:</strong> Para armazenamento seguro de dados</li>
              <li><strong>Autoridades legais:</strong> Quando exigido por lei</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">5. Segurança dos Dados</h2>
            <p>
              Utilizamos medidas de segurança padrão da indústria para proteger suas informações, incluindo:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Criptografia em trânsito (HTTPS/TLS)</li>
              <li>Criptografia em repouso</li>
              <li>Autenticação segura</li>
              <li>Controle de acesso restrito</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">6. Seus Direitos</h2>
            <p>Você tem direito a:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Acessar seus dados pessoais</li>
              <li>Corrigir dados incorretos</li>
              <li>Solicitar exclusão de sua conta e dados</li>
              <li>Exportar seus dados</li>
              <li>Cancelar sua assinatura a qualquer momento</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">7. Retenção de Dados</h2>
            <p>
              Mantemos seus dados enquanto sua conta estiver ativa. Após exclusão da conta, 
              seus dados são removidos em até 30 dias, exceto quando exigido por lei.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">8. Menores de Idade</h2>
            <p>
              Nosso serviço não é direcionado a menores de 18 anos. Não coletamos intencionalmente 
              informações de menores. Se você é pai/mãe e acredita que seu filho nos forneceu dados, 
              entre em contato conosco.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">9. Alterações nesta Política</h2>
            <p>
              Podemos atualizar esta política periodicamente. Notificaremos sobre mudanças significativas 
              por e-mail ou através do aplicativo.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">10. Contato</h2>
            <p>
              Para dúvidas sobre esta Política de Privacidade, entre em contato:
            </p>
            <p className="mt-2">
              <strong>E-mail:</strong> contato@financeapp.com.br
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
