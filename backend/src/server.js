require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── CORS ────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ─── WEBHOOK STRIPE (precisa de raw body, ANTES do express.json) ──────────────
const stripeRouter = require('./routes/stripe');
app.use('/stripe/webhook', express.raw({ type: 'application/json' }), (req, res, next) => {
  // Repassa para o router já com raw body
  stripeRouter(req, res, next);
});

// ─── BODY PARSERS ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── ARQUIVOS ESTÁTICOS (uploads) ─────────────────────────────────────────────
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadDir));

// ─── ROTAS ────────────────────────────────────────────────────────────────────
app.use('/auth', require('./routes/auth'));
app.use('/profiles', require('./routes/profiles'));
app.use('/categories', require('./routes/categories'));
app.use('/transactions', require('./routes/transactions'));
app.use('/credit-cards', require('./routes/creditCards'));
app.use('/reminders', require('./routes/reminders'));
app.use('/budgets', require('./routes/budgets'));
app.use('/purchases', require('./routes/purchases'));
app.use('/loans', require('./routes/loans'));
app.use('/stripe', stripeRouter);
app.use('/upload', require('./routes/upload'));

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Rota ${req.method} ${req.path} não encontrada` });
});

// ─── ERRO GLOBAL ──────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Finance App Backend rodando na porta ${PORT}`);
  console.log(`   Ambiente: ${process.env.NODE_ENV || 'development'}`);
});
