import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Target, TrendingUp, Flame, Search, Star, Clock, Users, Calendar } from "lucide-react";
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
  const { toast } = useToast();
  const { user } = useAuth();

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
        title: "Success",
        description: "Successfully enrolled in workout plan!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to enroll in workout plan.",
        variant: "destructive",
      });
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            }`}
          />
        ))}
        <span className="text-sm text-muted-foreground ml-1">
          ({rating.toFixed(1)})
        </span>
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
                                  <span>{plan.totalEnrollments} enrolled</span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between">
                                {renderStars(plan.averageRating)}
                                <span className="text-sm text-muted-foreground">
                                  {plan.totalRatings} reviews
                                </span>
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

                          <div className="text-sm text-muted-foreground mt-4">
                            Created by: {plan.createdBy.name} ({plan.createdBy.userType})
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <Button 
                            onClick={() => handleEnrollInPlan(plan._id)}
                            className="w-full lg:w-auto"
                          >
                            Enroll Now
                          </Button>
                          <Button variant="outline" className="w-full lg:w-auto">
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
    </div>
  );
};

export default WorkoutPlans;
