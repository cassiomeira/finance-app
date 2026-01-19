
import { Reminder } from "@/types/reminder";
import { Check, Trash2, Edit2, Pin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ReminderItemProps {
    reminder: Reminder;
    onToggle: (id: string) => void;
    onDelete: (id: string) => void;
    onEdit: (reminder: Reminder) => void;
}

export function ReminderItem({ reminder, onToggle, onDelete, onEdit }: ReminderItemProps) {
    // Sticky Note Colors
    const stickyColors = {
        personal: "bg-yellow-100 border-yellow-200 text-yellow-900 dark:bg-yellow-900/40 dark:border-yellow-800 dark:text-yellow-100",
        bill: "bg-red-100 border-red-200 text-red-900 dark:bg-red-900/40 dark:border-red-800 dark:text-red-100"
    };

    const colorClass = reminder.type === 'bill' ? stickyColors.bill : stickyColors.personal;

    return (
        <div className={cn(
            "relative flex flex-col justify-between p-5 min-h-[200px] shadow-md hover:shadow-lg transition-all transform hover:-translate-y-1 rounded-sm",
            colorClass,
            reminder.is_completed && "opacity-50 grayscale"
        )}>
            {/* Pin Icon effect */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-black/20 backdrop-blur-sm z-10 flex items-center justify-center shadow-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-600/50"></div>
            </div>

            <div className="space-y-3">
                <div className="flex items-start justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider opacity-60">
                        {format(reminder.date, "dd MMM", { locale: ptBR })}
                    </span>
                    <span className="text-xs font-mono opacity-60">
                        {format(reminder.date, "HH:mm")}
                    </span>
                </div>

                <h3 className={cn("font-handwriting text-xl leading-tight font-bold break-words", reminder.is_completed && "line-through")}>
                    {reminder.title}
                </h3>

                {reminder.type === 'bill' && (
                    <div className="inline-block px-2 py-0.5 bg-red-800/10 rounded text-[10px] font-bold uppercase">
                        Conta a Pagar
                    </div>
                )}
            </div>

            <div className="flex items-center justify-end gap-1 mt-4 pt-4 border-t border-black/5">
                {!reminder.is_completed && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(reminder)}
                        className="h-8 w-8 hover:bg-black/5"
                    >
                        <Edit2 size={16} />
                    </Button>
                )}

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onToggle(reminder.id)}
                    className={cn("h-8 w-8 hover:bg-black/5", reminder.is_completed && "text-green-700")}
                >
                    <Check size={18} />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(reminder.id)}
                    className="h-8 w-8 hover:bg-red-500/20 text-red-700/70 hover:text-red-700"
                >
                    <Trash2 size={16} />
                </Button>
            </div>
        </div>
    );
}
