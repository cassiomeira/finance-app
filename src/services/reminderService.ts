import { LocalNotifications } from '@capacitor/local-notifications';
import { Reminder } from '../types/reminder';
import { api } from "@/lib/api";
import { Capacitor } from '@capacitor/core';

export const reminderService = {
  async checkPermissions() {
    if (!Capacitor.isNativePlatform()) return true;
    try {
      const status = await LocalNotifications.checkPermissions();
      if (status.display !== 'granted') {
        const request = await LocalNotifications.requestPermissions();
        return request.display === 'granted';
      }
      return true;
    } catch (e) {
      console.error("Error checking permissions", e);
      return false;
    }
  },

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
      if (JSON.stringify(e).includes("Not implemented")) return;
      console.error("Error creating channel", e);
    }
  },

  getAll: async (): Promise<Reminder[]> => {
    const data = await api.reminders.getAll();
    return (data || []).map((r: any) => ({
      ...r,
      date: new Date(r.date)
    })) as Reminder[];
  },

  add: async (reminder: Omit<Reminder, 'id' | 'notification_id' | 'is_completed'>) => {
    await reminderService.checkPermissions();
    await reminderService.createChannel();

    const notificationId = Math.floor(Math.random() * 1000000);

    const data = await api.reminders.create({
      title: reminder.title,
      description: reminder.description,
      date: reminder.date.toISOString(),
      type: reminder.type,
      notification_id: notificationId,
    });

    // Agenda notificação local via Capacitor
    try {
      if (Capacitor.isNativePlatform()) {
        await LocalNotifications.schedule({
          notifications: [{
            title: "Lembrete Financeiro",
            body: reminder.title,
            id: notificationId,
            schedule: { at: reminder.date, allowWhileIdle: true },
            sound: undefined,
            attachments: undefined,
            actionTypeId: "",
            extra: null,
            channelId: 'custom_reminders'
          }]
        });
      }
    } catch (e) {
      if (!JSON.stringify(e).includes("Not implemented")) {
        console.error('Error scheduling notification', e);
      }
    }

    return { ...data, date: new Date(data.date) } as Reminder;
  },

  toggleComplete: async (id: string, currentStatus: boolean) => {
    await api.reminders.toggle(id);
    return true;
  },

  delete: async (id: string, notificationId?: number) => {
    if (notificationId && Capacitor.isNativePlatform()) {
      try {
        await LocalNotifications.cancel({ notifications: [{ id: notificationId }] });
      } catch (e) {
        console.error('Error canceling notification', e);
      }
    }
    await api.reminders.delete(id);
  },

  update: async (reminder: Reminder) => {
    await api.reminders.update(reminder.id, {
      title: reminder.title,
      date: reminder.date.toISOString(),
      type: reminder.type,
    });

    // Reagenda notificação
    if (reminder.notification_id && Capacitor.isNativePlatform()) {
      try {
        await LocalNotifications.cancel({ notifications: [{ id: reminder.notification_id }] });
        await reminderService.checkPermissions();
        await reminderService.createChannel();
        await LocalNotifications.schedule({
          notifications: [{
            title: "Lembrete Financeiro",
            body: reminder.title,
            id: reminder.notification_id,
            schedule: { at: reminder.date, allowWhileIdle: true },
            sound: undefined,
            attachments: undefined,
            actionTypeId: "",
            extra: null,
            channelId: 'custom_reminders'
          }]
        });
      } catch (e) {
        console.error('Error rescheduling notification', e);
      }
    }

    return reminder;
  }
};
