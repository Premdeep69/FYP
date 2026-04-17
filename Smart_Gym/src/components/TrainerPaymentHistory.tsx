import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ChevronLeft, ChevronRight, DollarSign, Calendar, Users,
  TrendingDown, Search, RefreshCw, Loader2, CreditCard, TrendingUp,
} from 'lucide-react';
import { apiService } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

interface TrainerPayment {
  _id: string;
  amount: number;
  currency: string;
  status: string;
  paymentType: string;
  description: string;
  createdAt: string;
  stripePaymentIntentId: string;
  refundAmount?: number;
  refundPercentage?: number;
  refundedAt?: string;
  refundReason?: string;
  userId?: { name: string; email: string };
  sessionId?: { scheduledDate: string; startTime?: string; endTime?: string; duration: number; sessionType?: string };
}

const STATUS_COLORS: Record<string, string> = {
  succeeded: 'bg-green-100 text-green-800',
  pending:   'bg-yellow-100 text-yellow-800',
  failed:    'bg-red-100 text-red-800',
  canceled:  'bg-gray-100 text-gray-800',
  refunded:  'bg-blue-100 text-blue-800',
};

const fmt = (cents: number, currency = 'usd') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100);

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

const TrainerPaymentHistory: React.FC = () => {
  const { toast } = useToast();
  const [payments, setPayments] = useState<TrainerPayment[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [earnings, setEarnings] = useState<any>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const data: any = await apiService.getTrainerPaymentHistory(page, 10, statusFilter, debouncedSearch);
      setPayments(data.payments || []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, debouncedSearch]);

  const fetchEarnings = useCallback(async () => {
    try {
      const data: any = await apiService.getTrainerEarnings();
      setEarnings(data);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);
  useEffect(() => { fetchEarnings(); }, [fetchEarnings]);

  // Derived stats from current page
  const succeeded = payments.filter(p => p.status === 'succeeded');
  const refunded  = payments.filter(p => p.status === 'refunded');
  const totalReceived  = succeeded.reduce((s, p) => s + p.amount, 0);
  const totalDeducted  = refunded.reduce((s, p) => s + (p.refundAmount ?? p.amount), 0);
  const netEarnings    = (earnings?.summary?.totalEarnings ?? 0);

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Earned',       value: fmt(netEarnings),                                    icon: <TrendingUp className="w-7 h-7 text-green-600" /> },
          { label: 'Sessions Paid',      value: earnings?.summary?.totalSessions ?? succeeded.length, icon: <Calendar className="w-7 h-7 text-blue-600" /> },
          { label: 'Refund Deductions',  value: fmt(totalDeducted),                                  icon: <TrendingDown className="w-7 h-7 text-orange-500" /> },
          { label: 'Avg Session Price',  value: fmt(earnings?.summary?.averageSessionPrice ?? 0),    icon: <DollarSign className="w-7 h-7 text-purple-600" /> },
        ].map(({ label, value, icon }) => (
          <Card key={label} className="p-4">
            <div className="flex items-center gap-3">
              {icon}
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-xl font-bold">{value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Monthly breakdown */}
      {earnings?.monthlyBreakdown?.length > 0 && (
        <Card className="p-4">
          <h4 className="font-semibold mb-3 text-sm">Monthly Earnings (Last 12 Months)</h4>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {[...earnings.monthlyBreakdown].reverse().map((m: any) => (
              <div key={`${m._id.year}-${m._id.month}`} className="flex-shrink-0 text-center p-3 bg-muted rounded-lg min-w-[80px]">
                <p className="text-xs text-muted-foreground mb-1">
                  {new Date(m._id.year, m._id.month - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                </p>
                <p className="font-bold text-sm">{fmt(m.earnings)}</p>
                <p className="text-xs text-muted-foreground">{m.sessions} sessions</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by client name, email or transaction ID…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {['succeeded','pending','failed','canceled','refunded'].map(s => (
              <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={fetchHistory}>
          <RefreshCw className="w-4 h-4 mr-1" /> Refresh
        </Button>
      </div>

      {/* Table */}
      <Card>
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold">Transaction History</h3>
          <span className="text-sm text-muted-foreground">{total} record{total !== 1 ? 's' : ''}</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading…
          </div>
        ) : payments.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No payment records found</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payment Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Session Details</TableHead>
                <TableHead>Transaction ID</TableHead>
                <TableHead>Amount Received</TableHead>
                <TableHead>Refund Deduction</TableHead>
                <TableHead>Net</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map(p => {
                const refundAmt = p.refundAmount ?? 0;
                const net = p.amount - refundAmt;
                return (
                  <TableRow key={p._id}>
                    <TableCell className="text-sm whitespace-nowrap">{fmtDateTime(p.createdAt)}</TableCell>

                    <TableCell>
                      {p.userId ? (
                        <div>
                          <p className="font-medium text-sm">{p.userId.name}</p>
                          <p className="text-xs text-muted-foreground">{p.userId.email}</p>
                        </div>
                      ) : <span className="text-muted-foreground text-sm">—</span>}
                    </TableCell>

                    <TableCell>
                      <div>
                        <p className="text-sm font-medium capitalize">
                          {p.sessionId?.sessionType?.replace('-', ' ') || p.description}
                        </p>
                        {p.sessionId && (
                          <p className="text-xs text-muted-foreground">
                            {fmtDate(p.sessionId.scheduledDate)}
                            {p.sessionId.startTime && ` · ${p.sessionId.startTime}`}
                            {p.sessionId.endTime && `–${p.sessionId.endTime}`}
                            {` · ${p.sessionId.duration} min`}
                          </p>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <span className="text-xs font-mono text-muted-foreground truncate max-w-[120px] block" title={p.stripePaymentIntentId}>
                        {p.stripePaymentIntentId?.slice(0, 20)}…
                      </span>
                    </TableCell>

                    <TableCell className="font-semibold whitespace-nowrap text-green-700">
                      {fmt(p.amount, p.currency)}
                    </TableCell>

                    <TableCell>
                      {refundAmt > 0 ? (
                        <div>
                          <p className="text-sm font-medium text-orange-600">-{fmt(refundAmt, p.currency)}</p>
                          {p.refundPercentage && (
                            <p className="text-xs text-muted-foreground">{p.refundPercentage}% refund</p>
                          )}
                          {p.refundedAt && <p className="text-xs text-muted-foreground">{fmtDate(p.refundedAt)}</p>}
                          {p.refundReason && <p className="text-xs text-muted-foreground italic">{p.refundReason}</p>}
                        </div>
                      ) : <span className="text-muted-foreground text-sm">—</span>}
                    </TableCell>

                    <TableCell className={`font-bold whitespace-nowrap ${net < p.amount ? 'text-orange-600' : 'text-green-700'}`}>
                      {fmt(net, p.currency)}
                    </TableCell>

                    <TableCell>
                      <Badge className={STATUS_COLORS[p.status] ?? 'bg-gray-100 text-gray-800'}>
                        {p.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                <ChevronLeft className="w-4 h-4" /> Previous
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default TrainerPaymentHistory;
