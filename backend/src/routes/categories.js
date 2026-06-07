const express = require('express');
const pool = require('../database/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /categories — padrão + do próprio usuário
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM categories
       WHERE is_default = true OR user_id = $1
       ORDER BY name`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar categorias' });
  }
});

// POST /categories
router.post('/', authMiddleware, async (req, res) => {
  const { name, icon, color, type } = req.body;

  if (!name || !icon || !color || !type) {
    return res.status(400).json({ error: 'Campos obrigatórios: name, icon, color, type' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO categories (user_id, name, icon, color, type, is_default)
       VALUES ($1, $2, $3, $4, $5, false)
       RETURNING *`,
      [req.user.id, name, icon, color, type]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar categoria' });
  }
});

// PUT /categories/:id
router.put('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { name, icon, color } = req.body;

  try {
    const result = await pool.query(
      `UPDATE categories SET
        name = COALESCE($1, name),
        icon = COALESCE($2, icon),
        color = COALESCE($3, color)
       WHERE id = $4 AND user_id = $5 AND is_default = false
       RETURNING *`,
      [name, icon, color, id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Categoria não encontrada ou não pode ser editada' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar categoria' });
  }
});

// DELETE /categories/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `DELETE FROM categories
       WHERE id = $1 AND user_id = $2 AND is_default = false
       RETURNING id`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Categoria não encontrada ou não pode ser deletada' });
    }
    res.json({ message: 'Categoria removida' });
  } catch (err) {
    if (err.code === '23503') {
      return res.status(400).json({ error: 'Categoria está em uso por transações' });
    }
    res.status(500).json({ error: 'Erro ao deletar categoria' });
  }
});

module.exports = router;
