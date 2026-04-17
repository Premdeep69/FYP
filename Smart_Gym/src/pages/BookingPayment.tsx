import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, ArrowLeft, Shield, Clock, CreditCard, Receipt } from "lucide-react";
import { apiService } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");

interface PaymentFormProps {
  bookingId: string;
  requestId?: string;
  amount: number;
  trainerName: string;
  sessionType?: string;
  sessionDate?: string;
  paymentDeadline?: string;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ bookingId, requestId, amount, trainerName, sessionType, sessionDate, paymentDeadline }) => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState("");
  const [succeeded, setSucceeded] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState<string | null>(null);

  useEffect(() => {
    if (!paymentDeadline) return;
    const tick = () => {
      const diff = new Date(paymentDeadline).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft("Expired"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h}h ${m}m ${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [paymentDeadline]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);
    setError(null);
    try {
      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}${requestId ? '/my-requests' : '/my-bookings'}`,
        },
        redirect: "if_required",
      });

      if (confirmError) {
        setError(confirmError.message || "Payment failed");
        toast({ title: "Payment Failed", description: confirmError.message, variant: "destructive" });
        return;
      }

      if (paymentIntent?.status === "succeeded") {
        if (requestId) {
          const res: any = await apiService.confirmRequestPayment(requestId, paymentIntent.id);
          setInvoiceNumber(res.invoiceNumber || null);
          setSucceeded(true);
          toast({ title: "🎉 Session Confirmed!", description: "Your session has been booked and confirmed." });
        } else {
          const res: any = await apiService.confirmBookingPayment(bookingId, paymentIntent.id);
          setInvoiceNumber(res.invoiceNumber || null);
          setSucceeded(true);
          toast({ title: "🎉 Payment Successful!", description: "Your booking has been confirmed." });
        }
      } else if (paymentIntent?.status === "requires_action") {
        toast({ title: "Action Required", description: "Please complete the additional verification step." });
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Success state */}
      {succeeded && (
        <div className="text-center py-6 space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Payment Confirmed!</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Your session with <span className="font-medium">{trainerName}</span> is now confirmed.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {invoiceNumber && (
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                onClick={async () => {
                  try {
                    const blob = await apiService.downloadInvoice(`invoice-${invoiceNumber}.pdf`) as Blob;
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `receipt-${invoiceNumber}.pdf`;
                    a.click();
                    URL.revokeObjectURL(url);
                  } catch {
                    toast({ title: 'Could not download receipt', variant: 'destructive' });
                  }
                }}
              >
                <Receipt className="w-4 h-4" /> Download Receipt
              </Button>
            )}
            <Button
              type="button"
              className="w-full"
              onClick={() => navigate(requestId ? "/my-requests" : "/my-bookings")}
            >
              View My Bookings
            </Button>
          </div>
        </div>
      )}

      {!succeeded && (
        <>
          <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Session with</p>
                <p className="font-semibold text-sm">{trainerName}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground mb-0.5">Total</p>
                <p className="text-2xl font-bold text-primary">${amount.toFixed(2)}</p>
              </div>
            </div>
            {(sessionType || sessionDate) && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                {sessionType && <Badge variant="outline" className="text-xs capitalize">{sessionType.replace(/-/g, " ")}</Badge>}
                {sessionDate && <Badge variant="outline" className="text-xs">{new Date(sessionDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</Badge>}
              </div>
            )}
          </div>

          {paymentDeadline && timeLeft && timeLeft !== "Expired" && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
              <Clock className="w-4 h-4 shrink-0" />
              <span>Complete payment within <span className="font-semibold">{timeLeft}</span> or this request will expire.</span>
            </div>
          )}
          {timeLeft === "Expired" && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>Payment deadline has passed. This request has expired.</AlertDescription>
            </Alert>
          )}

          <div className="rounded-xl border border-border p-4 bg-white">
            <PaymentElement options={{ layout: "tabs" }} />
          </div>

          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => navigate(requestId ? "/my-requests" : "/my-bookings")} disabled={processing} className="flex-1">
              <ArrowLeft className="w-4 h-4 mr-2" /> Cancel
            </Button>
            <Button type="submit" disabled={!stripe || processing || timeLeft === "Expired"} className="flex-1 font-semibold">
              {processing
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</>
                : <><CreditCard className="w-4 h-4 mr-2" />Pay ${amount.toFixed(2)}</>}
            </Button>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Shield className="w-3.5 h-3.5" />
            <span>Secured by Stripe. We never store your card details.</span>
          </div>
        </>
      )}
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
    const clientSecret = searchParams.get("clientSecret");
    const bookingId = searchParams.get("bookingId") || "";
    const requestId = searchParams.get("requestId") || undefined;
    const amount = searchParams.get("amount");
    const trainerName = searchParams.get("trainerName");
    const sessionType = searchParams.get("sessionType") || undefined;
    const sessionDate = searchParams.get("sessionDate") || undefined;
    const paymentDeadline = searchParams.get("paymentDeadline") || undefined;

    if (!clientSecret || !amount || !trainerName) {
      toast({ title: "Invalid Payment Link", description: "Missing payment information", variant: "destructive" });
      navigate("/my-bookings");
      return;
    }

    setPaymentData({ clientSecret, bookingId, requestId, amount: parseFloat(amount), trainerName: decodeURIComponent(trainerName), sessionType, sessionDate, paymentDeadline });
    setLoading(false);
  }, [searchParams, navigate, toast]);

  if (loading || !paymentData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-10 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <CreditCard className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Complete Payment</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {paymentData.requestId
              ? "Your trainer accepted your request. Pay now to confirm your session."
              : "Secure payment powered by Stripe."}
          </p>
        </div>

        <Card className="border-border/60 shadow-md">
          <CardContent className="pt-6">
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret: paymentData.clientSecret,
                appearance: {
                  theme: "stripe",
                  variables: { colorPrimary: "#4f46e5", borderRadius: "8px" },
                },
              }}
            >
              <PaymentForm
                bookingId={paymentData.bookingId}
                requestId={paymentData.requestId}
                amount={paymentData.amount}
                trainerName={paymentData.trainerName}
                sessionType={paymentData.sessionType}
                sessionDate={paymentData.sessionDate}
                paymentDeadline={paymentData.paymentDeadline}
              />
            </Elements>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BookingPayment;
