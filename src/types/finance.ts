export type TransactionType = 'income' | 'expense';
export type SubscriptionStatus = 'free' | 'premium' | 'cancelled';
export type PaymentMethod = 'cash' | 'debit' | 'credit' | 'pix' | 'transfer';
export type Frequency = 'weekly' | 'monthly' | 'yearly';

export interface RecurringTransaction {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  type: TransactionType;
  category_id: string | null;
  payment_method: PaymentMethod;
  frequency: Frequency;
  start_date: string;
  end_date: string | null;
  last_processed_date: string | null;
  active: boolean;
  created_at: string;
  category?: Category;
}

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  amount: number;
  month: number;
  year: number;
  created_at: string;
  category?: Category;
}

export interface Profile {
  id: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  subscription_status: SubscriptionStatus;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  monthly_transaction_count: number;
  last_transaction_reset: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string | null;
  name: string;
  icon: string;
  color: string;
  type: TransactionType;
  is_default: boolean;
  created_at: string;
}

export interface CreditCard {
  id: string;
  user_id: string;
  name: string;
  card_limit: number;
  closing_day: number;
  due_day: number;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface CardInvoice {
  id: string;
  card_id: string;
  month: number;
  year: number;
  total: number;
  status: 'open' | 'closed' | 'paid';
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  category_id: string | null;
  amount: number;
  description: string | null;
  date: string;
  payment_method: PaymentMethod;
  card_id: string | null;
  invoice_id: string | null;
  is_recurring: boolean;
  recurring_frequency: 'daily' | 'weekly' | 'monthly' | 'yearly' | null;
  receipt_url: string | null;
  created_at: string;
  updated_at: string;
  category?: Category;
}

export interface SpendingGoal {
  id: string;
  user_id: string;
  category_id: string | null;
  amount: number;
  month: number;
  year: number;
  is_global: boolean;
  created_at: string;
  category?: Category;
}

export interface FinancialSummary {
  totalBalance: number;
  totalIncome: number;
  totalExpense: number;
  expensesByCategory: { category: string; amount: number; color: string; icon: string }[];
  monthlyTrend: { month: string; income: number; expense: number }[];
  topExpenses: Transaction[];
}
