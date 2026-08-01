const express = require('express');
const pool = require('../database/db');
const { authMiddleware } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimit');
const { isUnlimited } = require('../middleware/plan');
const { decrypt } = require('../utils/crypto');

const router = express.Router();

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest';

// Decide qual chave Gemini usar:
//  1) chave própria do usuário (se cadastrada) — economiza a cota do dono
//  2) chave compartilhada do sistema, se o usuário for Premium/admin
//  3) senão, IA indisponível (Free sem chave própria)
async function resolveApiKey(userId) {
  const prof = await pool.query('SELECT gemini_api_key FROM profiles WHERE id = $1', [userId]);
  const userKey = decrypt(prof.rows[0]?.gemini_api_key);
  if (userKey) return { key: userKey, source: 'user' };
  if (await isUnlimited(userId) && process.env.GEMINI_API_KEY) {
    return { key: process.env.GEMINI_API_KEY, source: 'shared' };
  }
  return { key: null, source: null };
}

// POST /ai/gemini — proxy autenticado para a API do Gemini.
// A chave fica só no servidor; o cliente envia apenas o payload `contents`.
router.post('/gemini', authMiddleware, aiLimiter, async (req, res) => {
  const { key: apiKey } = await resolveApiKey(req.user.id);
  if (!apiKey) {
    return res.status(402).json({
      error: 'A IA está disponível no plano Premium. Assine o Premium ou adicione sua própria chave do Gemini nas Configurações.',
      code: 'AI_REQUIRES_PLAN_OR_KEY',
    });
  }

  const { contents } = req.body || {};
  if (!Array.isArray(contents) || contents.length === 0) {
    return res.status(400).json({ error: 'Payload de IA inválido' });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({ contents }),
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const msg = data?.error?.message || `Erro ${response.status} na IA`;
      console.error('Erro Gemini:', response.status, msg);
      // Não repassa o corpo bruto do provedor ao cliente.
      return res.status(502).json({ error: 'Falha ao processar com a IA' });
    }

    res.json(data);
  } catch (err) {
    console.error('Erro no proxy da IA:', err);
    res.status(502).json({ error: 'Falha ao contatar a IA' });
  }
});

module.exports = router;
