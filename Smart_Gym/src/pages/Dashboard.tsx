import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // If not logged in, redirect to login
        navigate("/login");
      } else if (user.userType === "trainer") {
        // If trainer, redirect to trainer dashboard
        navigate("/trainer-dashboard");
      } else {
        // If user, redirect to user dashboard
        navigate("/user-dashboard");
      }
    }
  }, [user, loading, navigate]);

  // Show loading state while checking authentication
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-lg">Redirecting to dashboard...</div>
    </div>
  );
};

export default Dashboard;
