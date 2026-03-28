import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Calendar, DollarSign, Users, Star, Clock,
  Plus, Trash2, Camera, Save, User, Award, Briefcase,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiService, TrainerDashboardData } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
const SESSION_TYPES = [
  { value: 'personal-training', label: 'Personal Training' },
  { value: 'group-class', label: 'Group Class' },
  { value: 'consultation', label: 'Consultation' },
  { value: 'follow-up', label: 'Follow-up' },
];
const COMMON_SPECIALIZATIONS = [
  'Weight Loss','Strength Training','HIIT','Yoga','Pilates',
  'CrossFit','Bodybuilding','Sports Training','Rehabilitation','Nutrition',
];

const TrainerDashboard = () => {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [dashboardData, setDashboardData] = useState<TrainerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  // Availability dialog
  const [showAvailabilityDialog, setShowAvailabilityDialog] = useState(false);
  const [availability, setAvailability] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  // Services dialog
  const [showServicesDialog, setShowServicesDialog] = useState(false);
  const [sessionTypes, setSessionTypes] = useState<any[]>([]);
  const [hourlyRate, setHourlyRate] = useState(0);

  // Reviews dialog
  const [showReviewsDialog, setShowReviewsDialog] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);

  // Profile form state
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: '',
    bio: '',
    experience: '',
    hourlyRate: '',
    specializations: [] as string[],
    certifications: [] as string[],
    avatar: '',
  });
  const [avatarPreview, setAvatarPreview] = useState('');
  const [newCertInput, setNewCertInput] = useState('');
  const [newSpecInput, setNewSpecInput] = useState('');

  useEffect(() => {
    if (user && user.userType !== 'trainer') {
      window.location.href = '/user-dashboard'; return;
    }
    if (user && user.userType === 'trainer' && !user.isVerified) {
      window.location.href = '/pending-approval'; return;
    }
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const data = await apiService.getTrainerDashboard();
      setDashboardData(data);
      // Seed availability/services from user object
      if (user?.trainerProfile) {
        setAvailability(user.trainerProfile.availability || []);
        setSessionTypes(user.trainerProfile.sessionTypes || []);
        setHourlyRate(user.trainerProfile.hourlyRate || 0);
      }
      // Seed profile form
      const tp = (user as any)?.trainerProfile || {};
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
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to load dashboard', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Avatar upload
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Image must be under 2MB.', variant: 'destructive' });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const b64 = reader.result as string;
      setAvatarPreview(b64);
      setProfileForm(p => ({ ...p, avatar: b64 }));
    };
    reader.readAsDataURL(file);
  };

  // Save profile
  const handleSaveProfile = async () => {
    if (!profileForm.name.trim()) {
      toast({ title: 'Validation Error', description: 'Name is required.', variant: 'destructive' });
      return;
    }
    setProfileSaving(true);
    try {
      const res = await apiService.updateTrainerProfile({
        name: profileForm.name,
        bio: profileForm.bio,
        experience: profileForm.experience || undefined,
        hourlyRate: profileForm.hourlyRate || undefined,
        specializations: profileForm.specializations,
        certifications: profileForm.certifications,
        avatar: profileForm.avatar || undefined,
      });
      localStorage.setItem('user', JSON.stringify(res.user));
      await refreshUser();
      toast({ title: 'Profile updated', description: 'Your changes have been saved.' });
      fetchDashboardData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to update profile', variant: 'destructive' });
    } finally {
      setProfileSaving(false);
    }
  };

  // Availability helpers
  const getDayAvail = (day: string) => availability.find(a => a.day === day);
  const toggleDay = (day: string) => {
    const idx = availability.findIndex(a => a.day === day);
    if (idx >= 0) {
      const u = [...availability];
      u[idx] = { ...u[idx], isAvailable: !u[idx].isAvailable };
      setAvailability(u);
    } else {
      setAvailability([...availability, { day, startTime: '09:00', endTime: '17:00', isAvailable: true }]);
    }
  };
  const updateDayTime = (day: string, field: 'startTime' | 'endTime', val: string) => {
    const idx = availability.findIndex(a => a.day === day);
    if (idx >= 0) {
      const u = [...availability];
      u[idx] = { ...u[idx], [field]: val };
      setAvailability(u);
    }
  };
  const handleSaveAvailability = async () => {
    setSaving(true);
    try {
      await apiService.updateTrainerAvailability(availability);
      toast({ title: 'Availability updated' });
      setShowAvailabilityDialog(false);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  // Services helpers
  const addSessionType = () => setSessionTypes([...sessionTypes, { type: 'personal-training', duration: 60, price: 50, description: '' }]);
  const updateST = (i: number, field: string, val: any) => { const u = [...sessionTypes]; u[i] = { ...u[i], [field]: val }; setSessionTypes(u); };
  const removeST = (i: number) => setSessionTypes(sessionTypes.filter((_, idx) => idx !== i));
  const handleSaveServices = async () => {
    setSaving(true);
    try {
      await apiService.updateTrainerPricing({ sessionTypes, hourlyRate });
      toast({ title: 'Services updated' });
      setShowServicesDialog(false);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const fetchReviews = async () => {
    try {
      const data = await apiService.getTrainerById(user?._id || user?.id || '');
      setReviews(data.recentReviews || []);
    } catch { setReviews([]); }
  };

  if (loading) return (
    <div className="min-h-screen py-12 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Loading your dashboard...</p>
      </div>
    </div>
  );

  if (!dashboardData) return (
    <div className="min-h-screen py-12 flex items-center justify-center">
      <p className="text-muted-foreground mr-4">Failed to load dashboard</p>
      <Button onClick={fetchDashboardData}>Try Again</Button>
    </div>
  );

  const getStatusColor = (s: string) => ({
    confirmed: 'bg-success/10 text-success',
    scheduled: 'bg-primary/10 text-primary',
    completed: 'bg-secondary/10 text-secondary',
  }[s] || 'bg-warning/10 text-warning');

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-heading font-bold mb-2">Trainer Dashboard</h1>
          <p className="text-lg text-muted-foreground">Manage your clients and schedule</p>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Active Clients', value: dashboardData.stats.activeClients, icon: Users, color: 'text-primary' },
            { label: 'This Month', value: `$${dashboardData.stats.monthlyEarnings.toFixed(0)}`, icon: DollarSign, color: 'text-success' },
            { label: 'Avg Rating', value: dashboardData.stats.rating.toFixed(1), icon: Star, color: 'text-warning' },
            { label: 'Sessions Today', value: dashboardData.stats.todaySessions, icon: Clock, color: 'text-secondary' },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="p-6">
              <Icon className={`w-8 h-8 ${color} mb-3`} />
              <h3 className="text-3xl font-heading font-bold mb-1">{value}</h3>
              <p className="text-sm text-muted-foreground">{label}</p>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview">
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          {/* ── Overview Tab ── */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Today's Schedule */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-heading font-bold">Today's Schedule</h3>
                  <Button variant="outline" size="sm"><Calendar className="w-4 h-4 mr-2" />View All</Button>
                </div>
                <div className="space-y-4">
                  {dashboardData.todaySessions.length > 0 ? dashboardData.todaySessions.map((s: any, i: number) => (
                    <div key={i} className="p-4 bg-muted rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-medium">{s.clientId?.name || 'Unknown Client'}</h4>
                          <p className="text-sm text-muted-foreground">{s.sessionType}</p>
                        </div>
                        <Badge className={getStatusColor(s.status)}>{s.status}</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        {new Date(s.scheduledDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  )) : <p className="text-center py-8 text-muted-foreground">No sessions today</p>}
                </div>
              </Card>

              {/* Active Clients */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-heading font-bold">Active Clients</h3>
                  <Button variant="outline" size="sm">View All</Button>
                </div>
                <div className="space-y-4">
                  {dashboardData.activeClients.length > 0 ? dashboardData.activeClients.slice(0, 5).map((c: any, i: number) => (
                    <div key={i} className="p-4 bg-muted rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-medium">{c.name}</h4>
                          <p className="text-sm text-muted-foreground">{c.totalSessions} sessions</p>
                        </div>
                        <span className="text-sm text-muted-foreground">{new Date(c.lastSession).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">Earned: ${c.totalEarnings?.toFixed(0) || '0'}</p>
                    </div>
                  )) : <p className="text-center py-8 text-muted-foreground">No active clients yet</p>}
                </div>
              </Card>
            </div>

            {/* Earnings */}
            <Card className="p-6">
              <h3 className="text-xl font-heading font-bold mb-6">Earnings Summary</h3>
              <div className="grid md:grid-cols-4 gap-6 text-center">
                {[
                  { label: 'Today', value: `$${dashboardData.stats.todayEarnings.toFixed(0)}` },
                  { label: 'This Month', value: `$${dashboardData.stats.monthlyEarnings.toFixed(0)}` },
                  { label: 'Active Clients', value: dashboardData.stats.activeClients },
                  { label: 'Rating', value: `${dashboardData.stats.rating.toFixed(1)} ⭐` },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-sm text-muted-foreground mb-1">{label}</p>
                    <p className="text-2xl font-heading font-bold">{value}</p>
                  </div>
                ))}
              </div>
            </Card>

            {/* Quick Actions */}
            <Card className="p-6">
              <h3 className="text-xl font-heading font-bold mb-4">Quick Actions</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <Button variant="outline" onClick={() => setShowAvailabilityDialog(true)}>
                  <Calendar className="w-4 h-4 mr-2" /> Update Availability
                </Button>
                <Button variant="outline" onClick={() => setShowServicesDialog(true)}>
                  <DollarSign className="w-4 h-4 mr-2" /> Edit Services
                </Button>
                <Button variant="outline" onClick={() => { fetchReviews(); setShowReviewsDialog(true); }}>
                  <Star className="w-4 h-4 mr-2" /> View Reviews
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* ── Profile Tab ── */}
          <TabsContent value="profile" className="space-y-6">
            <div className="max-w-2xl mx-auto space-y-6">

              {/* Avatar */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><User className="w-5 h-5" /> Profile Picture</CardTitle>
                  <CardDescription>Upload a professional photo for your trainer profile</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <div className="w-24 h-24 rounded-full overflow-hidden bg-muted border-2 border-border flex items-center justify-center">
                        {avatarPreview
                          ? <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                          : <User className="w-10 h-10 text-muted-foreground" />}
                      </div>
                      <label htmlFor="trainer-avatar-upload"
                        className="absolute bottom-0 right-0 p-1.5 bg-primary text-primary-foreground rounded-full cursor-pointer hover:bg-primary/90 transition-colors">
                        <Camera className="w-3.5 h-3.5" />
                      </label>
                      <input id="trainer-avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{user?.name}</p>
                      <p className="text-sm text-muted-foreground">{user?.email}</p>
                      <p className="text-xs text-muted-foreground mt-1">JPG, PNG or GIF · Max 2MB</p>
                      {avatarPreview && (
                        <Button variant="ghost" size="sm" className="mt-2 text-destructive hover:text-destructive px-0"
                          onClick={() => { setAvatarPreview(''); setProfileForm(p => ({ ...p, avatar: '' })); }}>
                          Remove photo
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Basic Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Briefcase className="w-5 h-5" /> Professional Details</CardTitle>
                  <CardDescription>Update your name, bio, and experience</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="t-name">Full Name *</Label>
                    <Input id="t-name" value={profileForm.name}
                      onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))} placeholder="Your full name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="t-bio">Bio</Label>
                    <Textarea id="t-bio" value={profileForm.bio} rows={4} maxLength={500}
                      onChange={e => setProfileForm(p => ({ ...p, bio: e.target.value }))}
                      placeholder="Tell clients about your training philosophy and background..." />
                    <p className="text-xs text-muted-foreground text-right">{profileForm.bio.length}/500</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="t-exp">Experience (years)</Label>
                      <Input id="t-exp" type="number" min={0} max={50} value={profileForm.experience}
                        onChange={e => setProfileForm(p => ({ ...p, experience: e.target.value }))} placeholder="5" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="t-rate">Hourly Rate ($)</Label>
                      <Input id="t-rate" type="number" min={0} value={profileForm.hourlyRate}
                        onChange={e => setProfileForm(p => ({ ...p, hourlyRate: e.target.value }))} placeholder="50" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Specializations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Award className="w-5 h-5" /> Specializations</CardTitle>
                  <CardDescription>Select your areas of expertise</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {COMMON_SPECIALIZATIONS.map(s => {
                      const selected = profileForm.specializations.includes(s);
                      return (
                        <button key={s} type="button"
                          onClick={() => setProfileForm(p => ({
                            ...p,
                            specializations: selected ? p.specializations.filter(x => x !== s) : [...p.specializations, s]
                          }))}
                          className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${selected
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background border-border hover:border-primary/50'}`}>
                          {s}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex gap-2">
                    <Input placeholder="Add custom specialization..." value={newSpecInput}
                      onChange={e => setNewSpecInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && newSpecInput.trim()) { e.preventDefault(); if (!profileForm.specializations.includes(newSpecInput.trim())) setProfileForm(p => ({ ...p, specializations: [...p.specializations, newSpecInput.trim()] })); setNewSpecInput(''); } }} />
                    <Button type="button" variant="outline" onClick={() => { if (newSpecInput.trim() && !profileForm.specializations.includes(newSpecInput.trim())) { setProfileForm(p => ({ ...p, specializations: [...p.specializations, newSpecInput.trim()] })); setNewSpecInput(''); } }}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {profileForm.specializations.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {profileForm.specializations.map(s => (
                        <Badge key={s} variant="secondary" className="gap-1 pr-1">{s}
                          <button type="button" onClick={() => setProfileForm(p => ({ ...p, specializations: p.specializations.filter(x => x !== s) }))} className="ml-1 hover:text-destructive">×</button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Certifications */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Award className="w-5 h-5" /> Certifications</CardTitle>
                  <CardDescription>List your professional certifications</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input placeholder="e.g., NASM-CPT, ACE, ACSM..." value={newCertInput}
                      onChange={e => setNewCertInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && newCertInput.trim()) { e.preventDefault(); if (!profileForm.certifications.includes(newCertInput.trim())) setProfileForm(p => ({ ...p, certifications: [...p.certifications, newCertInput.trim()] })); setNewCertInput(''); } }} />
                    <Button type="button" variant="outline" onClick={() => { if (newCertInput.trim() && !profileForm.certifications.includes(newCertInput.trim())) { setProfileForm(p => ({ ...p, certifications: [...p.certifications, newCertInput.trim()] })); setNewCertInput(''); } }}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {profileForm.certifications.length > 0 && (
                    <div className="space-y-2">
                      {profileForm.certifications.map((c, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <span className="text-sm">{c}</span>
                          <Button variant="ghost" size="sm" onClick={() => setProfileForm(p => ({ ...p, certifications: p.certifications.filter((_, idx) => idx !== i) }))}>
                            <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Save */}
              <Button onClick={handleSaveProfile} disabled={profileSaving} className="w-full" size="lg">
                {profileSaving
                  ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />Saving...</>
                  : <><Save className="w-4 h-4 mr-2" />Save Profile</>}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Availability Dialog */}
        <Dialog open={showAvailabilityDialog} onOpenChange={setShowAvailabilityDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Update Availability</DialogTitle><DialogDescription>Set your weekly schedule</DialogDescription></DialogHeader>
            <div className="space-y-4">
              {DAYS.map(day => {
                const da = getDayAvail(day);
                const isAvail = da?.isAvailable || false;
                return (
                  <div key={day} className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className="flex items-center gap-3 flex-1">
                      <Switch checked={isAvail} onCheckedChange={() => toggleDay(day)} />
                      <span className="font-medium capitalize w-24">{day}</span>
                    </div>
                    {isAvail && (
                      <div className="flex items-center gap-2">
                        <Input type="time" value={da?.startTime || '09:00'} onChange={e => updateDayTime(day, 'startTime', e.target.value)} className="w-32" />
                        <span className="text-muted-foreground">to</span>
                        <Input type="time" value={da?.endTime || '17:00'} onChange={e => updateDayTime(day, 'endTime', e.target.value)} className="w-32" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAvailabilityDialog(false)}>Cancel</Button>
              <Button onClick={handleSaveAvailability} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Services Dialog */}
        <Dialog open={showServicesDialog} onOpenChange={setShowServicesDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Edit Services & Pricing</DialogTitle><DialogDescription>Manage session types and pricing</DialogDescription></DialogHeader>
            <div className="space-y-6">
              <div>
                <Label>Hourly Rate ($)</Label>
                <div className="flex items-center gap-2 mt-2">
                  <DollarSign className="w-5 h-5 text-muted-foreground" />
                  <Input type="number" value={hourlyRate} onChange={e => setHourlyRate(parseFloat(e.target.value))} placeholder="50" />
                  <span className="text-muted-foreground">per hour</span>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-4">
                  <Label>Session Types</Label>
                  <Button onClick={addSessionType} size="sm" variant="outline"><Plus className="w-4 h-4 mr-2" />Add</Button>
                </div>
                <div className="space-y-4">
                  {sessionTypes.map((st, i) => (
                    <div key={i} className="p-4 border rounded-lg space-y-3">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label>Type</Label>
                          <Select value={st.type} onValueChange={v => updateST(i, 'type', v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{SESSION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div><Label>Duration (min)</Label><Input type="number" value={st.duration} onChange={e => updateST(i, 'duration', parseInt(e.target.value))} /></div>
                      </div>
                      <div><Label>Price ($)</Label><Input type="number" value={st.price} onChange={e => updateST(i, 'price', parseFloat(e.target.value))} /></div>
                      <div><Label>Description</Label><Input value={st.description} onChange={e => updateST(i, 'description', e.target.value)} placeholder="Brief description" /></div>
                      <Button variant="destructive" size="sm" onClick={() => removeST(i)}><Trash2 className="w-4 h-4 mr-2" />Remove</Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowServicesDialog(false)}>Cancel</Button>
              <Button onClick={handleSaveServices} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reviews Dialog */}
        <Dialog open={showReviewsDialog} onOpenChange={setShowReviewsDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Client Reviews</DialogTitle></DialogHeader>
            <div className="space-y-4">
              {reviews.length > 0 ? reviews.map((r: any, i: number) => (
                <div key={i} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium">{r.clientId?.name || 'Anonymous'}</h4>
                      <div className="flex items-center gap-1 mt-1">
                        {[1,2,3,4,5].map(s => <Star key={s} className={`w-4 h-4 ${s <= r.feedback?.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />)}
                      </div>
                    </div>
                    <span className="text-sm text-muted-foreground">{new Date(r.feedback?.createdAt || r.createdAt).toLocaleDateString()}</span>
                  </div>
                  {r.feedback?.comment && <p className="text-sm text-muted-foreground mt-2">{r.feedback.comment}</p>}
                </div>
              )) : (
                <div className="text-center py-8">
                  <Star className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No reviews yet</p>
                </div>
              )}
            </div>
            <DialogFooter><Button onClick={() => setShowReviewsDialog(false)}>Close</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default TrainerDashboard;
