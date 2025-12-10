import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Camera, Mic, Upload, X, Loader2, FileText, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useCategories } from '@/hooks/useCategories';
import { useCreditCards } from '@/hooks/useCreditCards';
import { useTransactions } from '@/hooks/useTransactions';

interface MagicInputProps {
    onTransactionGenerated: (transaction: any) => void;
}

export function MagicInput({ onTransactionGenerated }: MagicInputProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('camera');
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [fileType, setFileType] = useState<string>('image/jpeg');
    const [textInput, setTextInput] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Camera states
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    // Invoice/Card state
    const [selectedCardId, setSelectedCardId] = useState<string>('');
    const [isInvoiceMode, setIsInvoiceMode] = useState(false);
    const [isPaid, setIsPaid] = useState(true);

    const { categories } = useCategories();
    const { cards } = useCreditCards();
    const { createTransaction } = useTransactions();

    useEffect(() => {
        if (selectedCardId) {
            setIsPaid(false); // Default to pending for credit cards
        } else {
            setIsPaid(true); // Default to paid for others
        }
    }, [selectedCardId]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFileType(file.type);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveImage = () => {
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const startCamera = async () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            toast.error("Erro: Câmera requer conexão segura (HTTPS). Teste no PC ou após o deploy.");
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            setCameraStream(stream);
            setIsCameraOpen(true);
        } catch (err: any) {
            console.error("Erro ao acessar câmera:", err);
            if (err.name === 'NotAllowedError') {
                toast.error("Permissão da câmera negada.");
            } else if (err.name === 'NotFoundError') {
                toast.error("Nenhuma câmera encontrada.");
            } else {
                toast.error("Erro ao acessar câmera (HTTPS necessário?)");
            }
        }
    };

    const stopCamera = () => {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            setCameraStream(null);
        }
        setIsCameraOpen(false);
    };

    const capturePhoto = () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(videoRef.current, 0, 0);
                const dataUrl = canvas.toDataURL('image/jpeg');
                setImagePreview(dataUrl);
                stopCamera();
            }
        }
    };

    // Attach stream to video element when it mounts
    useEffect(() => {
        if (isCameraOpen && videoRef.current && cameraStream) {
            videoRef.current.srcObject = cameraStream;
        }
    }, [isCameraOpen, cameraStream]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (cameraStream) {
                cameraStream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const findCategoryId = (categoryGuess: string): string => {
        if (!categoryGuess) return "";

        const normalizedGuess = categoryGuess.toLowerCase().trim();

        const keywordMap: Record<string, string[]> = {
            'food': ['alimentação', 'comida', 'restaurante', 'mercado'],
            'transport': ['transporte', 'combustível', 'uber', 'ônibus'],
            'housing': ['moradia', 'aluguel', 'condomínio', 'luz', 'água'],
            'utilities': ['contas', 'internet', 'celular'],
            'health': ['saúde', 'farmácia', 'médico'],
            'leisure': ['lazer', 'cinema', 'viagem'],
            'education': ['educação', 'escola', 'curso'],
            'shopping': ['compras', 'roupas', 'eletrônicos'],
            'salary': ['salário', 'pagamento'],
            'freelance': ['freelance', 'extra'],
            'investment': ['investimento', 'aplicação'],
        };

        const exactMatch = categories.find(c =>
            c.id === categoryGuess ||
            c.name.toLowerCase() === normalizedGuess
        );
        if (exactMatch) return exactMatch.id;

        const keywords = keywordMap[normalizedGuess] || [normalizedGuess];

        const bestMatch = categories.find(c => {
            const catName = c.name.toLowerCase();
            return keywords.some(k => catName.includes(k) || k.includes(catName));
        });

        return bestMatch ? bestMatch.id : "";
    };

    const handleProcess = async () => {
        setIsLoading(true);
        try {
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
            if (!apiKey) throw new Error("Chave da API do Gemini não configurada.");

            let contents = [];
            const today = new Date().toISOString().split('T')[0];
            const prompt = isInvoiceMode
                ? `
                You are a financial assistant. Analyze the credit card invoice (image or PDF) and extract ALL transactions.
                Today is ${today}.
                Return ONLY a JSON object with a "transactions" key containing an array of objects.
                IMPORTANT: For the "date" field, ALWAYS use the INVOICE DUE DATE or TODAY'S DATE (${today}). 
                Do NOT use the original purchase date if it is in the past (common in installments/parcelas). 
                All extracted items must be recorded as expenses for the CURRENT invoice month.

                Structure:
                {
                    "transactions": [
                        {
                            "amount": number,
                            "description": string (brief description in Portuguese, keep installment info like 1/10),
                            "date": string (YYYY-MM-DD, use invoice due date or ${today}),
                            "category_id": string (guess one of: food, transport, housing, utilities, health, leisure, education, shopping, salary, freelance, investment, other),
                            "type": "expense"
                        }
                    ]
                }
            `
                : `
                You are a financial assistant. Analyze the input and extract transaction data.
                Today is ${today}.
                Return ONLY a JSON object with this structure (no markdown, no code blocks):
                {
                  "amount": number (use 0 if not found),
                  "description": string (brief description in Portuguese),
                  "date": string (YYYY-MM-DD, use today (${today}) if not found in the input),
                  "category_id": string (guess one of: food, transport, housing, utilities, health, leisure, education, shopping, salary, freelance, investment, other),
                  "type": "expense" | "income"
                }
            `;

            if (activeTab === 'camera' && imagePreview) {
                const base64Data = imagePreview.split(',')[1];
                const mimeType = fileType === 'application/pdf' ? 'application/pdf' : 'image/jpeg';

                contents = [{
                    parts: [
                        { text: prompt },
                        { inline_data: { mime_type: mimeType, data: base64Data } }
                    ]
                }];
            } else if (activeTab === 'text' && textInput) {
                contents = [{
                    parts: [
                        { text: prompt + `\nInput text: "${textInput}"` }
                    ]
                }];
            } else {
                throw new Error("Nenhuma imagem ou texto fornecido.");
            }

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents }),
                }
            );

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error.message);
            }

            const rawText = data.candidates[0].content.parts[0].text;
            const jsonText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
            const result = JSON.parse(jsonText);

            toast.success("Processado com sucesso!");

            if (isInvoiceMode && result.transactions && Array.isArray(result.transactions)) {
                let processedCount = 0;
                for (const tx of result.transactions) {
                    const mappedCategoryId = findCategoryId(tx.category_id);

                    // Salvar diretamente no banco
                    await createTransaction.mutateAsync({
                        description: tx.description,
                        amount: tx.amount,
                        date: tx.date,
                        category_id: mappedCategoryId || undefined, // Envia undefined se for string vazia
                        type: 'expense',
                        payment_method: 'credit',
                        card_id: selectedCardId || undefined, // Envia undefined se for string vazia
                        status: isPaid ? 'paid' : 'pending'
                    } as any); // Type cast temporário para contornar a definição estrita de CreateTransactionInput

                    processedCount++;
                    toast.success(`Lançado ${processedCount}/${result.transactions.length}: ${tx.description}`);
                    await new Promise(resolve => setTimeout(resolve, 800)); // Delay para feedback visual
                }
                toast.success(`Fatura processada! ${processedCount} itens salvos com sucesso.`);
            } else {
                const mappedCategoryId = findCategoryId(result.category_id);
                onTransactionGenerated({
                    description: result.description,
                    amount: result.amount,
                    date: result.date,
                    category_id: mappedCategoryId || undefined,
                    type: result.type,
                    payment_method: selectedCardId ? 'credit' : undefined,
                    card_id: selectedCardId || undefined,
                    status: isPaid ? 'paid' : 'pending'
                });
            }

            setIsOpen(false);
            resetForm();
        } catch (error: any) {
            console.error(error);
            toast.error("Erro ao processar: " + (error.message || "Erro desconhecido"));
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setImagePreview(null);
        setTextInput('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        // Não resetamos o cartão selecionado propositalmente para facilitar múltiplos lançamentos
    };

    const toggleRecording = () => {
        if (!isRecording) {
            if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
                toast.error("Seu navegador não suporta reconhecimento de fala.");
                return;
            }

            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            const recognition = new SpeechRecognition();

            recognition.lang = 'pt-BR';
            recognition.continuous = false;
            recognition.interimResults = false;

            recognition.onstart = () => {
                setIsRecording(true);
                toast.info("Ouvindo...");
            };

            recognition.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                setTextInput(prev => (prev ? prev + " " : "") + transcript);
            };

            recognition.onerror = (event: any) => {
                console.error("Erro no reconhecimento de fala:", event.error);
                toast.error("Erro ao reconhecer fala.");
                setIsRecording(false);
            };

            recognition.onend = () => {
                setIsRecording(false);
            };

            recognition.start();
        } else {
            setIsRecording(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    className="gap-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white border-0 hover:from-purple-600 hover:to-indigo-700 shadow-md"
                >
                    <Sparkles size={16} />
                    <span>Lançamento Mágico</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="text-purple-500" size={20} />
                        Assistente de IA
                    </DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="camera" value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="camera" className="gap-2">
                            <Camera size={16} /> Foto
                        </TabsTrigger>
                        <TabsTrigger value="text" className="gap-2">
                            <Mic size={16} /> Texto/Voz
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="camera" className="space-y-4 mt-4">
                        {!imagePreview && !isCameraOpen && (
                            <div className="grid grid-cols-2 gap-4">
                                <div
                                    className="border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-muted/50 transition-colors h-[200px]"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                                        <Upload size={24} />
                                    </div>
                                    <p className="text-sm font-medium text-center">Galeria / Arquivo</p>
                                </div>

                                <div
                                    className="border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-muted/50 transition-colors h-[200px]"
                                    onClick={startCamera}
                                >
                                    <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                                        <Camera size={24} />
                                    </div>
                                    <p className="text-sm font-medium text-center">Abrir Câmera</p>
                                </div>
                            </div>
                        )}

                        {isCameraOpen && (
                            <div className="relative rounded-xl overflow-hidden bg-black aspect-[3/4] flex items-center justify-center">
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute bottom-4 flex gap-4">
                                    <Button variant="secondary" onClick={stopCamera}>
                                        Cancelar
                                    </Button>
                                    <Button onClick={capturePhoto} className="bg-white text-black hover:bg-gray-200">
                                        <Camera className="mr-2 h-4 w-4" /> Capturar
                                    </Button>
                                </div>
                            </div>
                        )}

                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*,application/pdf"
                            onChange={handleFileChange}
                        />

                        <AnimatePresence mode="wait">
                            {imagePreview && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="relative w-full h-full flex items-center justify-center bg-muted/20 rounded-lg p-4"
                                >
                                    {fileType === 'application/pdf' ? (
                                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                            <FileText size={64} className="text-red-500" />
                                            <span className="text-sm font-medium">Documento PDF Selecionado</span>
                                        </div>
                                    ) : (
                                        <img
                                            src={imagePreview}
                                            alt="Preview"
                                            className="max-h-[300px] rounded-lg shadow-sm object-contain"
                                        />
                                    )}
                                    <Button
                                        size="icon"
                                        variant="destructive"
                                        className="absolute -top-2 -right-2 h-8 w-8 rounded-full shadow-md"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemoveImage();
                                        }}
                                    >
                                        <X size={14} />
                                    </Button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </TabsContent>

                    <TabsContent value="text" className="space-y-4 mt-4">
                        <div className="relative">
                            <Textarea
                                placeholder="Ex: Gastei 150 reais no mercado hoje..."
                                className="min-h-[150px] pr-12 resize-none text-base"
                                value={textInput}
                                onChange={(e) => setTextInput(e.target.value)}
                            />
                            <Button
                                size="icon"
                                variant={isRecording ? "destructive" : "secondary"}
                                className={`absolute bottom-3 right-3 rounded-full transition-all ${isRecording ? 'animate-pulse' : ''}`}
                                onClick={toggleRecording}
                            >
                                <Mic size={18} />
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground text-center">
                            {isRecording ? "Ouvindo..." : "Digite ou grave um áudio descrevendo o gasto."}
                        </p>
                    </TabsContent>
                </Tabs>

                {/* Card Selection */}
                {cards.length > 0 && (
                    <div className="space-y-2 pt-2 border-t">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <CreditCard size={16} />
                            Vincular ao Cartão (Opcional)
                        </label>
                        <select
                            className="w-full p-2 rounded-md border bg-background text-sm"
                            value={selectedCardId}
                            onChange={(e) => {
                                setSelectedCardId(e.target.value);
                                setIsInvoiceMode(!!e.target.value); // Ativa modo fatura se selecionar cartão
                            }}
                        >
                            <option value="">Nenhum (Lançamento Comum)</option>
                            {cards.map(card => (
                                <option key={card.id} value={card.id}>{card.name}</option>
                            ))}
                        </select>
                        {isInvoiceMode && (
                            <p className="text-xs text-blue-500 font-medium">
                                Modo Fatura Ativo: A IA buscará múltiplos itens na imagem.
                            </p>
                        )}
                    </div>
                )}

                {/* Status Selection */}
                <div className="flex items-center gap-2 pt-2">
                    <label className="text-sm font-medium flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={isPaid}
                            onChange={(e) => setIsPaid(e.target.checked)}
                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span>Já foi pago?</span>
                    </label>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${isPaid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {isPaid ? 'Pago' : 'A Pagar'}
                    </span>
                </div>

                <Button
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
                    onClick={handleProcess}
                    disabled={isLoading || (activeTab === 'camera' && !imagePreview) || (activeTab === 'text' && !textInput.trim())}
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processando com IA...
                        </>
                    ) : (
                        <>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Processar Mágica
                        </>
                    )}
                </Button>
            </DialogContent>
        </Dialog >
    );
}
