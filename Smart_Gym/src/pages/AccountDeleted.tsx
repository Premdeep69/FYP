import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ShieldX } from 'lucide-react';

const AccountDeleted = () => {
  const { logout } = useAuth();

  // Clear local storage on mount
  useEffect(() => {
    logout();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
          <ShieldX className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Account Deleted</h1>
        <p className="text-gray-500 mb-6">
          Your account has been removed by an administrator. If you believe this was a mistake,
          please contact support.
        </p>
        <a
          href="/login"
          className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Back to Login
        </a>
      </div>
    </div>
  );
};

export default AccountDeleted;
