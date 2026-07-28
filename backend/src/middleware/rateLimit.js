const rateLimit = require('express-rate-limit');

// Limiter geral para toda a API — protege contra abuso/scraping.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: parseInt(process.env.RATE_LIMIT_API) || 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Tente novamente em alguns minutos.' },
});

// Limiter estrito para autenticação — protege login/cadastro de brute force.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_AUTH) || 10,
  standardHeaders: true,
  legacyHeaders: false,
  // Não conta logins bem-sucedidos contra o limite.
  skipSuccessfulRequests: true,
  message: { error: 'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.' },
});

// Limiter para chamadas de IA — controla custo do Gemini.
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: parseInt(process.env.RATE_LIMIT_AI) || 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas solicitações de IA. Aguarde um momento.' },
});

module.exports = { apiLimiter, authLimiter, aiLimiter };
