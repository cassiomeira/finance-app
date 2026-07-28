const express = require('express');
const pool = require('../database/db');
const { authMiddleware } = require('../middleware/auth');
const { enforceCardLimit } = require('../middleware/plan');

const router = express.Router();

// GET /credit-cards
router.get('/', authMiddleware, async (req, res) => {
  try {
    const cards = await pool.query(
      `SELECT * FROM credit_cards WHERE user_id = $1 ORDER BY name`,
      [req.user.id]
    );

    // Calcula limite usado (transações de crédito pendentes)
    const usage = await pool.query(
      `SELECT card_id, SUM(amount) as used
       FROM transactions
       WHERE user_id = $1 AND payment_method = 'credit' AND status = 'pending' AND card_id IS NOT NULL
       GROUP BY card_id`,
      [req.user.id]
    );

    const usageMap = {};
    usage.rows.forEach(r => { usageMap[r.card_id] = parseFloat(r.used); });

    const result = cards.rows.map(c => ({
      ...c,
      card_limit: parseFloat(c.limit_amount || 0),
      used_limit: usageMap[c.id] || 0
    }));

    res.json(result);
  } catch (err) {
    console.error('Erro ao buscar cartões:', err);
    res.status(500).json({ error: 'Erro ao buscar cartões' });
  }
});

// POST /credit-cards
router.post('/', authMiddleware, enforceCardLimit, async (req, res) => {
  const { name, card_limit, closing_day, due_day, color } = req.body;

  if (!name || !card_limit || !closing_day || !due_day) {
    return res.status(400).json({ error: 'Campos obrigatórios: name, card_limit, closing_day, due_day' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO credit_cards (user_id, name, limit_amount, closing_day, due_day, color)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.user.id, name, card_limit, closing_day, due_day, color || '#10B981']
    );
    const card = { ...result.rows[0], card_limit: parseFloat(result.rows[0].limit_amount || 0), used_limit: 0 };
    res.status(201).json(card);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar cartão' });
  }
});

// DELETE /credit-cards/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Remove transações vinculadas
    await client.query(
      'DELETE FROM transactions WHERE card_id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    // Remove faturas vinculadas
    await client.query('DELETE FROM card_invoices WHERE card_id = $1', [id]);

    // Remove o cartão
    const result = await client.query(
      'DELETE FROM credit_cards WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Cartão não encontrado' });
    }

    await client.query('COMMIT');
    res.json({ message: 'Cartão e dados vinculados removidos' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Erro ao excluir cartão' });
  } finally {
    client.release();
  }
});

// GET /credit-cards/:cardId/invoices
router.get('/:cardId/invoices', authMiddleware, async (req, res) => {
  const { cardId } = req.params;
  try {
    // Verifica que o cartão é do usuário
    const card = await pool.query(
      'SELECT id FROM credit_cards WHERE id = $1 AND user_id = $2',
      [cardId, req.user.id]
    );
    if (card.rows.length === 0) {
      return res.status(404).json({ error: 'Cartão não encontrado' });
    }

    const result = await pool.query(
      `SELECT * FROM card_invoices WHERE card_id = $1
       ORDER BY year DESC, month DESC`,
      [cardId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar faturas' });
  }
});

module.exports = router;
