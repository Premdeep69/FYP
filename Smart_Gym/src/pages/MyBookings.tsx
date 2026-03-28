import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Calendar,
  Clock,
  DollarSign,
  MapPin,
  Star,
  XCircle,
  CheckCircle,
  AlertCircle,
  Video,
} from 'lucide-react';
import { apiService } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import MeetingInfo from '@/components/MeetingInfo';

interface Booking {
  _id: string;
  trainerId: {
    _id: string;
    name: string;
    trainerProfile: any;
  };
  sessionType: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  duration: number;
  status: string;
  price: number;
  paymentStatus: string;
  clientNotes?: string;
  trainerNotes?: string;
  feedback?: {
    rating: number;
    comment: string;
  };
}

const MyBookings: React.FC = () => {
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [showMeetingInfo, setShowMeetingInfo] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [rating, setRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const data = await apiService.getUserBookings();
      setBookings(data.bookings);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load bookings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!selectedBooking || !cancelReason.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please provide a reason for cancellation',
        variant: 'destructive',
      });
      return;
    }

    try {
      setProcessing(true);
      
      // Use cancel with refund endpoint if payment was made
      if (selectedBooking.paymentStatus === 'paid') {
        const response = await apiService.cancelBookingWithRefund(selectedBooking._id, cancelReason);
        
        toast({
          title: 'Booking Cancelled',
          description: response.refunded 
            ? 'Your booking has been cancelled and payment refunded'
            : 'Your booking has been cancelled',
        });
      } else {
        await apiService.updateBookingStatus(selectedBooking._id, 'cancelled', cancelReason);
        
        toast({
          title: 'Booking Cancelled',
          description: 'Your booking has been cancelled successfully',
        });
      }
      
      setShowCancelDialog(false);
      setCancelReason('');
      setSelectedBooking(null);
      fetchBookings();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to cancel booking',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!selectedBooking || rating === 0) {
      toast({
        title: 'Missing Information',
        description: 'Please provide a rating',
        variant: 'destructive',
      });
      return;
    }

    try {
      setProcessing(true);
      await apiService.addBookingFeedback(selectedBooking._id, rating, feedbackComment);
      
      toast({
        title: 'Feedback Submitted',
        description: 'Thank you for your feedback!',
      });

      setShowFeedbackDialog(false);
      setRating(0);
      setFeedbackComment('');
      fetchBookings();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit feedback',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending':
        return <AlertCircle className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const filterBookings = (status: string[]) => {
    return bookings.filter((booking) => status.includes(booking.status));
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const BookingCard = ({ booking }: { booking: Booking }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <Avatar className="w-16 h-16">
            <AvatarImage src={booking.trainerId.trainerProfile?.profileImage} />
            <AvatarFallback>{getInitials(booking.trainerId.name)}</AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold text-lg">{booking.trainerId.name}</h3>
                <p className="text-sm text-muted-foreground capitalize">
                  {booking.sessionType.replace('-', ' ')}
                </p>
              </div>
              <Badge className={getStatusColor(booking.status)}>
                <span className="flex items-center gap-1">
                  {getStatusIcon(booking.status)}
                  {booking.status}
                </span>
              </Badge>
            </div>

            <div className="grid md:grid-cols-2 gap-3 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>
                  {new Date(booking.scheduledDate).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>
                  {booking.startTime} - {booking.endTime} ({booking.duration} min)
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <span className="font-semibold">${booking.price}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className="text-xs">
                  {booking.paymentStatus}
                </Badge>
              </div>
            </div>

            {booking.clientNotes && (
              <div className="mb-4 p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Your Notes:</p>
                <p className="text-sm">{booking.clientNotes}</p>
              </div>
            )}

            {booking.feedback && (
              <div className="mb-4 p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm font-medium">Your Feedback:</p>
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= booking.feedback!.rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                {booking.feedback.comment && (
                  <p className="text-sm">{booking.feedback.comment}</p>
                )}
              </div>
            )}

            <div className="flex gap-2">
              {booking.status === 'pending' && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setSelectedBooking(booking);
                    setShowCancelDialog(true);
                  }}
                >
                  Cancel Booking
                </Button>
              )}
              {(booking.status === 'confirmed' || booking.status === 'pending') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedBooking(booking);
                    setShowMeetingInfo(true);
                  }}
                >
                  <Video className="w-4 h-4 mr-2" />
                  Join Meeting
                </Button>
              )}
              {booking.status === 'completed' && !booking.feedback && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedBooking(booking);
                    setShowFeedbackDialog(true);
                  }}
                >
                  <Star className="w-4 h-4 mr-2" />
                  Leave Feedback
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="min-h-screen py-12 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-heading font-bold mb-4">
            My Bookings
          </h1>
          <p className="text-lg text-muted-foreground">
            View and manage your training sessions
          </p>
        </div>

        <Tabs defaultValue="upcoming" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="upcoming">
              Upcoming ({filterBookings(['pending', 'confirmed']).length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({filterBookings(['completed']).length})
            </TabsTrigger>
            <TabsTrigger value="cancelled">
              Cancelled ({filterBookings(['cancelled']).length})
            </TabsTrigger>
            <TabsTrigger value="all">All ({bookings.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-4">
            {filterBookings(['pending', 'confirmed']).length === 0 ? (
              <Card className="p-8 text-center">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Upcoming Bookings</h3>
                <p className="text-muted-foreground">
                  You don't have any upcoming sessions scheduled
                </p>
              </Card>
            ) : (
              filterBookings(['pending', 'confirmed']).map((booking) => (
                <BookingCard key={booking._id} booking={booking} />
              ))
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {filterBookings(['completed']).length === 0 ? (
              <Card className="p-8 text-center">
                <CheckCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Completed Sessions</h3>
                <p className="text-muted-foreground">
                  Your completed sessions will appear here
                </p>
              </Card>
            ) : (
              filterBookings(['completed']).map((booking) => (
                <BookingCard key={booking._id} booking={booking} />
              ))
            )}
          </TabsContent>

          <TabsContent value="cancelled" className="space-y-4">
            {filterBookings(['cancelled']).length === 0 ? (
              <Card className="p-8 text-center">
                <XCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Cancelled Bookings</h3>
                <p className="text-muted-foreground">
                  Your cancelled sessions will appear here
                </p>
              </Card>
            ) : (
              filterBookings(['cancelled']).map((booking) => (
                <BookingCard key={booking._id} booking={booking} />
              ))
            )}
          </TabsContent>

          <TabsContent value="all" className="space-y-4">
            {bookings.length === 0 ? (
              <Card className="p-8 text-center">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Bookings Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start your fitness journey by booking a session with a trainer
                </p>
                <Button onClick={() => window.location.href = '/trainers'}>
                  Browse Trainers
                </Button>
              </Card>
            ) : (
              bookings.map((booking) => (
                <BookingCard key={booking._id} booking={booking} />
              ))
            )}
          </TabsContent>
        </Tabs>

        {/* Cancel Dialog */}
        <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancel Booking</DialogTitle>
              <DialogDescription>
                Please provide a reason for cancelling this booking
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="reason">Cancellation Reason</Label>
                <Textarea
                  id="reason"
                  placeholder="Why are you cancelling this booking?"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCancelDialog(false)}
                disabled={processing}
              >
                Keep Booking
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancelBooking}
                disabled={processing || !cancelReason.trim()}
              >
                {processing ? 'Cancelling...' : 'Cancel Booking'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Feedback Dialog */}
        <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Leave Feedback</DialogTitle>
              <DialogDescription>
                How was your session? Your feedback helps us improve
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Rating</Label>
                <div className="flex gap-2 mt-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`w-8 h-8 cursor-pointer transition-colors ${
                          star <= rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300 hover:text-yellow-200'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="comment">Comment (Optional)</Label>
                <Textarea
                  id="comment"
                  placeholder="Share your experience..."
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowFeedbackDialog(false)}
                disabled={processing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitFeedback}
                disabled={processing || rating === 0}
              >
                {processing ? 'Submitting...' : 'Submit Feedback'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Meeting Info Dialog */}
        {selectedBooking && (
          <MeetingInfo
            slotId={selectedBooking._id}
            slotTitle={`Session with ${selectedBooking.trainerId.name}`}
            slotDate={selectedBooking.scheduledDate}
            slotStartTime={selectedBooking.startTime}
            slotEndTime={selectedBooking.endTime}
            open={showMeetingInfo}
            onOpenChange={setShowMeetingInfo}
          />
        )}
      </div>
    </div>
  );
};

export default MyBookings;
