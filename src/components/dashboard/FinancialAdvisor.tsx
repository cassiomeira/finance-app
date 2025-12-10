import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Brain, Lightbulb, Loader2, Sparkles } from 'lucide-react';
import { useTransactions } from '@/hooks/useTransactions';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';

export function FinancialAdvisor() {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [advice, setAdvice] = useState<string | null>(null);
    const { transactions } = useTransactions();

    const handleAnalyze = async () => {
        setIsLoading(true);
        setAdvice(null);

        try {
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
            if (!apiKey) throw new Error("Chave da API do Gemini não configurada.");

            // Prepare data for AI
            const recentTransactions = transactions.slice(0, 50).map(t => ({
                date: t.date,
                amount: t.amount,
                description: t.description,
                category: t.category?.name || 'Outros',
                type: t.type
            }));

            const prompt = `
                Você é um consultor financeiro pessoal experiente e amigável.
                Analise as seguintes transações financeiras recentes do usuário:
                ${JSON.stringify(recentTransactions)}

                Por favor, forneça:
                1. Uma breve análise dos padrões de gastos (onde o dinheiro está indo).
                2. Identifique gastos supérfluos ou excessivos (ex: muito delivery, assinaturas).
                3. Dê 3 a 5 dicas práticas e acionáveis para economizar dinheiro baseadas nesses dados.
                
                Use formatação Markdown para deixar a resposta bonita e legível (negrito, listas, tópicos).
                Seja direto, encorajador e use emojis.
                Responda em Português do Brasil.
            `;

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }]
                    }),
                }
            );

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error.message);
            }

            const text = data.candidates[0].content.parts[0].text;
            setAdvice(text);

        } catch (error: any) {
            console.error(error);
            toast.error("Erro ao gerar análise: " + (error.message || "Erro desconhecido"));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-0 hover:from-emerald-600 hover:to-teal-700 shadow-md"
                >
                    <Brain size={16} />
                    <span>Consultor IA</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-emerald-600">
                        <Brain size={24} />
                        Consultor Financeiro Inteligente
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-hidden p-1">
                    {!advice && !isLoading && (
                        <div className="flex flex-col items-center justify-center h-64 text-center space-y-4">
                            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                                <Lightbulb size={32} />
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg">Descubra como economizar</h3>
                                <p className="text-muted-foreground text-sm max-w-xs mx-auto mt-2">
                                    Vou analisar suas últimas transações e encontrar oportunidades para você poupar dinheiro.
                                </p>
                            </div>
                            <Button onClick={handleAnalyze} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                <Sparkles size={16} className="mr-2" />
                                Analisar meus gastos
                            </Button>
                        </div>
                    )}

                    {isLoading && (
                        <div className="flex flex-col items-center justify-center h-64 space-y-4">
                            <Loader2 size={40} className="animate-spin text-emerald-600" />
                            <p className="text-sm text-muted-foreground animate-pulse">Analisando seus padrões de consumo...</p>
                        </div>
                    )}

                    {advice && (
                        <ScrollArea className="h-[50vh] pr-4">
                            <div className="prose prose-sm prose-emerald dark:prose-invert max-w-none">
                                <ReactMarkdown>{advice}</ReactMarkdown>
                            </div>
                        </ScrollArea>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
