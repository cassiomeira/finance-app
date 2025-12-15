import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function TermsOfService() {
    return (
        <div className="min-h-screen bg-background p-6">
            <div className="max-w-3xl mx-auto">
                <Link to="/settings" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8">
                    <ArrowLeft size={20} />
                    Voltar
                </Link>

                <h1 className="text-3xl font-bold mb-8">Termos de Uso</h1>

                <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
                    <p><strong>Última atualização:</strong> {new Date().toLocaleDateString('pt-BR')}</p>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-3">1. Aceitação dos Termos</h2>
                        <p>
                            Ao acessar ou usar o FinanceApp, você concorda em cumprir estes Termos de Uso.
                            Se você não concordar com qualquer parte destes termos, não poderá usar nosso serviço.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-3">2. Descrição do Serviço</h2>
                        <p>
                            O FinanceApp é um aplicativo de gerenciamento financeiro pessoal que permite:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Registrar receitas e despesas</li>
                            <li>Gerenciar cartões de crédito</li>
                            <li>Definir metas e orçamentos</li>
                            <li>Visualizar relatórios financeiros</li>
                            <li>Gerenciar empréstimos</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-3">3. Contas de Usuário</h2>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Você é responsável por manter a confidencialidade de sua conta e senha</li>
                            <li>Você deve fornecer informações verdadeiras e atualizadas</li>
                            <li>Você é responsável por todas as atividades em sua conta</li>
                            <li>Você deve ter pelo menos 18 anos para usar o serviço</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-3">4. Planos e Pagamentos</h2>
                        <h3 className="text-lg font-medium text-foreground mt-4 mb-2">4.1 Plano Gratuito:</h3>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>50 lançamentos por mês</li>
                            <li>1 cartão de crédito</li>
                            <li>Funcionalidades básicas</li>
                        </ul>

                        <h3 className="text-lg font-medium text-foreground mt-4 mb-2">4.2 Plano Premium (R$ 19,90/mês):</h3>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Lançamentos ilimitados</li>
                            <li>Cartões ilimitados</li>
                            <li>Exportação de relatórios</li>
                            <li>Metas ilimitadas</li>
                            <li>Suporte prioritário</li>
                        </ul>

                        <h3 className="text-lg font-medium text-foreground mt-4 mb-2">4.3 Pagamentos:</h3>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Os pagamentos são processados pelo Stripe de forma segura</li>
                            <li>A assinatura é renovada automaticamente mensalmente</li>
                            <li>Você pode cancelar a qualquer momento através do app</li>
                            <li>Não há reembolso proporcional para cancelamentos</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-3">5. Uso Aceitável</h2>
                        <p>Você concorda em não:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Violar leis ou regulamentos aplicáveis</li>
                            <li>Usar o serviço para atividades fraudulentas</li>
                            <li>Tentar acessar contas de outros usuários</li>
                            <li>Interferir no funcionamento do serviço</li>
                            <li>Fazer engenharia reversa do aplicativo</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-3">6. Propriedade Intelectual</h2>
                        <p>
                            Todo o conteúdo do FinanceApp, incluindo design, código, textos e marcas,
                            é de propriedade exclusiva do FinanceApp e protegido por leis de propriedade intelectual.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-3">7. Isenção de Responsabilidade</h2>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>O serviço é fornecido "como está" sem garantias</li>
                            <li>Não somos consultores financeiros - o app é apenas uma ferramenta de organização</li>
                            <li>Não nos responsabilizamos por decisões financeiras tomadas com base nos dados do app</li>
                            <li>Não garantimos disponibilidade ininterrupta do serviço</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-3">8. Limitação de Responsabilidade</h2>
                        <p>
                            Em nenhuma circunstância o FinanceApp será responsável por danos indiretos, incidentais,
                            especiais ou consequenciais resultantes do uso ou incapacidade de uso do serviço.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-3">9. Cancelamento</h2>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Você pode cancelar sua conta a qualquer momento</li>
                            <li>Podemos suspender ou encerrar sua conta por violação destes termos</li>
                            <li>Após cancelamento, você perde acesso aos dados (exceto exportação prévia)</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-3">10. Alterações nos Termos</h2>
                        <p>
                            Reservamo-nos o direito de modificar estes termos a qualquer momento.
                            Alterações significativas serão comunicadas por e-mail ou pelo app.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-3">11. Lei Aplicável</h2>
                        <p>
                            Estes termos são regidos pelas leis da República Federativa do Brasil.
                            Qualquer disputa será resolvida no foro da comarca do Rio de Janeiro/RJ.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-3">12. Contato</h2>
                        <p>
                            Para dúvidas sobre estes Termos de Uso, entre em contato:
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
