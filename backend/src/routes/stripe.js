const express = require('express');
const pool = require('../database/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// POST /stripe/create-checkout
router.post('/create-checkout', authMiddleware, async (req, res) => {
  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(503).json({ error: 'Pagamentos não configurados neste servidor' });
  }

  const Stripe = require('stripe');
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    const { origin } = req.body;
    const baseUrl = origin || process.env.FRONTEND_URL || 'http://localhost:5173';

    // Busca ou cria customer no Stripe
    const profile = await pool.query(
      'SELECT stripe_customer_id FROM profiles WHERE id = $1',
      [req.user.id]
    );

    let customerId = profile.rows[0]?.stripe_customer_id;

    if (!customerId) {
      const customers = await stripe.customers.list({ email: req.user.email, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      } else {
        const customer = await stripe.customers.create({
          email: req.user.email,
          metadata: { user_id: req.user.id }
        });
        customerId = customer.id;
      }

      await pool.query(
        'UPDATE profiles SET stripe_customer_id = $1 WHERE id = $2',
        [customerId, req.user.id]
      );
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{
        price_data: {
          currency: 'brl',
          product_data: {
            name: 'FinanceApp Premium',
            description: 'Lançamentos ilimitados, múltiplos cartões, exportação PDF e muito mais!'
          },
          unit_amount: parseInt(process.env.STRIPE_PRICE_AMOUNT) || 1990,
          recurring: { interval: 'month' }
        },
        quantity: 1
      }],
      mode: 'subscription',
      success_url: `${baseUrl}/subscription?success=true`,
      cancel_url: `${baseUrl}/subscription?canceled=true`
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Erro no checkout:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /stripe/create-portal-session
router.post('/create-portal-session', authMiddleware, async (req, res) => {
  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(503).json({ error: 'Pagamentos não configurados neste servidor' });
  }

  const Stripe = require('stripe');
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    const { origin } = req.body;
    const baseUrl = origin || process.env.FRONTEND_URL || 'http://localhost:5173';

    // Busca customer ID do perfil
    const profile = await pool.query(
      'SELECT stripe_customer_id FROM profiles WHERE id = $1',
      [req.user.id]
    );

    const customerId = profile.rows[0]?.stripe_customer_id;

    if (!customerId) {
      return res.status(400).json({ error: 'Nenhuma assinatura encontrada' });
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${baseUrl}/subscription`,
    });

    res.json({ url: portalSession.url });
  } catch (err) {
    console.error('Erro no portal:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /stripe/sync-subscription — sincronização ATIVA (sem webhook).
// O app pergunta ao Stripe se o cliente tem assinatura ativa e atualiza o
// perfil. Usado quando não há webhook disponível (ex.: servidor sem HTTPS).
// Chamada de saída para o Stripe — funciona mesmo em HTTP.
router.post('/sync-subscription', authMiddleware, async (req, res) => {
  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(503).json({ error: 'Pagamentos não configurados neste servidor' });
  }

  const Stripe = require('stripe');
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    const profile = await pool.query(
      'SELECT stripe_customer_id FROM profiles WHERE id = $1',
      [req.user.id]
    );
    const customerId = profile.rows[0]?.stripe_customer_id;

    // Sem customer no Stripe = nunca assinou = free.
    if (!customerId) {
      await pool.query(
        "UPDATE profiles SET subscription_status = 'free' WHERE id = $1 AND subscription_status <> 'free'",
        [req.user.id]
      );
      return res.json({ subscription_status: 'free' });
    }

    const subs = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 10,
    });

    const activeSub = subs.data.find(s => s.status === 'active' || s.status === 'trialing');
    const hadCanceled = subs.data.some(s => ['canceled', 'unpaid', 'incomplete_expired'].includes(s.status));

    let status;
    let subId = null;
    if (activeSub) {
      status = 'premium';
      subId = activeSub.id;
    } else if (hadCanceled) {
      status = 'cancelled';
    } else {
      status = 'free';
    }

    await pool.query(
      'UPDATE profiles SET subscription_status = $1, stripe_subscription_id = $2, updated_at = NOW() WHERE id = $3',
      [status, subId, req.user.id]
    );

    res.json({ subscription_status: status });
  } catch (err) {
    console.error('Erro ao sincronizar assinatura:', err);
    res.status(500).json({ error: 'Erro ao sincronizar assinatura' });
  }
});

// POST /stripe/webhook — recebe eventos do Stripe
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(503).json({ error: 'Pagamentos não configurados' });
  }

  const Stripe = require('stripe');
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  // Fail-closed: sem segredo de webhook configurado, nunca confiar no payload.
  // Caso contrário qualquer um poderia POSTar um evento forjado e virar premium.
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('STRIPE_WEBHOOK_SECRET não configurado — webhook rejeitado.');
    return res.status(503).json({ error: 'Webhook não configurado' });
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.subscription && session.customer) {
          await pool.query(
            `UPDATE profiles SET subscription_status = 'premium', stripe_subscription_id = $1
             WHERE stripe_customer_id = $2`,
            [session.subscription, session.customer]
          );
        }
        break;
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const status = sub.status === 'active' ? 'premium' : 'free';
        await pool.query(
          'UPDATE profiles SET subscription_status = $1 WHERE stripe_subscription_id = $2',
          [status, sub.id]
        );
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        await pool.query(
          `UPDATE profiles SET subscription_status = 'cancelled', stripe_subscription_id = NULL
           WHERE stripe_subscription_id = $1`,
          [sub.id]
        );
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        await pool.query(
          `UPDATE profiles SET subscription_status = 'free' WHERE stripe_customer_id = $1`,
          [invoice.customer]
        );
        break;
      }
    }
    res.json({ received: true });
  } catch (err) {
    console.error('Erro no webhook:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
