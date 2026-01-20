
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { reminderService } from "@/services/reminderService";
import { Plus, Loader2, Mic, MicOff } from "lucide-react";
import { Reminder } from "@/types/reminder";
import { format } from "date-fns";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { cn } from "@/lib/utils";

interface ReminderFormProps {
    onSuccess: () => void;
    editingReminder?: Reminder | null;
    onClose?: () => void;
    trigger?: React.ReactNode;
    showTrigger?: boolean;
}

export function ReminderForm({ onSuccess, editingReminder, onClose, trigger, showTrigger = true }: ReminderFormProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState("");
    const [date, setDate] = useState("");
    const [time, setTime] = useState("");
    const [type, setType] = useState<"personal" | "bill">("personal");

    const { isListening, transcript, startListening, stopListening, hasSupport } = useSpeechRecognition();

    useEffect(() => {
        if (transcript) {
            setTitle(transcript);
        }
    }, [transcript]);

    useEffect(() => {
        if (editingReminder) {
            setOpen(true);
            setTitle(editingReminder.title);
            try {
                setDate(format(editingReminder.date, 'yyyy-MM-dd'));
                setTime(format(editingReminder.date, 'HH:mm'));
            } catch (e) {
                console.error(e);
            }
            setType(editingReminder.type as any);
        }
    }, [editingReminder]);

    useEffect(() => {
        if (!open && onClose && editingReminder) {
            onClose();
        }
    }, [open, onClose, editingReminder]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading) return;

        if (!title || !date || !time) return;
        setLoading(true);

        try {
            const reminderDate = new Date(`${date}T${time}`);

            if (editingReminder) {
                await reminderService.update({
                    ...editingReminder,
                    title,
                    date: reminderDate,
                    type
                });
            } else {
                await reminderService.add({
                    title,
                    date: reminderDate,
                    type,
                });
            }

            setOpen(false);
            setTitle("");
            setDate("");
            setTime("");
            onSuccess();
        } catch (error) {
            console.error("Failed to save reminder", error);
        } finally {
            setLoading(false);
        }
    };

    const handleMicClick = (e: React.MouseEvent) => {
        e.preventDefault();
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {showTrigger && !editingReminder && (
                <DialogTrigger asChild>
                    {trigger || (
                        <Button className="w-full gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all">
                            <Plus size={18} /> Novo Lembrete
                        </Button>
                    )}
                </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{editingReminder ? "Editar Lembrete" : "Adicionar Lembrete"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <Label>Título</Label>
                        <div className="relative">
                            <Input
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="Ex: Comprar leite"
                                required
                                className="pr-10"
                            />
                            {hasSupport && (
                                <button
                                    type="button"
                                    onClick={handleMicClick}
                                    className={cn(
                                        "absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-all",
                                        isListening
                                            ? "bg-red-100 text-red-600 animate-pulse"
                                            : "hover:bg-muted text-muted-foreground"
                                    )}
                                    title="Falar lembrete"
                                >
                                    {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Data</Label>
                            <Input
                                type="date"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Hora</Label>
                            <Input
                                type="time"
                                value={time}
                                onChange={e => setTime(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Tipo</Label>
                        <Select value={type} onValueChange={(v: "personal" | "bill") => setType(v)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="personal">Pessoal (Amarelo)</SelectItem>
                                <SelectItem value="bill">Conta (Vermelho)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {editingReminder ? "Atualizar" : "Salvar Lembrete"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
