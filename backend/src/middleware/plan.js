const pool = require('../database/db');

// Limites do plano gratuito (configuráveis por env).
const FREE_TRANSACTION_LIMIT = parseInt(process.env.FREE_TRANSACTION_LIMIT) || 50;
const FREE_CARD_LIMIT = parseInt(process.env.FREE_CARD_LIMIT) || 1;

// Retorna o range [início, fim] do mês atual em datas YYYY-MM-DD.
function currentMonthRange() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const start = `${y}-${String(m).padStart(2, '0')}-01`;
  const end = new Date(y, m, 0).toISOString().split('T')[0];
  return { start, end };
}

// Descobre se o usuário tem acesso ilimitado (premium ou admin).
async function isUnlimited(userId) {
  const [profile, admin] = await Promise.all([
    pool.query('SELECT subscription_status FROM profiles WHERE id = $1', [userId]),
    pool.query("SELECT 1 FROM user_roles WHERE user_id = $1 AND role = 'admin'", [userId]),
  ]);
  if (admin.rows.length > 0) return true;
  return profile.rows[0]?.subscription_status === 'premium';
}

// Conta transações do usuário no mês corrente (fonte de verdade real,
// substitui o contador monthly_transaction_count que nunca resetava).
async function currentMonthTransactionCount(userId) {
  const { start, end } = currentMonthRange();
  const r = await pool.query(
    'SELECT COUNT(*)::int AS c FROM transactions WHERE user_id = $1 AND date >= $2 AND date <= $3',
    [userId, start, end]
  );
  return r.rows[0].c;
}

async function cardCount(userId) {
  const r = await pool.query('SELECT COUNT(*)::int AS c FROM credit_cards WHERE user_id = $1', [userId]);
  return r.rows[0].c;
}

// Middleware: bloqueia criação de transação além do limite do plano free.
async function enforceTransactionLimit(req, res, next) {
  try {
    if (await isUnlimited(req.user.id)) return next();
    const count = await currentMonthTransactionCount(req.user.id);
    if (count >= FREE_TRANSACTION_LIMIT) {
      return res.status(402).json({
        error: `Limite de ${FREE_TRANSACTION_LIMIT} lançamentos por mês atingido no plano gratuito. Assine o Premium para lançamentos ilimitados.`,
        code: 'PLAN_LIMIT_TRANSACTIONS',
      });
    }
    next();
  } catch (err) {
    console.error('Erro ao validar limite de transações:', err);
    res.status(500).json({ error: 'Erro ao validar plano' });
  }
}

// Middleware: bloqueia criação de cartão além do limite do plano free.
async function enforceCardLimit(req, res, next) {
  try {
    if (await isUnlimited(req.user.id)) return next();
    const count = await cardCount(req.user.id);
    if (count >= FREE_CARD_LIMIT) {
      return res.status(402).json({
        error: `O plano gratuito permite apenas ${FREE_CARD_LIMIT} cartão. Assine o Premium para adicionar mais cartões.`,
        code: 'PLAN_LIMIT_CARDS',
      });
    }
    next();
  } catch (err) {
    console.error('Erro ao validar limite de cartões:', err);
    res.status(500).json({ error: 'Erro ao validar plano' });
  }
}

module.exports = {
  FREE_TRANSACTION_LIMIT,
  FREE_CARD_LIMIT,
  isUnlimited,
  currentMonthTransactionCount,
  cardCount,
  enforceTransactionLimit,
  enforceCardLimit,
};
