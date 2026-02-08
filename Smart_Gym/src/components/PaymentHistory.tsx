import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  ChevronLeft, 
  ChevronRight, 
  Download,
  CreditCard,
  Calendar,
  DollarSign,
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
  trainerId?: {
    name: string;
    email: string;
  };
  sessionId?: {
    scheduledDate: string;
    duration: number;
  };
}

interface PaymentHistoryData {
  payments: Payment[];
  totalPages: number;
  currentPage: number;
  total: number;
}

const PaymentHistory: React.FC = () => {
  const { toast } = useToast();
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchPaymentHistory(currentPage);
  }, [currentPage]);

  const fetchPaymentHistory = async (page: number) => {
    try {
      setLoading(true);
      const data = await apiService.getPaymentHistory(page, 10);
      setPaymentHistory(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load payment history',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'succeeded':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'canceled':
        return 'bg-gray-100 text-gray-800';
      case 'refunded':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  if (loading && !paymentHistory) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading payment history...</p>
        </div>
      </div>
    );
  }

  if (!paymentHistory || paymentHistory.payments.length === 0) {
    return (
      <Card className="p-8 text-center">
        <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Payment History</h3>
        <p className="text-muted-foreground">
          You haven't made any payments yet. Book a session or subscribe to a plan to get started.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-sm text-muted-foreground">Total Spent</p>
              <p className="text-2xl font-bold">
                {formatAmount(
                  paymentHistory.payments
                    .filter(p => p.status === 'succeeded')
                    .reduce((sum, p) => sum + p.amount, 0),
                  'usd'
                )}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Calendar className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-sm text-muted-foreground">Sessions Booked</p>
              <p className="text-2xl font-bold">
                {paymentHistory.payments.filter(p => p.paymentType === 'session').length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-purple-600" />
            <div>
              <p className="text-sm text-muted-foreground">Total Transactions</p>
              <p className="text-2xl font-bold">{paymentHistory.total}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Payment History Table */}
      <Card>
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Payment History</h3>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paymentHistory.payments.map((payment) => (
              <TableRow key={payment._id}>
                <TableCell>
                  {formatDate(payment.createdAt)}
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{payment.description}</p>
                    {payment.trainerId && (
                      <p className="text-sm text-muted-foreground">
                        with {payment.trainerId.name}
                      </p>
                    )}
                    {payment.sessionId && (
                      <p className="text-sm text-muted-foreground">
                        {formatDate(payment.sessionId.scheduledDate)} • {payment.sessionId.duration} min
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {payment.paymentType}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">
                  {formatAmount(payment.amount, payment.currency)}
                </TableCell>
                <TableCell>
                  <Badge className={getStatusColor(payment.status)}>
                    {payment.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Pagination */}
        {paymentHistory.totalPages > 1 && (
          <div className="p-4 border-t flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {paymentHistory.currentPage} of {paymentHistory.totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={paymentHistory.currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(paymentHistory.totalPages, prev + 1))}
                disabled={paymentHistory.currentPage === paymentHistory.totalPages}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default PaymentHistory;