const express = require('express');
const pool = require('../database/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /transactions?month=6&year=2026
router.get('/', authMiddleware, async (req, res) => {
  const { month, year } = req.query;
  const now = new Date();
  const targetMonth = parseInt(month) || (now.getMonth() + 1);
  const targetYear = parseInt(year) || now.getFullYear();

  const startDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
  const endDate = new Date(targetYear, targetMonth, 0).toISOString().split('T')[0];

  try {
    const result = await pool.query(
      `SELECT t.*,
        json_build_object(
          'id', c.id, 'name', c.name, 'icon', c.icon, 'color', c.color, 'type', c.type
        ) AS category
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = $1
         AND t.date >= $2
         AND t.date <= $3
       ORDER BY t.date DESC, t.created_at DESC`,
      [req.user.id, startDate, endDate]
    );

    // Se não há category, seta null
    const transactions = result.rows.map(t => ({
      ...t,
      category: t.category && t.category.id ? t.category : null
    }));

    res.json(transactions);
  } catch (err) {
    console.error('Erro ao buscar transações:', err);
    res.status(500).json({ error: 'Erro ao buscar transações' });
  }
});

// POST /transactions
router.post('/', authMiddleware, async (req, res) => {
  const {
    type, category_id, amount, description, date,
    payment_method, card_id, is_recurring, recurring_frequency,
    recurring_end_date, status
  } = req.body;

  if (!type || !amount || !date || !payment_method) {
    return res.status(400).json({ error: 'Campos obrigatórios: type, amount, date, payment_method' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lógica padrão de status
    const txStatus = status || (payment_method === 'credit' ? 'pending' : 'paid');

    const result = await client.query(
      `INSERT INTO transactions
        (user_id, type, category_id, amount, description, date, payment_method, card_id, is_recurring, recurring_frequency, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        req.user.id, type, category_id || null, amount, description || null,
        date, payment_method, card_id || null,
        is_recurring || false, recurring_frequency || null, txStatus
      ]
    );

    const transaction = result.rows[0];

    // Se for recorrente, salva na tabela de recorrência
    if (is_recurring && recurring_frequency) {
      await client.query(
        `INSERT INTO recurring_transactions
          (user_id, description, amount, type, category_id, payment_method, frequency, start_date, end_date, active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true)`,
        [
          req.user.id, description || 'Sem descrição', amount, type,
          category_id || null, payment_method, recurring_frequency,
          date, recurring_end_date || null
        ]
      );
    }

    // Incrementa contador mensal do perfil
    await client.query(
      `UPDATE profiles SET
        monthly_transaction_count = monthly_transaction_count + 1,
        updated_at = NOW()
       WHERE id = $1`,
      [req.user.id]
    );

    await client.query('COMMIT');

    // Busca a transação com categoria
    const full = await pool.query(
      `SELECT t.*, json_build_object('id', c.id, 'name', c.name, 'icon', c.icon, 'color', c.color, 'type', c.type) AS category
       FROM transactions t LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.id = $1`,
      [transaction.id]
    );

    res.status(201).json(full.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao criar transação:', err);
    res.status(500).json({ error: 'Erro ao criar transação' });
  } finally {
    client.release();
  }
});

// PUT /transactions/:id
router.put('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { type, category_id, amount, description, date, payment_method, card_id, status } = req.body;

  try {
    const result = await pool.query(
      `UPDATE transactions SET
        type = COALESCE($1, type),
        category_id = COALESCE($2, category_id),
        amount = COALESCE($3, amount),
        description = COALESCE($4, description),
        date = COALESCE($5, date),
        payment_method = COALESCE($6, payment_method),
        card_id = COALESCE($7, card_id),
        status = COALESCE($8, status),
        updated_at = NOW()
       WHERE id = $9 AND user_id = $10
       RETURNING *`,
      [type, category_id, amount, description, date, payment_method, card_id, status, id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transação não encontrada' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar transação' });
  }
});

// PATCH /transactions/:id/status — toggle pago/pendente
router.patch('/:id/status', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['paid', 'pending'].includes(status)) {
    return res.status(400).json({ error: 'Status deve ser paid ou pending' });
  }

  try {
    const result = await pool.query(
      `UPDATE transactions SET status = $1, updated_at = NOW()
       WHERE id = $2 AND user_id = $3 RETURNING *`,
      [status, id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transação não encontrada' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar status' });
  }
});

// DELETE /transactions/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM transactions WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transação não encontrada' });
    }
    res.json({ message: 'Transação excluída' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir transação' });
  }
});

// DELETE /transactions/month/:month/:year — limpa mês inteiro
router.delete('/month/:month/:year', authMiddleware, async (req, res) => {
  const { month, year } = req.params;
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];

  try {
    await pool.query(
      `DELETE FROM transactions WHERE user_id = $1 AND date >= $2 AND date <= $3`,
      [req.user.id, startDate, endDate]
    );
    res.json({ message: 'Lançamentos do mês removidos' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao limpar mês' });
  }
});

// DELETE /transactions/all — limpa tudo
router.delete('/all/clear', authMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM transactions WHERE user_id = $1', [req.user.id]);
    res.json({ message: 'Todos os lançamentos removidos' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao limpar transações' });
  }
});

// PATCH /transactions/pay-invoice/:cardId — paga fatura do cartão
router.patch('/pay-invoice/:cardId', authMiddleware, async (req, res) => {
  const { cardId } = req.params;
  try {
    await pool.query(
      `UPDATE transactions SET status = 'paid', updated_at = NOW()
       WHERE user_id = $1 AND card_id = $2 AND status = 'pending'`,
      [req.user.id, cardId]
    );
    res.json({ message: 'Fatura paga com sucesso' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao pagar fatura' });
  }
});

module.exports = router;
