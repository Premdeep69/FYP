import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

const PendingApproval = () => {
  const { user, logout, refreshUser, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/login');
        return;
      }
      // If verified, send to dashboard
      if (user.userType === 'trainer' && user.isVerified) {
        navigate('/trainer-dashboard');
      }
      // Non-trainers shouldn't be here
      if (user.userType !== 'trainer') {
        navigate('/dashboard');
      }
    }
  }, [user, loading, navigate]);

  const handleRefresh = async () => {
    await refreshUser();
  };

  const status = user?.trainerVerification?.status || 'pending';

  const statusConfig = {
    pending: {
      icon: <Clock className="w-16 h-16 text-yellow-500 mx-auto" />,
      title: 'Account Pending Approval',
      message: 'Your trainer account has been submitted and is currently under review by our admin team. You will be able to access your dashboard once approved.',
      color: 'text-yellow-600',
      bg: 'bg-yellow-50 border-yellow-200',
    },
    rejected: {
      icon: <XCircle className="w-16 h-16 text-red-500 mx-auto" />,
      title: 'Account Not Approved',
      message: 'Unfortunately, your trainer account was not approved.',
      color: 'text-red-600',
      bg: 'bg-red-50 border-red-200',
    },
    verified: {
      icon: <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />,
      title: 'Account Approved',
      message: 'Your account has been approved! Redirecting you to your dashboard...',
      color: 'text-green-600',
      bg: 'bg-green-50 border-green-200',
    },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        <div className={`border-2 rounded-2xl p-8 text-center ${config.bg}`}>
          <div className="mb-6">{config.icon}</div>

          <h1 className={`text-2xl font-bold mb-3 ${config.color}`}>{config.title}</h1>
          <p className="text-gray-600 mb-6">{config.message}</p>

          {status === 'rejected' && user?.trainerVerification?.reviewNotes && (
            <div className="bg-white border border-red-200 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm font-medium text-gray-700 mb-1">Admin Notes:</p>
              <p className="text-sm text-gray-600">{user.trainerVerification.reviewNotes}</p>
            </div>
          )}

          {status === 'pending' && (
            <div className="bg-white rounded-lg p-4 mb-6 text-left space-y-2">
              <p className="text-sm font-medium text-gray-700">What happens next?</p>
              <ul className="text-sm text-gray-500 space-y-1 list-disc list-inside">
                <li>Admin reviews your submitted details</li>
                <li>You'll be notified once a decision is made</li>
                <li>Approved trainers get full dashboard access</li>
              </ul>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {status === 'pending' && (
              <Button variant="outline" onClick={handleRefresh} className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Check Status
              </Button>
            )}
            {status === 'verified' && (
              <Button onClick={() => navigate('/trainer-dashboard')} className="w-full">
                Go to Dashboard
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={() => { logout(); navigate('/login'); }}
              className="w-full text-gray-500"
            >
              Logout
            </Button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Submitted: {user?.trainerVerification?.submittedAt
            ? new Date(user.trainerVerification.submittedAt).toLocaleDateString()
            : 'N/A'}
        </p>
      </div>
    </div>
  );
};

export default PendingApproval;
