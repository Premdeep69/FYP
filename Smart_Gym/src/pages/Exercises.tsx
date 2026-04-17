import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExternalLink, Search, Filter, Star, Video, Heart } from "lucide-react";
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
  videoUrl?: string;
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
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("");
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>("");
  const [sortBy, setSortBy] = useState("popularity");
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [favLoading, setFavLoading] = useState<Set<string>>(new Set());
  const [favoriteExercises, setFavoriteExercises] = useState<Exercise[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();

  // Debounce: wait 400ms after user stops typing before searching
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    fetchFilters();
    fetchExercises();
    if (user) fetchFavorites();
  }, []);

  useEffect(() => {
    fetchExercises();
  }, [debouncedSearch, selectedCategory, selectedDifficulty, selectedMuscleGroup, sortBy]);

  const fetchFilters = async () => {
    try {
      const filtersData = await apiService.getExerciseFilters();
      setFilters(filtersData);
    } catch (error) {
      console.error("Failed to fetch filters:", error);
    }
  };

  const fetchFavorites = async () => {
    try {
      const data = await apiService.getFavoriteExercises();
      const list = data as Exercise[];
      setFavoriteExercises(list);
      setFavoriteIds(new Set(list.map((e) => e._id)));
    } catch (error) {
      console.error("Failed to fetch favorites:", error);
    }
  };

  const toggleFavorite = async (e: React.MouseEvent, exerciseId: string) => {
    e.stopPropagation(); // prevent opening the detail dialog

    if (!user) {
      toast({
        title: "Login required",
        description: "Please log in to save favourite exercises.",
        variant: "destructive",
      });
      return;
    }

    if (favLoading.has(exerciseId)) return;

    setFavLoading((prev) => new Set(prev).add(exerciseId));

    try {
      const isFav = favoriteIds.has(exerciseId);
      if (isFav) {
        await apiService.removeFromFavorites(exerciseId);
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          next.delete(exerciseId);
          return next;
        });
        setFavoriteExercises((prev) => prev.filter((e) => e._id !== exerciseId));
        toast({ title: "Removed from favourites" });
      } else {
        await apiService.addToFavorites(exerciseId);
        setFavoriteIds((prev) => new Set(prev).add(exerciseId));
        // find the exercise object from the current list and add it
        const found =
          exercises.find((e) => e._id === exerciseId) ||
          selectedExercise?._id === exerciseId ? selectedExercise : null;
        if (found) setFavoriteExercises((prev) => [...prev, found]);
        toast({ title: "Added to favourites" });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Could not update favourites.",
        variant: "destructive",
      });
    } finally {
      setFavLoading((prev) => {
        const next = new Set(prev);
        next.delete(exerciseId);
        return next;
      });
    }
  };

  const fetchExercises = async () => {
    try {
      setLoading(true);

      // If there's a debounced search term, use the search endpoint
      if (debouncedSearch.trim()) {
        const response = await apiService.searchExercises(debouncedSearch.trim());
        let results: Exercise[] = response.results || response.exercises || [];
        if (selectedCategory) {
          results = results.filter((e) => e.category === selectedCategory);
        }
        if (selectedDifficulty) {
          results = results.filter((e) => e.difficulty === selectedDifficulty);
        }
        if (selectedMuscleGroup) {
          results = results.filter((e) => e.muscleGroups.includes(selectedMuscleGroup));
        }
        setExercises(results);
        return;
      }

      // No search term — use the regular filtered endpoint
      const params: any = {
        page: 1,
        limit: 50,
        sortBy,
        sortOrder: "desc",
      };

      if (selectedCategory) params.category = selectedCategory;
      if (selectedDifficulty) params.difficulty = selectedDifficulty;
      if (selectedMuscleGroup) params.muscleGroups = selectedMuscleGroup;

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
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to rate exercises.",
        variant: "destructive",
      });
      return;
    }

    try {
      const res: any = await apiService.rateExercise(exerciseId, rating);
      toast({
        title: "Rating submitted",
        description: `You rated this exercise ${rating}/5. Average is now ${res.averageRating?.toFixed(1)}/5 (${res.totalRatings} ratings).`,
      });

      // Update local state immediately without a full refetch
      const patch = {
        averageRating: res.averageRating,
        totalRatings: res.totalRatings,
        userRating: rating,
      };
      setExercises(prev =>
        prev.map(ex => ex._id === exerciseId ? { ...ex, ...patch } : ex)
      );
      if (selectedExercise?._id === exerciseId) {
        setSelectedExercise(prev => prev ? { ...prev, ...patch } : prev);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to rate exercise.",
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

  const getYouTubeEmbedUrl = (url: string) => {
    if (!url) return null;
    
    // Extract video ID from various YouTube URL formats
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/ // Direct video ID
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return `https://www.youtube.com/embed/${match[1]}`;
      }
    }
    
    return null;
  };

  const renderStars = (rating: number, totalRatings?: number, onRate?: (rating: number) => void) => {
    const isInteractive = !!onRate;
    if (!isInteractive && (!totalRatings || totalRatings === 0)) {
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
        {(totalRatings && totalRatings > 0) || isInteractive ? (
          <span className="text-sm text-muted-foreground ml-1">
            ({rating.toFixed(1)})
          </span>
        ) : null}
      </div>
    );
  };

  // Reusable exercise card
  const ExerciseCard = ({ exercise }: { exercise: Exercise }) => (
    <Card
      key={exercise._id}
      className="p-6 card-hover cursor-pointer"
      onClick={() => setSelectedExercise(exercise)}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-xl font-heading font-bold">{exercise.name}</h3>
          {exercise.videoUrl && (
            <Video className="w-4 h-4 text-primary" title="Has tutorial video" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => toggleFavorite(e, exercise._id)}
            className="p-1 rounded-full hover:bg-muted transition-colors"
            title={favoriteIds.has(exercise._id) ? "Remove from favourites" : "Add to favourites"}
          >
            <Heart
              className={`w-5 h-5 transition-colors ${
                favoriteIds.has(exercise._id)
                  ? "fill-red-500 text-red-500"
                  : "text-muted-foreground hover:text-red-400"
              } ${favLoading.has(exercise._id) ? "opacity-50" : ""}`}
            />
          </button>
          <Badge className={getDifficultyColor(exercise.difficulty)}>
            {exercise.difficulty.charAt(0).toUpperCase() + exercise.difficulty.slice(1)}
          </Badge>
        </div>
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
        {renderStars(exercise.averageRating, exercise.totalRatings)}
        {exercise.totalRatings > 0 && (
          <span className="text-xs text-muted-foreground">
            {exercise.totalRatings} {exercise.totalRatings === 1 ? "review" : "reviews"}
          </span>
        )}
      </div>

      {exercise.equipment.length > 0 && !exercise.equipment.includes("none") && (
        <div className="mt-2">
          <span className="text-xs text-muted-foreground">
            Equipment: {exercise.equipment.join(", ")}
          </span>
        </div>
      )}
    </Card>
  );

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

        {/* Header */}
        <div className="mb-8">
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

        <Tabs defaultValue="all">
          <TabsList className="mb-6">
            <TabsTrigger value="all">All Exercises</TabsTrigger>
            {user && (
              <TabsTrigger value="favourites" className="flex items-center gap-1.5">
                <Heart className="w-4 h-4" />
                My Favourites
                {favoriteExercises.length > 0 && (
                  <span className="ml-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {favoriteExercises.length}
                  </span>
                )}
              </TabsTrigger>
            )}
          </TabsList>

          {/* ── ALL EXERCISES TAB ── */}
          <TabsContent value="all">
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
                <div className="flex flex-wrap gap-2">
                  <Select value={selectedCategory || "all"} onValueChange={(value) => setSelectedCategory(value === "all" ? "" : value)}>
                    <SelectTrigger className="w-[160px]">
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

                  <Select value={selectedMuscleGroup || "all"} onValueChange={(value) => setSelectedMuscleGroup(value === "all" ? "" : value)}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Muscle Group" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Muscles</SelectItem>
                      {filters.muscleGroups.map((muscle) => (
                        <SelectItem key={muscle} value={muscle}>
                          {muscle.charAt(0).toUpperCase() + muscle.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={selectedDifficulty || "all"} onValueChange={(value) => setSelectedDifficulty(value === "all" ? "" : value)}>
                    <SelectTrigger className="w-[160px]">
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
                    <SelectTrigger className="w-[160px]">
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
                <ExerciseCard key={exercise._id} exercise={exercise} />
              ))}
            </div>

            {exercises.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No exercises found matching your criteria.</p>
              </div>
            )}
          </TabsContent>

          {/* ── MY FAVOURITES TAB ── */}
          {user && (
            <TabsContent value="favourites">
              {favoriteExercises.length === 0 ? (
                <div className="text-center py-20">
                  <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-heading font-semibold mb-2">No favourites yet</h3>
                  <p className="text-muted-foreground">
                    Click the <Heart className="w-4 h-4 inline text-red-400" /> on any exercise to save it here.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-muted-foreground mb-6">
                    {favoriteExercises.length} saved {favoriteExercises.length === 1 ? "exercise" : "exercises"}
                  </p>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {favoriteExercises.map((exercise) => (
                      <ExerciseCard key={exercise._id} exercise={exercise} />
                    ))}
                  </div>
                </>
              )}
            </TabsContent>
          )}
        </Tabs>
      </div>

      <Dialog open={!!selectedExercise} onOpenChange={() => setSelectedExercise(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <DialogTitle className="text-2xl font-heading font-bold">
                {selectedExercise?.name}
              </DialogTitle>
              {selectedExercise && (
                <button
                  onClick={(e) => toggleFavorite(e, selectedExercise._id)}
                  className="p-1.5 rounded-full hover:bg-muted transition-colors"
                  title={favoriteIds.has(selectedExercise._id) ? "Remove from favourites" : "Add to favourites"}
                >
                  <Heart
                    className={`w-6 h-6 transition-colors ${
                      favoriteIds.has(selectedExercise._id)
                        ? "fill-red-500 text-red-500"
                        : "text-muted-foreground hover:text-red-400"
                    }`}
                  />
                </button>
              )}
            </div>
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

              {selectedExercise.videoUrl && (
                <div>
                  <h4 className="font-heading font-bold mb-3">Tutorial Video</h4>
                  {getYouTubeEmbedUrl(selectedExercise.videoUrl) ? (
                    <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                      <iframe
                        className="absolute top-0 left-0 w-full h-full rounded-lg border-0"
                        src={getYouTubeEmbedUrl(selectedExercise.videoUrl) || ''}
                        title={`${selectedExercise.name} Tutorial`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Invalid video URL</p>
                  )}
                </div>
              )}

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
                <div className="space-y-2">
                  <div className="flex items-center gap-4">
                    {renderStars(selectedExercise.averageRating, selectedExercise.totalRatings, (rating) =>
                      handleRateExercise(selectedExercise._id, rating)
                    )}
                    {selectedExercise.totalRatings > 0 && (
                      <span className="text-sm text-muted-foreground">
                        Based on {selectedExercise.totalRatings} {selectedExercise.totalRatings === 1 ? 'review' : 'reviews'}
                      </span>
                    )}
                  </div>
                  {user && (
                    <p className="text-xs text-muted-foreground">
                      Click on the stars to rate this exercise
                    </p>
                  )}
                  {!user && (
                    <p className="text-xs text-muted-foreground">
                      Log in to rate this exercise
                    </p>
                  )}
                </div>
              </div>


            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Exercises;
