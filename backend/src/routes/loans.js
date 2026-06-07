const express = require('express');
const pool = require('../database/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /loans — List all loans with payments
router.get('/', authMiddleware, async (req, res) => {
  try {
    const loans = await pool.query(
      'SELECT * FROM loans WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );

    const loansWithPayments = await Promise.all(
      loans.rows.map(async (loan) => {
        const payments = await pool.query(
          'SELECT * FROM loan_payments WHERE loan_id = $1 ORDER BY date ASC',
          [loan.id]
        );
        return { ...loan, payments: payments.rows };
      })
    );

    res.json(loansWithPayments);
  } catch (err) {
    console.error('Erro ao buscar empréstimos:', err);
    res.status(500).json({ error: 'Erro ao buscar empréstimos' });
  }
});

// POST /loans — Create loan
router.post('/', authMiddleware, async (req, res) => {
  const {
    name, type, principal_amount, interest_rate,
    interest_period, interest_type, start_date,
    number_of_installments, status
  } = req.body;

  if (!name || !type || !principal_amount) {
    return res.status(400).json({ error: 'Campos obrigatórios: name, type, principal_amount' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO loans
        (user_id, name, type, principal_amount, interest_rate, interest_period, interest_type, start_date, number_of_installments, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        req.user.id, name, type, principal_amount,
        interest_rate || 0, interest_period || 'monthly',
        interest_type || 'simple', start_date || new Date(),
        number_of_installments || null, status || 'active'
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao criar empréstimo:', err);
    res.status(500).json({ error: 'Erro ao criar empréstimo' });
  }
});

// PUT /loans/:id — Update loan
router.put('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const {
    name, type, principal_amount, interest_rate,
    interest_period, interest_type, start_date,
    number_of_installments, status
  } = req.body;

  try {
    const result = await pool.query(
      `UPDATE loans SET
        name = COALESCE($1, name),
        type = COALESCE($2, type),
        principal_amount = COALESCE($3, principal_amount),
        interest_rate = COALESCE($4, interest_rate),
        interest_period = COALESCE($5, interest_period),
        interest_type = COALESCE($6, interest_type),
        start_date = COALESCE($7, start_date),
        number_of_installments = COALESCE($8, number_of_installments),
        status = COALESCE($9, status),
        updated_at = NOW()
       WHERE id = $10 AND user_id = $11
       RETURNING *`,
      [
        name, type, principal_amount, interest_rate,
        interest_period, interest_type, start_date,
        number_of_installments, status, id, req.user.id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Empréstimo não encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao atualizar empréstimo:', err);
    res.status(500).json({ error: 'Erro ao atualizar empréstimo' });
  }
});

// DELETE /loans/:id — Delete loan
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM loans WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Empréstimo não encontrado' });
    }
    res.json({ message: 'Empréstimo removido' });
  } catch (err) {
    console.error('Erro ao excluir empréstimo:', err);
    res.status(500).json({ error: 'Erro ao excluir empréstimo' });
  }
});

// PATCH /loans/:id/integration — Toggle dashboard integration
router.patch('/:id/integration', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { integrate_in_dashboard } = req.body;

  try {
    const result = await pool.query(
      `UPDATE loans SET integrate_in_dashboard = $1, updated_at = NOW()
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [integrate_in_dashboard, id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Empréstimo não encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao atualizar integração:', err);
    res.status(500).json({ error: 'Erro ao atualizar integração' });
  }
});

// POST /loans/:id/payments — Create payment for a loan
router.post('/:id/payments', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { amount, date, note, installment_number } = req.body;

  if (!amount || !date) {
    return res.status(400).json({ error: 'Campos obrigatórios: amount, date' });
  }

  try {
    // Verify loan belongs to user
    const loan = await pool.query(
      'SELECT id FROM loans WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    if (loan.rows.length === 0) {
      return res.status(404).json({ error: 'Empréstimo não encontrado' });
    }

    const result = await pool.query(
      `INSERT INTO loan_payments (loan_id, amount, date, note, installment_number)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [id, amount, date, note || null, installment_number || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao criar pagamento:', err);
    res.status(500).json({ error: 'Erro ao criar pagamento' });
  }
});

// POST /loans/:id/payments/batch — Batch insert payments
router.post('/:id/payments/batch', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const payments = req.body;

  if (!Array.isArray(payments) || payments.length === 0) {
    return res.status(400).json({ error: 'Body deve ser um array de pagamentos' });
  }

  try {
    // Verify loan belongs to user
    const loan = await pool.query(
      'SELECT id FROM loans WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    if (loan.rows.length === 0) {
      return res.status(404).json({ error: 'Empréstimo não encontrado' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const inserted = [];
      for (const p of payments) {
        const result = await client.query(
          `INSERT INTO loan_payments (loan_id, amount, date, note, installment_number)
           VALUES ($1,$2,$3,$4,$5)
           RETURNING *`,
          [id, p.amount, p.date, p.note || null, p.installment_number || null]
        );
        inserted.push(result.rows[0]);
      }

      await client.query('COMMIT');
      res.status(201).json(inserted);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Erro ao inserir pagamentos em lote:', err);
    res.status(500).json({ error: 'Erro ao inserir pagamentos em lote' });
  }
});

// DELETE /loans/:id/payments — Delete all payments for a loan
router.delete('/:id/payments', authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    // Verify loan belongs to user
    const loan = await pool.query(
      'SELECT id FROM loans WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    if (loan.rows.length === 0) {
      return res.status(404).json({ error: 'Empréstimo não encontrado' });
    }

    await pool.query('DELETE FROM loan_payments WHERE loan_id = $1', [id]);
    res.json({ message: 'Pagamentos removidos' });
  } catch (err) {
    console.error('Erro ao excluir pagamentos:', err);
    res.status(500).json({ error: 'Erro ao excluir pagamentos' });
  }
});

// PUT /loans/:id/payments/replace — Replace all payments (delete + insert)
router.put('/:id/payments/replace', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const payments = req.body;

  if (!Array.isArray(payments)) {
    return res.status(400).json({ error: 'Body deve ser um array de pagamentos' });
  }

  try {
    // Verify loan belongs to user
    const loan = await pool.query(
      'SELECT id FROM loans WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    if (loan.rows.length === 0) {
      return res.status(404).json({ error: 'Empréstimo não encontrado' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Delete existing payments
      await client.query('DELETE FROM loan_payments WHERE loan_id = $1', [id]);

      // Insert new payments
      const inserted = [];
      for (const p of payments) {
        const result = await client.query(
          `INSERT INTO loan_payments (loan_id, amount, date, note, installment_number)
           VALUES ($1,$2,$3,$4,$5)
           RETURNING *`,
          [id, p.amount, p.date, p.note || null, p.installment_number || null]
        );
        inserted.push(result.rows[0]);
      }

      await client.query('COMMIT');
      res.json(inserted);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Erro ao substituir pagamentos:', err);
    res.status(500).json({ error: 'Erro ao substituir pagamentos' });
  }
});

// POST /loans/:id/sync-transactions — Sync loan to transactions
router.post('/:id/sync-transactions', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { transactions } = req.body;

  if (!Array.isArray(transactions)) {
    return res.status(400).json({ error: 'Campo obrigatório: transactions (array)' });
  }

  try {
    // Verify loan belongs to user
    const loan = await pool.query(
      'SELECT id FROM loans WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    if (loan.rows.length === 0) {
      return res.status(404).json({ error: 'Empréstimo não encontrado' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Delete existing transactions linked to this loan
      await client.query(
        'DELETE FROM transactions WHERE loan_id = $1 AND user_id = $2',
        [id, req.user.id]
      );

      // Insert new transactions
      const inserted = [];
      for (const t of transactions) {
        const result = await client.query(
          `INSERT INTO transactions
            (user_id, type, category_id, amount, description, date, payment_method, loan_id, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           RETURNING *`,
          [
            req.user.id, t.type, t.category_id || null,
            t.amount, t.description || null, t.date,
            t.payment_method || 'transfer', id, t.status || 'paid'
          ]
        );
        inserted.push(result.rows[0]);
      }

      await client.query('COMMIT');
      res.json(inserted);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Erro ao sincronizar transações:', err);
    res.status(500).json({ error: 'Erro ao sincronizar transações' });
  }
});

module.exports = router;
