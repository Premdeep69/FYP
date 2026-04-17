import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ChevronLeft, ChevronRight, Download, CreditCard, Calendar,
  DollarSign, FileText, Loader2, Search, RefreshCw, TrendingDown,
} from 'lucide-react';
import { apiService } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

interface Payment {
  _id: string;
  amount: number;
  currency: string;
  status: string;
  paymentType: string;
  description: string;
  createdAt: string;
  stripePaymentIntentId: string;
  invoiceNumber?: string;
  refundAmount?: number;
  refundedAt?: string;
  refundReason?: string;
  trainerId?: { name: string; email: string };
  sessionId?: { scheduledDate: string; startTime?: string; duration: number; sessionType?: string };
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

const PaymentHistory: React.FC = () => {
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const data: any = await apiService.getPaymentHistory(page, 10);
      // Client-side filter by status and search since backend doesn't support it yet
      let list: Payment[] = data.payments || [];
      if (statusFilter !== 'all') list = list.filter(p => p.status === statusFilter);
      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase();
        list = list.filter(p =>
          p.description?.toLowerCase().includes(q) ||
          p.trainerId?.name?.toLowerCase().includes(q) ||
          p.stripePaymentIntentId?.toLowerCase().includes(q)
        );
      }
      setPayments(list);
      setTotal(data.total ?? list.length);
      setTotalPages(data.totalPages ?? 1);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, debouncedSearch]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const handleDownload = async (payment: Payment) => {
    setDownloadingId(payment._id);
    try {
      let invoiceNum = payment.invoiceNumber;
      if (!invoiceNum) {
        const res: any = await apiService.generateInvoice(payment._id);
        invoiceNum = res.invoiceNumber;
      }
      if (!invoiceNum) throw new Error('Invoice not available');
      const blob = await apiService.downloadInvoice(`invoice-${invoiceNum}.pdf`) as Blob;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${invoiceNum}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast({ title: 'Could not download receipt', description: e.message, variant: 'destructive' });
    } finally {
      setDownloadingId(null);
    }
  };

  // Summary stats
  const succeeded = payments.filter(p => p.status === 'succeeded');
  const refunded  = payments.filter(p => p.status === 'refunded');
  const totalSpent = succeeded.reduce((s, p) => s + p.amount, 0);
  const totalRefunded = refunded.reduce((s, p) => s + (p.refundAmount ?? p.amount), 0);

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Spent',       value: fmt(totalSpent),          icon: <DollarSign className="w-7 h-7 text-green-600" /> },
          { label: 'Sessions Booked',   value: succeeded.filter(p => p.paymentType === 'session').length, icon: <Calendar className="w-7 h-7 text-blue-600" /> },
          { label: 'Total Refunded',    value: fmt(totalRefunded),        icon: <TrendingDown className="w-7 h-7 text-orange-500" /> },
          { label: 'Transactions',      value: total,                     icon: <CreditCard className="w-7 h-7 text-purple-600" /> },
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

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by trainer, description or transaction ID…"
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
          <h3 className="font-semibold">Payment History</h3>
          <span className="text-sm text-muted-foreground">{total} record{total !== 1 ? 's' : ''}</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading…
          </div>
        ) : payments.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No payments found</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payment Date</TableHead>
                <TableHead>Trainer</TableHead>
                <TableHead>Session Details</TableHead>
                <TableHead>Transaction ID</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Refund</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Receipt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map(p => (
                <TableRow key={p._id}>
                  <TableCell className="text-sm whitespace-nowrap">{fmtDateTime(p.createdAt)}</TableCell>

                  <TableCell>
                    {p.trainerId ? (
                      <div>
                        <p className="font-medium text-sm">{p.trainerId.name}</p>
                        <p className="text-xs text-muted-foreground">{p.trainerId.email}</p>
                      </div>
                    ) : <span className="text-muted-foreground text-sm">—</span>}
                  </TableCell>

                  <TableCell>
                    <div>
                      <p className="text-sm font-medium">{p.description}</p>
                      {p.sessionId && (
                        <p className="text-xs text-muted-foreground">
                          {fmtDate(p.sessionId.scheduledDate)}
                          {p.sessionId.startTime && ` · ${p.sessionId.startTime}`}
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

                  <TableCell className="font-semibold whitespace-nowrap">
                    {fmt(p.amount, p.currency)}
                  </TableCell>

                  <TableCell>
                    {p.refundAmount ? (
                      <div>
                        <p className="text-sm font-medium text-orange-600">-{fmt(p.refundAmount, p.currency)}</p>
                        {p.refundedAt && <p className="text-xs text-muted-foreground">{fmtDate(p.refundedAt)}</p>}
                        {p.refundReason && <p className="text-xs text-muted-foreground">{p.refundReason}</p>}
                      </div>
                    ) : <span className="text-muted-foreground text-sm">—</span>}
                  </TableCell>

                  <TableCell>
                    <Badge className={STATUS_COLORS[p.status] ?? 'bg-gray-100 text-gray-800'}>
                      {p.status}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-center">
                    {p.status === 'succeeded' ? (
                      <Button
                        variant="ghost" size="sm"
                        className="h-7 w-7 p-0"
                        disabled={downloadingId === p._id}
                        onClick={() => handleDownload(p)}
                        title="Download receipt"
                      >
                        {downloadingId === p._id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <FileText className="w-3.5 h-3.5 text-indigo-600" />}
                      </Button>
                    ) : <span className="text-muted-foreground text-xs">—</span>}
                  </TableCell>
                </TableRow>
              ))}
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

export default PaymentHistory;
