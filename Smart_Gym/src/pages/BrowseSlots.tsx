import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Search, Clock, DollarSign, Users, Video, MapPin, Star,
  Calendar, Filter, RefreshCw, ChevronLeft, ChevronRight,
  CheckCircle, Award, Zap, X, Wifi,
} from 'lucide-react';
import { apiService } from '@/services/api';
import { socketService } from '@/services/socket';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

// ── Types ────────────────────────────────────────────────────────────────────
interface Slot {
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
  trainerId: {
    _id: string;
    name: string;
    trainerProfile?: {
      bio?: string;
      specializations?: string[];
      certifications?: string[];
      experience?: number;
      hourlyRate?: number;
      profileImage?: string;
      rating?: { average: number; count: number };
    };
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const SESSION_TYPE_LABELS: Record<string, string> = {
  'personal-training': 'Personal Training',
  'group-class': 'Group Class',
  'consultation': 'Consultation',
  'follow-up': 'Follow-up',
};

const MODE_COLORS: Record<string, string> = {
  online:  'bg-blue-100 text-blue-700',
  offline: 'bg-green-100 text-green-700',
  hybrid:  'bg-purple-100 text-purple-700',
};

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

const spotsLeft = (slot: Slot) => slot.maxParticipants - slot.currentParticipants;

const getInitials = (name: string) =>
  name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

// ── Slot Card ────────────────────────────────────────────────────────────────
function SlotCard({ slot, onBook, isNew }: { slot: Slot; onBook: (slot: Slot) => void; isNew?: boolean }) {
  const tp = slot.trainerId?.trainerProfile;
  const spots = spotsLeft(slot);
  const isFull = spots <= 0;

  return (
    <Card className={`group hover:shadow-lg transition-all duration-200 border ${isNew ? 'ring-2 ring-indigo-400 ring-offset-1' : 'border-gray-100'}`}>
      <CardContent className="p-5">
        {/* Trainer row */}
        <div className="flex items-center gap-3 mb-4">
          <Avatar className="w-10 h-10 shrink-0">
            <AvatarImage src={tp?.profileImage} />
            <AvatarFallback className="bg-indigo-100 text-indigo-700 text-sm font-semibold">
              {getInitials(slot.trainerId?.name || '?')}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-gray-900 truncate">{slot.trainerId?.name}</p>
            <div className="flex items-center gap-1">
              {tp?.rating?.average ? (
                <>
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span className="text-xs text-gray-500">{tp.rating.average.toFixed(1)} ({tp.rating.count})</span>
                </>
              ) : <span className="text-xs text-gray-400">New trainer</span>}
            </div>
          </div>
          {isNew && (
            <Badge className="bg-indigo-100 text-indigo-700 text-xs shrink-0 animate-pulse">New</Badge>
          )}
        </div>

        {/* Session title & badges */}
        <h3 className="font-semibold text-gray-900 mb-2 leading-tight">{slot.title}</h3>
        {slot.description && (
          <p className="text-xs text-gray-500 line-clamp-2 mb-3">{slot.description}</p>
        )}
        <div className="flex flex-wrap gap-1.5 mb-4">
          <Badge variant="outline" className="text-xs capitalize border-gray-200">
            {SESSION_TYPE_LABELS[slot.sessionType] || slot.sessionType}
          </Badge>
          <Badge className={`text-xs capitalize ${MODE_COLORS[slot.mode] || 'bg-gray-100 text-gray-600'}`}>
            {slot.mode === 'online' ? <Video className="w-3 h-3 mr-1" /> : <MapPin className="w-3 h-3 mr-1" />}
            {slot.mode}
          </Badge>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-4">
          <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-gray-400" />{formatDate(slot.date)}</span>
          <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-gray-400" />{slot.startTime} – {slot.endTime}</span>
          <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-gray-400" />{slot.duration} min</span>
          <span className={`flex items-center gap-1.5 font-medium ${isFull ? 'text-red-500' : spots <= 2 ? 'text-orange-500' : 'text-gray-600'}`}>
            <Users className="w-3.5 h-3.5" />{isFull ? 'Full' : `${spots} spot${spots !== 1 ? 's' : ''} left`}
          </span>
          {slot.location && <span className="flex items-center gap-1.5 col-span-2 truncate"><MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />{slot.location}</span>}
        </div>

        {/* Price + CTA */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-2xl font-bold text-indigo-600">${slot.price}</span>
            <span className="text-xs text-gray-400 ml-1">/ session</span>
          </div>
          <Button
            size="sm"
            disabled={isFull}
            onClick={() => onBook(slot)}
            className={`${isFull ? 'opacity-50 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-200'}`}
          >
            {isFull ? 'Full' : 'Book Now'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function BrowseSlots() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const LIMIT = 12;

  // Filters
  const [search, setSearch] = useState('');
  const [sessionTypeFilter, setSessionTypeFilter] = useState('all');
  const [modeFilter, setModeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState('date');

  // Real-time
  const [liveCount, setLiveCount] = useState(0);
  const [newSlotIds, setNewSlotIds] = useState<Set<string>>(new Set());
  const newSlotTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Booking dialog
  const [bookingSlot, setBookingSlot] = useState<Slot | null>(null);
  const [notes, setNotes] = useState('');
  const [booking, setBooking] = useState(false);

  // ── Fetch ──
  const fetchSlots = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params: any = { page: p, limit: LIMIT, status: 'available' };
      if (sessionTypeFilter !== 'all') params.sessionType = sessionTypeFilter;
      if (modeFilter !== 'all') params.mode = modeFilter;
      if (dateFilter) params.date = dateFilter;
      const res: any = await apiService.getAllSessionSlots(params);
      let list: Slot[] = res.slots || [];

      // Client-side filter: search & price
      if (search.trim()) {
        const q = search.toLowerCase();
        list = list.filter(s =>
          s.title.toLowerCase().includes(q) ||
          s.trainerId?.name?.toLowerCase().includes(q) ||
          s.description?.toLowerCase().includes(q) ||
          s.trainerId?.trainerProfile?.specializations?.some((sp: string) => sp.toLowerCase().includes(q))
        );
      }
      if (maxPrice) list = list.filter(s => s.price <= Number(maxPrice));

      // Sort
      if (sortBy === 'date') list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.startTime.localeCompare(b.startTime));
      else if (sortBy === 'price-asc') list.sort((a, b) => a.price - b.price);
      else if (sortBy === 'price-desc') list.sort((a, b) => b.price - a.price);
      else if (sortBy === 'rating') list.sort((a, b) => (b.trainerId?.trainerProfile?.rating?.average || 0) - (a.trainerId?.trainerProfile?.rating?.average || 0));

      setSlots(list);
      setTotal(res.pagination?.total || list.length);
      setPages(res.pagination?.pages || 1);
      setPage(p);
    } catch (e: any) {
      toast({ title: 'Error loading slots', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [search, sessionTypeFilter, modeFilter, dateFilter, maxPrice, sortBy]);

  useEffect(() => { fetchSlots(1); }, [fetchSlots]);

  // ── Real-time socket ──
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    const handleSlotCreated = (data: any) => {
      setLiveCount(c => c + 1);
      const id = data?.slot?._id;
      if (id) {
        setNewSlotIds(prev => new Set(prev).add(id));
        if (newSlotTimer.current) clearTimeout(newSlotTimer.current);
        newSlotTimer.current = setTimeout(() => setNewSlotIds(new Set()), 8000);
      }
      fetchSlots(1);
    };

    const handleSlotUpdated = () => fetchSlots(page);
    const handleSlotCancelled = () => fetchSlots(page);

    socket.on('slot:created', handleSlotCreated);
    socket.on('slot:updated', handleSlotUpdated);
    socket.on('slot:cancelled', handleSlotCancelled);

    return () => {
      socket.off('slot:created', handleSlotCreated);
      socket.off('slot:updated', handleSlotUpdated);
      socket.off('slot:cancelled', handleSlotCancelled);
    };
  }, [fetchSlots, page]);

  // ── Booking ──
  const handleBook = async () => {
    if (!bookingSlot) return;
    if (!user) { navigate('/login'); return; }
    setBooking(true);
    try {
      const res: any = await apiService.bookSessionSlot(bookingSlot._id, notes);
      if (res.requiresPayment && res.payment) {
        const params = new URLSearchParams({
          clientSecret: res.payment.clientSecret,
          bookingId: res.booking._id,
          amount: res.payment.amount.toString(),
          trainerName: encodeURIComponent(bookingSlot.trainerId?.name || ''),
        });
        navigate(`/booking-payment?${params.toString()}`);
      } else {
        toast({ title: 'Booked!', description: 'Your session has been booked successfully.' });
        setBookingSlot(null);
        setNotes('');
        fetchSlots(page);
        navigate('/my-bookings');
      }
    } catch (e: any) {
      toast({ title: 'Booking failed', description: e.message, variant: 'destructive' });
      fetchSlots(page);
    } finally {
      setBooking(false);
    }
  };

  const clearFilters = () => {
    setSearch(''); setSessionTypeFilter('all'); setModeFilter('all');
    setDateFilter(''); setMaxPrice(''); setSortBy('date');
  };

  const hasFilters = search || sessionTypeFilter !== 'all' || modeFilter !== 'all' || dateFilter || maxPrice;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-indigo-700 via-indigo-600 to-purple-700 text-white py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl md:text-4xl font-bold">Browse Sessions</h1>
            {liveCount > 0 && (
              <div className="flex items-center gap-2 bg-white/15 rounded-full px-3 py-1.5 text-sm">
                <Wifi className="w-4 h-4 text-green-300 animate-pulse" />
                <span className="text-white/90">Live updates on</span>
              </div>
            )}
          </div>
          <p className="text-white/70 mb-8">Find and book training sessions from verified trainers</p>

          {/* Search bar */}
          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search by trainer name, session type, or specialization…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-12 h-12 bg-white text-gray-900 border-0 shadow-lg rounded-xl text-base"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Filters bar */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-6">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Session Type</Label>
              <Select value={sessionTypeFilter} onValueChange={setSessionTypeFilter}>
                <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.entries(SESSION_TYPE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Mode</Label>
              <Select value={modeFilter} onValueChange={setModeFilter}>
                <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modes</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="offline">In-Person</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Date</Label>
              <Input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
                min={new Date().toISOString().split('T')[0]} className="w-36 h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Max Price ($)</Label>
              <Input type="number" min={0} placeholder="Any" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} className="w-24 h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Sort By</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Earliest First</SelectItem>
                  <SelectItem value="price-asc">Price: Low → High</SelectItem>
                  <SelectItem value="price-desc">Price: High → Low</SelectItem>
                  <SelectItem value="rating">Top Rated</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 ml-auto">
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 text-gray-500">
                  <X className="w-4 h-4 mr-1" />Clear
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => fetchSlots(page)} className="h-9">
                <RefreshCw className="w-4 h-4 mr-1" />Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Results header */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500">
            {loading ? 'Loading…' : `${slots.length} session${slots.length !== 1 ? 's' : ''} available`}
            {hasFilters && <span className="ml-2 text-indigo-600 font-medium">· Filtered</span>}
          </p>
          {liveCount > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              Live — updates automatically
            </div>
          )}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse">
                <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 bg-gray-200 rounded-full" /><div className="flex-1"><div className="h-3 bg-gray-200 rounded w-3/4 mb-2" /><div className="h-2 bg-gray-100 rounded w-1/2" /></div></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-2" /><div className="h-3 bg-gray-100 rounded w-2/3 mb-4" />
                <div className="grid grid-cols-2 gap-2 mb-4">{Array.from({ length: 4 }).map((_, j) => <div key={j} className="h-3 bg-gray-100 rounded" />)}</div>
                <div className="flex justify-between items-center"><div className="h-6 bg-gray-200 rounded w-16" /><div className="h-8 bg-gray-200 rounded w-20" /></div>
              </div>
            ))}
          </div>
        ) : slots.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <Calendar className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-lg font-medium text-gray-500 mb-1">No sessions found</p>
            <p className="text-sm mb-4">{hasFilters ? 'Try adjusting your filters' : 'Check back soon — trainers are adding new slots'}</p>
            {hasFilters && <Button variant="outline" size="sm" onClick={clearFilters}><Filter className="w-4 h-4 mr-1" />Clear Filters</Button>}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {slots.map(slot => (
              <SlotCard
                key={slot._id}
                slot={slot}
                onBook={setBookingSlot}
                isNew={newSlotIds.has(slot._id)}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && !loading && (
          <div className="flex items-center justify-between mt-8">
            <p className="text-sm text-gray-500">Page {page} of {pages} · {total} total</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => fetchSlots(page - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {Array.from({ length: Math.min(pages, 5) }, (_, i) => {
                const p = page <= 3 ? i + 1 : page - 2 + i;
                if (p < 1 || p > pages) return null;
                return (
                  <Button key={p} size="sm" variant={p === page ? 'default' : 'outline'} onClick={() => fetchSlots(p)} className="w-9">
                    {p}
                  </Button>
                );
              })}
              <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => fetchSlots(page + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Booking Dialog */}
      <Dialog open={!!bookingSlot} onOpenChange={o => !booking && !o && setBookingSlot(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-indigo-500" /> Confirm Booking
            </DialogTitle>
            <DialogDescription>Review the session details before confirming</DialogDescription>
          </DialogHeader>

          {bookingSlot && (
            <div className="space-y-4">
              {/* Trainer */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={bookingSlot.trainerId?.trainerProfile?.profileImage} />
                  <AvatarFallback className="bg-indigo-100 text-indigo-700 text-sm font-semibold">
                    {getInitials(bookingSlot.trainerId?.name || '?')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-sm">{bookingSlot.trainerId?.name}</p>
                  {bookingSlot.trainerId?.trainerProfile?.specializations?.slice(0, 2).map((s: string) => (
                    <Badge key={s} variant="outline" className="text-xs mr-1 mt-0.5">{s}</Badge>
                  ))}
                </div>
              </div>

              {/* Session details */}
              <div className="space-y-2 text-sm">
                {[
                  { icon: <Calendar className="w-4 h-4 text-gray-400" />, label: 'Date', value: formatDate(bookingSlot.date) },
                  { icon: <Clock className="w-4 h-4 text-gray-400" />, label: 'Time', value: `${bookingSlot.startTime} – ${bookingSlot.endTime} (${bookingSlot.duration} min)` },
                  { icon: bookingSlot.mode === 'online' ? <Video className="w-4 h-4 text-gray-400" /> : <MapPin className="w-4 h-4 text-gray-400" />, label: 'Mode', value: bookingSlot.mode.charAt(0).toUpperCase() + bookingSlot.mode.slice(1) + (bookingSlot.location ? ` · ${bookingSlot.location}` : '') },
                  { icon: <Users className="w-4 h-4 text-gray-400" />, label: 'Spots left', value: `${spotsLeft(bookingSlot)} of ${bookingSlot.maxParticipants}` },
                ].map(({ icon, label, value }) => (
                  <div key={label} className="flex items-center gap-3">
                    {icon}
                    <span className="text-gray-500 w-20 shrink-0">{label}</span>
                    <span className="font-medium text-gray-900">{value}</span>
                  </div>
                ))}
              </div>

              {/* Certifications */}
              {bookingSlot.trainerId?.trainerProfile?.certifications?.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {bookingSlot.trainerId.trainerProfile.certifications.slice(0, 3).map((c: string) => (
                    <div key={c} className="flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                      <Award className="w-3 h-3" />{c}
                    </div>
                  ))}
                </div>
              ) : null}

              {/* Price */}
              <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg">
                <span className="text-sm text-indigo-700 font-medium">Total</span>
                <span className="text-2xl font-bold text-indigo-600">${bookingSlot.price}</span>
              </div>

              {/* Notes */}
              <div>
                <Label className="text-sm">Notes <span className="text-gray-400 font-normal">(optional)</span></Label>
                <Textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Any goals, injuries, or requirements for this session…"
                  rows={2}
                  className="mt-1 resize-none text-sm"
                />
              </div>

              {!user && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  You need to log in to book a session.
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setBookingSlot(null); setNotes(''); }} disabled={booking}>Cancel</Button>
            <Button onClick={handleBook} disabled={booking || !bookingSlot} className="bg-indigo-600 hover:bg-indigo-700">
              {booking ? (
                <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />Processing…</>
              ) : (
                <>Confirm · ${bookingSlot?.price}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
