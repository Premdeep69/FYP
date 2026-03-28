import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { apiService } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  Users, UserCheck, DollarSign, TrendingUp, CheckCircle, XCircle,
  UserPlus, LogOut, Search, Filter, ArrowUpDown, Eye, Receipt,
  CreditCard, Clock, AlertCircle, RefreshCw, ChevronLeft, ChevronRight,
  FileText, File, Download,
} from 'lucide-react';

// ── Billing sub-component ────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  succeeded: 'bg-green-100 text-green-800',
  pending:   'bg-yellow-100 text-yellow-800',
  failed:    'bg-red-100 text-red-800',
  canceled:  'bg-gray-100 text-gray-800',
  refunded:  'bg-blue-100 text-blue-800',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  succeeded: <CheckCircle className="w-3.5 h-3.5" />,
  pending:   <Clock className="w-3.5 h-3.5" />,
  failed:    <XCircle className="w-3.5 h-3.5" />,
  canceled:  <AlertCircle className="w-3.5 h-3.5" />,
  refunded:  <RefreshCw className="w-3.5 h-3.5" />,
};

function BillingTab() {
  const { toast } = useToast();
  const [payments, setPayments] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Detail dialog
  const [detailPayment, setDetailPayment] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const LIMIT = 15;

  const fetchPayments = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params: any = { page: p, limit: LIMIT, sortBy, sortOrder };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (search) params.search = search;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await apiService.getAdminPayments(params);
      setPayments(res.payments || []);
      setTotal(res.total || 0);
      setPages(res.pages || 1);
      setSummary(res.summary || {});
      setPage(p);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, startDate, endDate, sortBy, sortOrder]);

  useEffect(() => { fetchPayments(1); }, [fetchPayments]);

  const openDetail = async (paymentId: string) => {
    setDetailLoading(true);
    setDetailPayment({ _id: paymentId, _loading: true });
    try {
      const data = await apiService.getAdminPaymentById(paymentId);
      setDetailPayment(data);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
      setDetailPayment(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const toggleSort = (field: string) => {
    if (sortBy === field) setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortOrder('desc'); }
  };

  const SortBtn = ({ field, label }: { field: string; label: string }) => (
    <button
      className="flex items-center gap-1 hover:text-gray-900 transition-colors"
      onClick={() => toggleSort(field)}
    >
      {label}
      <ArrowUpDown className={`w-3 h-3 ${sortBy === field ? 'text-indigo-600' : 'text-gray-400'}`} />
    </button>
  );

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: `$${(summary.totalRevenue ?? 0).toFixed(2)}`, icon: <DollarSign className="w-5 h-5 text-green-600" />, bg: 'bg-green-50' },
          { label: 'Completed', value: summary.completed ?? 0, icon: <CheckCircle className="w-5 h-5 text-blue-600" />, bg: 'bg-blue-50' },
          { label: 'Pending', value: summary.pending ?? 0, icon: <Clock className="w-5 h-5 text-yellow-600" />, bg: 'bg-yellow-50' },
          { label: 'Refunded', value: summary.refunded ?? 0, icon: <RefreshCw className="w-5 h-5 text-purple-600" />, bg: 'bg-purple-50' },
        ].map(({ label, value, icon, bg }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${bg}`}>{icon}</div>
                <div>
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="text-xl font-bold text-gray-900">{value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs text-gray-500 mb-1 block">Search</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="User, trainer, transaction ID..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="w-36">
              <Label className="text-xs text-gray-500 mb-1 block">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="succeeded">Succeeded</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                  <SelectItem value="canceled">Canceled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">From</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-36" />
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">To</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-36" />
            </div>
            <Button variant="outline" size="sm" onClick={() => { setSearch(''); setStatusFilter('all'); setStartDate(''); setEndDate(''); }}>
              <Filter className="w-4 h-4 mr-1" /> Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Transactions
              <span className="ml-2 text-sm font-normal text-gray-500">({total} total)</span>
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => fetchPayments(page)}>
              <RefreshCw className="w-4 h-4 mr-1" /> Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">Loading...</div>
          ) : payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Receipt className="w-10 h-10 mb-2 opacity-40" />
              <p>No transactions found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-y">
                  <tr className="text-left text-gray-500 text-xs uppercase tracking-wide">
                    <th className="px-4 py-3"><SortBtn field="createdAt" label="Date" /></th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Trainer</th>
                    <th className="px-4 py-3">Session</th>
                    <th className="px-4 py-3"><SortBtn field="amount" label="Amount" /></th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Transaction ID</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {payments.map((p) => (
                    <tr key={p._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {new Date(p.createdAt).toLocaleDateString()}<br />
                        <span className="text-xs">{new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{p.userId?.name || '—'}</p>
                        <p className="text-xs text-gray-400">{p.userId?.email || ''}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{p.trainerId?.name || '—'}</p>
                        <p className="text-xs text-gray-400">{p.trainerId?.email || ''}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {p.sessionId ? (
                          <>
                            <p className="capitalize">{p.sessionId.sessionType?.replace('-', ' ') || p.paymentType}</p>
                            {p.sessionId.scheduledDate && (
                              <p className="text-xs text-gray-400">{new Date(p.sessionId.scheduledDate).toLocaleDateString()}</p>
                            )}
                          </>
                        ) : (
                          <span className="text-gray-400 capitalize">{p.paymentType}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">
                        ${(p.amount / 100).toFixed(2)}
                        <p className="text-xs font-normal text-gray-400 uppercase">{p.currency}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status] || 'bg-gray-100 text-gray-800'}`}>
                          {STATUS_ICONS[p.status]}
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-gray-500 break-all">
                          {p.stripePaymentIntentId?.slice(0, 20)}...
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button size="sm" variant="ghost" onClick={() => openDetail(p._id)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
              <p className="text-sm text-gray-500">
                Page {page} of {pages} — {total} records
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => fetchPayments(page - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => fetchPayments(page + 1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!detailPayment} onOpenChange={o => !o && setDetailPayment(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-600" /> Transaction Detail
            </DialogTitle>
          </DialogHeader>
          {detailPayment?._loading || detailLoading ? (
            <div className="py-10 text-center text-gray-400">Loading...</div>
          ) : detailPayment && (
            <div className="space-y-4 text-sm">
              {/* Status banner */}
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${STATUS_COLORS[detailPayment.status] || 'bg-gray-100 text-gray-800'}`}>
                {STATUS_ICONS[detailPayment.status]}
                <span className="font-semibold capitalize">{detailPayment.status}</span>
                <span className="ml-auto font-bold text-base">${(detailPayment.amount / 100).toFixed(2)} {detailPayment.currency?.toUpperCase()}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">User</p>
                  <p className="font-medium">{detailPayment.userId?.name || '—'}</p>
                  <p className="text-xs text-gray-500">{detailPayment.userId?.email}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">Trainer</p>
                  <p className="font-medium">{detailPayment.trainerId?.name || '—'}</p>
                  <p className="text-xs text-gray-500">{detailPayment.trainerId?.email}</p>
                </div>
              </div>

              {detailPayment.sessionId && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">Session</p>
                  <p className="font-medium capitalize">{detailPayment.sessionId.sessionType?.replace('-', ' ')}</p>
                  <p className="text-xs text-gray-500">
                    {detailPayment.sessionId.scheduledDate && new Date(detailPayment.sessionId.scheduledDate).toLocaleDateString()}
                    {detailPayment.sessionId.startTime && ` at ${detailPayment.sessionId.startTime}`}
                    {detailPayment.sessionId.duration && ` · ${detailPayment.sessionId.duration} min`}
                  </p>
                </div>
              )}

              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <p className="text-xs text-gray-400 mb-1">Transaction Info</p>
                <div className="flex justify-between">
                  <span className="text-gray-500">Transaction ID</span>
                  <span className="font-mono text-xs break-all text-right max-w-[200px]">{detailPayment.stripePaymentIntentId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Type</span>
                  <span className="capitalize">{detailPayment.paymentType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Date</span>
                  <span>{new Date(detailPayment.createdAt).toLocaleString()}</span>
                </div>
                {detailPayment.description && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Description</span>
                    <span className="text-right max-w-[200px]">{detailPayment.description}</span>
                  </div>
                )}
                {detailPayment.invoiceNumber && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Invoice #</span>
                    <span>{detailPayment.invoiceNumber}</span>
                  </div>
                )}
              </div>

              {detailPayment.status === 'refunded' && (
                <div className="bg-blue-50 rounded-lg p-3 space-y-1">
                  <p className="text-xs text-blue-600 font-medium">Refund Details</p>
                  {detailPayment.refundAmount && <p>Amount: ${(detailPayment.refundAmount / 100).toFixed(2)}</p>}
                  {detailPayment.refundReason && <p>Reason: {detailPayment.refundReason}</p>}
                  {detailPayment.refundedAt && <p>Date: {new Date(detailPayment.refundedAt).toLocaleDateString()}</p>}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailPayment(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Main AdminDashboard ──────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [pendingTrainers, setPendingTrainers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [showAddTrainer, setShowAddTrainer] = useState(false);
  const [newTrainer, setNewTrainer] = useState({ name: '', email: '', password: '', specializations: '', experience: '', hourlyRate: '' });

  const [reviewDialog, setReviewDialog] = useState<{ open: boolean; trainer: any; action: 'verify' | 'reject' }>({ open: false, trainer: null, action: 'verify' });
  const [reviewNotes, setReviewNotes] = useState('');
  const [docViewerDialog, setDocViewerDialog] = useState<{ open: boolean; trainer: any } | null>(null);

  useEffect(() => {
    if (!user || user.userType !== 'admin') { navigate('/login'); return; }
    loadAll();
  }, [user]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [s, u, t, pt] = await Promise.all([
        apiService.getAdminStats(),
        apiService.getAdminUsers({ limit: 100 }),
        apiService.getAdminTrainers(),
        apiService.getPendingTrainers(),
      ]);
      setStats(s);
      setUsers(u.users || []);
      setTrainers(t);
      setPendingTrainers(pt);
    } catch (e: any) {
      toast({ title: 'Error loading data', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyReject = async () => {
    try {
      if (reviewDialog.action === 'verify') {
        await apiService.verifyTrainer(reviewDialog.trainer._id, reviewNotes);
        toast({ title: 'Trainer verified' });
      } else {
        await apiService.rejectTrainer(reviewDialog.trainer._id, reviewNotes);
        toast({ title: 'Trainer rejected' });
      }
      setReviewDialog({ open: false, trainer: null, action: 'verify' });
      setReviewNotes('');
      loadAll();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleToggleActive = async (userId: string) => {
    try {
      await apiService.toggleUserActive(userId);
      toast({ title: 'User status updated' });
      loadAll();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleAddTrainer = async () => {
    try {
      await apiService.adminAddTrainer({
        ...newTrainer,
        specializations: newTrainer.specializations.split(',').map(s => s.trim()).filter(Boolean),
        experience: Number(newTrainer.experience),
        hourlyRate: Number(newTrainer.hourlyRate),
      });
      toast({ title: 'Trainer added successfully' });
      setShowAddTrainer(false);
      setNewTrainer({ name: '', email: '', password: '', specializations: '', experience: '', hourlyRate: '' });
      loadAll();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const filteredUsers = users.filter(u =>
    u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center h-screen text-gray-500">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <h1 className="text-xl font-semibold text-gray-900">Admin Dashboard</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{user?.name}</span>
          <Button variant="outline" size="sm" onClick={() => { logout(); navigate('/login'); }}>
            <LogOut className="w-4 h-4 mr-1" /> Logout
          </Button>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Users', value: stats?.totalUsers ?? 0, icon: <Users className="w-8 h-8 text-blue-500" /> },
            { label: 'Total Trainers', value: stats?.totalTrainers ?? 0, icon: <UserCheck className="w-8 h-8 text-green-500" /> },
            { label: 'Total Revenue', value: `$${(stats?.totalRevenue ?? 0).toFixed(2)}`, icon: <DollarSign className="w-8 h-8 text-yellow-500" /> },
            { label: 'Transactions', value: stats?.totalPayments ?? 0, icon: <TrendingUp className="w-8 h-8 text-purple-500" /> },
          ].map(({ label, value, icon }) => (
            <Card key={label}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  {icon}
                  <div>
                    <p className="text-sm text-gray-500">{label}</p>
                    <p className="text-2xl font-bold">{value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Revenue Chart */}
        {stats?.monthlyRevenue?.length > 0 && (
          <Card className="mb-6">
            <CardHeader><CardTitle className="text-base">Monthly Revenue</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stats.monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: any) => [`$${v}`, 'Revenue']} />
                  <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="billing">
          <TabsList className="mb-4">
            <TabsTrigger value="billing">
              <Receipt className="w-4 h-4 mr-1.5" /> Billing
            </TabsTrigger>
            <TabsTrigger value="verification">
              Trainer Verification
              {pendingTrainers.length > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-1.5">{pendingTrainers.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="trainers">All Trainers</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
          </TabsList>

          {/* Billing Tab */}
          <TabsContent value="billing"><BillingTab /></TabsContent>

          {/* Trainer Verification Tab */}
          <TabsContent value="verification">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Pending Verification ({pendingTrainers.length})</CardTitle>
                <Button size="sm" onClick={() => setShowAddTrainer(true)}>
                  <UserPlus className="w-4 h-4 mr-1" /> Add Trainer
                </Button>
              </CardHeader>
              <CardContent>
                {pendingTrainers.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-8">No pending verifications</p>
                ) : (
                  <div className="space-y-3">
                    {pendingTrainers.map((trainer) => (
                      <div key={trainer._id} className="p-4 border rounded-lg bg-white space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{trainer.name}</p>
                            <p className="text-sm text-gray-500">{trainer.email}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              Specializations: {trainer.trainerProfile?.specializations?.join(', ') || 'N/A'} |
                              Experience: {trainer.trainerProfile?.experience || 0} yrs |
                              Submitted: {trainer.trainerVerification?.submittedAt ? new Date(trainer.trainerVerification.submittedAt).toLocaleDateString() : 'N/A'}
                            </p>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <Button size="sm" variant="outline" className="text-green-600 border-green-300 hover:bg-green-50"
                              onClick={() => { setReviewDialog({ open: true, trainer, action: 'verify' }); setReviewNotes(''); }}>
                              <CheckCircle className="w-4 h-4 mr-1" /> Verify
                            </Button>
                            <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50"
                              onClick={() => { setReviewDialog({ open: true, trainer, action: 'reject' }); setReviewNotes(''); }}>
                              <XCircle className="w-4 h-4 mr-1" /> Reject
                            </Button>
                          </div>
                        </div>

                        {/* Documents section */}
                        {trainer.verificationDocuments?.length > 0 ? (
                          <div className="border-t pt-3">
                            <p className="text-xs font-medium text-gray-600 mb-2">
                              Submitted Documents ({trainer.verificationDocuments.length})
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {trainer.verificationDocuments.map((doc: any, di: number) => (
                                <div key={di} className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border rounded-lg text-xs">
                                  {doc.mimeType === 'application/pdf'
                                    ? <FileText className="w-3.5 h-3.5 text-red-500" />
                                    : <File className="w-3.5 h-3.5 text-blue-500" />}
                                  <span className="max-w-[120px] truncate text-gray-700">{doc.name}</span>
                                  <span className="text-gray-400">
                                    {doc.size ? `${(doc.size / 1024).toFixed(0)}KB` : ''}
                                  </span>
                                </div>
                              ))}
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-2 text-xs"
                              onClick={() => setDocViewerDialog({ open: true, trainer })}
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" /> View All Documents
                            </Button>
                          </div>
                        ) : (
                          <div className="border-t pt-3">
                            <p className="text-xs text-gray-400 italic">No documents submitted</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* All Trainers Tab */}
          <TabsContent value="trainers">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">All Trainers ({trainers.length})</CardTitle>
                <Button size="sm" onClick={() => setShowAddTrainer(true)}>
                  <UserPlus className="w-4 h-4 mr-1" /> Add Trainer
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {trainers.map((trainer) => (
                    <div key={trainer._id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{trainer.name}</p>
                        <p className="text-sm text-gray-500">{trainer.email}</p>
                        <p className="text-xs text-gray-400 mt-1">{trainer.trainerProfile?.specializations?.join(', ') || 'No specializations'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={
                          trainer.trainerVerification?.status === 'verified' ? 'bg-green-100 text-green-800' :
                          trainer.trainerVerification?.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }>{trainer.trainerVerification?.status || 'pending'}</Badge>
                        <Badge className={trainer.isActive ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}>
                          {trainer.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        <Button size="sm" variant="outline" onClick={() => handleToggleActive(trainer._id)}>
                          {trainer.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Users ({users.length})</CardTitle>
                <Input placeholder="Search by name or email..." value={userSearch}
                  onChange={e => setUserSearch(e.target.value)} className="mt-2 max-w-sm" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredUsers.map((u) => (
                    <div key={u._id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{u.name}</p>
                        <p className="text-sm text-gray-500">{u.email}</p>
                        <p className="text-xs text-gray-400">Joined: {new Date(u.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={u.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        <Button size="sm" variant="outline" onClick={() => handleToggleActive(u._id)}>
                          {u.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Review Dialog */}
      <Dialog open={reviewDialog.open} onOpenChange={o => setReviewDialog(prev => ({ ...prev, open: o }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{reviewDialog.action === 'verify' ? 'Verify Trainer' : 'Reject Trainer'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              {reviewDialog.action === 'verify' ? 'Approve' : 'Reject'} <strong>{reviewDialog.trainer?.name}</strong>?
            </p>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea value={reviewNotes} onChange={e => setReviewNotes(e.target.value)} placeholder="Add review notes..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialog(prev => ({ ...prev, open: false }))}>Cancel</Button>
            <Button onClick={handleVerifyReject}
              className={reviewDialog.action === 'verify' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}>
              {reviewDialog.action === 'verify' ? 'Verify' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Trainer Dialog */}
      <Dialog open={showAddTrainer} onOpenChange={setShowAddTrainer}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Trainer</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {[
              { label: 'Name', key: 'name', type: 'text' },
              { label: 'Email', key: 'email', type: 'email' },
              { label: 'Password', key: 'password', type: 'password' },
              { label: 'Specializations (comma-separated)', key: 'specializations', type: 'text' },
              { label: 'Experience (years)', key: 'experience', type: 'number' },
              { label: 'Hourly Rate ($)', key: 'hourlyRate', type: 'number' },
            ].map(({ label, key, type }) => (
              <div key={key}>
                <Label>{label}</Label>
                <Input type={type} value={(newTrainer as any)[key]}
                  onChange={e => setNewTrainer(prev => ({ ...prev, [key]: e.target.value }))} />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddTrainer(false)}>Cancel</Button>
            <Button onClick={handleAddTrainer}>Add Trainer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Viewer Dialog */}
      {docViewerDialog?.open && (
        <Dialog open={docViewerDialog.open} onOpenChange={o => !o && setDocViewerDialog(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                Documents — {docViewerDialog.trainer?.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {docViewerDialog.trainer?.verificationDocuments?.length > 0 ? (
                docViewerDialog.trainer.verificationDocuments.map((doc: any, i: number) => (
                  <div key={i} className="border rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b">
                      <div className="flex items-center gap-2">
                        {doc.mimeType === 'application/pdf'
                          ? <FileText className="w-4 h-4 text-red-500" />
                          : <File className="w-4 h-4 text-blue-500" />}
                        <span className="text-sm font-medium">{doc.name}</span>
                        {doc.size && <span className="text-xs text-gray-400">{(doc.size / 1024).toFixed(0)} KB</span>}
                      </div>
                      <a href={doc.data} download={doc.name}
                        className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800">
                        <Download className="w-3.5 h-3.5" /> Download
                      </a>
                    </div>
                    <div className="p-2 bg-white">
                      {doc.mimeType === 'application/pdf' ? (
                        <iframe src={doc.data} className="w-full h-64 rounded" title={doc.name} />
                      ) : (
                        <img src={doc.data} alt={doc.name} className="max-w-full max-h-64 mx-auto rounded object-contain" />
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-8">No documents submitted</p>
              )}
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDocViewerDialog(null)}>Close</Button>
              <Button className="bg-green-600 hover:bg-green-700"
                onClick={() => { setDocViewerDialog(null); setReviewDialog({ open: true, trainer: docViewerDialog.trainer, action: 'verify' }); setReviewNotes(''); }}>
                <CheckCircle className="w-4 h-4 mr-1" /> Verify Trainer
              </Button>
              <Button variant="outline" className="text-red-600 border-red-300"
                onClick={() => { setDocViewerDialog(null); setReviewDialog({ open: true, trainer: docViewerDialog.trainer, action: 'reject' }); setReviewNotes(''); }}>
                <XCircle className="w-4 h-4 mr-1" /> Reject
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
