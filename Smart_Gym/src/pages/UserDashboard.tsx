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
  Zap
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
  const { user } = useAuth();
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
          <TabsList className="grid w-full grid-cols-4 lg:w-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="goals">Goals</TabsTrigger>
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
