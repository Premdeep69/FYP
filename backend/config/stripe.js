import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

let stripe = null;

if (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.includes('your_stripe')) {
  try {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });
    console.log('✓ Stripe initialized successfully');
  } catch (error) {
    console.warn('⚠ Stripe initialization failed:', error.message);
  }
} else {
  console.warn('⚠ Stripe not configured - payment features will be limited');
}

export default stripe;