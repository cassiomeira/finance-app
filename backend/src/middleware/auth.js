const jwt = require('jsonwebtoken');
const pool = require('../database/db');

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Busca o usuário no banco para garantir que ainda existe
    const result = await pool.query(
      'SELECT id, email, name FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    req.user = result.rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }
    return res.status(401).json({ error: 'Token inválido' });
  }
}

async function adminMiddleware(req, res, next) {
  try {
    await authMiddleware(req, res, async () => {
      const result = await pool.query(
        "SELECT id FROM user_roles WHERE user_id = $1 AND role = 'admin'",
        [req.user.id]
      );
      if (result.rows.length === 0) {
        return res.status(403).json({ error: 'Acesso negado: requer permissão de admin' });
      }
      next();
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
}

module.exports = { authMiddleware, adminMiddleware };
