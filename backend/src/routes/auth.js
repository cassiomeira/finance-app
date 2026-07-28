const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const pool = require('../database/db');
const { authMiddleware } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');
const { isValidEmail, passwordIssue } = require('../middleware/validators');

const router = express.Router();

// POST /auth/signup
router.post('/signup', authLimiter, async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Email inválido' });
  }

  const pwIssue = passwordIssue(password);
  if (pwIssue) {
    return res.status(400).json({ error: pwIssue });
  }

  if (name != null && (typeof name !== 'string' || name.length > 120)) {
    return res.status(400).json({ error: 'Nome inválido' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verifica se já existe
    const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const userId = uuidv4();
    const userName = name || email.split('@')[0];

    // Cria usuário
    await client.query(
      'INSERT INTO users (id, email, password_hash, name) VALUES ($1, $2, $3, $4)',
      [userId, email, passwordHash, userName]
    );

    // Cria perfil
    await client.query(
      'INSERT INTO profiles (id, email, name) VALUES ($1, $2, $3)',
      [userId, email, userName]
    );

    // Se for o email admin, atribui role de admin
    const adminEmail = process.env.ADMIN_EMAIL || 'cassiomeiraelis@gmail.com';
    if (email === adminEmail) {
      await client.query(
        "INSERT INTO user_roles (user_id, role) VALUES ($1, 'admin') ON CONFLICT DO NOTHING",
        [userId]
      );
    }

    await client.query('COMMIT');

    const token = jwt.sign(
      { userId, email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      user: { id: userId, email, name: userName },
      session: { access_token: token, token_type: 'bearer' }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro no signup:', err);
    res.status(500).json({ error: 'Erro ao criar conta' });
  } finally {
    client.release();
  }
});

// POST /auth/signin
router.post('/signin', authLimiter, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }

  try {
    const result = await pool.query(
      'SELECT id, email, name, password_hash FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      user: { id: user.id, email: user.email, name: user.name },
      session: { access_token: token, token_type: 'bearer' }
    });
  } catch (err) {
    console.error('Erro no signin:', err);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

// POST /auth/signout
router.post('/signout', authMiddleware, (req, res) => {
  // JWT é stateless — o cliente apenas descarta o token
  res.json({ message: 'Logout realizado com sucesso' });
});

// GET /auth/user
router.get('/user', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, name, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    res.json({ user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
});

// PUT /auth/user — atualiza nome/senha
router.put('/user', authMiddleware, async (req, res) => {
  const { name, password } = req.body;

  if (name != null && (typeof name !== 'string' || name.length > 120)) {
    return res.status(400).json({ error: 'Nome inválido' });
  }
  if (password != null) {
    const pwIssue = passwordIssue(password);
    if (pwIssue) return res.status(400).json({ error: pwIssue });
  }

  try {
    if (name) {
      await pool.query('UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2', [name, req.user.id]);
      await pool.query('UPDATE profiles SET name = $1, updated_at = NOW() WHERE id = $2', [name, req.user.id]);
    }
    if (password) {
      const hash = await bcrypt.hash(password, 12);
      await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, req.user.id]);
    }
    res.json({ message: 'Usuário atualizado com sucesso' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
});

module.exports = router;
