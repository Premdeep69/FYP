import React, { useState } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { stripePromise } from '@/config/stripe';
import PaymentForm from './PaymentForm';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, DollarSign, User } from 'lucide-react';
import { apiService } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

interface SessionBookingProps {
  session: {
    _id: string;
    trainerId: {
      _id: string;
      name: string;
      email: string;
    };
    scheduledDate: string;
    duration: number;
    price: number;
    sessionType: string;
    status: string;
  };
  onBookingComplete: () => void;
  onCancel: () => void;
}

const SessionBooking: React.FC<SessionBookingProps> = ({
  session,
  onBookingComplete,
  onCancel,
}) => {
  const { toast } = useToast();
  const [paymentStep, setPaymentStep] = useState<'details' | 'payment'>('details');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleProceedToPayment = async () => {
    setLoading(true);
    try {
      const response = await apiService.createSessionPayment(
        session._id,
        session.price,
        session.trainerId._id
      );
      
      setClientSecret(response.clientSecret);
      setPaymentStep('payment');
    } catch (error: any) {
      toast({
        title: 'Payment Setup Failed',
        description: error.message || 'Failed to setup payment',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    toast({
      title: 'Booking Confirmed!',
      description: 'Your session has been booked successfully',
    });
    onBookingComplete();
  };

  if (paymentStep === 'payment' && clientSecret) {
    return (
      <Elements stripe={stripePromise}>
        <PaymentForm
          clientSecret={clientSecret}
          amount={session.price * 100} // Convert to cents
          description={`${session.sessionType} session with ${session.trainerId.name}`}
          onSuccess={handlePaymentSuccess}
          onCancel={() => setPaymentStep('details')}
        />
      </Elements>
    );
  }

  return (
    <Card className="p-6 max-w-md mx-auto">
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">Book Training Session</h3>
        <Badge variant="outline" className="mb-4">
          {session.sessionType}
        </Badge>
      </div>

      <div className="space-y-4 mb-6">
        <div className="flex items-center gap-3">
          <User className="w-5 h-5 text-muted-foreground" />
          <div>
            <p className="font-medium">{session.trainerId.name}</p>
            <p className="text-sm text-muted-foreground">{session.trainerId.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-muted-foreground" />
          <div>
            <p className="font-medium">{formatDate(session.scheduledDate)}</p>
            <p className="text-sm text-muted-foreground">{formatTime(session.scheduledDate)}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-muted-foreground" />
          <p>{session.duration} minutes</p>
        </div>

        <div className="flex items-center gap-3">
          <DollarSign className="w-5 h-5 text-muted-foreground" />
          <p className="text-xl font-bold">${session.price.toFixed(2)}</p>
        </div>
      </div>

      <div className="border-t pt-4 mb-6">
        <div className="flex justify-between items-center">
          <span className="font-medium">Total:</span>
          <span className="text-xl font-bold">${session.price.toFixed(2)}</span>
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={loading}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          onClick={handleProceedToPayment}
          disabled={loading}
          className="flex-1"
        >
          {loading ? 'Setting up...' : 'Proceed to Payment'}
        </Button>
      </div>
    </Card>
  );
};

export default SessionBooking;