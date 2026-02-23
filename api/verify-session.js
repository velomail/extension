/**
 * Vercel serverless function: verify Stripe Checkout Session and return { ok: true } if paid.
 * Used by the VeloMail extension to unlock lifetime access after purchase.
 *
 * Deploy this repo to Vercel; set STRIPE_SECRET_KEY in Vercel project Environment Variables.
 * Endpoint: GET /api/verify-session?session_id=cs_xxx
 */

const Stripe = require('stripe');

const cors = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };

function json(res, status, body) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  res.status(status).json(body);
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(204).end();
  }

  const sessionId = req.query?.session_id || (req.body && req.body.session_id);
  if (!sessionId || !sessionId.startsWith('cs_')) {
    return json(res, 400, { ok: false, error: 'Missing or invalid session_id.' });
  }

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    console.error('STRIPE_SECRET_KEY not set');
    return json(res, 500, { ok: false, error: 'Server configuration error.' });
  }

  try {
    const stripe = new Stripe(secret);
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === 'paid' && session.status === 'complete') {
      return json(res, 200, { ok: true });
    }

    return json(res, 400, { ok: false, error: 'Session not paid or not complete.' });
  } catch (err) {
    console.error('Stripe verify-session error:', err.message);
    const code = err.type === 'StripeInvalidRequestError' ? 400 : 500;
    return json(res, code, { ok: false, error: err.message || 'Verification failed.' });
  }
}
