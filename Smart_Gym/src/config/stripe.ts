import { loadStripe } from '@stripe/stripe-js';

// Stripe publishable key
const stripePublishableKey = 'pk_test_51T8NDWCqlCjzmsfq0wSNWEu2Uf3UbRxGm8GeK5GdY4cglfVBZDjI0c2xjPBdAHBIlauxSgiCcnHvUWVm1SKrGR0500ES5ok34h';

export const stripePromise = loadStripe(stripePublishableKey);