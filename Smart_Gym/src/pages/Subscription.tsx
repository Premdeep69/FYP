import React, { useState, useEffect } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { stripePromise } from '@/config/stripe';
import SubscriptionPlans from '@/components/SubscriptionPlans';
import PaymentHistory from '@/components/PaymentHistory';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CreditCard, 
  Calendar, 
  AlertCircle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiService } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

interface Subscription {
  _id: string;
  plan: {
    name: string;
    price: number;
    interval: string;
    features: string[];
  };
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  canceledAt?: string;
}

const Subscription: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSubscriptions();
    }
  }, [user]);

  const fetchSubscriptions = async () => {
    try {
      const data = await apiService.getUserSubscriptions();
      setSubscriptions(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load subscriptions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async (subscriptionId: string) => {
    try {
      await apiService.cancelSubscription(subscriptionId);
      toast({
        title: 'Subscription Canceled',
        description: 'Your subscription will be canceled at the end of the current period',
      });
      fetchSubscriptions(); // Refresh the list
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to cancel subscription',
        variant: 'destructive',
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'canceled':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'canceled':
        return 'bg-red-100 text-red-800';
      case 'past_due':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price / 100);
  };

  if (!user) {
    return (
      <div className="min-h-screen py-12 flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
          <p className="text-muted-foreground">Please log in to manage your subscriptions.</p>
        </Card>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <div className="min-h-screen py-12">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-heading font-bold mb-4">
              Subscription & Billing
            </h1>
            <p className="text-lg text-muted-foreground">
              Manage your subscriptions and view payment history
            </p>
          </div>

          <Tabs defaultValue="current" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="current">Current Plans</TabsTrigger>
              <TabsTrigger value="plans">Available Plans</TabsTrigger>
              <TabsTrigger value="history">Payment History</TabsTrigger>
            </TabsList>

            <TabsContent value="current" className="space-y-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading subscriptions...</p>
                  </div>
                </div>
              ) : subscriptions.length > 0 ? (
                <div className="grid gap-6">
                  {subscriptions.map((subscription) => (
                    <Card key={subscription._id} className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(subscription.status)}
                          <div>
                            <h3 className="text-xl font-semibold">
                              {subscription.plan.name} Plan
                            </h3>
                            <p className="text-muted-foreground">
                              {formatPrice(subscription.plan.price)} per {subscription.plan.interval}
                            </p>
                          </div>
                        </div>
                        <Badge className={getStatusColor(subscription.status)}>
                          {subscription.status}
                        </Badge>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4 mb-6">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">
                            Current period: {formatDate(subscription.currentPeriodStart)} - {formatDate(subscription.currentPeriodEnd)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">
                            {subscription.cancelAtPeriodEnd 
                              ? 'Cancels at period end' 
                              : 'Auto-renews'
                            }
                          </span>
                        </div>
                      </div>

                      <div className="mb-6">
                        <h4 className="font-medium mb-2">Plan Features:</h4>
                        <ul className="grid md:grid-cols-2 gap-1 text-sm text-muted-foreground">
                          {subscription.plan.features.map((feature, index) => (
                            <li key={index} className="flex items-center gap-2">
                              <CheckCircle className="w-3 h-3 text-green-600" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {subscription.status === 'active' && !subscription.cancelAtPeriodEnd && (
                        <Button
                          variant="outline"
                          onClick={() => handleCancelSubscription(subscription._id)}
                        >
                          Cancel Subscription
                        </Button>
                      )}

                      {subscription.cancelAtPeriodEnd && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-yellow-600" />
                            <span className="text-sm text-yellow-800">
                              This subscription will be canceled on {formatDate(subscription.currentPeriodEnd)}
                            </span>
                          </div>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="p-8 text-center">
                  <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Active Subscriptions</h3>
                  <p className="text-muted-foreground mb-4">
                    You don't have any active subscriptions. Choose a plan to get started.
                  </p>
                  <Button onClick={() => document.querySelector('[value="plans"]')?.click()}>
                    View Available Plans
                  </Button>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="plans">
              <SubscriptionPlans />
            </TabsContent>

            <TabsContent value="history">
              <PaymentHistory />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Elements>
  );
};

export default Subscription;