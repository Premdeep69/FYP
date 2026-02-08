import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExternalLink, Search, Filter, Star } from "lucide-react";
import { apiService } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import ExerciseForm from "@/components/ExerciseForm";

interface Exercise {
  _id: string;
  name: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  category: string;
  description: string;
  instructions: Array<{ step: number; description: string }>;
  muscleGroups: string[];
  equipment: string[];
  tips?: string[];
  warnings?: string[];
  averageRating: number;
  totalRatings: number;
  popularity: number;
  createdBy: {
    name: string;
    userType: string;
  };
}

interface ExerciseFilters {
  categories: string[];
  muscleGroups: string[];
  equipment: string[];
  difficulties: string[];
}

const Exercises = () => {
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [filters, setFilters] = useState<ExerciseFilters>({
    categories: [],
    muscleGroups: [],
    equipment: [],
    difficulties: []
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("");
  const [sortBy, setSortBy] = useState("popularity");
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchFilters();
    fetchExercises();
  }, []);

  useEffect(() => {
    fetchExercises();
  }, [searchTerm, selectedCategory, selectedDifficulty, sortBy]);

  const fetchFilters = async () => {
    try {
      const filtersData = await apiService.getExerciseFilters();
      setFilters(filtersData);
    } catch (error) {
      console.error("Failed to fetch filters:", error);
    }
  };

  const fetchExercises = async () => {
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

      const response = await apiService.getExercises(params);
      setExercises(response.exercises);
    } catch (error) {
      console.error("Failed to fetch exercises:", error);
      toast({
        title: "Error",
        description: "Failed to load exercises. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRateExercise = async (exerciseId: string, rating: number) => {
    try {
      await apiService.rateExercise(exerciseId, rating);
      toast({
        title: "Success",
        description: "Exercise rated successfully!",
      });
      // Refresh exercises to show updated rating
      fetchExercises();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to rate exercise. Please try again.",
        variant: "destructive",
      });
    }
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

  const renderStars = (rating: number, onRate?: (rating: number) => void) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            } ${onRate ? "cursor-pointer hover:text-yellow-400" : ""}`}
            onClick={() => onRate && onRate(star)}
          />
        ))}
        <span className="text-sm text-muted-foreground ml-1">
          ({rating.toFixed(1)})
        </span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Loading exercises...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4">
        <div className="mb-12">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl md:text-5xl font-heading font-bold mb-4">Exercise Library</h1>
              <p className="text-lg text-muted-foreground">
                Browse our comprehensive collection of exercises with detailed instructions
              </p>
            </div>
            {user?.userType === "trainer" && (
              <ExerciseForm onExerciseCreated={fetchExercises} />
            )}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search exercises..."
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
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={selectedDifficulty || "all"} onValueChange={(value) => setSelectedDifficulty(value === "all" ? "" : value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  {filters.difficulties.map((difficulty) => (
                    <SelectItem key={difficulty} value={difficulty}>
                      {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
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

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exercises.map((exercise) => (
            <Card
              key={exercise._id}
              className="p-6 card-hover cursor-pointer"
              onClick={() => setSelectedExercise(exercise)}
            >
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-xl font-heading font-bold">{exercise.name}</h3>
                <Badge className={getDifficultyColor(exercise.difficulty)}>
                  {exercise.difficulty.charAt(0).toUpperCase() + exercise.difficulty.slice(1)}
                </Badge>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-3">
                <Badge variant="outline">
                  {exercise.category.charAt(0).toUpperCase() + exercise.category.slice(1)}
                </Badge>
                {exercise.muscleGroups.slice(0, 2).map((muscle) => (
                  <Badge key={muscle} variant="secondary" className="text-xs">
                    {muscle.charAt(0).toUpperCase() + muscle.slice(1)}
                  </Badge>
                ))}
                {exercise.muscleGroups.length > 2 && (
                  <Badge variant="secondary" className="text-xs">
                    +{exercise.muscleGroups.length - 2}
                  </Badge>
                )}
              </div>

              <p className="text-muted-foreground mb-3 line-clamp-2">{exercise.description}</p>
              
              <div className="flex items-center justify-between">
                {renderStars(exercise.averageRating)}
                <span className="text-xs text-muted-foreground">
                  {exercise.totalRatings} reviews
                </span>
              </div>

              {exercise.equipment.length > 0 && !exercise.equipment.includes("none") && (
                <div className="mt-2">
                  <span className="text-xs text-muted-foreground">
                    Equipment: {exercise.equipment.join(", ")}
                  </span>
                </div>
              )}
            </Card>
          ))}
        </div>

        {exercises.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No exercises found matching your criteria.</p>
          </div>
        )}
      </div>

      <Dialog open={!!selectedExercise} onOpenChange={() => setSelectedExercise(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-heading font-bold">
              {selectedExercise?.name}
            </DialogTitle>
          </DialogHeader>
          
          {selectedExercise && (
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2">
                <Badge className={getDifficultyColor(selectedExercise.difficulty)}>
                  {selectedExercise.difficulty.charAt(0).toUpperCase() + selectedExercise.difficulty.slice(1)}
                </Badge>
                <Badge variant="outline">
                  {selectedExercise.category.charAt(0).toUpperCase() + selectedExercise.category.slice(1)}
                </Badge>
                {selectedExercise.muscleGroups.map((muscle) => (
                  <Badge key={muscle} variant="secondary">
                    {muscle.charAt(0).toUpperCase() + muscle.slice(1)}
                  </Badge>
                ))}
              </div>

              <div>
                <h4 className="font-heading font-bold mb-2">Description</h4>
                <p className="text-muted-foreground">{selectedExercise.description}</p>
              </div>

              {selectedExercise.instructions && selectedExercise.instructions.length > 0 && (
                <div>
                  <h4 className="font-heading font-bold mb-3">Step-by-Step Instructions</h4>
                  <ol className="space-y-2">
                    {selectedExercise.instructions.map((instruction) => (
                      <li key={instruction.step} className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                          {instruction.step}
                        </span>
                        <span className="text-muted-foreground">{instruction.description}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {selectedExercise.tips && selectedExercise.tips.length > 0 && (
                <div>
                  <h4 className="font-heading font-bold mb-2">Tips</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {selectedExercise.tips.map((tip, index) => (
                      <li key={index} className="text-muted-foreground text-sm">{tip}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedExercise.warnings && selectedExercise.warnings.length > 0 && (
                <div>
                  <h4 className="font-heading font-bold mb-2 text-destructive">Warnings</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {selectedExercise.warnings.map((warning, index) => (
                      <li key={index} className="text-destructive text-sm">{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedExercise.equipment && selectedExercise.equipment.length > 0 && !selectedExercise.equipment.includes("none") && (
                <div>
                  <h4 className="font-heading font-bold mb-2">Equipment Needed</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedExercise.equipment.map((item) => (
                      <Badge key={item} variant="outline">
                        {item.charAt(0).toUpperCase() + item.slice(1).replace("-", " ")}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 className="font-heading font-bold mb-2">Rating</h4>
                <div className="flex items-center gap-4">
                  {renderStars(selectedExercise.averageRating, (rating) => 
                    handleRateExercise(selectedExercise._id, rating)
                  )}
                  <span className="text-sm text-muted-foreground">
                    Based on {selectedExercise.totalRatings} reviews
                  </span>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                Created by: {selectedExercise.createdBy.name} ({selectedExercise.createdBy.userType})
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Exercises;
