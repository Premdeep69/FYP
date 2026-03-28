import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign, Users, Star, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiService, TrainerDashboardData } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

const TrainerDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dashboardData, setDashboardData] = useState<TrainerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is actually a trainer (not a regular user)
    if (user && user.userType !== 'trainer') {
      toast({
        title: "Access Denied",
        description: "This dashboard is for trainers only.",
        variant: "destructive",
      });
      window.location.href = '/user-dashboard';
      return;
    }
    
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const data = await apiService.getTrainerDashboard();
      setDashboardData(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen py-12 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen py-12 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Failed to load dashboard data</p>
          <Button onClick={fetchDashboardData} className="mt-4">Try Again</Button>
        </div>
      </div>
    );
  }

  const stats = [
    { 
      label: "Active Clients", 
      value: dashboardData.stats.activeClients.toString(), 
      icon: Users, 
      color: "text-primary" 
    },
    { 
      label: "This Month", 
      value: `$${dashboardData.stats.monthlyEarnings.toFixed(0)}`, 
      icon: DollarSign, 
      color: "text-success" 
    },
    { 
      label: "Avg Rating", 
      value: dashboardData.stats.rating.toFixed(1), 
      icon: Star, 
      color: "text-warning" 
    },
    { 
      label: "Sessions Today", 
      value: dashboardData.stats.todaySessions.toString(), 
      icon: Clock, 
      color: "text-secondary" 
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-success/10 text-success";
      case "scheduled":
        return "bg-primary/10 text-primary";
      case "completed":
        return "bg-secondary/10 text-secondary";
      default:
        return "bg-warning/10 text-warning";
    }
  };

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-heading font-bold mb-4">Trainer Dashboard</h1>
          <p className="text-lg text-muted-foreground">Manage your clients and schedule</p>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card key={index} className="p-6">
              <stat.icon className={`w-8 h-8 ${stat.color} mb-3`} />
              <h3 className="text-3xl font-heading font-bold mb-1">{stat.value}</h3>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Today's Schedule */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-heading font-bold">Today's Schedule</h3>
              <Button variant="outline" size="sm">
                <Calendar className="w-4 h-4 mr-2" />
                View All
              </Button>
            </div>
            <div className="space-y-4">
              {dashboardData.todaySessions.length > 0 ? (
                dashboardData.todaySessions.map((session: any, index: number) => (
                  <div key={index} className="p-4 bg-muted rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium">{session.clientId?.name || 'Unknown Client'}</h4>
                        <p className="text-sm text-muted-foreground">{session.sessionType}</p>
                      </div>
                      <Badge className={getStatusColor(session.status)}>
                        {session.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      {new Date(session.scheduledDate).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No sessions scheduled for today</p>
                </div>
              )}
            </div>
          </Card>

          {/* Active Clients */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-heading font-bold">Active Clients</h3>
              <Button variant="outline" size="sm">View All</Button>
            </div>
            <div className="space-y-4">
              {dashboardData.activeClients.length > 0 ? (
                dashboardData.activeClients.slice(0, 5).map((client: any, index: number) => (
                  <div key={index} className="p-4 bg-muted rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium">{client.name}</h4>
                        <p className="text-sm text-muted-foreground">{client.totalSessions} sessions</p>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {new Date(client.lastSession).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Total earned: ${client.totalEarnings?.toFixed(0) || '0'}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No active clients yet</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Earnings Summary */}
        <Card className="p-6 mt-6">
          <h3 className="text-xl font-heading font-bold mb-6">Earnings Summary</h3>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Today</p>
              <p className="text-2xl font-heading font-bold">${dashboardData.stats.todayEarnings.toFixed(0)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">This Month</p>
              <p className="text-2xl font-heading font-bold">${dashboardData.stats.monthlyEarnings.toFixed(0)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Active Clients</p>
              <p className="text-2xl font-heading font-bold">{dashboardData.stats.activeClients}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Rating</p>
              <p className="text-2xl font-heading font-bold">{dashboardData.stats.rating.toFixed(1)} ⭐</p>
            </div>
          </div>
        </Card>

        {/* Profile Management */}
        <Card className="p-6 mt-6">
          <h3 className="text-xl font-heading font-bold mb-4">Profile Management</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <Button variant="outline">Update Availability</Button>
            <Button variant="outline">Edit Services</Button>
            <Button variant="outline">Manage Certifications</Button>
            <Button variant="outline">View Reviews</Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default TrainerDashboard;
