import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Clock, RefreshCw, MessageSquarePlus, CheckCircle, XCircle, Hourglass, ArrowRight, CreditCard, AlertTriangle, Ban, Loader2, AlertCircle } from "lucide-react";
import { apiService } from "@/services/api";
import { socketService } from "@/services/socket";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
  pending:          { label: "Pending",          icon: <Hourglass className="w-3.5 h-3.5" />,     cls: "bg-yellow-100 text-yellow-800" },
  awaiting_payment: { label: "Awaiting Payment", icon: <CreditCard className="w-3.5 h-3.5" />,    cls: "bg-blue-100 text-blue-800" },
  confirmed:        { label: "Confirmed",         icon: <CheckCircle className="w-3.5 h-3.5" />,   cls: "bg-green-100 text-green-800" },
  rejected:         { label: "Declined",          icon: <XCircle className="w-3.5 h-3.5" />,       cls: "bg-red-100 text-red-800" },
  expired:          { label: "Expired",           icon: <AlertTriangle className="w-3.5 h-3.5" />, cls: "bg-gray-100 text-gray-600" },
  payment_failed:   { label: "Payment Failed",    icon: <Ban className="w-3.5 h-3.5" />,           cls: "bg-red-100 text-red-700" },
};

const SESSION_TYPE_LABELS: Record<string, string> = {
  "personal-training": "Personal Training",
  "group-class": "Group Class",
  "consultation": "Consultation",
  "follow-up": "Follow-up",
};

function DeadlineCountdown({ deadline }: { deadline: string }) {
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    const tick = () => {
      const diff = new Date(deadline).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft("Expired"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h}h ${m}m ${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadline]);
  if (!timeLeft) return null;
  const isUrgent = new Date(deadline).getTime() - Date.now() < 3600000;
  return (
    <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg ${isUrgent ? "bg-red-50 text-red-600 border border-red-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
      <Clock className="w-3.5 h-3.5 shrink-0" />
      {timeLeft === "Expired" ? "Payment window expired" : <span>Pay within <span className="font-semibold ml-1">{timeLeft}</span></span>}
    </div>
  );
}

export default function MyRequests() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [payingId, setPayingId] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const data: any = await apiService.getUserSessionRequests();
      setRequests(data);

      // Auto-sync any awaiting_payment requests — check if Stripe already processed them
      const awaitingPayment = (data as any[]).filter(
        (r: any) => r.status === "awaiting_payment" && !r.createdSlotId && !r.createdBookingId
      );
      if (awaitingPayment.length > 0) {
        const synced = await Promise.allSettled(
          awaitingPayment.map((r: any) => apiService.syncRequestPayment(r._id))
        );
        const anyConfirmed = synced.some(
          (s) => s.status === "fulfilled" && (s.value as any)?.status === "confirmed"
        );
        if (anyConfirmed) {
          // Re-fetch with updated statuses
          const fresh: any = await apiService.getUserSessionRequests();
          setRequests(fresh);
        }
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  // Refresh when tab regains focus (e.g. returning from payment page)
  useEffect(() => {
    const onFocus = () => fetchRequests();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchRequests]);

  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;
    const onAwaitingPayment = ({ request }: any) => {
      fetchRequests();
      toast({ title: "Request Accepted!", description: `${request?.trainerId?.name || "Your trainer"} accepted. Complete payment to confirm.` });
    };
    const onConfirmed = () => { fetchRequests(); toast({ title: "Session Confirmed!", description: "Your session has been booked." }); };
    const onRejected = ({ request }: any) => { fetchRequests(); toast({ title: "Request Declined", description: request?.trainerNote || "The trainer could not accommodate your request.", variant: "destructive" }); };
    const onExpired = () => { fetchRequests(); toast({ title: "Request Expired", description: "Payment window closed.", variant: "destructive" }); };
    const onFailed = () => { fetchRequests(); toast({ title: "Payment Failed", variant: "destructive" }); };
    socket.on("sessionRequest:awaiting_payment", onAwaitingPayment);
    socket.on("sessionRequest:confirmed", onConfirmed);
    socket.on("sessionRequest:rejected", onRejected);
    socket.on("sessionRequest:expired", onExpired);
    socket.on("sessionRequest:payment_failed", onFailed);
    // Refresh if the linked booking gets cancelled
    const onBookingCancelledByTrainer = () => { fetchRequests(); toast({ title: "Session Cancelled", description: "Your trainer cancelled the session.", variant: "destructive" }); };
    const onBookingCancelledByUser = () => { fetchRequests(); };
    socket.on("booking:cancelled_by_trainer", onBookingCancelledByTrainer);
    socket.on("booking:cancelled_by_user", onBookingCancelledByUser);
    return () => {
      socket.off("sessionRequest:awaiting_payment", onAwaitingPayment);
      socket.off("sessionRequest:confirmed", onConfirmed);
      socket.off("sessionRequest:rejected", onRejected);
      socket.off("sessionRequest:expired", onExpired);
      socket.off("sessionRequest:payment_failed", onFailed);
      socket.off("booking:cancelled_by_trainer", onBookingCancelledByTrainer);
      socket.off("booking:cancelled_by_user", onBookingCancelledByUser);
    };
  }, [fetchRequests]);

  const handlePayNow = async (req: any) => {
    setPayingId(req._id);
    try {
      // Always fetch a fresh clientSecret from the backend
      const res: any = await apiService.getRequestPaymentIntent(req._id);

      if (!res.requiresPayment) {
        // Stripe not configured — confirm directly without payment
        toast({ title: 'Payment not required', description: 'Session confirmed without payment (dev mode).' });
        await apiService.confirmRequestPayment(req._id, '');
        fetchRequests();
        return;
      }

      if (!res.clientSecret) {
        toast({ title: 'Payment not available', description: 'Could not retrieve payment details. Try again.', variant: 'destructive' });
        return;
      }

      const params = new URLSearchParams({
        clientSecret: res.clientSecret,
        requestId: req._id,
        bookingId: '',
        amount: String(req.agreedPrice || res.amount || 0),
        trainerName: encodeURIComponent(req.trainerId?.name || 'Trainer'),
        sessionType: req.sessionType || '',
        sessionDate: req.preferredDate || '',
        paymentDeadline: req.paymentDeadline || '',
      });
      navigate(`/booking-payment?${params.toString()}`);
    } catch (e: any) {
      // If already confirmed, just refresh
      if (e.message?.includes('already been confirmed') || e.message?.includes('alreadyConfirmed')) {
        toast({ title: 'Session already confirmed', description: 'Your session is already booked.' });
        fetchRequests();
      } else {
        toast({ title: 'Error', description: e.message, variant: 'destructive' });
      }
    } finally {
      setPayingId(null);
    }
  };

  if (!user || user.userType !== "user") return null;

  const filtered = statusFilter === "all" ? requests : requests.filter(r => r.status === statusFilter);
  const pendingPaymentCount = requests.filter(r => r.status === "awaiting_payment" && !r.createdSlotId && !r.createdBookingId).length;

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-10">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-1">My Session Requests</h1>
              <p className="text-muted-foreground">Track requests you have sent to trainers</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchRequests}><RefreshCw className="w-4 h-4 mr-1.5" />Refresh</Button>
              <Button size="sm" onClick={() => navigate("/trainers")}><MessageSquarePlus className="w-4 h-4 mr-1.5" />New Request</Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {pendingPaymentCount > 0 && (
          <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl mb-6 max-w-2xl mx-auto">
            <CreditCard className="w-5 h-5 text-blue-600 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-800">{pendingPaymentCount} request{pendingPaymentCount > 1 ? "s" : ""} awaiting payment</p>
              <p className="text-xs text-blue-600">Complete payment within 24 hours to confirm your session.</p>
            </div>
          </div>
        )}

        {requests.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-5 max-w-2xl mx-auto">
            {["all", "pending", "awaiting_payment", "confirmed", "rejected", "expired"].map(s => {
              const count = s === "all" ? requests.length : requests.filter(r => r.status === s).length;
              if (s !== "all" && count === 0) return null;
              return (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize ${statusFilter === s ? "bg-primary text-primary-foreground" : "bg-white border border-border text-muted-foreground hover:border-primary/50"}`}>
                  {s.replace("_", " ")} ({count})
                </button>
              );
            })}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3" />Loading...
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <MessageSquarePlus className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No requests yet</h3>
            <p className="text-muted-foreground text-sm mb-5">Send a session request to a trainer when no slots are available</p>
            <Button onClick={() => navigate("/trainers")}>Browse Trainers <ArrowRight className="w-4 h-4 ml-2" /></Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground max-w-2xl mx-auto">
            <p>No {statusFilter.replace("_", " ")} requests</p>
          </div>
        ) : (
          <div className="space-y-4 max-w-2xl mx-auto">
            {filtered.map((req: any) => {
              const sc = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
              const tp = req.trainerId?.trainerProfile;
              const initials = req.trainerId?.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "?";
              const isAwaitingPayment = req.status === "awaiting_payment" && !req.createdSlotId && !req.createdBookingId;
              return (
                <Card key={req._id} className={`border-border/60 shadow-sm hover:shadow-md transition-shadow ${isAwaitingPayment ? "ring-2 ring-blue-400 ring-offset-1" : ""}`}>
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <Avatar className="w-11 h-11 shrink-0">
                        <AvatarImage src={tp?.profileImage} />
                        <AvatarFallback className="bg-indigo-100 text-indigo-700 font-semibold text-sm">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <p className="font-semibold text-sm">{req.trainerId?.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{SESSION_TYPE_LABELS[req.sessionType] || req.sessionType}</p>
                          </div>
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 ${sc.cls}`}>{sc.icon}{sc.label}</span>
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-3">
                          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{new Date(req.preferredDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{req.preferredTime} · {req.duration} min</span>
                          <span className="capitalize">{req.mode}</span>
                          {req.agreedPrice && <span className="font-semibold text-green-700">${req.agreedPrice}</span>}
                        </div>
                        {req.message && <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 mb-3 italic">"{req.message}"</p>}

                        {isAwaitingPayment && (
                          <div className="space-y-2 mb-3">
                            {req.paymentDeadline && <DeadlineCountdown deadline={req.paymentDeadline} />}
                            {req.trainerNote && <p className="text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2"><span className="font-medium">Trainer note: </span>{req.trainerNote}</p>}
                            <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700 font-semibold" onClick={() => handlePayNow(req)} disabled={payingId === req._id}>
                              {payingId === req._id
                                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Loading payment...</>
                                : <><CreditCard className="w-4 h-4 mr-2" />Pay ${req.agreedPrice} to Confirm Session</>}
                            </Button>
                          </div>
                        )}
                        {req.status === "confirmed" && (() => {
                          const booking = req.createdBookingId;
                          const bookingCancelled = booking && booking.status === "cancelled";
                          const cancelledByTrainer = booking?.cancelledByRole === "trainer";
                          const cancelledByUser = booking?.cancelledByRole === "user";
                          const refundPct = booking?.refundPercentage;

                          if (bookingCancelled) {
                            return (
                              <div className="space-y-2 mb-3">
                                <div className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                                  <AlertCircle className="w-4 h-4 shrink-0" />
                                  <span className="font-medium">
                                    {cancelledByTrainer ? "Cancelled by Trainer" : cancelledByUser ? "Cancelled by You" : "Session Cancelled"}
                                  </span>
                                </div>
                                {refundPct !== undefined && (
                                  <div className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                                    <CreditCard className="w-4 h-4 shrink-0" />
                                    <span>
                                      {refundPct === 100
                                        ? "A full 100% refund has been issued to your original payment method."
                                        : refundPct === 70
                                        ? `A 70% refund has been issued. A 30% cancellation fee was retained.`
                                        : `Refund: ${refundPct}%`}
                                    </span>
                                  </div>
                                )}
                                {booking?.cancellationReason && (
                                  <p className="text-xs text-muted-foreground px-1">
                                    Reason: {booking.cancellationReason}
                                  </p>
                                )}
                              </div>
                            );
                          }

                          return (
                            <div className="flex items-center gap-2 p-2.5 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700 mb-3">
                              <CheckCircle className="w-4 h-4 shrink-0" /><span>Session confirmed and booked!</span>
                              <Button size="sm" variant="ghost" className="h-6 text-xs text-green-700 ml-auto px-2" onClick={() => navigate("/my-bookings")}>View Booking</Button>
                            </div>
                          );
                        })()}
                        {req.status === "rejected" && req.trainerNote && (
                          <div className="flex items-start gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 mb-3">
                            <XCircle className="w-4 h-4 shrink-0 mt-0.5" /><span><span className="font-medium">Trainer note: </span>{req.trainerNote}</span>
                          </div>
                        )}
                        {req.status === "expired" && (
                          <div className="flex items-center gap-2 p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-500 mb-3">
                            <AlertTriangle className="w-4 h-4 shrink-0" /><span>Payment window expired. Send a new request to try again.</span>
                          </div>
                        )}
                        {req.status === "payment_failed" && (
                          <div className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 mb-3">
                            <Ban className="w-4 h-4 shrink-0" /><span>Payment failed. Please send a new request.</span>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground">Sent {new Date(req.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
