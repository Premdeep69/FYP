import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import { apiService } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

const stripePromise = loadStripe('pk_test_51T8NDWCqlCjzmsfq0wSNWEu2Uf3UbRxGm8GeK5GdY4cglfVBZDjI0c2xjPBdAHBIlauxSgiCcnHvUWVm1SKrGR0500ES5ok34h');

interface PaymentFormProps {
  clientSecret: string;
  bookingId: string;
  amount: number;
  trainerName: string;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ clientSecret, bookingId, amount, trainerName }) => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const { error: submitError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/booking-payment-success?bookingId=${bookingId}`,
        },
        redirect: 'if_required',
      });

      if (submitError) {
        setError(submitError.message || 'Payment failed');
        toast({
          title: 'Payment Failed',
          description: submitError.message,
          variant: 'destructive',
        });
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Confirm booking payment on backend
        await apiService.confirmBookingPayment(bookingId, paymentIntent.id);

        toast({
          title: 'Payment Successful',
          description: 'Your booking has been confirmed!',
        });

        navigate('/my-bookings');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      toast({
        title: 'Error',
        description: err.message || 'An error occurred during payment',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">Training Session with</p>
            <p className="font-semibold">{trainerName}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Amount</p>
            <p className="text-2xl font-bold">${amount.toFixed(2)}</p>
          </div>
        </div>

        <PaymentElement />

        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate('/my-bookings')}
          disabled={processing}
          className="flex-1"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!stripe || processing}
          className="flex-1"
        >
          {processing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Pay ${amount.toFixed(2)}
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

const BookingPayment: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [paymentData, setPaymentData] = useState<any>(null);

  useEffect(() => {
    const clientSecret = searchParams.get('clientSecret');
    const bookingId = searchParams.get('bookingId');
    const amount = searchParams.get('amount');
    const trainerName = searchParams.get('trainerName');

    if (!clientSecret || !bookingId || !amount || !trainerName) {
      toast({
        title: 'Invalid Payment Link',
        description: 'Missing payment information',
        variant: 'destructive',
      });
      navigate('/my-bookings');
      return;
    }

    setPaymentData({
      clientSecret,
      bookingId,
      amount: parseFloat(amount),
      trainerName: decodeURIComponent(trainerName),
    });
    setLoading(false);
  }, [searchParams, navigate, toast]);

  if (loading || !paymentData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const options = {
    clientSecret: paymentData.clientSecret,
    appearance: {
      theme: 'stripe' as const,
    },
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Complete Your Booking Payment</CardTitle>
            <CardDescription>
              Secure payment powered by Stripe. Your booking will be confirmed after successful payment.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Elements stripe={stripePromise} options={options}>
              <PaymentForm
                clientSecret={paymentData.clientSecret}
                bookingId={paymentData.bookingId}
                amount={paymentData.amount}
                trainerName={paymentData.trainerName}
              />
            </Elements>
          </CardContent>
        </Card>

        <Alert className="mt-4">
          <AlertDescription className="text-sm text-muted-foreground">
            Your payment information is secure and encrypted. We never store your card details.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
};

export default BookingPayment;
