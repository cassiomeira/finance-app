const express = require('express');
const pool = require('../database/db');
const { authMiddleware } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Configuração do multer para upload de comprovantes
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `receipt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não suportado'));
    }
  }
});

// GET /purchases
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM purchases ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar compras' });
  }
});

// PUT /purchases/:id
router.put('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const allowedFields = [
    'item', 'client', 'supplier', 'quantity', 'received_quantity',
    'amount', 'freight', 'installments', 'status', 'observation',
    'receipt_url', 'purchase_date', 'batch_id', 'last_notification_request'
  ];

  const fields = Object.keys(updates).filter(k => allowedFields.includes(k));
  if (fields.length === 0) {
    return res.status(400).json({ error: 'Nenhum campo válido para atualizar' });
  }

  const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
  const values = fields.map(f => updates[f]);
  values.push(id);

  try {
    const result = await pool.query(
      `UPDATE purchases SET ${setClause}, updated_at = NOW()
       WHERE id = $${values.length}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Compra não encontrada' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar compra' });
  }
});

// DELETE /purchases/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM purchases WHERE id = $1 RETURNING id',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Compra não encontrada' });
    }
    res.json({ message: 'Compra removida' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir compra' });
  }
});

// POST /purchases/upload-receipt — upload de comprovante
router.post('/upload-receipt', authMiddleware, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }

  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.json({ url: fileUrl });
});

module.exports = router;
