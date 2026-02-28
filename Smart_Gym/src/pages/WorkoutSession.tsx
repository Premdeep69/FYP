import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  Flame, 
  Dumbbell,
  Play,
  Pause,
  SkipForward,
  Trophy,
  TrendingUp
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/contexts/NotificationContext";
import { apiService } from "@/services/api";

const WorkoutSession = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addNotification } = useNotifications();
  
  const { progressId, workoutPlan, currentWorkout, currentWeek, currentDay } = location.state || {};
  
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [completedExercises, setCompletedExercises] = useState<number[]>([]);
  const [exerciseData, setExerciseData] = useState<any[]>([]);
  const [workoutNotes, setWorkoutNotes] = useState("");
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [workoutSummary, setWorkoutSummary] = useState<any>(null);

  useEffect(() => {
    if (!progressId || !currentWorkout) {
      toast({
        title: "Error",
        description: "Workout session data not found. Redirecting...",
        variant: "destructive",
      });
      navigate("/my-workouts");
    } else {
      console.log('Workout Session Data:', {
        progressId,
        workoutPlan,
        currentWorkout,
        exercises: currentWorkout.exercises
      });
    }
  }, [progressId, currentWorkout, navigate, toast, workoutPlan]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  if (!currentWorkout) {
    return null;
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleExerciseComplete = (index: number) => {
    if (completedExercises.includes(index)) {
      setCompletedExercises(completedExercises.filter(i => i !== index));
    } else {
      setCompletedExercises([...completedExercises, index]);
    }
  };

  const handleCompleteWorkout = async () => {
    try {
      const workoutData = {
        workoutIndex: currentWorkout.day - 1,
        duration: Math.floor(elapsedTime / 60),
        caloriesBurned: Math.floor(elapsedTime / 60) * 8, // Rough estimate
        exercises: exerciseData,
        notes: workoutNotes
      };

      // Show summary first
      setWorkoutSummary({
        duration: Math.floor(elapsedTime / 60),
        calories: Math.floor(elapsedTime / 60) * 8,
        exercisesCompleted: completedExercises.length,
        totalExercises: currentWorkout.exercises.length,
        notes: workoutNotes
      });
      setShowSummary(true);

      // Save to backend
      await apiService.logWorkoutCompletion(progressId, workoutData);
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save workout. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleFinishAndExit = () => {
    // Add notification for workout completion
    addNotification({
      type: 'workout_completed',
      title: '🏆 Workout Completed!',
      message: `Congratulations! You completed ${currentWorkout.name || 'your workout'}. You burned ${Math.floor(elapsedTime / 60) * 8} calories in ${Math.floor(elapsedTime / 60)} minutes.`,
      actionUrl: '/my-workouts'
    });

    toast({
      title: "Workout Completed!",
      description: "Great job! Your progress has been saved.",
    });
    navigate("/my-workouts");
  };

  const handleSaveAndExit = async () => {
    if (completedExercises.length === 0) {
      // No exercises completed, just exit
      navigate("/my-workouts");
      return;
    }

    try {
      // Save partial workout progress
      const workoutData = {
        workoutIndex: currentWorkout.day - 1,
        duration: Math.floor(elapsedTime / 60),
        caloriesBurned: Math.floor(elapsedTime / 60) * 8,
        exercises: exerciseData,
        notes: workoutNotes,
        isPartial: true // Flag to indicate incomplete workout
      };

      await apiService.logWorkoutCompletion(progressId, workoutData);
      
      toast({
        title: "Progress Saved",
        description: `Saved ${completedExercises.length} of ${currentWorkout.exercises.length} exercises. You can continue later!`,
      });
      
      navigate("/my-workouts");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save progress. Your data may be lost.",
        variant: "destructive",
      });
      // Still navigate away even if save fails
      navigate("/my-workouts");
    }
  };

  const progressPercentage = (completedExercises.length / currentWorkout.exercises.length) * 100;

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/my-workouts")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to My Workouts
          </Button>
          
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-heading font-bold mb-2">{currentWorkout.name}</h1>
              <p className="text-muted-foreground">{workoutPlan.name}</p>
            </div>
            <Badge variant="outline">
              Week {currentWeek} • Day {currentDay}
            </Badge>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-sm text-muted-foreground">Time</span>
              </div>
              <p className="text-2xl font-bold">{formatTime(elapsedTime)}</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Dumbbell className="w-4 h-4 text-primary" />
                <span className="text-sm text-muted-foreground">Exercises</span>
              </div>
              <p className="text-2xl font-bold">
                {completedExercises.length}/{currentWorkout.exercises.length}
              </p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Flame className="w-4 h-4 text-primary" />
                <span className="text-sm text-muted-foreground">Est. Calories</span>
              </div>
              <p className="text-2xl font-bold">{Math.floor(elapsedTime / 60) * 8}</p>
            </Card>
          </div>

          {/* Progress */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Workout Progress</span>
              <span className="text-sm text-muted-foreground">
                {progressPercentage.toFixed(0)}%
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>

          {/* Timer Controls */}
          <div className="flex gap-2 mb-6">
            <Button
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              variant={isTimerRunning ? "outline" : "default"}
            >
              {isTimerRunning ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Pause Timer
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Start Timer
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Exercises */}
        <div className="space-y-4 mb-6">
          <h2 className="text-xl font-heading font-bold">Exercises</h2>
          {currentWorkout.exercises.map((exercise: any, index: number) => {
            const isCompleted = completedExercises.includes(index);
            
            return (
              <Card 
                key={index} 
                className={`p-4 ${isCompleted ? 'bg-success/5 border-success' : ''}`}
              >
                <div className="flex items-start gap-4">
                  <Checkbox
                    checked={isCompleted}
                    onCheckedChange={() => handleExerciseComplete(index)}
                    className="mt-1"
                  />
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-heading font-bold text-lg">
                          {exercise.exerciseId?.name || exercise.name || `Exercise ${index + 1}`}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {exercise.sets} sets
                          {exercise.reps && ` × ${exercise.reps} reps`}
                          {exercise.duration && ` × ${exercise.duration}s`}
                          {exercise.weight && ` @ ${exercise.weight}kg`}
                        </p>
                      </div>
                      {isCompleted && (
                        <CheckCircle2 className="w-5 h-5 text-success" />
                      )}
                    </div>

                    {exercise.exerciseId?.muscleGroups && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {exercise.exerciseId.muscleGroups.map((muscle: string) => (
                          <Badge key={muscle} variant="secondary" className="text-xs">
                            {muscle}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Quick log inputs */}
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      <Input
                        type="number"
                        placeholder="Sets"
                        className="text-sm"
                        disabled={!isCompleted}
                      />
                      <Input
                        type="number"
                        placeholder="Reps"
                        className="text-sm"
                        disabled={!isCompleted}
                      />
                      <Input
                        type="number"
                        placeholder="Weight (kg)"
                        className="text-sm"
                        disabled={!isCompleted}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Notes */}
        <Card className="p-4 mb-6">
          <h3 className="font-heading font-bold mb-2">Workout Notes</h3>
          <Textarea
            placeholder="How did the workout feel? Any observations?"
            value={workoutNotes}
            onChange={(e) => setWorkoutNotes(e.target.value)}
            rows={3}
          />
        </Card>

        {/* Complete Button */}
        <div className="flex gap-2">
          <Button
            onClick={handleCompleteWorkout}
            disabled={completedExercises.length === 0}
            className="flex-1"
            size="lg"
          >
            <CheckCircle2 className="w-5 h-5 mr-2" />
            Complete Workout
          </Button>
          <Button
            variant="outline"
            onClick={handleSaveAndExit}
            size="lg"
          >
            Save & Exit
          </Button>
        </div>
      </div>

      {/* Workout Summary Dialog */}
      <Dialog open={showSummary} onOpenChange={setShowSummary}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">
              <div className="flex flex-col items-center gap-2 mb-4">
                <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
                  <Trophy className="w-8 h-8 text-success" />
                </div>
                <span className="text-2xl font-heading font-bold">Workout Complete!</span>
              </div>
            </DialogTitle>
          </DialogHeader>

          {workoutSummary && (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-4 text-center">
                  <Clock className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">{workoutSummary.duration}</p>
                  <p className="text-sm text-muted-foreground">Minutes</p>
                </Card>
                <Card className="p-4 text-center">
                  <Flame className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">{workoutSummary.calories}</p>
                  <p className="text-sm text-muted-foreground">Calories</p>
                </Card>
                <Card className="p-4 text-center col-span-2">
                  <Dumbbell className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">
                    {workoutSummary.exercisesCompleted}/{workoutSummary.totalExercises}
                  </p>
                  <p className="text-sm text-muted-foreground">Exercises Completed</p>
                </Card>
              </div>

              {/* Motivational Message */}
              <div className="text-center p-4 bg-success/10 rounded-lg">
                <p className="font-medium text-success">
                  {workoutSummary.exercisesCompleted === workoutSummary.totalExercises
                    ? "🎉 Perfect! You completed all exercises!"
                    : "💪 Great effort! Keep pushing forward!"}
                </p>
              </div>

              {/* Notes Preview */}
              {workoutSummary.notes && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-1">Your Notes:</p>
                  <p className="text-sm text-muted-foreground">{workoutSummary.notes}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-2">
                <Button onClick={handleFinishAndExit} size="lg" className="w-full">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  View My Progress
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => navigate("/workout-plans")}
                  className="w-full"
                >
                  Browse More Workouts
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkoutSession;
