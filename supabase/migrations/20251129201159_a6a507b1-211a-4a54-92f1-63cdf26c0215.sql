-- Create enum for transaction types
CREATE TYPE public.transaction_type AS ENUM ('income', 'expense');

-- Create enum for subscription status
CREATE TYPE public.subscription_status AS ENUM ('free', 'premium', 'cancelled');

-- Create enum for payment methods
CREATE TYPE public.payment_method AS ENUM ('cash', 'debit', 'credit', 'pix', 'transfer');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  avatar_url TEXT,
  subscription_status subscription_status DEFAULT 'free',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  monthly_transaction_count INTEGER DEFAULT 0,
  last_transaction_reset TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create categories table
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  type transaction_type NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create credit cards table
CREATE TABLE public.credit_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  card_limit DECIMAL(12,2) NOT NULL DEFAULT 0,
  closing_day INTEGER NOT NULL CHECK (closing_day >= 1 AND closing_day <= 31),
  due_day INTEGER NOT NULL CHECK (due_day >= 1 AND due_day <= 31),
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create card invoices table
CREATE TABLE public.card_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES public.credit_cards(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  total DECIMAL(12,2) DEFAULT 0,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'paid')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create transactions table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type transaction_type NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  amount DECIMAL(12,2) NOT NULL,
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method payment_method DEFAULT 'cash',
  card_id UUID REFERENCES public.credit_cards(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES public.card_invoices(id) ON DELETE SET NULL,
  is_recurring BOOLEAN DEFAULT false,
  recurring_frequency TEXT CHECK (recurring_frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  receipt_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create spending goals table
CREATE TABLE public.spending_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  is_global BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spending_goals ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Categories policies
CREATE POLICY "Users can view default or own categories" ON public.categories FOR SELECT USING (is_default = true OR auth.uid() = user_id);
CREATE POLICY "Users can insert own categories" ON public.categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own categories" ON public.categories FOR UPDATE USING (auth.uid() = user_id AND is_default = false);
CREATE POLICY "Users can delete own categories" ON public.categories FOR DELETE USING (auth.uid() = user_id AND is_default = false);

-- Credit cards policies
CREATE POLICY "Users can view own cards" ON public.credit_cards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own cards" ON public.credit_cards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own cards" ON public.credit_cards FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own cards" ON public.credit_cards FOR DELETE USING (auth.uid() = user_id);

-- Card invoices policies
CREATE POLICY "Users can view own invoices" ON public.card_invoices FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.credit_cards WHERE id = card_invoices.card_id AND user_id = auth.uid())
);
CREATE POLICY "Users can insert own invoices" ON public.card_invoices FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.credit_cards WHERE id = card_invoices.card_id AND user_id = auth.uid())
);
CREATE POLICY "Users can update own invoices" ON public.card_invoices FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.credit_cards WHERE id = card_invoices.card_id AND user_id = auth.uid())
);

-- Transactions policies
CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own transactions" ON public.transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own transactions" ON public.transactions FOR DELETE USING (auth.uid() = user_id);

-- Spending goals policies
CREATE POLICY "Users can view own goals" ON public.spending_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own goals" ON public.spending_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own goals" ON public.spending_goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own goals" ON public.spending_goals FOR DELETE USING (auth.uid() = user_id);

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

-- Trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert default categories
INSERT INTO public.categories (name, icon, color, type, is_default) VALUES
-- Income categories
('Salário', 'Briefcase', '#10b981', 'income', true),
('Freelance', 'Laptop', '#06b6d4', 'income', true),
('Rendimentos', 'TrendingUp', '#8b5cf6', 'income', true),
('Investimentos', 'PiggyBank', '#f59e0b', 'income', true),
('Outros', 'Plus', '#64748b', 'income', true),
-- Expense categories
('Alimentação', 'UtensilsCrossed', '#ef4444', 'expense', true),
('Transporte', 'Car', '#f97316', 'expense', true),
('Lazer', 'Gamepad2', '#ec4899', 'expense', true),
('Saúde', 'Heart', '#14b8a6', 'expense', true),
('Contas', 'FileText', '#6366f1', 'expense', true),
('Educação', 'GraduationCap', '#8b5cf6', 'expense', true),
('Moradia', 'Home', '#0ea5e9', 'expense', true),
('Compras', 'ShoppingBag', '#f43f5e', 'expense', true),
('Assinaturas', 'CreditCard', '#a855f7', 'expense', true),
('Outros', 'MoreHorizontal', '#64748b', 'expense', true);