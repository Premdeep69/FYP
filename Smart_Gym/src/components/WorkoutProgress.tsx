import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Play, CheckCircle, Clock, Target, Trophy } from "lucide-react";
import { apiService } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

interface WorkoutProgressProps {
  userId: string;
}

interface UserWorkoutProgress {
  _id: string;
  workoutPlanId: {
    _id: string;
    name: string;
    description: string;
    difficulty: string;
    duration: {
      weeks: number;
      daysPerWeek: number;
      minutesPerSession: number;
    };
  };
  status: "active" | "completed" | "paused" | "abandoned";
  currentWeek: number;
  currentDay: number;
  completedWorkouts: Array<{
    workoutIndex: number;
    completedAt: string;
    duration: number;
    caloriesBurned: number;
    rating?: number;
  }>;
  statistics: {
    totalWorkouts: number;
    totalDuration: number;
    totalCalories: number;
    averageRating: number;
    completionRate: number;
    currentStreak: number;
    longestStreak: number;
  };
  personalRecords: Array<{
    exerciseId: string;
    recordType: string;
    value: number;
    unit: string;
    achievedAt: string;
  }>;
}

const WorkoutProgress: React.FC<WorkoutProgressProps> = ({ userId }) => {
  const [workoutProgress, setWorkoutProgress] = useState<UserWorkoutProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProgress, setSelectedProgress] = useState<UserWorkoutProgress | null>(null);
  const [logWorkoutOpen, setLogWorkoutOpen] = useState(false);
  const [workoutData, setWorkoutData] = useState({
    duration: "",
    caloriesBurned: "",
    rating: "",
    notes: ""
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchWorkoutProgress();
  }, [userId]);

  const fetchWorkoutProgress = async () => {
    try {
      setLoading(true);
      const progress = await apiService.getUserWorkoutPlans("active");
      setWorkoutProgress(progress);
    } catch (error) {
      console.error("Failed to fetch workout progress:", error);
      toast({
        title: "Error",
        description: "Failed to load workout progress.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogWorkout = async () => {
    if (!selectedProgress) return;

    try {
      const logData = {
        workoutIndex: selectedProgress.completedWorkouts.length,
        duration: parseInt(workoutData.duration),
        caloriesBurned: parseInt(workoutData.caloriesBurned),
        rating: workoutData.rating ? parseInt(workoutData.rating) : undefined,
        notes: workoutData.notes,
        exercises: [] // This would be populated with actual exercise data
      };

      await apiService.logWorkoutCompletion(selectedProgress._id, logData);
      
      toast({
        title: "Success",
        description: "Workout logged successfully!",
      });

      setLogWorkoutOpen(false);
      setWorkoutData({ duration: "", caloriesBurned: "", rating: "", notes: "" });
      fetchWorkoutProgress(); // Refresh data
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to log workout.",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-success/10 text-success";
      case "completed":
        return "bg-primary/10 text-primary";
      case "paused":
        return "bg-warning/10 text-warning";
      case "abandoned":
        return "bg-destructive/10 text-destructive";
      default:
        return "";
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

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-muted animate-pulse rounded-lg"></div>
        <div className="h-32 bg-muted animate-pulse rounded-lg"></div>
      </div>
    );
  }

  if (workoutProgress.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Active Workout Plans</h3>
        <p className="text-muted-foreground mb-4">
          Start your fitness journey by enrolling in a workout plan.
        </p>
        <Button>Browse Workout Plans</Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-heading font-bold">Your Workout Progress</h2>
      </div>

      {workoutProgress.map((progress) => (
        <Card key={progress._id} className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-xl font-heading font-bold">
                  {progress.workoutPlanId.name}
                </h3>
                <Badge className={getStatusColor(progress.status)}>
                  {progress.status.charAt(0).toUpperCase() + progress.status.slice(1)}
                </Badge>
                <Badge className={getDifficultyColor(progress.workoutPlanId.difficulty)}>
                  {progress.workoutPlanId.difficulty.charAt(0).toUpperCase() + progress.workoutPlanId.difficulty.slice(1)}
                </Badge>
              </div>
              <p className="text-muted-foreground mb-3">
                {progress.workoutPlanId.description}
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {progress.statistics.totalWorkouts}
                  </div>
                  <div className="text-sm text-muted-foreground">Workouts</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {Math.round(progress.statistics.totalDuration / 60)}h
                  </div>
                  <div className="text-sm text-muted-foreground">Total Time</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {progress.statistics.totalCalories}
                  </div>
                  <div className="text-sm text-muted-foreground">Calories</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {progress.statistics.currentStreak}
                  </div>
                  <div className="text-sm text-muted-foreground">Day Streak</div>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Progress</span>
                  <span className="text-sm text-muted-foreground">
                    {progress.statistics.completionRate.toFixed(1)}% Complete
                  </span>
                </div>
                <Progress value={progress.statistics.completionRate} className="h-2" />
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>Week {progress.currentWeek} of {progress.workoutPlanId.duration.weeks}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Target className="w-4 h-4" />
                  <span>Day {progress.currentDay}</span>
                </div>
                {progress.statistics.averageRating > 0 && (
                  <div className="flex items-center gap-1">
                    <Trophy className="w-4 h-4" />
                    <span>Avg Rating: {progress.statistics.averageRating.toFixed(1)}/5</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Dialog open={logWorkoutOpen} onOpenChange={setLogWorkoutOpen}>
                <DialogTrigger asChild>
                  <Button 
                    onClick={() => setSelectedProgress(progress)}
                    className="flex items-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Log Workout
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Log Workout Session</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="duration">Duration (minutes)</Label>
                        <Input
                          id="duration"
                          type="number"
                          value={workoutData.duration}
                          onChange={(e) => setWorkoutData(prev => ({ ...prev, duration: e.target.value }))}
                          placeholder="45"
                        />
                      </div>
                      <div>
                        <Label htmlFor="calories">Calories Burned</Label>
                        <Input
                          id="calories"
                          type="number"
                          value={workoutData.caloriesBurned}
                          onChange={(e) => setWorkoutData(prev => ({ ...prev, caloriesBurned: e.target.value }))}
                          placeholder="300"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="rating">Rating (1-5)</Label>
                      <Input
                        id="rating"
                        type="number"
                        min="1"
                        max="5"
                        value={workoutData.rating}
                        onChange={(e) => setWorkoutData(prev => ({ ...prev, rating: e.target.value }))}
                        placeholder="4"
                      />
                    </div>
                    <div>
                      <Label htmlFor="notes">Notes (optional)</Label>
                      <Textarea
                        id="notes"
                        value={workoutData.notes}
                        onChange={(e) => setWorkoutData(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="How did the workout feel?"
                      />
                    </div>
                    <Button onClick={handleLogWorkout} className="w-full">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Log Workout
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Button variant="outline" size="sm">
                View Details
              </Button>
            </div>
          </div>

          {progress.personalRecords.length > 0 && (
            <div className="border-t border-border pt-4">
              <h4 className="font-medium mb-2">Recent Personal Records</h4>
              <div className="flex flex-wrap gap-2">
                {progress.personalRecords.slice(0, 3).map((record, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    <Trophy className="w-3 h-3 mr-1" />
                    {record.recordType.replace("-", " ")}: {record.value} {record.unit}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
};

export default WorkoutProgress;