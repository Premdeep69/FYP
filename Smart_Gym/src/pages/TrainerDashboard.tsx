import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Calendar as CalendarIcon, DollarSign, Users, Star, Clock, Plus, Trash2,
  Camera, Save, User, Award, Briefcase, CheckCircle, XCircle, AlertCircle,
  Edit, Copy, Video, MapPin, X, RefreshCw, LogOut, TrendingUp,
  ChevronLeft, ChevronRight, Search, Filter, MessageSquarePlus, Hourglass, CreditCard,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiService, TrainerDashboardData } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { socketService } from "@/services/socket";
import TrainerPaymentHistory from "@/components/TrainerPaymentHistory";

// ── Constants ────────────────────────────────────────────────────────────────
const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
const SESSION_TYPES = [
  { value: 'personal-training', label: 'Personal Training' },
  { value: 'group-class', label: 'Group Class' },
  { value: 'consultation', label: 'Consultation' },
  { value: 'follow-up', label: 'Follow-up' },
];
const MODES = [
  { value: 'online', label: 'Online' },
  { value: 'offline', label: 'Offline' },
  { value: 'hybrid', label: 'Hybrid' },
];
const MEETING_TYPES = [
  { value: 'none', label: 'No Meeting Link' },
  { value: 'external', label: 'External Link (Zoom, Meet…)' },
];
const COMMON_SPECIALIZATIONS = [
  'Weight Loss','Strength Training','HIIT','Yoga','Pilates',
  'CrossFit','Bodybuilding','Sports Training','Rehabilitation','Nutrition',
];

// ── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-green-100 text-green-800',
  completed: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800',
  'no-show': 'bg-gray-100 text-gray-800',
  available: 'bg-green-100 text-green-800',
  full:      'bg-orange-100 text-orange-800',
};
const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending:   <AlertCircle className="w-3.5 h-3.5" />,
  confirmed: <CheckCircle className="w-3.5 h-3.5" />,
  completed: <CheckCircle className="w-3.5 h-3.5" />,
  cancelled: <XCircle className="w-3.5 h-3.5" />,
  'no-show': <XCircle className="w-3.5 h-3.5" />,
};

const emptySlotForm = {
  title: '', description: '', sessionType: 'personal-training', mode: 'offline',
  location: '', meetingType: 'none', meetingLink: '',
  date: new Date(), startTime: '09:00', endTime: '10:00',
  duration: 60, price: 50, maxParticipants: 1,
  cancellationPolicy: '24 hours notice required',
  meetingAccessControl: { requiresPassword: false, password: '', allowEarlyJoin: true, earlyJoinMinutes: 10, recordSession: false },
};

const formatDateForAPI = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// ── Main Component ───────────────────────────────────────────────────────────
const TrainerDashboard = () => {
  const { user, logout, refreshUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<TrainerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Bookings state ──
  const [bookings, setBookings] = useState<any[]>([]);
  const [bookingStats, setBookingStats] = useState<any>(null);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingStatusFilter, setBookingStatusFilter] = useState('all');
  const [bookingSearch, setBookingSearch] = useState('');
  const [bookingPage, setBookingPage] = useState(1);
  const [bookingPages, setBookingPages] = useState(1);
  const [notesDialog, setNotesDialog] = useState<{ open: boolean; booking: any } | null>(null);
  const [trainerNotes, setTrainerNotes] = useState('');

  // ── Session Slots state ──
  const [slots, setSlots] = useState<any[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotTabFilter, setSlotTabFilter] = useState('available');
  const [slotDialog, setSlotDialog] = useState<{ open: boolean; editing: any | null }>({ open: false, editing: null });
  const [slotForm, setSlotForm] = useState({ ...emptySlotForm });
  const [slotSaving, setSlotSaving] = useState(false);

  // ── Profile state ──
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: '', bio: '', experience: '', hourlyRate: '',
    specializations: [] as string[], certifications: [] as string[], avatar: '',
  });
  const [avatarPreview, setAvatarPreview] = useState('');
  const [newCertInput, setNewCertInput] = useState('');
  const [newSpecInput, setNewSpecInput] = useState('');

  // ── Availability state ──
  const [availability, setAvailability] = useState<any[]>([]);
  const [availSaving, setAvailSaving] = useState(false);

  // ── Services state ──
  const [sessionTypes, setSessionTypes] = useState<any[]>([]);
  const [hourlyRate, setHourlyRate] = useState(0);
  const [servicesSaving, setServicesSaving] = useState(false);

  // ── Session Requests state ──
  const [requests, setRequests] = useState<any[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestStatusFilter, setRequestStatusFilter] = useState('all');
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; req: any } | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [acceptDialog, setAcceptDialog] = useState<{ open: boolean; req: any } | null>(null);
  const [acceptPrice, setAcceptPrice] = useState('');
  const [acceptNote, setAcceptNote] = useState('');
  const pendingRequestCount = requests.filter(r => r.status === 'pending').length;

  // ── Auth guard ──
  useEffect(() => {
    if (!user) return;
    if (user.userType !== 'trainer') { navigate('/user-dashboard'); return; }
    if (!user.isVerified) { navigate('/pending-approval'); return; }
    loadAll();
  }, [user]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const data = await apiService.getTrainerDashboard();
      setDashboardData(data);
      const tp = (user as any)?.trainerProfile || {};
      setAvailability(tp.availability || []);
      setSessionTypes(tp.sessionTypes || []);
      setHourlyRate(tp.hourlyRate || 0);
      setProfileForm({
        name: user?.name || '',
        bio: tp.bio || '',
        experience: tp.experience?.toString() || '',
        hourlyRate: tp.hourlyRate?.toString() || '',
        specializations: tp.specializations || [],
        certifications: tp.certifications || [],
        avatar: tp.profileImage || '',
      });
      setAvatarPreview(tp.profileImage || '');
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // ── Session Requests ──
  const fetchRequests = useCallback(async () => {
    setRequestsLoading(true);
    try {
      const data: any = await apiService.getTrainerSessionRequests(
        requestStatusFilter !== 'all' ? requestStatusFilter : undefined
      );
      setRequests(data);
    } catch (e: any) {
      toast({ title: 'Error loading requests', description: e.message, variant: 'destructive' });
    } finally { setRequestsLoading(false); }
  }, [requestStatusFilter]);

  useEffect(() => { if (user?.isVerified) fetchRequests(); }, [fetchRequests]);

  // Real-time: new request arrives
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;
    const onNew = () => {
      fetchRequests();
      toast({ title: '📩 New session request!', description: 'A user has requested a session with you.' });
    };
    const onConfirmed = () => {
      fetchRequests();
      toast({ title: '💳 Payment received!', description: 'A user completed payment — session is now confirmed.' });
    };
    socket.on('sessionRequest:new', onNew);
    socket.on('sessionRequest:confirmed', onConfirmed);
    // Slot booking confirmed after payment
    const onNewBookingConfirmed = () => {
      fetchBookings(1);
      fetchBookingStats();
      toast({ title: '💳 New booking confirmed!', description: 'A user completed payment for a session.' });
    };
    socket.on('booking:new_confirmed', onNewBookingConfirmed);
    return () => {
      socket.off('sessionRequest:new', onNew);
      socket.off('sessionRequest:confirmed', onConfirmed);
      socket.off('booking:new_confirmed', onNewBookingConfirmed);
    };
  }, [fetchRequests]);

  const handleAcceptRequest = async () => {
    if (!acceptDialog?.req) return;
    try {
      await apiService.acceptSessionRequest(acceptDialog.req._id, {
        trainerNote: acceptNote || undefined,
        price: acceptPrice ? Number(acceptPrice) : undefined,
      });
      toast({ title: '✅ Request accepted', description: 'A session slot has been created for the user.' });
      setAcceptDialog(null);
      setAcceptNote('');
      setAcceptPrice('');
      fetchRequests();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleRejectRequest = async () => {
    if (!rejectDialog?.req) return;
    try {
      await apiService.rejectSessionRequest(rejectDialog.req._id, rejectNote || undefined);
      toast({ title: 'Request declined' });
      setRejectDialog(null);
      setRejectNote('');
      fetchRequests();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  // ── Bookings ──
  const fetchBookings = useCallback(async (page = 1) => {
    setBookingsLoading(true);
    try {
      const params: any = { page, limit: 10 };
      if (bookingStatusFilter !== 'all') params.status = bookingStatusFilter;
      const res: any = await apiService.getTrainerBookings(params);
      setBookings(res.bookings || []);
      setBookingPages(res.pagination?.pages || 1);
      setBookingPage(page);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setBookingsLoading(false); }
  }, [bookingStatusFilter]);

  const fetchBookingStats = useCallback(async () => {
    try {
      const s: any = await apiService.getBookingStats();
      setBookingStats(s);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { if (user?.isVerified) { fetchBookings(1); fetchBookingStats(); } }, [fetchBookings, fetchBookingStats]);

  const handleBookingStatus = async (bookingId: string, status: string, notes?: string) => {
    try {
      if (status === 'cancelled') {
        // Trainer cancellation — triggers 100% refund
        const res: any = await apiService.cancelBookingAsTrainer(bookingId, notes || 'Cancelled by trainer');
        const refund = res.refund;
        toast({
          title: 'Booking Cancelled',
          description: refund?.processed
            ? `Full refund of $${refund.refundAmount} issued to the client.`
            : 'Booking cancelled.',
        });
      } else {
        await apiService.updateBookingStatus(bookingId, status, undefined, notes);
        toast({ title: `Booking ${status}` });
      }
      fetchBookings(bookingPage);
      fetchBookingStats();
      setNotesDialog(null);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const filteredBookings = bookings.filter(b => {
    if (!bookingSearch) return true;
    const q = bookingSearch.toLowerCase();
    return b.clientId?.name?.toLowerCase().includes(q) || b.clientId?.email?.toLowerCase().includes(q) || b.sessionType?.includes(q);
  });

  // ── Session Slots ──
  const fetchSlots = useCallback(async () => {
    setSlotsLoading(true);
    try {
      const res: any = await apiService.getTrainerSessionSlots({ limit: 100 });
      setSlots(res.slots || []);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setSlotsLoading(false); }
  }, []);

  useEffect(() => { if (user?.isVerified) fetchSlots(); }, [fetchSlots]);

  const openCreateSlot = () => { setSlotForm({ ...emptySlotForm, date: new Date() }); setSlotDialog({ open: true, editing: null }); };
  const openEditSlot = (slot: any) => {
    setSlotForm({
      title: slot.title, description: slot.description || '',
      sessionType: slot.sessionType, mode: slot.mode,
      location: slot.location || '', meetingType: slot.meetingType || 'none',
      meetingLink: slot.meetingLink || '', date: new Date(slot.date),
      startTime: slot.startTime, endTime: slot.endTime,
      duration: slot.duration, price: slot.price,
      maxParticipants: slot.maxParticipants,
      cancellationPolicy: slot.cancellationPolicy || '24 hours notice required',
      meetingAccessControl: slot.meetingAccessControl || emptySlotForm.meetingAccessControl,
    });
    setSlotDialog({ open: true, editing: slot });
  };

  const handleSaveSlot = async () => {
    if (!slotForm.title) { toast({ title: 'Title is required', variant: 'destructive' }); return; }
    setSlotSaving(true);
    try {
      const payload = { ...slotForm, date: formatDateForAPI(slotForm.date) };
      if (slotDialog.editing) {
        await apiService.updateSessionSlot(slotDialog.editing._id, payload);
        toast({ title: 'Slot updated' });
      } else {
        await apiService.createSessionSlot(payload);
        toast({ title: 'Slot created' });
      }
      setSlotDialog({ open: false, editing: null });
      fetchSlots();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setSlotSaving(false); }
  };

  const handleCancelSlot = async (slotId: string) => {
    if (!confirm('Cancel this slot? All bookings will be cancelled.')) return;
    try {
      await apiService.cancelSessionSlot(slotId, 'Trainer cancelled');
      toast({ title: 'Slot cancelled' });
      fetchSlots();
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm('Delete this slot?')) return;
    try {
      await apiService.deleteSessionSlot(slotId);
      toast({ title: 'Slot deleted' });
      fetchSlots();
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  const filteredSlots = slots.filter(s => slotTabFilter === 'all' || s.status === slotTabFilter);

  // ── Profile ──
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast({ title: 'Image must be under 2MB', variant: 'destructive' }); return; }
    const reader = new FileReader();
    reader.onloadend = () => { const b64 = reader.result as string; setAvatarPreview(b64); setProfileForm(p => ({ ...p, avatar: b64 })); };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    if (!profileForm.name.trim()) { toast({ title: 'Name is required', variant: 'destructive' }); return; }
    setProfileSaving(true);
    try {
      await apiService.updateTrainerProfile({
        name: profileForm.name, bio: profileForm.bio,
        experience: profileForm.experience || undefined,
        hourlyRate: profileForm.hourlyRate || undefined,
        specializations: profileForm.specializations,
        certifications: profileForm.certifications,
        avatar: profileForm.avatar || undefined,
      });
      await refreshUser();
      toast({ title: 'Profile saved' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setProfileSaving(false); }
  };

  // ── Availability ──
  const getDayAvail = (day: string) => availability.find(a => a.day === day);
  const toggleDay = (day: string) => {
    const idx = availability.findIndex(a => a.day === day);
    if (idx >= 0) { const u = [...availability]; u[idx] = { ...u[idx], isAvailable: !u[idx].isAvailable }; setAvailability(u); }
    else setAvailability([...availability, { day, startTime: '09:00', endTime: '17:00', isAvailable: true }]);
  };
  const updateDayTime = (day: string, field: 'startTime' | 'endTime', val: string) => {
    const idx = availability.findIndex(a => a.day === day);
    if (idx >= 0) { const u = [...availability]; u[idx] = { ...u[idx], [field]: val }; setAvailability(u); }
  };
  const handleSaveAvailability = async () => {
    setAvailSaving(true);
    try {
      await apiService.updateTrainerAvailability(availability);
      toast({ title: 'Availability updated' });
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    finally { setAvailSaving(false); }
  };

  // ── Services ──
  const handleSaveServices = async () => {
    setServicesSaving(true);
    try {
      await apiService.updateTrainerPricing({ sessionTypes, hourlyRate });
      toast({ title: 'Services updated' });
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    finally { setServicesSaving(false); }
  };

  // ── Loading / guard ──
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" /><p className="text-muted-foreground">Loading dashboard…</p></div>
    </div>
  );

  const tp = (user as any)?.trainerProfile || {};
  const totalRevenue = bookingStats?.stats?.reduce((s: number, x: any) => s + (x.totalRevenue || 0), 0) || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Avatar className="w-9 h-9">
            <AvatarImage src={avatarPreview} />
            <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-sm text-gray-900">{user?.name}</p>
            <p className="text-xs text-gray-500">Trainer Dashboard</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => { logout(); navigate('/login'); }}>
          <LogOut className="w-4 h-4 mr-1" /> Logout
        </Button>
      </div>

      <div className="p-6 max-w-7xl mx-auto">
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Active Clients', value: dashboardData?.stats.activeClients ?? 0, icon: <Users className="w-7 h-7 text-blue-500" /> },
            { label: 'Monthly Earnings', value: `$${(dashboardData?.stats.monthlyEarnings ?? 0).toFixed(0)}`, icon: <DollarSign className="w-7 h-7 text-green-500" /> },
            { label: 'Total Bookings', value: bookingStats?.totalBookings ?? 0, icon: <CalendarIcon className="w-7 h-7 text-indigo-500" /> },
            { label: 'Avg Rating', value: (tp.rating?.average || 0).toFixed(1) + ' ⭐', icon: <Star className="w-7 h-7 text-yellow-500" /> },
          ].map(({ label, value, icon }) => (
            <Card key={label}><CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">{icon}<div><p className="text-xs text-gray-500">{label}</p><p className="text-2xl font-bold">{value}</p></div></div>
            </CardContent></Card>
          ))}
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="overview">
          <TabsList className="mb-5 flex-wrap h-auto gap-1">
            <TabsTrigger value="overview"><TrendingUp className="w-4 h-4 mr-1.5" />Overview</TabsTrigger>
            <TabsTrigger value="bookings"><CalendarIcon className="w-4 h-4 mr-1.5" />Bookings{bookingStats?.upcomingBookings > 0 && <span className="ml-1.5 bg-indigo-500 text-white text-xs rounded-full px-1.5">{bookingStats.upcomingBookings}</span>}</TabsTrigger>
            <TabsTrigger value="requests">
              <MessageSquarePlus className="w-4 h-4 mr-1.5" />Requests
              {pendingRequestCount > 0 && <span className="ml-1.5 bg-orange-500 text-white text-xs rounded-full px-1.5">{pendingRequestCount}</span>}
            </TabsTrigger>
            <TabsTrigger value="slots"><Clock className="w-4 h-4 mr-1.5" />Session Slots</TabsTrigger>
            <TabsTrigger value="profile"><User className="w-4 h-4 mr-1.5" />Profile</TabsTrigger>
            <TabsTrigger value="availability"><CalendarIcon className="w-4 h-4 mr-1.5" />Availability</TabsTrigger>
            <TabsTrigger value="services"><DollarSign className="w-4 h-4 mr-1.5" />Services</TabsTrigger>
            <TabsTrigger value="payments"><CreditCard className="w-4 h-4 mr-1.5" />Payments</TabsTrigger>
          </TabsList>

          {/* ── Overview ── */}
          <TabsContent value="overview" className="space-y-5">
            <div className="grid lg:grid-cols-2 gap-5">
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Today's Sessions</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {dashboardData?.todaySessions?.length ? dashboardData.todaySessions.map((s: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{s.clientId?.name || 'Client'}</p>
                        <p className="text-xs text-gray-500 capitalize">{s.sessionType?.replace('-', ' ')} · {s.startTime}</p>
                      </div>
                      <Badge className={STATUS_COLORS[s.status] || ''}>{s.status}</Badge>
                    </div>
                  )) : <p className="text-sm text-gray-400 text-center py-6">No sessions today</p>}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Active Clients</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {dashboardData?.activeClients?.length ? dashboardData.activeClients.slice(0, 5).map((c: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-8 h-8"><AvatarFallback className="text-xs">{c.name?.charAt(0)}</AvatarFallback></Avatar>
                        <div><p className="font-medium text-sm">{c.name}</p><p className="text-xs text-gray-500">{c.totalSessions} sessions</p></div>
                      </div>
                      <span className="text-sm font-medium text-green-600">${c.totalEarnings?.toFixed(0) || 0}</span>
                    </div>
                  )) : <p className="text-sm text-gray-400 text-center py-6">No active clients yet</p>}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Earnings Summary</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  {[
                    { label: 'Today', value: `$${(dashboardData?.stats.todayEarnings ?? 0).toFixed(0)}` },
                    { label: 'This Month', value: `$${(dashboardData?.stats.monthlyEarnings ?? 0).toFixed(0)}` },
                    { label: 'Total Revenue', value: `$${totalRevenue.toFixed(0)}` },
                    { label: 'Completed Sessions', value: tp.completedSessions || 0 },
                  ].map(({ label, value }) => (
                    <div key={label} className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">{label}</p>
                      <p className="text-xl font-bold">{value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Bookings ── */}
          <TabsContent value="bookings" className="space-y-4">
            {/* Booking stats */}
            {bookingStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Total', value: bookingStats.totalBookings, color: 'text-gray-700' },
                  { label: 'Upcoming', value: bookingStats.upcomingBookings, color: 'text-indigo-600' },
                  { label: 'Completed', value: bookingStats.stats?.find((s: any) => s._id === 'completed')?.count || 0, color: 'text-green-600' },
                  { label: 'Pending', value: bookingStats.stats?.find((s: any) => s._id === 'pending')?.count || 0, color: 'text-yellow-600' },
                ].map(({ label, value, color }) => (
                  <Card key={label}><CardContent className="pt-4 pb-3 text-center">
                    <p className={`text-2xl font-bold ${color}`}>{value}</p>
                    <p className="text-xs text-gray-500">{label}</p>
                  </CardContent></Card>
                ))}
              </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[200px] relative">
                <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
                <Input placeholder="Search by client name or email…" value={bookingSearch} onChange={e => setBookingSearch(e.target.value)} className="pl-8" />
              </div>
              <Select value={bookingStatusFilter} onValueChange={v => { setBookingStatusFilter(v); setBookingPage(1); }}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {['pending','confirmed','completed','cancelled','no-show'].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => fetchBookings(1)}><RefreshCw className="w-4 h-4 mr-1" />Refresh</Button>
            </div>

            {/* Bookings list */}
            {bookingsLoading ? (
              <div className="flex items-center justify-center py-16 text-gray-400">Loading…</div>
            ) : filteredBookings.length === 0 ? (
              <Card><CardContent className="py-16 text-center text-gray-400">
                <CalendarIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No bookings found</p>
              </CardContent></Card>
            ) : (
              <div className="space-y-3">
                {filteredBookings.map(booking => (
                  <Card key={booking._id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start gap-4">
                        <Avatar className="w-10 h-10 shrink-0">
                          <AvatarFallback>{booking.clientId?.name?.charAt(0) || '?'}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <p className="font-semibold text-sm">{booking.clientId?.name || 'Unknown'}</p>
                              <p className="text-xs text-gray-500">{booking.clientId?.email}</p>
                            </div>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${STATUS_COLORS[booking.status] || 'bg-gray-100 text-gray-700'}`}>
                              {STATUS_ICONS[booking.status]}{booking.status}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-600 mb-3">
                            <span className="flex items-center gap-1"><CalendarIcon className="w-3.5 h-3.5" />{new Date(booking.scheduledDate).toLocaleDateString()}</span>
                            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{booking.startTime} – {booking.endTime}</span>
                            <span className="flex items-center gap-1 capitalize"><Filter className="w-3.5 h-3.5" />{booking.sessionType?.replace('-', ' ')}</span>
                            <span className="flex items-center gap-1 font-semibold text-green-700"><DollarSign className="w-3.5 h-3.5" />${booking.price}</span>
                          </div>
                          {booking.clientNotes && (
                            <div className="mb-3 p-2 bg-gray-50 rounded text-xs text-gray-600">
                              <span className="font-medium">Client note: </span>{booking.clientNotes}
                            </div>
                          )}
                          <div className="flex flex-wrap gap-2">
                            {booking.status === 'pending' && <>
                              <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700" onClick={() => handleBookingStatus(booking._id, 'confirmed')}>
                                <CheckCircle className="w-3.5 h-3.5 mr-1" />Confirm
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs text-red-600 border-red-300" onClick={() => handleBookingStatus(booking._id, 'cancelled')}>
                                <XCircle className="w-3.5 h-3.5 mr-1" />Decline
                              </Button>
                            </>}
                            {booking.status === 'confirmed' && <>
                              <Button size="sm" className="h-7 text-xs" onClick={() => { setNotesDialog({ open: true, booking }); setTrainerNotes(booking.trainerNotes || ''); }}>
                                <CheckCircle className="w-3.5 h-3.5 mr-1" />Mark Complete
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs text-red-600 border-red-300" onClick={() => handleBookingStatus(booking._id, 'cancelled')}>
                                <XCircle className="w-3.5 h-3.5 mr-1" />Cancel
                              </Button>
                            </>}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Pagination */}
            {bookingPages > 1 && (
              <div className="flex items-center justify-between pt-1">
                <p className="text-sm text-gray-500">Page {bookingPage} of {bookingPages}</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={bookingPage <= 1} onClick={() => fetchBookings(bookingPage - 1)}><ChevronLeft className="w-4 h-4" /></Button>
                  <Button size="sm" variant="outline" disabled={bookingPage >= bookingPages} onClick={() => fetchBookings(bookingPage + 1)}><ChevronRight className="w-4 h-4" /></Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── Session Requests ── */}
          <TabsContent value="requests" className="space-y-4">
            <div className="flex flex-wrap gap-3 items-center justify-between">
              <div className="flex gap-2 flex-wrap">
                {['all','pending','awaiting_payment','accepted','confirmed','rejected'].map(s => (
                  <Button key={s} size="sm" variant={requestStatusFilter === s ? 'default' : 'outline'}
                    onClick={() => setRequestStatusFilter(s)} className="capitalize h-8 text-xs">
                    {s.replace('_',' ')} ({s === 'all' ? requests.length : requests.filter(r => r.status === s).length})
                  </Button>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={fetchRequests}><RefreshCw className="w-4 h-4 mr-1" />Refresh</Button>
            </div>

            {requestsLoading ? (
              <div className="flex items-center justify-center py-16 text-gray-400">Loading…</div>
            ) : requests.filter(r => requestStatusFilter === 'all' || r.status === requestStatusFilter).length === 0 ? (
              <Card><CardContent className="py-16 text-center text-gray-400">
                <MessageSquarePlus className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No {requestStatusFilter !== 'all' ? requestStatusFilter : ''} requests</p>
              </CardContent></Card>
            ) : (
              <div className="space-y-3">
                {requests
                  .filter(r => requestStatusFilter === 'all' || r.status === requestStatusFilter)
                  .map((req: any) => {
                    const statusCls = req.status === 'pending' ? 'bg-yellow-100 text-yellow-800' 
                      : req.status === 'awaiting_payment' ? 'bg-blue-100 text-blue-800'
                      : req.status === 'confirmed' ? 'bg-green-100 text-green-800'
                      : req.status === 'accepted' ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800';
                    const StatusIcon = req.status === 'pending' ? Hourglass 
                      : req.status === 'awaiting_payment' ? Clock
                      : ['accepted','confirmed'].includes(req.status) ? CheckCircle 
                      : XCircle;
                    const initials = req.userId?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '?';
                    return (
                      <Card key={req._id} className="border-border/60 hover:shadow-sm transition-shadow">
                        <CardContent className="pt-4 pb-4">
                          <div className="flex items-start gap-4">
                            <Avatar className="w-10 h-10 shrink-0">
                              <AvatarFallback className="bg-indigo-100 text-indigo-700 text-sm font-semibold">{initials}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div>
                                  <p className="font-semibold text-sm">{req.userId?.name}</p>
                                  <p className="text-xs text-gray-500">{req.userId?.email}</p>
                                </div>
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 ${statusCls}`}>
                                  <StatusIcon className="w-3.5 h-3.5" />
                                  {req.status === 'awaiting_payment' ? 'Awaiting Payment' : req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-600 mb-3">
                                <span className="flex items-center gap-1 capitalize"><Filter className="w-3.5 h-3.5" />{req.sessionType?.replace(/-/g, ' ')}</span>
                                <span className="flex items-center gap-1"><CalendarIcon className="w-3.5 h-3.5" />{new Date(req.preferredDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{req.preferredTime} · {req.duration} min</span>
                                <span className="capitalize text-gray-500">{req.mode}</span>
                              </div>
                              {req.message && (
                                <div className="mb-3 p-2.5 bg-gray-50 rounded-lg text-xs text-gray-600 italic border border-gray-100">
                                  "{req.message}"
                                </div>
                              )}
                              {req.trainerNote && req.status !== 'pending' && (
                                <div className="mb-3 p-2.5 bg-blue-50 rounded-lg text-xs text-blue-700 border border-blue-100">
                                  <span className="font-medium">Your note: </span>{req.trainerNote}
                                </div>
                              )}
                              <p className="text-xs text-gray-400 mb-3">Received {new Date(req.createdAt).toLocaleDateString()}</p>
                              {req.status === 'pending' && (
                                <div className="flex gap-2">
                                  <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700"
                                    onClick={() => { setAcceptDialog({ open: true, req }); setAcceptNote(''); setAcceptPrice(''); }}>
                                    <CheckCircle className="w-3.5 h-3.5 mr-1" />Accept
                                  </Button>
                                  <Button size="sm" variant="outline" className="h-7 text-xs text-red-600 border-red-300 hover:bg-red-50"
                                    onClick={() => { setRejectDialog({ open: true, req }); setRejectNote(''); }}>
                                    <XCircle className="w-3.5 h-3.5 mr-1" />Decline
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            )}
          </TabsContent>

          {/* ── Session Slots ── */}
          <TabsContent value="slots" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-2 flex-wrap">
                {['available','full','completed','cancelled','all'].map(s => (
                  <Button key={s} size="sm" variant={slotTabFilter === s ? 'default' : 'outline'}
                    onClick={() => setSlotTabFilter(s)} className="capitalize h-8 text-xs">
                    {s} ({s === 'all' ? slots.length : slots.filter(x => x.status === s).length})
                  </Button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={fetchSlots}><RefreshCw className="w-4 h-4" /></Button>
                <Button size="sm" onClick={openCreateSlot}><Plus className="w-4 h-4 mr-1" />New Slot</Button>
              </div>
            </div>

            {slotsLoading ? (
              <div className="flex items-center justify-center py-16 text-gray-400">Loading…</div>
            ) : filteredSlots.length === 0 ? (
              <Card><CardContent className="py-16 text-center text-gray-400">
                <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No slots found</p>
                <Button size="sm" className="mt-4" onClick={openCreateSlot}><Plus className="w-4 h-4 mr-1" />Create Slot</Button>
              </CardContent></Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSlots.map(slot => (
                  <Card key={slot._id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-sm leading-tight">{slot.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ml-2 ${STATUS_COLORS[slot.status] || 'bg-gray-100 text-gray-700'}`}>{slot.status}</span>
                      </div>
                      {slot.description && <p className="text-xs text-gray-500 line-clamp-2 mb-3">{slot.description}</p>}
                      <div className="space-y-1.5 text-xs text-gray-600 mb-3">
                        <div className="flex items-center gap-1.5"><CalendarIcon className="w-3.5 h-3.5" />{new Date(slot.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                        <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{slot.startTime} – {slot.endTime} ({slot.duration} min)</div>
                        <div className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />{slot.currentParticipants}/{slot.maxParticipants} participants</div>
                        <div className="flex items-center gap-1.5 font-semibold text-green-700"><DollarSign className="w-3.5 h-3.5" />${slot.price}</div>
                        <div className="flex items-center gap-1.5">
                          {slot.mode === 'online' ? <Video className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" />}
                          <span className="capitalize">{slot.mode}{slot.location ? ` · ${slot.location}` : ''}</span>
                        </div>
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        {slot.status !== 'completed' && slot.status !== 'cancelled' && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openEditSlot(slot)}><Edit className="w-3 h-3 mr-1" />Edit</Button>
                        )}
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setSlotForm({ ...emptySlotForm, title: slot.title, description: slot.description || '', sessionType: slot.sessionType, mode: slot.mode, location: slot.location || '', meetingType: slot.meetingType || 'none', meetingLink: slot.meetingLink || '', startTime: slot.startTime, endTime: slot.endTime, duration: slot.duration, price: slot.price, maxParticipants: slot.maxParticipants, cancellationPolicy: slot.cancellationPolicy || '24 hours notice required', meetingAccessControl: emptySlotForm.meetingAccessControl, date: new Date() }); setSlotDialog({ open: true, editing: null }); }}>
                          <Copy className="w-3 h-3 mr-1" />Duplicate
                        </Button>
                        {slot.status === 'available' && slot.currentParticipants === 0 && (
                          <Button size="sm" variant="outline" className="h-7 text-xs text-red-500 border-red-200" onClick={() => handleDeleteSlot(slot._id)}><Trash2 className="w-3 h-3" /></Button>
                        )}
                        {(slot.status === 'available' || slot.status === 'full') && (
                          <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => handleCancelSlot(slot._id)}><X className="w-3 h-3 mr-1" />Cancel</Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Profile ── */}
          <TabsContent value="profile">
            <div className="max-w-2xl mx-auto space-y-5">
              {/* Avatar */}
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Camera className="w-4 h-4" />Profile Picture</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-center gap-5">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200 flex items-center justify-center">
                        {avatarPreview ? <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" /> : <User className="w-8 h-8 text-gray-400" />}
                      </div>
                      <label htmlFor="avatar-upload" className="absolute bottom-0 right-0 p-1.5 bg-indigo-600 text-white rounded-full cursor-pointer hover:bg-indigo-700">
                        <Camera className="w-3 h-3" />
                      </label>
                      <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{user?.name}</p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                      <p className="text-xs text-gray-400 mt-1">JPG, PNG · Max 2MB</p>
                      {avatarPreview && <Button variant="ghost" size="sm" className="mt-1 text-red-500 px-0 h-6 text-xs" onClick={() => { setAvatarPreview(''); setProfileForm(p => ({ ...p, avatar: '' })); }}>Remove</Button>}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Professional Details */}
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Briefcase className="w-4 h-4" />Professional Details</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div><Label>Full Name *</Label><Input value={profileForm.name} onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))} className="mt-1" /></div>
                  <div>
                    <Label>Bio</Label>
                    <Textarea value={profileForm.bio} rows={4} maxLength={500} onChange={e => setProfileForm(p => ({ ...p, bio: e.target.value }))} placeholder="Tell clients about your training philosophy…" className="mt-1" />
                    <p className="text-xs text-gray-400 text-right mt-1">{profileForm.bio.length}/500</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Experience (years)</Label><Input type="number" min={0} value={profileForm.experience} onChange={e => setProfileForm(p => ({ ...p, experience: e.target.value }))} className="mt-1" /></div>
                    <div><Label>Hourly Rate ($)</Label><Input type="number" min={0} value={profileForm.hourlyRate} onChange={e => setProfileForm(p => ({ ...p, hourlyRate: e.target.value }))} className="mt-1" /></div>
                  </div>
                </CardContent>
              </Card>

              {/* Specializations */}
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Award className="w-4 h-4" />Specializations</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {COMMON_SPECIALIZATIONS.map(s => {
                      const sel = profileForm.specializations.includes(s);
                      return <button key={s} type="button" onClick={() => setProfileForm(p => ({ ...p, specializations: sel ? p.specializations.filter(x => x !== s) : [...p.specializations, s] }))}
                        className={`px-3 py-1 rounded-full text-xs border transition-colors ${sel ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 hover:border-indigo-400'}`}>{s}</button>;
                    })}
                  </div>
                  <div className="flex gap-2">
                    <Input placeholder="Add custom…" value={newSpecInput} onChange={e => setNewSpecInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && newSpecInput.trim()) { e.preventDefault(); if (!profileForm.specializations.includes(newSpecInput.trim())) setProfileForm(p => ({ ...p, specializations: [...p.specializations, newSpecInput.trim()] })); setNewSpecInput(''); } }} />
                    <Button type="button" variant="outline" size="sm" onClick={() => { if (newSpecInput.trim() && !profileForm.specializations.includes(newSpecInput.trim())) { setProfileForm(p => ({ ...p, specializations: [...p.specializations, newSpecInput.trim()] })); setNewSpecInput(''); } }}><Plus className="w-4 h-4" /></Button>
                  </div>
                  {profileForm.specializations.length > 0 && <div className="flex flex-wrap gap-1.5">{profileForm.specializations.map(s => <Badge key={s} variant="secondary" className="gap-1 text-xs">{s}<button onClick={() => setProfileForm(p => ({ ...p, specializations: p.specializations.filter(x => x !== s) }))} className="ml-1 hover:text-red-500">×</button></Badge>)}</div>}
                </CardContent>
              </Card>

              {/* Certifications */}
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Award className="w-4 h-4" />Certifications</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <Input placeholder="e.g., NASM-CPT, ACE…" value={newCertInput} onChange={e => setNewCertInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && newCertInput.trim()) { e.preventDefault(); if (!profileForm.certifications.includes(newCertInput.trim())) setProfileForm(p => ({ ...p, certifications: [...p.certifications, newCertInput.trim()] })); setNewCertInput(''); } }} />
                    <Button type="button" variant="outline" size="sm" onClick={() => { if (newCertInput.trim() && !profileForm.certifications.includes(newCertInput.trim())) { setProfileForm(p => ({ ...p, certifications: [...p.certifications, newCertInput.trim()] })); setNewCertInput(''); } }}><Plus className="w-4 h-4" /></Button>
                  </div>
                  {profileForm.certifications.map((c, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
                      <span className="text-sm">{c}</span>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setProfileForm(p => ({ ...p, certifications: p.certifications.filter((_, idx) => idx !== i) }))}><Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" /></Button>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Button onClick={handleSaveProfile} disabled={profileSaving} className="w-full" size="lg">
                {profileSaving ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />Saving…</> : <><Save className="w-4 h-4 mr-2" />Save Profile</>}
              </Button>
            </div>
          </TabsContent>

          {/* ── Availability ── */}
          <TabsContent value="availability">
            <div className="max-w-2xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Weekly Availability</CardTitle>
                  <CardDescription>Set the days and hours you're available for sessions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {DAYS.map(day => {
                    const da = getDayAvail(day);
                    const isAvail = da?.isAvailable || false;
                    return (
                      <div key={day} className={`flex items-center gap-4 p-3 rounded-lg border transition-colors ${isAvail ? 'bg-indigo-50 border-indigo-200' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex items-center gap-3 w-32">
                          <Switch checked={isAvail} onCheckedChange={() => toggleDay(day)} />
                          <span className="font-medium text-sm capitalize">{day}</span>
                        </div>
                        {isAvail ? (
                          <div className="flex items-center gap-2 flex-1">
                            <Input type="time" value={da?.startTime || '09:00'} onChange={e => updateDayTime(day, 'startTime', e.target.value)} className="w-28 h-8 text-sm" />
                            <span className="text-gray-400 text-sm">to</span>
                            <Input type="time" value={da?.endTime || '17:00'} onChange={e => updateDayTime(day, 'endTime', e.target.value)} className="w-28 h-8 text-sm" />
                          </div>
                        ) : <span className="text-sm text-gray-400">Not available</span>}
                      </div>
                    );
                  })}
                  <Button onClick={handleSaveAvailability} disabled={availSaving} className="w-full mt-2">
                    {availSaving ? 'Saving…' : <><Save className="w-4 h-4 mr-2" />Save Availability</>}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── Services ── */}
          <TabsContent value="services">
            <div className="max-w-2xl mx-auto space-y-5">
              <Card>
                <CardHeader><CardTitle className="text-base">Hourly Rate</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-5 h-5 text-gray-400" />
                    <Input type="number" min={0} value={hourlyRate} onChange={e => setHourlyRate(parseFloat(e.target.value))} className="max-w-[140px]" />
                    <span className="text-sm text-gray-500">per hour</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Session Types & Pricing</CardTitle>
                  <Button size="sm" variant="outline" onClick={() => setSessionTypes([...sessionTypes, { type: 'personal-training', duration: 60, price: 50, description: '' }])}>
                    <Plus className="w-4 h-4 mr-1" />Add
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {sessionTypes.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No session types configured yet</p>}
                  {sessionTypes.map((st, i) => (
                    <div key={i} className="p-4 border rounded-lg space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Type</Label>
                          <Select value={st.type} onValueChange={v => { const u = [...sessionTypes]; u[i] = { ...u[i], type: v }; setSessionTypes(u); }}>
                            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>{SESSION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div><Label className="text-xs">Duration (min)</Label><Input type="number" value={st.duration} onChange={e => { const u = [...sessionTypes]; u[i] = { ...u[i], duration: parseInt(e.target.value) }; setSessionTypes(u); }} className="mt-1" /></div>
                      </div>
                      <div><Label className="text-xs">Price ($)</Label><Input type="number" value={st.price} onChange={e => { const u = [...sessionTypes]; u[i] = { ...u[i], price: parseFloat(e.target.value) }; setSessionTypes(u); }} className="mt-1" /></div>
                      <div><Label className="text-xs">Description</Label><Input value={st.description} onChange={e => { const u = [...sessionTypes]; u[i] = { ...u[i], description: e.target.value }; setSessionTypes(u); }} placeholder="Brief description" className="mt-1" /></div>
                      <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={() => setSessionTypes(sessionTypes.filter((_, idx) => idx !== i))}><Trash2 className="w-3.5 h-3.5 mr-1" />Remove</Button>
                    </div>
                  ))}
                  <Button onClick={handleSaveServices} disabled={servicesSaving} className="w-full">
                    {servicesSaving ? 'Saving…' : <><Save className="w-4 h-4 mr-2" />Save Services</>}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── Payments ── */}
          <TabsContent value="payments" className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold mb-1">Payment History</h2>
              <p className="text-sm text-muted-foreground mb-5">All received payments, refund deductions and transaction history</p>
              <TrainerPaymentHistory />
            </div>
          </TabsContent>

        </Tabs>
      </div>

      {/* ── Complete Booking Dialog ── */}
      <Dialog open={!!notesDialog?.open} onOpenChange={o => !o && setNotesDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Mark as Completed</DialogTitle><DialogDescription>Optionally add notes for this session.</DialogDescription></DialogHeader>
          <div><Label>Trainer Notes (optional)</Label><Textarea value={trainerNotes} onChange={e => setTrainerNotes(e.target.value)} rows={3} placeholder="Session summary, progress notes…" className="mt-1" /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotesDialog(null)}>Cancel</Button>
            <Button onClick={() => handleBookingStatus(notesDialog!.booking._id, 'completed', trainerNotes)}>Confirm Complete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Slot Create/Edit Dialog ── */}
      <Dialog open={slotDialog.open} onOpenChange={o => !slotSaving && setSlotDialog({ open: o, editing: slotDialog.editing })}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{slotDialog.editing ? 'Edit Session Slot' : 'Create Session Slot'}</DialogTitle>
            <DialogDescription>Configure the details for this training session slot</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Title *</Label><Input value={slotForm.title} onChange={e => setSlotForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g., Morning HIIT Class" className="mt-1" /></div>
            <div><Label>Description</Label><Textarea value={slotForm.description} onChange={e => setSlotForm(p => ({ ...p, description: e.target.value }))} rows={2} className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Session Type</Label>
                <Select value={slotForm.sessionType} onValueChange={v => setSlotForm(p => ({ ...p, sessionType: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{SESSION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Mode</Label>
                <Select value={slotForm.mode} onValueChange={v => setSlotForm(p => ({ ...p, mode: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{MODES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            {(slotForm.mode === 'offline' || slotForm.mode === 'hybrid') && (
              <div><Label>Location</Label><Input value={slotForm.location} onChange={e => setSlotForm(p => ({ ...p, location: e.target.value }))} placeholder="e.g., Main Gym, Studio A" className="mt-1" /></div>
            )}
            {(slotForm.mode === 'online' || slotForm.mode === 'hybrid') && (
              <div>
                <Label>Meeting Type</Label>
                <Select value={slotForm.meetingType} onValueChange={v => setSlotForm(p => ({ ...p, meetingType: v, meetingLink: '' }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{MEETING_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
                {slotForm.meetingType === 'external' && <Input value={slotForm.meetingLink} onChange={e => setSlotForm(p => ({ ...p, meetingLink: e.target.value }))} placeholder="https://zoom.us/j/…" className="mt-2" />}
              </div>
            )}
            <div><Label className="mb-2 block">Date *</Label>
              <Calendar mode="single" selected={slotForm.date} onSelect={d => d && setSlotForm(p => ({ ...p, date: d }))} disabled={d => d < new Date(new Date().setHours(0,0,0,0))} className="rounded-md border w-fit" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Start Time</Label><Input type="time" value={slotForm.startTime} onChange={e => setSlotForm(p => ({ ...p, startTime: e.target.value }))} className="mt-1" /></div>
              <div><Label>End Time</Label><Input type="time" value={slotForm.endTime} onChange={e => setSlotForm(p => ({ ...p, endTime: e.target.value }))} className="mt-1" /></div>
              <div><Label>Duration (min)</Label><Input type="number" value={slotForm.duration} onChange={e => setSlotForm(p => ({ ...p, duration: parseInt(e.target.value) }))} className="mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Price ($)</Label><Input type="number" value={slotForm.price} onChange={e => setSlotForm(p => ({ ...p, price: parseFloat(e.target.value) }))} className="mt-1" /></div>
              <div><Label>Max Participants</Label><Input type="number" min={1} value={slotForm.maxParticipants} onChange={e => setSlotForm(p => ({ ...p, maxParticipants: parseInt(e.target.value) }))} className="mt-1" /></div>
            </div>
            <div><Label>Cancellation Policy</Label><Input value={slotForm.cancellationPolicy} onChange={e => setSlotForm(p => ({ ...p, cancellationPolicy: e.target.value }))} className="mt-1" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSlotDialog({ open: false, editing: null })} disabled={slotSaving}>Cancel</Button>
            <Button onClick={handleSaveSlot} disabled={slotSaving || !slotForm.title}>
              {slotSaving ? 'Saving…' : slotDialog.editing ? 'Update Slot' : 'Create Slot'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Accept Request Dialog ── */}
      <Dialog open={!!acceptDialog?.open} onOpenChange={o => !o && setAcceptDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" /> Accept Request
            </DialogTitle>
            <DialogDescription>
              Accepting will create a confirmed session slot for <strong>{acceptDialog?.req?.userId?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div>
              <Label className="text-xs font-medium">Session Price ($) <span className="text-muted-foreground font-normal">— leave blank to use your default rate</span></Label>
              <Input type="number" min={0} placeholder="e.g. 60" value={acceptPrice}
                onChange={e => setAcceptPrice(e.target.value)} className="mt-1.5 h-9" />
            </div>
            <div>
              <Label className="text-xs font-medium">Note to user <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea value={acceptNote} onChange={e => setAcceptNote(e.target.value)}
                placeholder="e.g. See you at Studio A, bring water…" rows={2} className="mt-1.5 text-sm resize-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setAcceptDialog(null)}>Cancel</Button>
            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={handleAcceptRequest}>
              <CheckCircle className="w-4 h-4 mr-1.5" /> Confirm Accept
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Reject Request Dialog ── */}
      <Dialog open={!!rejectDialog?.open} onOpenChange={o => !o && setRejectDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500" /> Decline Request
            </DialogTitle>
            <DialogDescription>
              Let <strong>{rejectDialog?.req?.userId?.name}</strong> know why you can't accommodate this request.
            </DialogDescription>
          </DialogHeader>
          <div className="py-1">
            <Label className="text-xs font-medium">Reason <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Textarea value={rejectNote} onChange={e => setRejectNote(e.target.value)}
              placeholder="e.g. I'm fully booked on that date, please try another time…"
              rows={3} className="mt-1.5 text-sm resize-none" />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRejectDialog(null)}>Cancel</Button>
            <Button size="sm" variant="destructive" onClick={handleRejectRequest}>
              <XCircle className="w-4 h-4 mr-1.5" /> Decline Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TrainerDashboard;
