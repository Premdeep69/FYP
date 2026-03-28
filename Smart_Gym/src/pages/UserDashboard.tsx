import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  User, 
  Target, 
  TrendingUp, 
  Calendar, 
  Plus, 
  Flame, 
  Clock, 
  Activity,
  Award,
  Dumbbell,
  Heart,
  Zap,
  Camera,
  Save,
  Edit2
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { apiService, UserDashboardData } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import WorkoutProgress from "@/components/WorkoutProgress";
import NotificationSettings from "@/components/NotificationSettings";
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent
} from "@/components/ui/chart";
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

const UserDashboard = () => {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const { addNotification } = useNotifications();
  const [dashboardData, setDashboardData] = useState<UserDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState("overview");
  const [showLogWorkout, setShowLogWorkout] = useState(false);
  const [workoutForm, setWorkoutForm] = useState({
    name: "",
    type: "strength",
    duration: "",
    caloriesBurned: "",
    notes: ""
  });

  // Profile state
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: "",
    bio: "",
    age: "",
    height: "",
    weight: "",
    fitnessLevel: "beginner",
    goals: [] as string[],
    avatar: "",
  });
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [newGoalInput, setNewGoalInput] = useState("");

  const chartConfig = {
    workouts: {
      label: "Workouts",
      color: "hsl(var(--primary))",
    },
    calories: {
      label: "Calories",
      color: "hsl(var(--destructive))",
    },
    minutes: {
      label: "Minutes",
      color: "hsl(var(--success))",
    },
  };

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
      // Populate profile form with current data
      setProfileForm({
        name: data.user.name || "",
        bio: data.user.profile?.bio || "",
        age: data.user.profile?.age?.toString() || "",
        height: data.user.profile?.height?.toString() || "",
        weight: data.user.profile?.weight?.toString() || "",
        fitnessLevel: data.user.profile?.fitnessLevel || "beginner",
        goals: data.user.profile?.goals || [],
        avatar: data.user.profile?.avatar || "",
      });
      setAvatarPreview(data.user.profile?.avatar || "");
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
    // Validate form
    if (!workoutForm.name || !workoutForm.duration || !workoutForm.caloriesBurned) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      await apiService.logWorkout({
        name: workoutForm.name,
        type: workoutForm.type,
        duration: parseInt(workoutForm.duration),
        caloriesBurned: parseInt(workoutForm.caloriesBurned),
        notes: workoutForm.notes
      });
      
      toast({
        title: "Workout Logged",
        description: "Your workout has been recorded!",
      });

      // Add notification for workout completion
      addNotification({
        type: 'workout_completed',
        title: '✅ Workout Completed!',
        message: `Great job on completing ${workoutForm.name}! You burned ${workoutForm.caloriesBurned} calories in ${workoutForm.duration} minutes.`,
        actionUrl: '/user-dashboard'
      });
      
      // Reset form and close dialog
      setWorkoutForm({
        name: "",
        type: "strength",
        duration: "",
        caloriesBurned: "",
        notes: ""
      });
      setShowLogWorkout(false);
      
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

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File too large", description: "Image must be under 2MB.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setAvatarPreview(base64);
      setProfileForm(prev => ({ ...prev, avatar: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    if (!profileForm.name.trim()) {
      toast({ title: "Validation Error", description: "Name is required.", variant: "destructive" });
      return;
    }
    setProfileSaving(true);
    try {
      const res = await apiService.updateProfile({
        name: profileForm.name,
        bio: profileForm.bio,
        age: profileForm.age || undefined,
        height: profileForm.height || undefined,
        weight: profileForm.weight || undefined,
        fitnessLevel: profileForm.fitnessLevel,
        goals: profileForm.goals,
        avatar: profileForm.avatar || undefined,
      });
      // Update stored user in localStorage/context
      localStorage.setItem('user', JSON.stringify(res.user));
      await refreshUser();
      toast({ title: "Profile updated", description: "Your changes have been saved." });
      fetchDashboardData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update profile", variant: "destructive" });
    } finally {
      setProfileSaving(false);
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
      icon: Dumbbell, 
      color: "text-primary",
      bgColor: "bg-primary/10",
      comparison: dashboardData.comparisons?.workouts || 0
    },
    { 
      label: "Current Streak", 
      value: `${dashboardData.currentStreak} days`, 
      icon: Flame, 
      color: "text-destructive",
      bgColor: "bg-destructive/10",
      comparison: null
    },
    { 
      label: "Total Sessions", 
      value: dashboardData.user.stats?.totalWorkouts?.toString() || "0", 
      icon: Activity, 
      color: "text-success",
      bgColor: "bg-success/10",
      comparison: null
    },
    { 
      label: "Active Minutes", 
      value: dashboardData.weeklyStats.totalMinutes.toString(), 
      icon: Clock, 
      color: "text-warning",
      bgColor: "bg-warning/10",
      comparison: dashboardData.comparisons?.minutes || 0
    },
  ];

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl md:text-5xl font-heading font-bold mb-2">My Dashboard</h1>
              <p className="text-lg text-muted-foreground">Welcome back, {dashboardData.user.name}!</p>
            </div>
            <Dialog open={showLogWorkout} onOpenChange={setShowLogWorkout}>
              <DialogTrigger asChild>
                <Button size="lg">
                  <Plus className="w-5 h-5 mr-2" />
                  Log Workout
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Log a Workout</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="workout-name">Workout Name *</Label>
                    <Input
                      id="workout-name"
                      placeholder="e.g., Morning Run, Gym Session"
                      value={workoutForm.name}
                      onChange={(e) => setWorkoutForm({ ...workoutForm, name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="workout-type">Workout Type *</Label>
                    <Select
                      value={workoutForm.type}
                      onValueChange={(value) => setWorkoutForm({ ...workoutForm, type: value })}
                    >
                      <SelectTrigger id="workout-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="strength">Strength Training</SelectItem>
                        <SelectItem value="cardio">Cardio</SelectItem>
                        <SelectItem value="flexibility">Flexibility</SelectItem>
                        <SelectItem value="sports">Sports</SelectItem>
                        <SelectItem value="yoga">Yoga</SelectItem>
                        <SelectItem value="hiit">HIIT</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="duration">Duration (min) *</Label>
                      <Input
                        id="duration"
                        type="number"
                        placeholder="30"
                        value={workoutForm.duration}
                        onChange={(e) => setWorkoutForm({ ...workoutForm, duration: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="calories">Calories Burned *</Label>
                      <Input
                        id="calories"
                        type="number"
                        placeholder="200"
                        value={workoutForm.caloriesBurned}
                        onChange={(e) => setWorkoutForm({ ...workoutForm, caloriesBurned: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (optional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="How did it go? Any observations?"
                      rows={3}
                      value={workoutForm.notes}
                      onChange={(e) => setWorkoutForm({ ...workoutForm, notes: e.target.value })}
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button onClick={quickLogWorkout} className="flex-1">
                      <Dumbbell className="w-4 h-4 mr-2" />
                      Log Workout
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowLogWorkout(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {userStats.map((stat, index) => (
            <Card key={index} className="relative overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                    <h3 className="text-3xl font-heading font-bold">{stat.value}</h3>
                    {stat.comparison !== null && stat.comparison !== undefined && (
                      <p className="text-sm mt-1">
                        <span className={stat.comparison >= 0 ? "text-success" : "text-destructive"}>
                          {stat.comparison >= 0 ? "+" : ""}{stat.comparison}
                        </span>
                        <span className="text-muted-foreground"> from last week</span>
                      </p>
                    )}
                  </div>
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="goals">Goals</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Weekly Activity Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Weekly Activity</CardTitle>
                  <CardDescription>Your workout activity for the past 7 days</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[300px]">
                    <BarChart data={dashboardData.weeklyActivityData || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="workouts" fill="var(--color-workouts)" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Calories Burned Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Calories Burned</CardTitle>
                  <CardDescription>Daily calorie burn this week</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[300px]">
                    <AreaChart data={dashboardData.weeklyActivityData || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area 
                        type="monotone" 
                        dataKey="calories" 
                        stroke="var(--color-calories)" 
                        fill="var(--color-calories)" 
                        fillOpacity={0.2}
                      />
                    </AreaChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Workout Type Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Workout Distribution</CardTitle>
                  <CardDescription>Breakdown by workout type</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] flex items-center justify-center">
                    {dashboardData.workoutTypeDistribution && dashboardData.workoutTypeDistribution.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={dashboardData.workoutTypeDistribution}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, value }) => `${name} ${value}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {dashboardData.workoutTypeDistribution.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <ChartTooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-center text-muted-foreground">
                        <p>No workout data available</p>
                        <p className="text-sm">Start logging workouts to see distribution</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Weekly Stats Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>This Week's Summary</CardTitle>
                  <CardDescription>Your performance metrics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Dumbbell className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Workout Sessions</p>
                        <p className="text-2xl font-bold">{dashboardData.weeklyStats.workoutSessions}</p>
                      </div>
                    </div>
                    {dashboardData.comparisons && (
                      <Badge variant="secondary">
                        {dashboardData.comparisons.workouts >= 0 ? "+" : ""}
                        {dashboardData.comparisons.workouts} from last week
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between p-4 bg-destructive/5 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-destructive/10 rounded-lg">
                        <Flame className="w-5 h-5 text-destructive" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Calories Burned</p>
                        <p className="text-2xl font-bold">{dashboardData.weeklyStats.totalCalories}</p>
                      </div>
                    </div>
                    {dashboardData.comparisons && (
                      <Badge variant="secondary">
                        {dashboardData.comparisons.calories >= 0 ? "+" : ""}
                        {dashboardData.comparisons.calories} from last week
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between p-4 bg-success/5 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-success/10 rounded-lg">
                        <Clock className="w-5 h-5 text-success" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Active Minutes</p>
                        <p className="text-2xl font-bold">{dashboardData.weeklyStats.totalMinutes}</p>
                      </div>
                    </div>
                    {dashboardData.comparisons && (
                      <Badge variant="secondary">
                        {dashboardData.comparisons.minutes >= 0 ? "+" : ""}
                        {dashboardData.comparisons.minutes} from last week
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between p-4 bg-warning/5 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-warning/10 rounded-lg">
                        <Zap className="w-5 h-5 text-warning" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Current Streak</p>
                        <p className="text-2xl font-bold">{dashboardData.currentStreak} days</p>
                      </div>
                    </div>
                    <Badge variant="secondary">Keep it up!</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Workouts */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Recent Workouts</CardTitle>
                    <CardDescription>Your latest training sessions</CardDescription>
                  </div>
                  <Button variant="outline" size="sm">View All</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardData.recentWorkouts.length > 0 ? (
                    dashboardData.recentWorkouts.map((workout, index) => (
                      <div 
                        key={index} 
                        className="flex items-center gap-4 p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="p-3 bg-primary/10 rounded-lg">
                          <Activity className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold mb-1">{workout.name}</h4>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {workout.duration} min
                            </span>
                            <span className="flex items-center gap-1">
                              <Flame className="w-3 h-3" />
                              {workout.caloriesBurned} cal
                            </span>
                            <Badge variant="outline" className="capitalize">{workout.type}</Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">
                            {new Date(workout.completedAt).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                        <Dumbbell className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground mb-4">No workouts logged yet</p>
                      <Button onClick={quickLogWorkout}>
                        <Plus className="w-4 h-4 mr-2" />
                        Log Your First Workout
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Monthly Progress */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Monthly Progress</CardTitle>
                  <CardDescription>Your workout trends over the past month</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[350px]">
                    <LineChart data={dashboardData.monthlyProgressData || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Line 
                        type="monotone" 
                        dataKey="workouts" 
                        stroke="var(--color-workouts)" 
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="minutes" 
                        stroke="var(--color-minutes)" 
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Activity Heatmap */}
              <Card>
                <CardHeader>
                  <CardTitle>Activity Intensity</CardTitle>
                  <CardDescription>Minutes per workout session</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[300px]">
                    <BarChart data={dashboardData.weeklyActivityData || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="minutes" fill="var(--color-minutes)" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Achievements */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Achievements</CardTitle>
                  <CardDescription>Your fitness milestones</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                      <Award className="w-8 h-8 text-yellow-600" />
                      <div>
                        <p className="font-semibold">7-Day Streak!</p>
                        <p className="text-sm text-muted-foreground">Completed workouts 7 days in a row</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                      <Target className="w-8 h-8 text-blue-600" />
                      <div>
                        <p className="font-semibold">Goal Crusher</p>
                        <p className="text-sm text-muted-foreground">Reached your weekly workout goal</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                      <Heart className="w-8 h-8 text-green-600" />
                      <div>
                        <p className="font-semibold">Calorie Burner</p>
                        <p className="text-sm text-muted-foreground">Burned 1000+ calories this week</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Workout Progress Component */}
            <WorkoutProgress userId={user?._id || user?.id || ""} />
          </TabsContent>

          {/* Goals Tab */}
          <TabsContent value="goals" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Active Goals */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Active Goals</CardTitle>
                      <CardDescription>Track your fitness objectives</CardDescription>
                    </div>
                    <Button variant="outline" size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Goal
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {dashboardData.activeGoals.length > 0 ? (
                      dashboardData.activeGoals.map((goal, index) => {
                        const percentage = Math.min((goal.currentValue / goal.targetValue) * 100, 100);
                        return (
                          <div key={index} className="p-4 border border-border rounded-lg">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h4 className="font-semibold text-lg mb-1">{goal.title}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {goal.currentValue} / {goal.targetValue} {goal.unit}
                                </p>
                              </div>
                              <Badge variant={percentage >= 100 ? "default" : "secondary"}>
                                {percentage.toFixed(0)}%
                              </Badge>
                            </div>
                            <Progress value={percentage} className="h-3" />
                            <div className="flex items-center justify-between mt-2 text-sm text-muted-foreground">
                              <span>{percentage >= 100 ? "Goal completed!" : `${(goal.targetValue - goal.currentValue).toFixed(0)} ${goal.unit} to go`}</span>
                              <span>Target: {new Date(goal.deadline).toLocaleDateString()}</span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                          <Target className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <p className="text-muted-foreground mb-4">No active goals set</p>
                        <Button variant="outline">
                          <Plus className="w-4 h-4 mr-2" />
                          Set Your First Goal
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Goal Suggestions */}
              <Card>
                <CardHeader>
                  <CardTitle>Suggested Goals</CardTitle>
                  <CardDescription>Based on your activity</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 border border-border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <Dumbbell className="w-5 h-5 text-primary" />
                        <div className="flex-1">
                          <p className="font-medium">Workout 5 times this week</p>
                          <p className="text-sm text-muted-foreground">Increase your frequency</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-3 border border-border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <Flame className="w-5 h-5 text-destructive" />
                        <div className="flex-1">
                          <p className="font-medium">Burn 2000 calories</p>
                          <p className="text-sm text-muted-foreground">Weekly calorie goal</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-3 border border-border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-success" />
                        <div className="flex-1">
                          <p className="font-medium">300 active minutes</p>
                          <p className="text-sm text-muted-foreground">Weekly time goal</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Personal Records */}
              <Card>
                <CardHeader>
                  <CardTitle>Personal Records</CardTitle>
                  <CardDescription>Your best achievements</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
                      <div>
                        <p className="text-sm text-muted-foreground">Longest Streak</p>
                        <p className="text-2xl font-bold">{dashboardData.user.stats?.longestStreak || 0} days</p>
                      </div>
                      <Award className="w-8 h-8 text-yellow-600" />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Workouts</p>
                        <p className="text-2xl font-bold">{dashboardData.user.stats?.totalWorkouts || 0}</p>
                      </div>
                      <Dumbbell className="w-8 h-8 text-primary" />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Minutes</p>
                        <p className="text-2xl font-bold">{dashboardData.user.stats?.totalMinutes || 0}</p>
                      </div>
                      <Clock className="w-8 h-8 text-success" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <div className="max-w-2xl mx-auto space-y-6">
              {/* Avatar */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><User className="w-5 h-5" /> Profile Picture</CardTitle>
                  <CardDescription>Upload a photo to personalize your account</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <div className="w-24 h-24 rounded-full overflow-hidden bg-muted border-2 border-border flex items-center justify-center">
                        {avatarPreview ? (
                          <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-10 h-10 text-muted-foreground" />
                        )}
                      </div>
                      <label
                        htmlFor="avatar-upload"
                        className="absolute bottom-0 right-0 p-1.5 bg-primary text-primary-foreground rounded-full cursor-pointer hover:bg-primary/90 transition-colors"
                      >
                        <Camera className="w-3.5 h-3.5" />
                      </label>
                      <input
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarChange}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{dashboardData.user.name}</p>
                      <p className="text-sm text-muted-foreground">{dashboardData.user.email}</p>
                      <p className="text-xs text-muted-foreground mt-1">JPG, PNG or GIF · Max 2MB</p>
                      {avatarPreview && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2 text-destructive hover:text-destructive px-0"
                          onClick={() => { setAvatarPreview(""); setProfileForm(p => ({ ...p, avatar: "" })); }}
                        >
                          Remove photo
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Personal Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Edit2 className="w-5 h-5" /> Personal Details</CardTitle>
                  <CardDescription>Update your basic information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="profile-name">Full Name *</Label>
                    <Input
                      id="profile-name"
                      value={profileForm.name}
                      onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))}
                      placeholder="Your full name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="profile-bio">Bio</Label>
                    <Textarea
                      id="profile-bio"
                      value={profileForm.bio}
                      onChange={e => setProfileForm(p => ({ ...p, bio: e.target.value }))}
                      placeholder="Tell us a bit about yourself and your fitness journey..."
                      rows={3}
                      maxLength={300}
                    />
                    <p className="text-xs text-muted-foreground text-right">{profileForm.bio.length}/300</p>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="profile-age">Age</Label>
                      <Input
                        id="profile-age"
                        type="number"
                        min={13}
                        max={120}
                        value={profileForm.age}
                        onChange={e => setProfileForm(p => ({ ...p, age: e.target.value }))}
                        placeholder="25"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="profile-height">Height (cm)</Label>
                      <Input
                        id="profile-height"
                        type="number"
                        min={100}
                        max={250}
                        value={profileForm.height}
                        onChange={e => setProfileForm(p => ({ ...p, height: e.target.value }))}
                        placeholder="170"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="profile-weight">Weight (kg)</Label>
                      <Input
                        id="profile-weight"
                        type="number"
                        min={30}
                        max={300}
                        value={profileForm.weight}
                        onChange={e => setProfileForm(p => ({ ...p, weight: e.target.value }))}
                        placeholder="70"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Fitness Level</Label>
                    <Select
                      value={profileForm.fitnessLevel}
                      onValueChange={v => setProfileForm(p => ({ ...p, fitnessLevel: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Fitness Goals */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Target className="w-5 h-5" /> Fitness Goals</CardTitle>
                  <CardDescription>What are you working towards?</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Quick-select common goals */}
                  <div className="flex flex-wrap gap-2">
                    {["Weight Loss", "Muscle Gain", "Improve Endurance", "Increase Flexibility", "General Fitness", "Sports Performance"].map(g => {
                      const selected = profileForm.goals.includes(g);
                      return (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setProfileForm(p => ({
                            ...p,
                            goals: selected ? p.goals.filter(x => x !== g) : [...p.goals, g]
                          }))}
                          className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                            selected
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background border-border hover:border-primary/50"
                          }`}
                        >
                          {g}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom goal input */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a custom goal..."
                      value={newGoalInput}
                      onChange={e => setNewGoalInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && newGoalInput.trim()) {
                          e.preventDefault();
                          if (!profileForm.goals.includes(newGoalInput.trim())) {
                            setProfileForm(p => ({ ...p, goals: [...p.goals, newGoalInput.trim()] }));
                          }
                          setNewGoalInput("");
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (newGoalInput.trim() && !profileForm.goals.includes(newGoalInput.trim())) {
                          setProfileForm(p => ({ ...p, goals: [...p.goals, newGoalInput.trim()] }));
                          setNewGoalInput("");
                        }
                      }}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Selected goals */}
                  {profileForm.goals.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {profileForm.goals.map(g => (
                        <Badge key={g} variant="secondary" className="gap-1 pr-1">
                          {g}
                          <button
                            type="button"
                            onClick={() => setProfileForm(p => ({ ...p, goals: p.goals.filter(x => x !== g) }))}
                            className="ml-1 hover:text-destructive transition-colors"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Save Button */}
              <Button onClick={handleSaveProfile} disabled={profileSaving} className="w-full" size="lg">
                {profileSaving ? (
                  <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" /> Saving...</>
                ) : (
                  <><Save className="w-4 h-4 mr-2" /> Save Profile</>
                )}
              </Button>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <div className="max-w-2xl mx-auto">
              <NotificationSettings />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default UserDashboard;
