import Stripe from 'stripe';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Ensure env is loaded — resolve relative to this file so it works from any cwd
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

let stripe = null;

const key = process.env.STRIPE_SECRET_KEY;
if (key && !key.includes('your_stripe')) {
  try {
    stripe = new Stripe(key, { apiVersion: '2023-10-16' });
    console.log('✓ Stripe initialized successfully');
  } catch (error) {
    console.warn('⚠ Stripe initialization failed:', error.message);
  }
} else {
  console.warn('⚠ Stripe not configured - payment features will be limited');
}

export default stripe;
