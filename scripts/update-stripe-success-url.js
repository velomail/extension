/**
 * Updates the Stripe Payment Link success URL to redirect to VeloMail's success page.
 * Run: STRIPE_SECRET_KEY=sk_xxx node scripts/update-stripe-success-url.js
 * Or on Windows: set STRIPE_SECRET_KEY=sk_xxx && node scripts/update-stripe-success-url.js
 *
 * Pass a payment link ID as first arg, or it will list links and update the first active one.
 * Example: node scripts/update-stripe-success-url.js plink_xxx
 */

const Stripe = require('stripe');

const SUCCESS_URL =
  'https://velomail.vercel.app/landing/success.html?session_id={CHECKOUT_SESSION_ID}';

async function main() {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    console.error('Error: Set STRIPE_SECRET_KEY in your environment.');
    console.error('Example: set STRIPE_SECRET_KEY=sk_live_xxx && node scripts/update-stripe-success-url.js');
    process.exit(1);
  }

  const stripe = new Stripe(secret);
  const linkId = process.argv[2];

  if (linkId) {
    // Update specific payment link by ID
    try {
      const link = await stripe.paymentLinks.update(linkId, {
        after_completion: {
          type: 'redirect',
          redirect: { url: SUCCESS_URL },
        },
      });
      console.log('Updated payment link:', link.id);
      console.log('Success URL:', SUCCESS_URL);
      console.log('Payment link URL:', link.url);
      return;
    } catch (err) {
      console.error('Failed to update:', err.message);
      process.exit(1);
    }
  }

  // List payment links and update the first active one
  const links = await stripe.paymentLinks.list({ limit: 20, active: true });
  if (links.data.length === 0) {
    console.error('No active payment links found.');
    console.error('Create one in Stripe Dashboard or pass the ID: node scripts/update-stripe-success-url.js plink_xxx');
    process.exit(1);
  }

  // Prefer the one matching our known URL slug
  const knownSlug = '5kQ00j17i7jt9oc5Y4bZe04';
  let target = links.data.find((l) => l.url && l.url.includes(knownSlug));
  if (!target) target = links.data[0];

  try {
    const updated = await stripe.paymentLinks.update(target.id, {
      after_completion: {
        type: 'redirect',
        redirect: { url: SUCCESS_URL },
      },
    });
    console.log('Updated payment link:', updated.id);
    console.log('Success URL:', SUCCESS_URL);
    console.log('Payment link URL:', updated.url);
  } catch (err) {
    console.error('Failed to update:', err.message);
    process.exit(1);
  }
}

main();
