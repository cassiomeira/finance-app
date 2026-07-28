const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimit');

const router = express.Router();

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest';

// POST /ai/gemini — proxy autenticado para a API do Gemini.
// A chave fica só no servidor; o cliente envia apenas o payload `contents`.
router.post('/gemini', authMiddleware, aiLimiter, async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'IA não configurada neste servidor' });
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
