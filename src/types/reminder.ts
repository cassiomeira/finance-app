
export interface Reminder {
  id: string;
  title: string;
  description?: string;
  date: Date;
  type: 'personal' | 'bill';
  related_transaction_id?: string;
  is_completed: boolean;
  notification_id?: number; // For capacitor local notification
}
