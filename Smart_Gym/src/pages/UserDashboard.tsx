import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { User, Target, TrendingUp, Calendar, Bell, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiService, UserDashboardData } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import WorkoutProgress from "@/components/WorkoutProgress";

const UserDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dashboardData, setDashboardData] = useState<UserDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is actually a user (not a trainer)
    if (user && user.userType !== 'user') {
      toast({
        title: "Access Denied",
        description: "This dashboard is for users only.",
        variant: "destructive",
      });
      window.location.href = '/trainer-dashboard';
      return;
    }
    
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const data = await apiService.getUserDashboard();
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

  const quickLogWorkout = async () => {
    try {
      await apiService.logWorkout({
        name: "Quick Workout",
        type: "other",
        duration: 30,
        caloriesBurned: 200,
        notes: "Quick logged workout"
      });
      
      toast({
        title: "Workout Logged",
        description: "Your workout has been recorded!",
      });
      
      // Refresh dashboard data
      fetchDashboardData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to log workout",
        variant: "destructive",
      });
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

  const userStats = [
    { 
      label: "Workouts This Week", 
      value: dashboardData.weeklyStats.workoutSessions.toString(), 
      icon: TrendingUp, 
      color: "text-primary" 
    },
    { 
      label: "Current Streak", 
      value: `${dashboardData.currentStreak} days`, 
      icon: Target, 
      color: "text-success" 
    },
    { 
      label: "Total Sessions", 
      value: dashboardData.user.stats?.totalWorkouts?.toString() || "0", 
      icon: Calendar, 
      color: "text-warning" 
    },
  ];

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-heading font-bold mb-4">My Dashboard</h1>
          <p className="text-lg text-muted-foreground">Track your progress and manage your profile</p>
        </div>

        {/* Profile Section */}
        <Card className="p-6 mb-8">
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <User className="w-12 h-12 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-heading font-bold mb-2">{dashboardData.user.name}</h2>
              <p className="text-muted-foreground mb-4">{dashboardData.user.email}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">Edit Profile</Button>
                <Button variant="outline" size="sm">Settings</Button>
                <Button onClick={quickLogWorkout} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Quick Log Workout
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {userStats.map((stat, index) => (
            <Card key={index} className="p-6">
              <stat.icon className={`w-10 h-10 ${stat.color} mb-3`} />
              <h3 className="text-3xl font-heading font-bold mb-1">{stat.value}</h3>
              <p className="text-muted-foreground">{stat.label}</p>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Progress Tracker */}
          <Card className="p-6">
            <h3 className="text-xl font-heading font-bold mb-6">Weekly Progress</h3>
            <div className="space-y-6">
              {dashboardData.activeGoals.length > 0 ? (
                dashboardData.activeGoals.map((goal, index) => {
                  const percentage = Math.min((goal.currentValue / goal.targetValue) * 100, 100);
                  return (
                    <div key={index}>
                      <div className="flex justify-between mb-2">
                        <span className="font-medium">{goal.title}</span>
                        <span className="text-sm text-muted-foreground">
                          {goal.currentValue} / {goal.targetValue} {goal.unit}
                        </span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No active goals set</p>
                  <Button variant="outline" size="sm">Set Goals</Button>
                </div>
              )}
            </div>
          </Card>

          {/* Weekly Stats */}
          <Card className="p-6">
            <h3 className="text-xl font-heading font-bold mb-6">This Week's Stats</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Workout Sessions</span>
                <span className="font-bold text-2xl">{dashboardData.weeklyStats.workoutSessions}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Active Minutes</span>
                <span className="font-bold text-2xl">{dashboardData.weeklyStats.totalMinutes}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Calories Burned</span>
                <span className="font-bold text-2xl">{dashboardData.weeklyStats.totalCalories}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="p-6 mt-6">
          <h3 className="text-xl font-heading font-bold mb-4">Recent Workouts</h3>
          <div className="space-y-4">
            {dashboardData.recentWorkouts.length > 0 ? (
              dashboardData.recentWorkouts.map((workout, index) => (
                <div key={index} className="flex items-start gap-3 pb-4 border-b border-border last:border-0">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                  <div className="flex-1">
                    <p className="font-medium">{workout.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {workout.duration} minutes • {workout.caloriesBurned} calories • {workout.type}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(workout.completedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No workouts logged yet</p>
                <Button onClick={quickLogWorkout}>
                  <Plus className="w-4 h-4 mr-2" />
                  Log Your First Workout
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Workout Progress */}
        <div className="mt-6">
          <WorkoutProgress userId={user?._id || user?.id || ""} />
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
