require('dotenv').config();
// Garante que DATABASE_URL está disponível antes de criar o pool
const pool = require('./db');

const schema = `
-- Extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de roles
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'moderator', 'user')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, role)
);

-- Tabela de perfis
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  avatar_url TEXT,
  subscription_status TEXT DEFAULT 'free' CHECK (subscription_status IN ('free', 'premium', 'cancelled')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  monthly_transaction_count INTEGER DEFAULT 0,
  last_transaction_reset TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de categorias
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de cartões de crédito
CREATE TABLE IF NOT EXISTS credit_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  limit_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  closing_day INTEGER NOT NULL CHECK (closing_day >= 1 AND closing_day <= 31),
  due_day INTEGER NOT NULL CHECK (due_day >= 1 AND due_day <= 31),
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de faturas de cartão
CREATE TABLE IF NOT EXISTS card_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id UUID NOT NULL REFERENCES credit_cards(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  total DECIMAL(12,2) DEFAULT 0,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'paid')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de transações
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  amount DECIMAL(12,2) NOT NULL,
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash', 'debit', 'credit', 'pix', 'transfer')),
  card_id UUID REFERENCES credit_cards(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES card_invoices(id) ON DELETE SET NULL,
  is_recurring BOOLEAN DEFAULT false,
  recurring_frequency TEXT CHECK (recurring_frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  receipt_url TEXT,
  status TEXT DEFAULT 'paid' CHECK (status IN ('paid', 'pending')),
  purchase_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de metas de gastos (budgets)
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de lembretes
CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  date TIMESTAMPTZ NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('personal', 'bill')),
  is_completed BOOLEAN NOT NULL DEFAULT false,
  notification_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de transações recorrentes
CREATE TABLE IF NOT EXISTS recurring_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash', 'debit', 'credit', 'pix', 'transfer')),
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  start_date DATE NOT NULL,
  end_date DATE,
  last_processed_date DATE,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de compras (para o bot WhatsApp)
CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  friendly_id SERIAL,
  item TEXT NOT NULL,
  client TEXT NOT NULL DEFAULT 'Geral',
  supplier TEXT,
  quantity INTEGER DEFAULT 1,
  received_quantity INTEGER,
  amount DECIMAL(12,2),
  freight DECIMAL(12,2) DEFAULT 0,
  installments INTEGER DEFAULT 1,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'waiting', 'completed', 'cancelled')),
  requester TEXT,
  observation TEXT,
  receipt_url TEXT,
  purchase_date DATE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  batch_id UUID,
  last_notification_request TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de empréstimos
CREATE TABLE IF NOT EXISTS loans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('borrowed', 'lent')),
  principal_amount DECIMAL(12,2) NOT NULL,
  interest_rate DECIMAL(8,4) NOT NULL DEFAULT 0,
  interest_period TEXT DEFAULT 'monthly' CHECK (interest_period IN ('monthly', 'yearly')),
  interest_type TEXT DEFAULT 'simple' CHECK (interest_type IN ('simple', 'compound')),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  number_of_installments INTEGER,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  integrate_in_dashboard BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de pagamentos de empréstimo
CREATE TABLE IF NOT EXISTS loan_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  note TEXT,
  installment_number INTEGER,
  kind TEXT NOT NULL DEFAULT 'payment' CHECK (kind IN ('payment', 'disbursement')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add loan_id to transactions if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='loan_id') THEN
    ALTER TABLE transactions ADD COLUMN loan_id UUID REFERENCES loans(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add kind to loan_payments if missing (pagamento que abate vs aporte que soma)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='loan_payments' AND column_name='kind') THEN
    ALTER TABLE loan_payments ADD COLUMN kind TEXT NOT NULL DEFAULT 'payment' CHECK (kind IN ('payment', 'disbursement'));
  END IF;
END $$;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_card_id ON transactions(card_id);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status);
CREATE INDEX IF NOT EXISTS idx_budgets_user_month ON budgets(user_id, month, year);
CREATE INDEX IF NOT EXISTS idx_loans_user_id ON loans(user_id);
CREATE INDEX IF NOT EXISTS idx_loan_payments_loan_id ON loan_payments(loan_id);
`;

const defaultCategories = `
INSERT INTO categories (name, icon, color, type, is_default) 
SELECT name, icon, color, type, true
FROM (VALUES
  ('Salário', 'Briefcase', '#10b981', 'income'),
  ('Freelance', 'Laptop', '#06b6d4', 'income'),
  ('Rendimentos', 'TrendingUp', '#8b5cf6', 'income'),
  ('Investimentos', 'PiggyBank', '#f59e0b', 'income'),
  ('Outros', 'Plus', '#64748b', 'income'),
  ('Alimentação', 'UtensilsCrossed', '#ef4444', 'expense'),
  ('Transporte', 'Car', '#f97316', 'expense'),
  ('Lazer', 'Gamepad2', '#ec4899', 'expense'),
  ('Saúde', 'Heart', '#14b8a6', 'expense'),
  ('Contas', 'FileText', '#6366f1', 'expense'),
  ('Educação', 'GraduationCap', '#8b5cf6', 'expense'),
  ('Moradia', 'Home', '#0ea5e9', 'expense'),
  ('Compras', 'ShoppingBag', '#f43f5e', 'expense'),
  ('Assinaturas', 'CreditCard', '#a855f7', 'expense'),
  ('Outros', 'MoreHorizontal', '#64748b', 'expense')
) AS v(name, icon, color, type)
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE is_default = true LIMIT 1);
`;

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('🔄 Executando migrações...');
    await client.query(schema);
    console.log('✅ Schema criado/atualizado com sucesso!');

    await client.query(defaultCategories);
    console.log('✅ Categorias padrão inseridas!');

    console.log('🎉 Migração concluída!');
  } catch (err) {
    console.error('❌ Erro na migração:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
