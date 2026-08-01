const crypto = require('crypto');

// Criptografia simétrica (AES-256-GCM) para guardar segredos do usuário
// (ex.: a chave Gemini própria) sem deixá-los em texto puro no banco.
// A chave de criptografia deriva de DATA_ENCRYPTION_KEY (ou, na falta, do
// JWT_SECRET). Se esse segredo mudar, os valores guardados ficam ilegíveis
// e o usuário precisa cadastrar a chave de novo — comportamento aceitável.

const ALGO = 'aes-256-gcm';

function getKey() {
  const secret = process.env.DATA_ENCRYPTION_KEY || process.env.JWT_SECRET || 'fallback-dev-secret';
  return crypto.createHash('sha256').update(secret).digest(); // 32 bytes
}

function encrypt(plain) {
  if (plain == null || plain === '') return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`;
}

function decrypt(stored) {
  if (!stored) return null;
  try {
    const [ivb, tagb, encb] = String(stored).split(':');
    if (!ivb || !tagb || !encb) return null;
    const decipher = crypto.createDecipheriv(ALGO, getKey(), Buffer.from(ivb, 'base64'));
    decipher.setAuthTag(Buffer.from(tagb, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(encb, 'base64')), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}

module.exports = { encrypt, decrypt };
