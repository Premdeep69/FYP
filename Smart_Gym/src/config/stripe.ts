import { loadStripe } from '@stripe/stripe-js';

// Replace with your actual Stripe publishable key
const stripePublishableKey = 'pk_test_your_stripe_publishable_key_here';

export const stripePromise = loadStripe(stripePublishableKey);