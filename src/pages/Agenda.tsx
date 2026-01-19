
import { useState, useEffect } from "react";
import { reminderService } from "@/services/reminderService";
import { Reminder } from "@/types/reminder";
import { ReminderItem } from "@/components/reminders/ReminderItem";
import { ReminderForm } from "@/components/reminders/ReminderForm";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/layout/AppLayout";

export default function Agenda() {
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);

    const loadReminders = async () => {
        const data = await reminderService.getAll();
        setReminders(data);
    };

    useEffect(() => {
        loadReminders();
    }, []);

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

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {reminders.map(reminder => (
                        <ReminderItem
                            key={reminder.id}
                            reminder={reminder}
                            onToggle={handleToggle}
                            onDelete={handleDelete}
                            onEdit={handleEdit}
                        />
                    ))}

                    {/* Add Button as a card - Dotted Style */}
                    <ReminderForm
                        onSuccess={loadReminders}
                        trigger={
                            <Button variant="outline" className="h-full min-h-[200px] border-dashed border-2 flex flex-col gap-2 hover:bg-muted/50 whitespace-normal bg-transparent">
                                <Plus size={32} className="opacity-50" />
                                <span className="text-muted-foreground">Novo Post-it</span>
                            </Button>
                        }
                    />
                </div>

                {/* Hidden form just for editing handling */}
                <ReminderForm
                    onSuccess={loadReminders}
                    editingReminder={editingReminder}
                    onClose={handleEditClose}
                    showTrigger={false}
                />
            </div>
        </AppLayout>
    );
}
