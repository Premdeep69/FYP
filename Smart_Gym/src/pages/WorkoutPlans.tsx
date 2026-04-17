import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Target, TrendingUp, Flame, Search, Star, Clock, Users, Calendar, Dumbbell } from "lucide-react";
import { apiService } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface WorkoutPlan {
  _id: string;
  name: string;
  description: string;
  category: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  duration: {
    weeks: number;
    daysPerWeek: number;
    minutesPerSession: number;
  };
  goals: string[];
  workouts: Array<{
    day: number;
    week: number;
    name: string;
    description: string;
    exercises: Array<{
      exerciseId: {
        name: string;
        category: string;
        muscleGroups: string[];
      };
      sets: number;
      reps?: number;
      duration?: number;
      weight?: number;
    }>;
    estimatedDuration: number;
    estimatedCalories: number;
  }>;
  equipment: string[];
  tags: string[];
  isPremium: boolean;
  averageRating: number;
  totalRatings: number;
  totalEnrollments: number;
  createdBy: {
    name: string;
    userType: string;
    trainerProfile?: any;
  };
}

interface WorkoutPlanFilters {
  categories: string[];
  difficulties: string[];
  equipment: string[];
  goals: string[];
}

const WorkoutPlans = () => {
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<WorkoutPlan | null>(null);
  const [filters, setFilters] = useState<WorkoutPlanFilters>({
    categories: [],
    difficulties: [],
    equipment: [],
    goals: []
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("beginner");
  const [sortBy, setSortBy] = useState("popularity");
  const [userPlanRatings, setUserPlanRatings] = useState<Record<string, number>>({});
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchFilters();
    fetchWorkoutPlans();
  }, []);

  useEffect(() => {
    fetchWorkoutPlans();
  }, [searchTerm, selectedCategory, selectedDifficulty, sortBy]);

  const fetchFilters = async () => {
    try {
      const filtersData = await apiService.getWorkoutPlanFilters();
      setFilters(filtersData);
    } catch (error) {
      console.error("Failed to fetch filters:", error);
    }
  };

  const fetchWorkoutPlans = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: 1,
        limit: 50,
        sortBy,
        sortOrder: "desc"
      };

      if (searchTerm) params.search = searchTerm;
      if (selectedCategory) params.category = selectedCategory;
      if (selectedDifficulty) params.difficulty = selectedDifficulty;

      const response = await apiService.getWorkoutPlans(params);
      setWorkoutPlans(response.workoutPlans);
    } catch (error) {
      console.error("Failed to fetch workout plans:", error);
      toast({
        title: "Error",
        description: "Failed to load workout plans. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEnrollInPlan = async (planId: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to enroll in workout plans.",
        variant: "destructive",
      });
      return;
    }

    try {
      await apiService.enrollInWorkoutPlan(planId);
      toast({
        title: "Enrolled successfully!",
        description: "You can now track your progress in My Workouts.",
      });
      // Close dialog if open, then redirect
      setSelectedPlan(null);
      navigate("/my-workouts");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to enroll in workout plan.",
        variant: "destructive",
      });
    }
  };

  const handleRatePlan = async (planId: string, rating: number) => {
    if (!user) {
      toast({ title: "Login required", description: "Please log in to rate plans.", variant: "destructive" });
      return;
    }
    try {
      const res: any = await apiService.rateWorkoutPlan(planId, rating);
      setUserPlanRatings(prev => ({ ...prev, [planId]: rating }));
      // Update the plan in local state immediately
      setWorkoutPlans(prev => prev.map(p =>
        p._id === planId
          ? { ...p, averageRating: res.averageRating, totalRatings: res.totalRatings }
          : p
      ));
      if (selectedPlan?._id === planId) {
        setSelectedPlan(prev => prev ? { ...prev, averageRating: res.averageRating, totalRatings: res.totalRatings } : prev);
      }
      toast({ title: "Rating submitted", description: `You rated this plan ${rating}/5.` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to submit rating.", variant: "destructive" });
    }
  };

  const renderStars = (rating: number, count: number, onRate?: (r: number) => void) => {
    const isInteractive = !!onRate;
    if (!isInteractive && (!count || count === 0)) {
      return <span className="text-sm text-muted-foreground">No reviews yet</span>;
    }
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 transition-all ${
              star <= Math.round(rating)
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            } ${isInteractive ? "cursor-pointer hover:scale-110 hover:text-yellow-400" : ""}`}
            onClick={() => onRate && onRate(star)}
          />
        ))}
        {(count > 0 || isInteractive) && (
          <span className="text-sm text-muted-foreground ml-1">({rating.toFixed(1)})</span>
        )}
      </div>
    );
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case "beginner":
        return "bg-success/10 text-success hover:bg-success/20";
      case "intermediate":
        return "bg-warning/10 text-warning hover:bg-warning/20";
      case "advanced":
        return "bg-destructive/10 text-destructive hover:bg-destructive/20";
      default:
        return "";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "weight-loss":
        return TrendingUp;
      case "strength":
      case "muscle-gain":
        return Flame;
      default:
        return Target;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Loading workout plans...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4">
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-heading font-bold mb-4">Workout Plans</h1>
          <p className="text-lg text-muted-foreground">
            Choose from professionally designed workout plans to achieve your fitness goals
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search workout plans..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={selectedCategory || "all"} onValueChange={(value) => setSelectedCategory(value === "all" ? "" : value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {filters.categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1).replace("-", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="popularity">Most Popular</SelectItem>
                  <SelectItem value="rating">Highest Rated</SelectItem>
                  <SelectItem value="name">Name A-Z</SelectItem>
                  <SelectItem value="created">Newest</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Difficulty Level Tabs */}
        <Tabs value={selectedDifficulty} onValueChange={setSelectedDifficulty} className="w-full">
          <TabsList className="grid w-full md:w-auto grid-cols-3 mb-8">
            <TabsTrigger value="beginner">Beginner</TabsTrigger>
            <TabsTrigger value="intermediate">Intermediate</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          {["beginner", "intermediate", "advanced"].map((level) => (
            <TabsContent key={level} value={level} className="space-y-6">
              {workoutPlans
                .filter((plan) => plan.difficulty === level)
                .map((plan) => {
                  const CategoryIcon = getCategoryIcon(plan.category);
                  return (
                    <Card key={plan._id} className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                        <div className="flex-1">
                          <div className="flex items-start gap-4 mb-4">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <CategoryIcon className="w-6 h-6 text-primary" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-2xl font-heading font-bold">{plan.name}</h3>
                                {plan.isPremium && (
                                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                                    Premium
                                  </Badge>
                                )}
                              </div>
                              <p className="text-muted-foreground mb-3">{plan.description}</p>
                              
                              <div className="flex flex-wrap gap-2 mb-3">
                                <Badge className={getDifficultyColor(plan.difficulty)}>
                                  {plan.difficulty.charAt(0).toUpperCase() + plan.difficulty.slice(1)}
                                </Badge>
                                <Badge variant="outline">
                                  {plan.category.charAt(0).toUpperCase() + plan.category.slice(1).replace("-", " ")}
                                </Badge>
                                {plan.goals.slice(0, 2).map((goal) => (
                                  <Badge key={goal} variant="secondary" className="text-xs">
                                    {goal.charAt(0).toUpperCase() + goal.slice(1).replace("-", " ")}
                                  </Badge>
                                ))}
                              </div>

                              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  <span>{plan.duration.weeks} weeks</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  <span>{plan.duration.daysPerWeek} days/week</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  <span>{plan.duration.minutesPerSession} min/session</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Users className="w-4 h-4" />
                                  <span>{plan.totalEnrollments > 0 ? `${plan.totalEnrollments} enrolled` : 'Be the first to enroll'}</span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between">
                                {renderStars(plan.averageRating, plan.totalRatings)}
                                {plan.totalRatings > 0 && (
                                  <span className="text-sm text-muted-foreground">
                                    {plan.totalRatings} {plan.totalRatings === 1 ? 'review' : 'reviews'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {plan.equipment.length > 0 && !plan.equipment.includes("none") && (
                            <div className="mb-4">
                              <h5 className="font-medium mb-2">Equipment needed:</h5>
                              <div className="flex flex-wrap gap-2">
                                {plan.equipment.map((item) => (
                                  <Badge key={item} variant="outline" className="text-xs">
                                    {item.charAt(0).toUpperCase() + item.slice(1).replace("-", " ")}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {plan.workouts.length > 0 && (
                            <div className="border-t border-border pt-4">
                              <h4 className="font-heading font-bold mb-3">Sample Workouts</h4>
                              <div className="grid md:grid-cols-2 gap-3">
                                {plan.workouts.slice(0, 4).map((workout, index) => (
                                  <div key={index} className="p-3 bg-muted rounded-lg">
                                    <div className="font-medium text-sm mb-1">{workout.name}</div>
                                    <div className="text-xs text-muted-foreground mb-2">
                                      {workout.description}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {workout.exercises.length} exercises • {workout.estimatedDuration} min • {workout.estimatedCalories} cal
                                    </div>
                                  </div>
                                ))}
                              </div>
                              {plan.workouts.length > 4 && (
                                <p className="text-sm text-muted-foreground mt-2">
                                  +{plan.workouts.length - 4} more workouts
                                </p>
                              )}
                            </div>
                          )}


                        </div>

                        <div className="flex flex-col gap-2">
                          <Button 
                            onClick={() => handleEnrollInPlan(plan._id)}
                            className="w-full lg:w-auto"
                          >
                            Enroll Now
                          </Button>
                          <Button 
                            variant="outline" 
                            className="w-full lg:w-auto"
                            onClick={() => setSelectedPlan(plan)}
                          >
                            View Details
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              
              {workoutPlans.filter((plan) => plan.difficulty === level).length === 0 && (
                <Card className="p-12 text-center">
                  <p className="text-muted-foreground">
                    No {level} workout plans found matching your criteria.
                  </p>
                </Card>
              )}
            </TabsContent>
          ))}
        </Tabs>

        {workoutPlans.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No workout plans found matching your criteria.</p>
          </div>
        )}
      </div>

      {/* Workout Plan Details Dialog */}
      <Dialog open={!!selectedPlan} onOpenChange={() => setSelectedPlan(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-heading font-bold flex items-center gap-2">
              {selectedPlan?.name}
              {selectedPlan?.isPremium && (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  Premium
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedPlan && (
            <div className="space-y-6">
              {/* Overview */}
              <div>
                <h4 className="font-heading font-bold mb-2">Overview</h4>
                <p className="text-muted-foreground">{selectedPlan.description}</p>
              </div>

              {/* Plan Details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Duration</span>
                  </div>
                  <p className="text-lg font-bold">{selectedPlan.duration.weeks} weeks</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Frequency</span>
                  </div>
                  <p className="text-lg font-bold">{selectedPlan.duration.daysPerWeek} days/week</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Session</span>
                  </div>
                  <p className="text-lg font-bold">{selectedPlan.duration.minutesPerSession} min</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Enrolled</span>
                  </div>
                  <p className="text-lg font-bold">
                    {selectedPlan.totalEnrollments > 0 ? selectedPlan.totalEnrollments : '—'}
                  </p>
                </div>
              </div>

              {/* Difficulty & Category */}
              <div>
                <h4 className="font-heading font-bold mb-2">Level & Category</h4>
                <div className="flex flex-wrap gap-2">
                  <Badge className={getDifficultyColor(selectedPlan.difficulty)}>
                    {selectedPlan.difficulty.charAt(0).toUpperCase() + selectedPlan.difficulty.slice(1)}
                  </Badge>
                  <Badge variant="outline">
                    {selectedPlan.category.charAt(0).toUpperCase() + selectedPlan.category.slice(1).replace("-", " ")}
                  </Badge>
                </div>
              </div>

              {/* Goals */}
              {selectedPlan.goals.length > 0 && (
                <div>
                  <h4 className="font-heading font-bold mb-2">Fitness Goals</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedPlan.goals.map((goal) => (
                      <Badge key={goal} variant="secondary">
                        {goal.charAt(0).toUpperCase() + goal.slice(1).replace("-", " ")}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Equipment */}
              {selectedPlan.equipment.length > 0 && !selectedPlan.equipment.includes("none") && (
                <div>
                  <h4 className="font-heading font-bold mb-2">Equipment Needed</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedPlan.equipment.map((item) => (
                      <Badge key={item} variant="outline">
                        {item.charAt(0).toUpperCase() + item.slice(1).replace("-", " ")}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* All Workouts */}
              {selectedPlan.workouts.length > 0 && (
                <div>
                  <h4 className="font-heading font-bold mb-3">Complete Workout Schedule</h4>
                  <div className="space-y-3">
                    {selectedPlan.workouts.map((workout, index) => (
                      <div key={index} className="p-4 border border-border rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                Week {workout.week} • Day {workout.day}
                              </Badge>
                            </div>
                            <h5 className="font-heading font-bold">{workout.name}</h5>
                            <p className="text-sm text-muted-foreground">{workout.description}</p>
                          </div>
                          <div className="text-right text-sm text-muted-foreground">
                            <div>{workout.estimatedDuration} min</div>
                            <div>{workout.estimatedCalories} cal</div>
                          </div>
                        </div>
                        
                        {workout.exercises.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-border">
                            <div className="text-sm font-medium mb-2">Exercises ({workout.exercises.length}):</div>
                            <div className="grid gap-2">
                              {workout.exercises.map((exercise, exIndex) => (
                                <div key={exIndex} className="flex items-center gap-2 text-sm">
                                  <Dumbbell className="w-3 h-3 text-muted-foreground" />
                                  <span className="font-medium">{exercise.exerciseId.name}</span>
                                  <span className="text-muted-foreground">•</span>
                                  <span className="text-muted-foreground">
                                    {exercise.sets} sets
                                    {exercise.reps && ` × ${exercise.reps} reps`}
                                    {exercise.duration && ` × ${exercise.duration}s`}
                                    {exercise.weight && ` @ ${exercise.weight}kg`}
                                  </span>
                                  <div className="flex gap-1 ml-auto">
                                    {exercise.exerciseId.muscleGroups.slice(0, 2).map((muscle) => (
                                      <Badge key={muscle} variant="secondary" className="text-xs">
                                        {muscle}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rating */}
              <div>
                <h4 className="font-heading font-bold mb-2">Rating</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    {renderStars(selectedPlan.averageRating, selectedPlan.totalRatings)}
                    {selectedPlan.totalRatings > 0 && (
                      <span className="text-sm text-muted-foreground">
                        Based on {selectedPlan.totalRatings} {selectedPlan.totalRatings === 1 ? 'review' : 'reviews'}
                      </span>
                    )}
                  </div>
                  {user?.userType === 'user' && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm font-medium mb-2">
                        {userPlanRatings[selectedPlan._id]
                          ? `Your rating: ${userPlanRatings[selectedPlan._id]}/5`
                          : 'Rate this plan (must be enrolled):'}
                      </p>
                      {renderStars(
                        userPlanRatings[selectedPlan._id] ?? 0,
                        1,
                        (r) => handleRatePlan(selectedPlan._id, r)
                      )}
                    </div>
                  )}
                </div>
              </div>



              {/* Action Button */}
              <div className="flex gap-2 pt-4 border-t border-border">
                <Button 
                  onClick={() => {
                    handleEnrollInPlan(selectedPlan._id);
                    setSelectedPlan(null);
                  }}
                  className="flex-1"
                >
                  Enroll in This Plan
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setSelectedPlan(null)}
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

export default WorkoutPlans;
