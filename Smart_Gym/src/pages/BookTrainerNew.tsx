import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Star, Clock, DollarSign, ArrowLeft, CheckCircle, Users,
  MapPin, Video, AlertCircle, Award, Briefcase, CalendarDays,
  ChevronRight, Zap,
} from 'lucide-react';
import { apiService } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface SessionSlot {
  _id: string;
  title: string;
  description?: string;
  sessionType: string;
  mode: string;
  location?: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  price: number;
  maxParticipants: number;
  currentParticipants: number;
  status: string;
  trainerId: any;
}

const getInitials = (name: string) =>
  name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

const formatType = (type: string) =>
  type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

const StarRating = ({ value, count }: { value: number; count: number }) => (
  <div className="flex items-center gap-1.5">
    <div className="flex">
      {[1,2,3,4,5].map(s => (
        <Star key={s} className={`w-3.5 h-3.5 ${s <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
      ))}
    </div>
    <span className="text-sm font-semibold text-gray-700">{value.toFixed(1)}</span>
    <span className="text-xs text-gray-400">({count} reviews)</span>
  </div>
);

const BookTrainerNew: React.FC = () => {
  const { trainerId } = useParams<{ trainerId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [trainer, setTrainer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedSessionType, setSelectedSessionType] = useState('all');
  const [availableSlots, setAvailableSlots] = useState<SessionSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<SessionSlot | null>(null);
  const [notes, setNotes] = useState('');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking] = useState(false);

  const formatDateForAPI = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  useEffect(() => { if (trainerId) fetchTrainerDetails(); }, [trainerId]);
  useEffect(() => { if (selectedDate) fetchAvailableSlots(); }, [selectedDate, selectedSessionType]);

  const fetchTrainerDetails = async () => {
    try {
      const data = await apiService.getTrainerById(trainerId!);
      setTrainer(data.trainer);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
      navigate('/trainers');
    } finally { setLoading(false); }
  };

  const fetchAvailableSlots = async () => {
    if (!selectedDate || !trainerId) return;
    try {
      setLoadingSlots(true);
      const data = await apiService.getAvailableSessionSlots(
        trainerId, formatDateForAPI(selectedDate),
        selectedSessionType === 'all' ? undefined : selectedSessionType
      );
      setAvailableSlots(data.slots || []);
      setSelectedSlot(null);
    } catch (e: any) {
      setAvailableSlots([]);
    } finally { setLoadingSlots(false); }
  };

  const handleBooking = async () => {
    if (!selectedSlot) return;
    if (selectedSlot.currentParticipants >= selectedSlot.maxParticipants) {
      toast({ title: 'Slot Full', description: 'Please select another slot.', variant: 'destructive' });
      fetchAvailableSlots();
      return;
    }
    try {
      setBooking(true);
      const response = await apiService.bookSessionSlot(selectedSlot._id, notes);
      if (response.requiresPayment && response.payment) {
        const params = new URLSearchParams({
          clientSecret: response.payment.clientSecret,
          bookingId: response.booking._id,
          amount: response.payment.amount.toString(),
          trainerName: encodeURIComponent(selectedSlot.trainerId?.name || trainer.name),
        });
        navigate(`/booking-payment?${params.toString()}`);
      } else {
        toast({ title: 'Booked!', description: 'Your session has been booked successfully.' });
        navigate('/my-bookings');
      }
    } catch (e: any) {
      toast({ title: 'Booking Failed', description: e.message, variant: 'destructive' });
      fetchAvailableSlots();
    } finally { setBooking(false); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4" />
        <p className="text-gray-500">Loading trainer details...</p>
      </div>
    </div>
  );

  if (!trainer) return null;

  const tp = trainer.trainerProfile;
  const availableSpots = (slot: SessionSlot) => slot.maxParticipants - slot.currentParticipants;

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Trainer hero banner */}
      <div className="bg-gradient-to-br from-indigo-700 via-indigo-600 to-purple-700 text-white">
        <div className="container mx-auto px-4 py-8">
          <button onClick={() => navigate('/trainers')}
            className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Trainers
          </button>

          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <Avatar className="w-24 h-24 ring-4 ring-white/30 shadow-2xl shrink-0">
              <AvatarImage src={tp.profileImage} />
              <AvatarFallback className="bg-white/20 text-white text-3xl font-bold">
                {getInitials(trainer.name)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">{trainer.name}</h1>
                <Badge className="bg-green-400/20 text-green-200 border-green-400/30 text-xs">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1.5" /> Available
                </Badge>
              </div>
              <StarRating value={tp.rating.average} count={tp.rating.count} />
              {tp.bio && <p className="text-white/70 text-sm mt-2 max-w-xl">{tp.bio}</p>}

              <div className="flex flex-wrap gap-4 mt-4">
                {[
                  { icon: Award, label: `${tp.experience} yrs experience` },
                  { icon: CalendarDays, label: `${tp.completedSessions || 0} sessions` },
                  { icon: DollarSign, label: `$${tp.hourlyRate}/hour` },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-1.5 text-white/80 text-sm">
                    <Icon className="w-4 h-4 text-white/60" /> {label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Specializations */}
          <div className="flex flex-wrap gap-2 mt-5">
            {tp.specializations.map((s: string, i: number) => (
              <Badge key={i} className="bg-white/15 text-white border-white/20 hover:bg-white/25 text-xs">{s}</Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid lg:grid-cols-3 gap-8">

          {/* Left: Trainer info cards */}
          <div className="space-y-5">
            {/* Certifications */}
            {tp.certifications.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Award className="w-4 h-4 text-indigo-500" /> Certifications
                </h3>
                <div className="space-y-2">
                  {tp.certifications.map((c: string, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                      <CheckCircle className="w-4 h-4 text-green-500 shrink-0" /> {c}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Session types */}
            {tp.sessionTypes.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-indigo-500" /> Services & Pricing
                </h3>
                <div className="space-y-2">
                  {tp.sessionTypes.map((s: any, i: number) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-900 capitalize">{s.type.replace(/-/g, ' ')}</p>
                        <p className="text-xs text-gray-400">{s.duration} min</p>
                      </div>
                      <span className="font-bold text-indigo-600">${s.price}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Selected slot summary */}
            {selectedSlot && (
              <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-5 text-white shadow-lg">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-4 h-4 text-yellow-300" />
                  <h3 className="font-semibold">Booking Summary</h3>
                </div>
                <div className="space-y-2 text-sm">
                  {[
                    { label: 'Session', value: selectedSlot.title },
                    { label: 'Date', value: selectedDate?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
                    { label: 'Time', value: `${selectedSlot.startTime} – ${selectedSlot.endTime}` },
                    { label: 'Duration', value: `${selectedSlot.duration} min` },
                    { label: 'Mode', value: selectedSlot.mode.charAt(0).toUpperCase() + selectedSlot.mode.slice(1) },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between">
                      <span className="text-white/60">{label}</span>
                      <span className="font-medium">{value}</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-3 border-t border-white/20 mt-2">
                    <span className="text-white/60">Total</span>
                    <span className="text-2xl font-bold">${selectedSlot.price}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: Booking form */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-indigo-500" /> Book a Session
              </h2>

              {/* Session type filter */}
              {tp.sessionTypes.length > 0 && (
                <div className="mb-6">
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Session Type</Label>
                  <Select value={selectedSessionType} onValueChange={v => setSelectedSessionType(v)}>
                    <SelectTrigger className="bg-gray-50 border-gray-200">
                      <SelectValue placeholder="All session types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {tp.sessionTypes.map((s: any) => (
                        <SelectItem key={s.type} value={s.type}>{formatType(s.type)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Date picker */}
              <div className="mb-6">
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Select Date</Label>
                <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50 inline-block">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={date => date < new Date(new Date().setHours(0,0,0,0))}
                    className="rounded-xl"
                  />
                </div>
              </div>

              {/* Available slots */}
              <div className="mb-6">
                <Label className="text-sm font-medium text-gray-700 mb-3 block">
                  Available Slots
                  {selectedDate && <span className="text-gray-400 font-normal ml-2">
                    {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </span>}
                </Label>

                {loadingSlots ? (
                  <div className="flex items-center justify-center py-10 text-gray-400">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500 mr-3" />
                    Loading slots...
                  </div>
                ) : availableSlots.length === 0 ? (
                  <Alert className="bg-amber-50 border-amber-200">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-700">
                      No slots available for this date. Try another date or contact the trainer.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-3">
                    {availableSlots.map(slot => {
                      const spots = availableSpots(slot);
                      const isSelected = selectedSlot?._id === slot._id;
                      return (
                        <div key={slot._id}
                          onClick={() => setSelectedSlot(slot)}
                          className={`relative rounded-xl border-2 p-4 cursor-pointer transition-all duration-150 ${
                            isSelected
                              ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                              : 'border-gray-100 bg-white hover:border-indigo-200 hover:bg-gray-50'
                          }`}>
                          {isSelected && (
                            <div className="absolute top-3 right-3">
                              <CheckCircle className="w-5 h-5 text-indigo-600" />
                            </div>
                          )}

                          <div className="flex items-start justify-between pr-8">
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-1">{slot.title}</h4>
                              {slot.description && (
                                <p className="text-xs text-gray-500 mb-2">{slot.description}</p>
                              )}
                              <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                                  {slot.startTime} – {slot.endTime}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Users className="w-3.5 h-3.5 text-gray-400" />
                                  {spots} spot{spots !== 1 ? 's' : ''} left
                                </span>
                                {slot.mode === 'online' && (
                                  <span className="flex items-center gap-1">
                                    <Video className="w-3.5 h-3.5 text-gray-400" /> Online
                                  </span>
                                )}
                                {slot.mode === 'offline' && slot.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                                    <span className="truncate max-w-[120px]">{slot.location}</span>
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline" className="text-xs border-gray-200 text-gray-500">
                                  {formatType(slot.sessionType)}
                                </Badge>
                                <Badge variant="outline" className="text-xs border-gray-200 text-gray-500">
                                  {slot.duration} min
                                </Badge>
                              </div>
                            </div>
                            <div className="text-right shrink-0 ml-4">
                              <p className="text-2xl font-bold text-indigo-600">${slot.price}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="mb-6">
                <Label htmlFor="notes" className="text-sm font-medium text-gray-700 mb-2 block">
                  Notes <span className="text-gray-400 font-normal">(optional)</span>
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Any specific goals, injuries, or requirements for this session..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  className="bg-gray-50 border-gray-200 resize-none"
                />
              </div>

              {/* Book button */}
              <Button
                onClick={handleBooking}
                disabled={!selectedSlot || booking}
                size="lg"
                className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 text-base font-semibold shadow-md shadow-indigo-200 disabled:opacity-50"
              >
                {booking ? (
                  <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" /> Processing...</>
                ) : selectedSlot ? (
                  <>Confirm Booking · ${selectedSlot.price} <ChevronRight className="w-4 h-4 ml-1" /></>
                ) : (
                  'Select a slot to continue'
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookTrainerNew;
