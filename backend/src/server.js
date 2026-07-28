require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { apiLimiter } = require('./middleware/rateLimit');

// ─── VALIDAÇÃO DE BOOT ────────────────────────────────────────────────────────
// Falha cedo e alto se o segredo do JWT não estiver configurado, em vez de
// quebrar em runtime no primeiro login/cadastro.
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
  console.error('❌ JWT_SECRET ausente ou muito curto. Configure uma variável de ambiente JWT_SECRET forte (>= 16 caracteres).');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3001;

// Roda atrás do nginx/Coolify — confia no proxy para IP correto (rate limit).
app.set('trust proxy', 1);

// ─── SEGURANÇA (headers) ──────────────────────────────────────────────────────
app.use(helmet());

// ─── CORS ────────────────────────────────────────────────────────────────────
// Allowlist por env. CORS_ORIGINS pode ser uma lista separada por vírgula.
// Em produção, defina CORS_ORIGINS (ex.: https://app.seudominio.com).
const allowedOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    // Permite requisições sem Origin (apps mobile/curl/same-origin via nginx)
    // e, se nenhuma allowlist foi configurada, mantém comportamento aberto
    // (mas logando um aviso) para não quebrar deploys existentes.
    if (!origin) return callback(null, true);
    if (allowedOrigins.length === 0) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origem não permitida pelo CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

if (allowedOrigins.length === 0) {
  console.warn('⚠️  CORS aberto (sem CORS_ORIGINS/FRONTEND_URL). Defina CORS_ORIGINS em produção.');
}

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

// ─── RATE LIMIT GERAL ─────────────────────────────────────────────────────────
app.use(apiLimiter);

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
app.use('/ai', require('./routes/ai'));

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
