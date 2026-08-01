const express = require('express');
const pool = require('../database/db');
const { authMiddleware } = require('../middleware/auth');
const { currentMonthTransactionCount, cardCount } = require('../middleware/plan');
const { encrypt } = require('../utils/crypto');

const router = express.Router();

// GET /profiles/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM profiles WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Perfil não encontrado' });
    }

    // Sobrescreve o contador persistido (que nunca resetava) pela contagem
    // real do mês corrente, para o limite do plano refletir a verdade.
    const [txCount, cards] = await Promise.all([
      currentMonthTransactionCount(req.user.id),
      cardCount(req.user.id),
    ]);

    // Nunca expõe a chave Gemini guardada; só informa se existe uma.
    const { gemini_api_key, ...safe } = result.rows[0];
    res.json({
      ...safe,
      has_gemini_key: !!gemini_api_key,
      monthly_transaction_count: txCount,
      credit_card_count: cards,
    });
  } catch (err) {
    console.error('Erro ao buscar perfil:', err);
    res.status(500).json({ error: 'Erro ao buscar perfil' });
  }
});

// PUT /profiles/me
router.put('/me', authMiddleware, async (req, res) => {
  const { name, avatar_url } = req.body;
  try {
    const result = await pool.query(
      `UPDATE profiles SET
        name = COALESCE($1, name),
        avatar_url = COALESCE($2, avatar_url),
        updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [name, avatar_url, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar perfil' });
  }
});

// PUT /profiles/gemini-key — salva (criptografada) ou limpa a chave Gemini do usuário.
// Envie { key: "AIza..." } para salvar, ou { key: "" } para remover.
router.put('/gemini-key', authMiddleware, async (req, res) => {
  const { key } = req.body || {};
  if (key != null && typeof key !== 'string') {
    return res.status(400).json({ error: 'Chave inválida' });
  }
  const trimmed = (key || '').trim();
  if (trimmed.length > 500) {
    return res.status(400).json({ error: 'Chave muito longa' });
  }
  try {
    const enc = trimmed ? encrypt(trimmed) : null;
    await pool.query(
      'UPDATE profiles SET gemini_api_key = $1, updated_at = NOW() WHERE id = $2',
      [enc, req.user.id]
    );
    res.json({ has_gemini_key: !!enc });
  } catch (err) {
    console.error('Erro ao salvar chave Gemini:', err);
    res.status(500).json({ error: 'Erro ao salvar chave' });
  }
});

// GET /profiles/is-admin
router.get('/is-admin', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id FROM user_roles WHERE user_id = $1 AND role = 'admin'",
      [req.user.id]
    );
    res.json({ is_admin: result.rows.length > 0 });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao verificar admin' });
  }
});

module.exports = router;
