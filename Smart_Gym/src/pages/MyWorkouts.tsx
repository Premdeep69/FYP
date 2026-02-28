import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, Clock, TrendingUp, CheckCircle2, Circle, Dumbbell, Play } from "lucide-react";
import { apiService } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface EnrolledWorkout {
  _id: string;
  workoutPlanId: {
    _id: string;
    name: string;
    description: string;
    difficulty: string;
    category: string;
    duration: {
      weeks: number;
      daysPerWeek: number;
      minutesPerSession: number;
    };
    workouts: Array<{
      day: number;
      week: number;
      name: string;
      exercises: any[];
    }>;
  };
  status: string;
  currentWeek: number;
  currentDay: number;
  completedWorkouts: any[];
  statistics: {
    totalWorkouts: number;
    totalDuration: number;
    totalCalories: number;
    averageRating: number;
    completionRate: number;
    currentStreak: number;
    longestStreak: number;
  };
  startDate: string;
  completedDate?: string;
  createdAt: string;
}

const MyWorkouts = () => {
  const [enrolledWorkouts, setEnrolledWorkouts] = useState<EnrolledWorkout[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<EnrolledWorkout | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active");
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    fetchEnrolledWorkouts();
  }, [user, navigate]);

  const fetchEnrolledWorkouts = async () => {
    try {
      setLoading(true);
      console.log('Fetching enrolled workouts...');
      // Fetch all workouts (don't filter by status on API call)
      const response = await apiService.getUserWorkoutPlans();
      console.log('Enrolled workouts response:', response);
      
      // Handle both array and object responses
      const workouts = Array.isArray(response) ? response : [];
      setEnrolledWorkouts(workouts);
    } catch (error: any) {
      console.error("Failed to fetch enrolled workouts:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load your workouts. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case "beginner":
        return "bg-success/10 text-success";
      case "intermediate":
        return "bg-warning/10 text-warning";
      case "advanced":
        return "bg-destructive/10 text-destructive";
      default:
        return "";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "paused":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "";
    }
  };

  const handleContinueWorkout = (enrolled: EnrolledWorkout) => {
    // Find the current workout based on current week and day
    const currentWorkout = enrolled.workoutPlanId.workouts.find(
      w => w.week === enrolled.currentWeek && w.day === enrolled.currentDay
    );

    if (currentWorkout) {
      // Navigate to workout session page with the workout data
      navigate('/workout-session', {
        state: {
          progressId: enrolled._id,
          workoutPlan: enrolled.workoutPlanId,
          currentWorkout,
          currentWeek: enrolled.currentWeek,
          currentDay: enrolled.currentDay
        }
      });
    } else {
      toast({
        title: "No Workout Found",
        description: "Unable to find the current workout. Please check your schedule.",
        variant: "destructive",
      });
    }
  };

  const handleViewSchedule = (enrolled: EnrolledWorkout) => {
    setSelectedSchedule(enrolled);
  };

  const activeWorkouts = enrolledWorkouts.filter(w => w.status === "active");
  const completedWorkouts = enrolledWorkouts.filter(w => w.status === "completed");

  if (loading) {
    return (
      <div className="min-h-screen py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Loading your workouts...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-heading font-bold mb-4">My Workouts</h1>
          <p className="text-lg text-muted-foreground">
            Track your progress and manage your enrolled workout plans
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-border">
          <button
            onClick={() => setActiveTab("active")}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === "active"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Active ({activeWorkouts.length})
          </button>
          <button
            onClick={() => setActiveTab("completed")}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === "completed"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Completed ({completedWorkouts.length})
          </button>
        </div>

        {/* Active Workouts */}
        {activeTab === "active" && (
          <div className="space-y-6">
            {activeWorkouts.length === 0 ? (
              <Card className="p-12 text-center">
                <Dumbbell className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-heading font-bold mb-2">No Active Workouts</h3>
                <p className="text-muted-foreground mb-4">
                  You haven't enrolled in any workout plans yet.
                </p>
                <Button onClick={() => navigate("/workout-plans")}>
                  Browse Workout Plans
                </Button>
              </Card>
            ) : (
              activeWorkouts.map((enrolled) => (
                <Card key={enrolled._id} className="p-6">
                  <div className="flex flex-col lg:flex-row gap-6">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-2xl font-heading font-bold mb-2">
                            {enrolled.workoutPlanId.name}
                          </h3>
                          <p className="text-muted-foreground mb-3">
                            {enrolled.workoutPlanId.description}
                          </p>
                        </div>
                        <Badge className={getStatusColor(enrolled.status)}>
                          {enrolled.status.charAt(0).toUpperCase() + enrolled.status.slice(1)}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-4">
                        <Badge className={getDifficultyColor(enrolled.workoutPlanId.difficulty)}>
                          {enrolled.workoutPlanId.difficulty.charAt(0).toUpperCase() + 
                           enrolled.workoutPlanId.difficulty.slice(1)}
                        </Badge>
                        <Badge variant="outline">
                          {enrolled.workoutPlanId.category.charAt(0).toUpperCase() + 
                           enrolled.workoutPlanId.category.slice(1).replace("-", " ")}
                        </Badge>
                      </div>

                      {/* Progress */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Progress</span>
                          <span className="text-sm text-muted-foreground">
                            {enrolled.completedWorkouts?.length || 0} / {enrolled.workoutPlanId.workouts?.length || 0} workouts
                          </span>
                        </div>
                        <Progress 
                          value={enrolled.statistics?.completionRate || 0} 
                          className="h-2" 
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          {(enrolled.statistics?.completionRate || 0).toFixed(0)}% complete
                        </p>
                      </div>

                      {/* Current Position */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                        <div className="p-3 bg-muted rounded-lg">
                          <div className="text-xs text-muted-foreground mb-1">Current Week</div>
                          <div className="text-lg font-bold">{enrolled.currentWeek || 1}</div>
                        </div>
                        <div className="p-3 bg-muted rounded-lg">
                          <div className="text-xs text-muted-foreground mb-1">Current Day</div>
                          <div className="text-lg font-bold">{enrolled.currentDay || 1}</div>
                        </div>
                        <div className="p-3 bg-muted rounded-lg">
                          <div className="text-xs text-muted-foreground mb-1">Total Weeks</div>
                          <div className="text-lg font-bold">{enrolled.workoutPlanId.duration.weeks}</div>
                        </div>
                        <div className="p-3 bg-muted rounded-lg">
                          <div className="text-xs text-muted-foreground mb-1">Days/Week</div>
                          <div className="text-lg font-bold">{enrolled.workoutPlanId.duration.daysPerWeek}</div>
                        </div>
                      </div>

                      {/* Dates */}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>Started: {new Date(enrolled.startDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{enrolled.workoutPlanId.duration.minutesPerSession} min/session</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 lg:w-48">
                      <Button 
                        className="w-full"
                        onClick={() => handleContinueWorkout(enrolled)}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Continue Workout
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => handleViewSchedule(enrolled)}
                      >
                        View Schedule
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Completed Workouts */}
        {activeTab === "completed" && (
          <div className="space-y-6">
            {completedWorkouts.length === 0 ? (
              <Card className="p-12 text-center">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-heading font-bold mb-2">No Completed Workouts</h3>
                <p className="text-muted-foreground">
                  Complete your first workout plan to see it here!
                </p>
              </Card>
            ) : (
              completedWorkouts.map((enrolled) => (
                <Card key={enrolled._id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-5 h-5 text-success" />
                        <h3 className="text-2xl font-heading font-bold">
                          {enrolled.workoutPlanId.name}
                        </h3>
                      </div>
                      <p className="text-muted-foreground mb-3">
                        {enrolled.workoutPlanId.description}
                      </p>

                      <div className="flex flex-wrap gap-2 mb-4">
                        <Badge className={getDifficultyColor(enrolled.workoutPlanId.difficulty)}>
                          {enrolled.workoutPlanId.difficulty.charAt(0).toUpperCase() + 
                           enrolled.workoutPlanId.difficulty.slice(1)}
                        </Badge>
                        <Badge variant="outline">
                          {enrolled.workoutPlanId.category.charAt(0).toUpperCase() + 
                           enrolled.workoutPlanId.category.slice(1).replace("-", " ")}
                        </Badge>
                        <Badge className="bg-green-100 text-green-800">
                          Completed
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>Completed: {enrolled.completedDate ? new Date(enrolled.completedDate).toLocaleDateString() : 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-4 h-4" />
                          <span>{enrolled.completedWorkouts?.length || 0} workouts completed</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </div>

      {/* View Schedule Dialog */}
      <Dialog open={!!selectedSchedule} onOpenChange={() => setSelectedSchedule(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-heading font-bold">
              {selectedSchedule?.workoutPlanId.name} - Complete Schedule
            </DialogTitle>
          </DialogHeader>

          {selectedSchedule && (
            <div className="space-y-6">
              {/* Overview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Duration</span>
                  </div>
                  <p className="text-lg font-bold">{selectedSchedule.workoutPlanId.duration.weeks} weeks</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Frequency</span>
                  </div>
                  <p className="text-lg font-bold">{selectedSchedule.workoutPlanId.duration.daysPerWeek} days/week</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Progress</span>
                  </div>
                  <p className="text-lg font-bold">{(selectedSchedule.statistics?.completionRate || 0).toFixed(0)}%</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Completed</span>
                  </div>
                  <p className="text-lg font-bold">{selectedSchedule.completedWorkouts?.length || 0}</p>
                </div>
              </div>

              {/* Current Position */}
              <div className="p-4 bg-primary/10 rounded-lg border-2 border-primary">
                <div className="flex items-center gap-2 mb-2">
                  <Play className="w-5 h-5 text-primary" />
                  <span className="font-bold text-primary">You are here</span>
                </div>
                <p className="text-sm">
                  Week {selectedSchedule.currentWeek}, Day {selectedSchedule.currentDay}
                </p>
              </div>

              {/* Complete Schedule */}
              <div>
                <h4 className="font-heading font-bold mb-3">Complete Workout Schedule</h4>
                <div className="space-y-4">
                  {selectedSchedule.workoutPlanId.workouts
                    .sort((a, b) => a.week - b.week || a.day - b.day)
                    .map((workout, index) => {
                      const isCompleted = selectedSchedule.completedWorkouts?.some(
                        cw => cw.workoutIndex === index
                      );
                      const isCurrent = 
                        workout.week === selectedSchedule.currentWeek && 
                        workout.day === selectedSchedule.currentDay;

                      return (
                        <div 
                          key={index} 
                          className={`p-4 border rounded-lg ${
                            isCurrent 
                              ? 'border-primary bg-primary/5' 
                              : isCompleted 
                              ? 'border-success bg-success/5' 
                              : 'border-border'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-xs">
                                  Week {workout.week} • Day {workout.day}
                                </Badge>
                                {isCurrent && (
                                  <Badge className="bg-primary text-primary-foreground">
                                    Current
                                  </Badge>
                                )}
                                {isCompleted && (
                                  <Badge className="bg-success text-success-foreground">
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    Completed
                                  </Badge>
                                )}
                              </div>
                              <h5 className="font-heading font-bold">{workout.name}</h5>
                            </div>
                          </div>
                          
                          {workout.exercises && workout.exercises.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-border">
                              <div className="text-sm font-medium mb-2">
                                Exercises ({workout.exercises.length}):
                              </div>
                              <div className="grid gap-2">
                                {workout.exercises.map((exercise: any, exIndex: number) => (
                                  <div key={exIndex} className="flex items-center gap-2 text-sm">
                                    <Dumbbell className="w-3 h-3 text-muted-foreground" />
                                    <span className="font-medium">
                                      {exercise.exerciseId?.name || 'Exercise'}
                                    </span>
                                    <span className="text-muted-foreground">•</span>
                                    <span className="text-muted-foreground">
                                      {exercise.sets} sets
                                      {exercise.reps && ` × ${exercise.reps} reps`}
                                      {exercise.duration && ` × ${exercise.duration}s`}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Action Button */}
              <div className="flex gap-2 pt-4 border-t border-border">
                {selectedSchedule.status === "active" && (
                  <Button 
                    onClick={() => {
                      handleContinueWorkout(selectedSchedule);
                      setSelectedSchedule(null);
                    }}
                    className="flex-1"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Start Current Workout
                  </Button>
                )}
                <Button 
                  variant="outline"
                  onClick={() => setSelectedSchedule(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyWorkouts;

