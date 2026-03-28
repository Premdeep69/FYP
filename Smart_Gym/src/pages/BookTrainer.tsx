import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Calendar as CalendarIcon,
  Clock,
  DollarSign,
  ArrowLeft,
  CheckCircle,
} from 'lucide-react';
import { apiService } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
}

const BookTrainer: React.FC = () => {
  const { trainerId } = useParams<{ trainerId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [trainer, setTrainer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedSessionType, setSelectedSessionType] = useState('');
  const [selectedDuration, setSelectedDuration] = useState(60);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [notes, setNotes] = useState('');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    if (trainerId) {
      fetchTrainerDetails();
    }
  }, [trainerId]);

  useEffect(() => {
    if (selectedDate && selectedDuration) {
      fetchAvailableSlots();
    }
  }, [selectedDate, selectedDuration]);

  const fetchTrainerDetails = async () => {
    try {
      const data = await apiService.getTrainerById(trainerId!);
      setTrainer(data.trainer);
      
      // Set default session type if available
      if (data.trainer.trainerProfile.sessionTypes.length > 0) {
        setSelectedSessionType(data.trainer.trainerProfile.sessionTypes[0].type);
        setSelectedDuration(data.trainer.trainerProfile.sessionTypes[0].duration);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load trainer details',
        variant: 'destructive',
      });
      navigate('/trainers');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableSlots = async () => {
    if (!selectedDate || !trainerId) return;

    try {
      setLoadingSlots(true);
      const dateStr = selectedDate.toISOString().split('T')[0];
      const data = await apiService.getAvailableSlots(trainerId, dateStr, selectedDuration);
      setAvailableSlots(data.availableSlots);
      setSelectedSlot(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load available slots',
        variant: 'destructive',
      });
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleSessionTypeChange = (type: string) => {
    setSelectedSessionType(type);
    const sessionType = trainer.trainerProfile.sessionTypes.find((st: any) => st.type === type);
    if (sessionType) {
      setSelectedDuration(sessionType.duration);
    }
  };

  const handleBooking = async () => {
    if (!selectedDate || !selectedSlot || !selectedSessionType) {
      toast({
        title: 'Missing Information',
        description: 'Please select a date, time slot, and session type',
        variant: 'destructive',
      });
      return;
    }

    try {
      setBooking(true);
      const dateStr = selectedDate.toISOString().split('T')[0];
      
      const response = await apiService.createBooking({
        trainerId: trainerId!,
        sessionType: selectedSessionType,
        scheduledDate: dateStr,
        startTime: selectedSlot.startTime,
        duration: selectedDuration,
        notes,
      });

      // Check if payment is required
      if (response.requiresPayment && response.payment) {
        toast({
          title: 'Booking Created',
          description: 'Redirecting to payment...',
        });

        // Redirect to payment page with payment details
        const paymentParams = new URLSearchParams({
          clientSecret: response.payment.clientSecret,
          bookingId: response.booking._id,
          amount: response.payment.amount.toString(),
          trainerName: encodeURIComponent(trainer.name),
        });

        navigate(`/booking-payment?${paymentParams.toString()}`);
      } else {
        // No payment required (Stripe not configured)
        toast({
          title: 'Booking Created',
          description: 'Your session has been booked successfully!',
        });

        navigate('/my-bookings');
      }
    } catch (error: any) {
      toast({
        title: 'Booking Failed',
        description: error.message || 'Failed to create booking',
        variant: 'destructive',
      });
    } finally {
      setBooking(false);
    }
  };

  const getPrice = () => {
    if (!trainer) return 0;
    
    const sessionType = trainer.trainerProfile.sessionTypes.find(
      (st: any) => st.type === selectedSessionType
    );
    
    return sessionType ? sessionType.price : trainer.trainerProfile.hourlyRate;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  if (loading) {
    return (
      <div className="min-h-screen py-12 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!trainer) {
    return null;
  }

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        <Button
          variant="ghost"
          onClick={() => navigate('/trainers')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Trainers
        </Button>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Trainer Info Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <div className="flex flex-col items-center text-center">
                  <Avatar className="w-24 h-24 mb-4">
                    <AvatarImage src={trainer.trainerProfile.profileImage} />
                    <AvatarFallback>{getInitials(trainer.name)}</AvatarFallback>
                  </Avatar>
                  <CardTitle className="text-xl mb-2">{trainer.name}</CardTitle>
                  <p className="text-sm text-muted-foreground mb-4">
                    {trainer.trainerProfile.experience} years experience
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2 text-sm">Specializations</h3>
                  <div className="flex flex-wrap gap-1">
                    {trainer.trainerProfile.specializations.map((spec: string, index: number) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {spec}
                      </Badge>
                    ))}
                  </div>
                </div>

                {selectedSessionType && (
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Session Price</span>
                      <span className="text-2xl font-bold text-primary">
                        ${getPrice()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {selectedDuration} minutes session
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Booking Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Book a Session</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Session Type Selection */}
                <div>
                  <Label>Session Type</Label>
                  <Select value={selectedSessionType} onValueChange={handleSessionTypeChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select session type" />
                    </SelectTrigger>
                    <SelectContent>
                      {trainer.trainerProfile.sessionTypes.map((session: any) => (
                        <SelectItem key={session.type} value={session.type}>
                          {session.type.replace('-', ' ').toUpperCase()} - {session.duration} min (${session.price})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Selection */}
                <div>
                  <Label className="mb-2 block">Select Date</Label>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    className="rounded-md border"
                  />
                </div>

                {/* Time Slots */}
                {selectedDate && (
                  <div>
                    <Label className="mb-2 block">Available Time Slots</Label>
                    {loadingSlots ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                        <p className="text-sm text-muted-foreground">Loading slots...</p>
                      </div>
                    ) : availableSlots.length === 0 ? (
                      <div className="text-center py-8 bg-muted rounded-lg">
                        <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          No available slots for this date
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {availableSlots.map((slot, index) => (
                          <Button
                            key={index}
                            variant={selectedSlot === slot ? 'default' : 'outline'}
                            onClick={() => setSelectedSlot(slot)}
                            className="relative"
                          >
                            {selectedSlot === slot && (
                              <CheckCircle className="w-4 h-4 absolute top-1 right-1" />
                            )}
                            <div className="text-center">
                              <div className="font-medium">{slot.startTime}</div>
                              <div className="text-xs opacity-75">{slot.endTime}</div>
                            </div>
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Notes */}
                <div>
                  <Label htmlFor="notes">Additional Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any specific goals or requirements for this session..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                  />
                </div>

                {/* Booking Summary */}
                {selectedSlot && (
                  <div className="bg-muted p-4 rounded-lg space-y-2">
                    <h3 className="font-semibold mb-3">Booking Summary</h3>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Date</span>
                      <span className="font-medium">
                        {selectedDate?.toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Time</span>
                      <span className="font-medium">
                        {selectedSlot.startTime} - {selectedSlot.endTime}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Duration</span>
                      <span className="font-medium">{selectedDuration} minutes</span>
                    </div>
                    <div className="flex items-center justify-between text-sm pt-2 border-t">
                      <span className="text-muted-foreground">Total Price</span>
                      <span className="text-xl font-bold text-primary">
                        ${getPrice()}
                      </span>
                    </div>
                  </div>
                )}

                {/* Book Button */}
                <Button
                  onClick={handleBooking}
                  disabled={!selectedSlot || booking}
                  className="w-full"
                  size="lg"
                >
                  {booking ? 'Booking...' : 'Confirm Booking'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookTrainer;
