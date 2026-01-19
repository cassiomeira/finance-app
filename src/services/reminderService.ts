
import { LocalNotifications } from '@capacitor/local-notifications';
import { Reminder } from '../types/reminder';
import { supabase } from "@/integrations/supabase/client";

export const reminderService = {
    // Get all reminders
    getAll: async (): Promise<Reminder[]> => {
        const { data, error } = await supabase
            .from('reminders')
            .select('*')
            .order('date', { ascending: true });

        if (error) {
            console.error('Error fetching reminders:', error);
            return [];
        }

        return data.map((r: any) => ({
            ...r,
            date: new Date(r.date) // Convert string back to Date object
        })) as Reminder[];
    },

    // Add a new reminder
    add: async (reminder: Omit<Reminder, 'id' | 'notification_id' | 'is_completed'>) => {
        const notificationId = Math.floor(Math.random() * 1000000);
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) throw new Error("User not authenticated");

        const newReminder = {
            ...reminder,
            user_id: user.id,
            notification_id: notificationId,
            is_completed: false,
            date: reminder.date.toISOString() // Send as ISO string
        };

        const { data, error } = await supabase
            .from('reminders')
            .insert(newReminder)
            .select()
            .single();

        if (error) {
            console.error('Error creating reminder:', error);
            throw error;
        }

        // Schedule Notification via Capacitor (Local)
        try {
            await LocalNotifications.schedule({
                notifications: [
                    {
                        title: "Lembrete Financeiro",
                        body: reminder.title,
                        id: notificationId,
                        schedule: { at: reminder.date },
                        sound: undefined,
                        attachments: undefined,
                        actionTypeId: "",
                        extra: null
                    }
                ]
            });
            console.log('Notification scheduled for', reminder.date);
        } catch (e) {
            console.error('Error scheduling notification', e);
        }

        return { ...data, date: new Date(data.date) } as Reminder;
    },

    // Toggle completion status
    toggleComplete: async (id: string, currentStatus: boolean) => {
        const { error } = await supabase
            .from('reminders')
            .update({ is_completed: !currentStatus })
            .eq('id', id);

        if (error) console.error('Error updating reminder:', error);
        return !error;
    },

    // Delete reminder
    delete: async (id: string, notificationId?: number) => {

        if (notificationId) {
            try {
                await LocalNotifications.cancel({ notifications: [{ id: notificationId }] });
            } catch (e) {
                console.error('Error canceling notification', e);
            }
        }

        const { error } = await supabase
            .from('reminders')
            .delete()
            .eq('id', id);

        if (error) console.error('Error deleting reminder:', error);
    }
};
