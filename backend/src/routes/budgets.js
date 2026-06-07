const express = require('express');
const pool = require('../database/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /budgets?month=6&year=2026
router.get('/', authMiddleware, async (req, res) => {
  const { month, year } = req.query;
  const now = new Date();
  const targetMonth = parseInt(month) || (now.getMonth() + 1);
  const targetYear = parseInt(year) || now.getFullYear();

  try {
    const result = await pool.query(
      `SELECT b.*,
        json_build_object('id', c.id, 'name', c.name, 'icon', c.icon, 'color', c.color, 'type', c.type) AS category
       FROM budgets b
       LEFT JOIN categories c ON b.category_id = c.id
       WHERE b.user_id = $1 AND b.month = $2 AND b.year = $3`,
      [req.user.id, targetMonth, targetYear]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar metas' });
  }
});

// POST /budgets — cria ou atualiza (upsert por category_id + mês/ano)
router.post('/', authMiddleware, async (req, res) => {
  const { category_id, amount, month, year } = req.body;
  const now = new Date();
  const targetMonth = parseInt(month) || (now.getMonth() + 1);
  const targetYear = parseInt(year) || now.getFullYear();

  if (!amount) {
    return res.status(400).json({ error: 'Campo obrigatório: amount' });
  }

  try {
    // Verifica se já existe
    const existing = await pool.query(
      `SELECT id FROM budgets
       WHERE user_id = $1 AND month = $2 AND year = $3
         AND (category_id = $4 OR (category_id IS NULL AND $4 IS NULL))`,
      [req.user.id, targetMonth, targetYear, category_id || null]
    );

    let result;
    if (existing.rows.length > 0) {
      result = await pool.query(
        'UPDATE budgets SET amount = $1 WHERE id = $2 RETURNING *',
        [amount, existing.rows[0].id]
      );
    } else {
      result = await pool.query(
        `INSERT INTO budgets (user_id, category_id, amount, month, year)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [req.user.id, category_id || null, amount, targetMonth, targetYear]
      );
    }
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao salvar meta' });
  }
});

// DELETE /budgets/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM budgets WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Meta não encontrada' });
    }
    res.json({ message: 'Meta excluída' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir meta' });
  }
});

module.exports = router;
