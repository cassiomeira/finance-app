
import { LocalNotifications } from '@capacitor/local-notifications';
import { Reminder } from '../types/reminder';
import { supabase } from "@/integrations/supabase/client";
import { Capacitor } from '@capacitor/core';

export const reminderService = {
    // Check and request permissions
    async checkPermissions() {
        if (!Capacitor.isNativePlatform()) return true; // Always true on web for now (handled by browser)

        try {
            const status = await LocalNotifications.checkPermissions();
            if (status.display !== 'granted') {
                const request = await LocalNotifications.requestPermissions();
                if (request.display !== 'granted') {
                    console.error("Notification permission denied");
                    return false;
                }
            }
            return true;
        } catch (e) {
            console.error("Error checking permissions", e);
            return false;
        }
    },

    // Create Notification Channel (Android)
    async createChannel() {
        if (!Capacitor.isNativePlatform()) return;

        try {
            await LocalNotifications.createChannel({
                id: 'custom_reminders',
                name: 'Lembretes Financeiros',
                description: 'Notificações de contas e lembretes pessoais',
                importance: 5,
                visibility: 1,
                vibration: true,
            });
        } catch (e) {
            // Ignore specific error on web if it happens
            if (JSON.stringify(e).includes("Not implemented")) return;
            console.error("Error creating channel", e);
        }
    },

    // Get all reminders
    getAll: async (): Promise<Reminder[]> => {
        const { data, userError } = await supabase.auth.getUser();
        if (!data.user) return []; // Access control check

        const { data: reminders, error } = await supabase
            .from('reminders')
            .select('*')
            .order('date', { ascending: true });

        if (error) {
            console.error('Error fetching reminders:', error);
            return [];
        }

        return reminders.map((r: any) => ({
            ...r,
            date: new Date(r.date) // Convert string back to Date object
        })) as Reminder[];
    },

    // Add a new reminder
    add: async (reminder: Omit<Reminder, 'id' | 'notification_id' | 'is_completed'>) => {
        // Ensure permissions and channel exist before scheduling
        await reminderService.checkPermissions();
        await reminderService.createChannel();

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
            if (Capacitor.isNativePlatform()) {
                await LocalNotifications.schedule({
                    notifications: [
                        {
                            title: "Lembrete Financeiro",
                            body: reminder.title,
                            id: notificationId,
                            schedule: { at: reminder.date, allowWhileIdle: true }, // allowWhileIdle for doze mode
                            sound: undefined,
                            attachments: undefined,
                            actionTypeId: "",
                            extra: null,
                            channelId: 'custom_reminders' // Use created channel
                        }
                    ]
                });
                console.log('Notification scheduled for', reminder.date);
            }
        } catch (e) {
            if (!JSON.stringify(e).includes("Not implemented")) {
                console.error('Error scheduling notification', e);
            }
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

        if (notificationId && Capacitor.isNativePlatform()) {
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
    },

    // Update reminder
    update: async (reminder: Reminder) => {
        // 1. Update in Supabase
        const { error } = await supabase
            .from('reminders')
            .update({
                title: reminder.title,
                date: reminder.date.toISOString(), // Send as ISO string
                type: reminder.type,
            })
            .eq('id', reminder.id);

        if (error) {
            console.error('Error updating reminder:', error);
            throw error;
        }

        // 2. Reschedule Notification (Cancel old + Schedule new)
        if (reminder.notification_id && Capacitor.isNativePlatform()) {
            try {
                await LocalNotifications.cancel({ notifications: [{ id: reminder.notification_id }] });

                // Ensure permissions/channel
                await reminderService.checkPermissions();
                await reminderService.createChannel();

                await LocalNotifications.schedule({
                    notifications: [
                        {
                            title: "Lembrete Financeiro",
                            body: reminder.title,
                            id: reminder.notification_id,
                            schedule: { at: reminder.date, allowWhileIdle: true },
                            sound: undefined,
                            attachments: undefined,
                            actionTypeId: "",
                            extra: null,
                            channelId: 'custom_reminders'
                        }
                    ]
                });
            } catch (e) {
                console.error('Error rescheduling notification', e);
            }
        }

        return reminder;
    }
};
