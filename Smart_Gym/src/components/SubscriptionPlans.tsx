import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Star } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiService } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

interface Plan {
  id: string;
  name: string;
  price: number;
  interval: 'month' | 'year';
  stripePriceId: string;
  features: string[];
  popular?: boolean;
  description: string;
}

const plans: Plan[] = [
  {
    id: 'basic',
    name: 'Basic',
    price: 29,
    interval: 'month',
    stripePriceId: 'price_basic_monthly', // Replace with actual Stripe price ID
    description: 'Perfect for getting started',
    features: [
      'Access to exercise library',
      'Basic workout plans',
      'Progress tracking',
      'Community support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 59,
    interval: 'month',
    stripePriceId: 'price_pro_monthly', // Replace with actual Stripe price ID
    description: 'Most popular choice',
    popular: true,
    features: [
      'Everything in Basic',
      'Unlimited trainer sessions',
      'Custom workout plans',
      'Nutrition guidance',
      'Priority support',
      'Advanced analytics',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 99,
    interval: 'month',
    stripePriceId: 'price_premium_monthly', // Replace with actual Stripe price ID
    description: 'For serious fitness enthusiasts',
    features: [
      'Everything in Pro',
      '1-on-1 coaching sessions',
      'Meal planning',
      'Supplement recommendations',
      'Body composition analysis',
      'Exclusive content',
    ],
  },
];

const SubscriptionPlans: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (plan: Plan) => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to subscribe to a plan',
        variant: 'destructive',
      });
      return;
    }

    setLoading(plan.id);

    try {
      const response = await apiService.createSubscription(plan.stripePriceId, plan.name);
      
      // Redirect to Stripe Checkout or handle client secret
      if (response.clientSecret) {
        // Handle payment confirmation here
        toast({
          title: 'Subscription Created',
          description: 'Please complete your payment to activate your subscription',
        });
      }
    } catch (error: any) {
      console.error('Subscription error:', error);
      
      // Check for configuration errors
      if (error.message?.includes('not configured') || error.message?.includes('authentication failed')) {
        toast({
          title: 'Payment System Not Configured',
          description: 'Stripe payment system needs to be configured. Please contact the administrator or check STRIPE_SETUP_GUIDE.md',
          variant: 'destructive',
        });
      } else if (error.message?.includes('Invalid Stripe price ID')) {
        toast({
          title: 'Configuration Error',
          description: 'Subscription plans need to be configured in Stripe. Please check STRIPE_SETUP_GUIDE.md',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Subscription Failed',
          description: error.message || 'Failed to create subscription',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="py-12">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
            Choose Your Plan
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Select the perfect plan for your fitness journey. All plans include our core features
            with additional benefits as you upgrade.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative p-8 ${
                plan.popular
                  ? 'border-primary shadow-lg scale-105'
                  : 'border-border'
              }`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary">
                  <Star className="w-3 h-3 mr-1" />
                  Most Popular
                </Badge>
              )}

              <div className="text-center mb-6">
                <h3 className="text-2xl font-heading font-bold mb-2">{plan.name}</h3>
                <p className="text-muted-foreground mb-4">{plan.description}</p>
                <div className="mb-4">
                  <span className="text-4xl font-bold">${plan.price}</span>
                  <span className="text-muted-foreground">/{plan.interval}</span>
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-primary flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => handleSubscribe(plan)}
                disabled={loading === plan.id}
                className={`w-full ${
                  plan.popular
                    ? 'bg-primary hover:bg-primary/90'
                    : ''
                }`}
                variant={plan.popular ? 'default' : 'outline'}
              >
                {loading === plan.id ? 'Processing...' : `Subscribe to ${plan.name}`}
              </Button>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-sm text-muted-foreground">
            All plans include a 7-day free trial. Cancel anytime.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPlans;