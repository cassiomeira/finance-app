// Validadores simples e sem dependência para os inputs mais sensíveis.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = parseInt(process.env.MIN_PASSWORD_LENGTH) || 8;

function isValidEmail(email) {
  return typeof email === 'string' && email.length <= 254 && EMAIL_RE.test(email);
}

function passwordIssue(password) {
  if (typeof password !== 'string') return 'Senha inválida';
  if (password.length < MIN_PASSWORD) return `A senha deve ter no mínimo ${MIN_PASSWORD} caracteres`;
  if (password.length > 200) return 'Senha muito longa';
  return null;
}

// Normaliza um valor monetário vindo do cliente. Retorna { value } ou { error }.
function parseAmount(raw) {
  const n = typeof raw === 'string' ? Number(raw) : raw;
  if (typeof n !== 'number' || !Number.isFinite(n)) return { error: 'Valor inválido' };
  if (n <= 0) return { error: 'O valor deve ser maior que zero' };
  if (n > 1_000_000_000) return { error: 'Valor acima do limite permitido' };
  return { value: n };
}

module.exports = { isValidEmail, passwordIssue, parseAmount, MIN_PASSWORD };
