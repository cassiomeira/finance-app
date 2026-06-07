const express = require('express');
const pool = require('../database/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /reminders
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM reminders WHERE user_id = $1 ORDER BY date ASC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar lembretes' });
  }
});

// POST /reminders
router.post('/', authMiddleware, async (req, res) => {
  const { title, description, date, type, notification_id } = req.body;

  if (!title || !date || !type) {
    return res.status(400).json({ error: 'Campos obrigatórios: title, date, type' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO reminders (user_id, title, description, date, type, notification_id, is_completed)
       VALUES ($1, $2, $3, $4, $5, $6, false)
       RETURNING *`,
      [req.user.id, title, description || null, date, type, notification_id || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar lembrete' });
  }
});

// PUT /reminders/:id
router.put('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { title, date, type, description } = req.body;

  try {
    const result = await pool.query(
      `UPDATE reminders SET
        title = COALESCE($1, title),
        date = COALESCE($2, date),
        type = COALESCE($3, type),
        description = COALESCE($4, description)
       WHERE id = $5 AND user_id = $6
       RETURNING *`,
      [title, date, type, description, id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lembrete não encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar lembrete' });
  }
});

// PATCH /reminders/:id/toggle — marca/desmarca como concluído
router.patch('/:id/toggle', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `UPDATE reminders
       SET is_completed = NOT is_completed
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lembrete não encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar lembrete' });
  }
});

// DELETE /reminders/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM reminders WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lembrete não encontrado' });
    }
    res.json({ message: 'Lembrete removido' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir lembrete' });
  }
});

module.exports = router;
