
import { useState, useEffect, useRef } from "react";
import { reminderService } from "@/services/reminderService";
import { aiService } from "@/services/aiService";
import { Reminder } from "@/types/reminder";
import { ReminderItem } from "@/components/reminders/ReminderItem";
import { ReminderForm } from "@/components/reminders/ReminderForm";
import { Plus, Mic, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/layout/AppLayout";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PurchasesBoard } from "@/components/reminders/PurchasesBoard";

export default function Agenda() {
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
    const [isProcessingVoice, setIsProcessingVoice] = useState(false);

    // Ref to track processing state without triggering re-renders
    const isProcessingRef = useRef(false);

    // Voice Logic
    const { isListening, transcript, isFinal, startListening, stopListening, resetTranscript, hasSupport, error: voiceError } = useSpeechRecognition();

    const loadReminders = async () => {
        try {
            const data = await reminderService.getAll();
            setReminders(data);
        } catch (error) {
            console.error("Failed to load reminders", error);
        }
    };

    useEffect(() => {
        loadReminders();
        isProcessingRef.current = false;
    }, []);

    // Monitor for voice errors
    useEffect(() => {
        if (voiceError) {
            console.log("Voice Error Caught:", voiceError);
            if (voiceError.includes("no-speech")) {
                toast.warning("Não ouvi nada. Tente falar mais perto!");
            } else {
                toast.error(`Erro voz: ${voiceError}`);
            }
            setIsProcessingVoice(false);
            isProcessingRef.current = false;
        }
    }, [voiceError]);

    // Smart Voice Handling
    useEffect(() => {
        const processVoiceCommand = async () => {

            // Console log to debug state on PC
            console.log(`State Check -> Transcript: "${transcript}", VoiceMode: ${isProcessingVoice}, Listening: ${isListening}, Final: ${isFinal}`);

            // CASE 1: Success - We have a transcript and are in processing mode, and (done listening OR got final result)
            if (transcript && isProcessingVoice && (!isListening || isFinal)) {

                if (isProcessingRef.current) {
                    console.log("Already processing (Locked).");
                    return;
                }
                isProcessingRef.current = true;

                // DEBUG TOAST 1
                toast.info(`1/4: Identifiquei texto! ("${transcript.substring(0, 15)}...")`);
                console.log("1/4: Identifiquei texto!");

                if (isListening) stopListening();
                setIsProcessingVoice(false);

                const toastId = toast.loading('2/4: Enviando para IA... 🤖');
                console.log("2/4: Enviando para IA...");

                try {
                    const parsedData = await aiService.parseReminder(transcript);
                    console.log("AI Data:", parsedData);

                    if (parsedData) {
                        toast.success("3/4: IA entendeu! Salvando...", { id: toastId });
                        try {
                            const result = await reminderService.add({
                                title: parsedData.title,
                                date: new Date(`${parsedData.date}T${parsedData.time}`),
                                type: parsedData.type as "personal" | "bill"
                            });
                            console.log("Reminder saved:", result);

                            await loadReminders();
                            toast.success("4/4: Sucesso! ✅", { id: toastId });
                        } catch (saveError: any) {
                            console.error("Erro ao salvar:", saveError);
                            toast.error(`ERRO DB: ${saveError?.message || JSON.stringify(saveError)}`, { id: toastId });
                        }
                    } else {
                        console.warn("AI returned null");
                        toast.error("ERRO IA: Retornou vazio/nulo.", { id: toastId });
                    }
                } catch (error: any) {
                    console.error("AI Error:", error);
                    toast.error(`ERRO GERAL: ${error?.message}`, { id: toastId });
                } finally {
                    setTimeout(() => { isProcessingRef.current = false; }, 1000);
                }
            }
            // CASE 2: Silence/Abort - Stopped listening, NO transcript
            else if (!isListening && !transcript && isProcessingVoice) {
                console.log("Abort condition met: Not listening, no transcript, but was in voice mode.");
                // Only reset if we truly finished without input
                setIsProcessingVoice(false);
                isProcessingRef.current = false;
            }
        };

        processVoiceCommand();
    }, [isListening, transcript, isProcessingVoice, isFinal]);

    const handleVoiceCardClick = () => {
        if (!hasSupport) {
            toast.error("Navegador sem suporte.");
            return;
        }

        if (isListening) {
            stopListening();
            toast.info("Pausado.");
            setIsProcessingVoice(false);
        } else {
            resetTranscript();
            setIsProcessingVoice(true);
            isProcessingRef.current = false;

            try {
                toast.info("Aguardando microfone...");
                startListening();
            } catch (e) {
                console.error(e);
                setIsProcessingVoice(false);
                toast.error("Erro ao iniciar microfone.");
            }
        }
    };

    const handleToggle = async (id: string) => {
        const reminder = reminders.find(r => r.id === id);
        if (reminder) {
            await reminderService.toggleComplete(id, reminder.is_completed);
            loadReminders();
        }
    };

    const handleDelete = async (id: string) => {
        const reminder = reminders.find(r => r.id === id);
        if (reminder) {
            await reminderService.delete(id, reminder.notification_id);
            loadReminders();
        }
    };

    const handleEdit = (reminder: Reminder) => {
        setEditingReminder(reminder);
    };

    const handleEditClose = () => {
        setEditingReminder(null);
    }

    return (
        <AppLayout>
            <div className="space-y-6 pb-24">
                <header className="flex flex-col gap-2">
                    <h1 className="text-2xl font-bold tracking-tight">Minha Agenda</h1>
                    <p className="text-muted-foreground">Gerencie seus post-its e contas.</p>
                </header>

                <Tabs defaultValue="agenda" className="w-full">
                    <TabsList className="mb-4">
                        <TabsTrigger value="agenda">Agenda & Lembretes</TabsTrigger>
                        <TabsTrigger value="compras">🛒 Compras & Pedidos</TabsTrigger>
                    </TabsList>

                    <TabsContent value="agenda">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {/* Voice Card */}
                            {hasSupport && (
                                <div
                                    onClick={handleVoiceCardClick}
                                    className={cn(
                                        "cursor-pointer group relative overflow-hidden rounded-xl border-0 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 p-6 flex flex-col justify-between min-h-[160px] shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]",
                                        isListening && "ring-4 ring-violet-300/50 animate-pulse"
                                    )}
                                >
                                    <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-40 transition-opacity">
                                        <Sparkles size={64} className="text-white" />
                                    </div>

                                    <div className={cn(
                                        "w-12 h-12 rounded-full flex items-center justify-center bg-white/20 backdrop-blur-sm text-white mb-4 transition-all",
                                        isListening && "bg-white text-violet-600 scale-110"
                                    )}>
                                        {isProcessingVoice && !isListening ? <Loader2 className="animate-spin" size={24} /> : <Mic size={24} />}
                                    </div>

                                    <div className="z-10">
                                        <h3 className="text-white font-bold text-lg leading-tight mb-1">
                                            {isListening ? "Ouvindo..." : (isProcessingVoice ? "Criando..." : "IA Magic")}
                                        </h3>
                                        <p className="text-white/80 text-xs font-medium">
                                            {isListening ? "Fale seu lembrete..." : (isProcessingVoice ? "Aguarde..." : "Criar por voz")}
                                        </p>
                                    </div>

                                    {transcript && isListening && (
                                        <div className="absolute bottom-0 left-0 right-0 bg-black/20 backdrop-blur-md p-2 text-white/90 text-[10px] truncate">
                                            "{transcript}"
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Standard Add Button */}
                            <ReminderForm
                                onSuccess={loadReminders}
                                trigger={
                                    <Button variant="outline" className="h-full min-h-[160px] border-dashed border-2 flex flex-col items-center justify-center gap-3 hover:bg-muted/50 whitespace-normal bg-card/50">
                                        <div className="p-3 bg-muted rounded-full">
                                            <Plus size={24} className="text-muted-foreground" />
                                        </div>
                                        <span className="text-muted-foreground font-medium">Novo Manual</span>
                                    </Button>
                                }
                            />

                            {/* Reminders List */}
                            {reminders.map(reminder => (
                                <ReminderItem
                                    key={reminder.id}
                                    reminder={reminder}
                                    onToggle={handleToggle}
                                    onDelete={handleDelete}
                                    onEdit={handleEdit}
                                />
                            ))}

                        </div>

                        <ReminderForm
                            onSuccess={loadReminders}
                            editingReminder={editingReminder}
                            onClose={handleEditClose}
                            showTrigger={false}
                        />
                    </TabsContent>

                    <TabsContent value="compras">
                        <PurchasesBoard />
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
}
