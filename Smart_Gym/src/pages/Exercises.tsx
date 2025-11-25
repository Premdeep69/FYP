import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

interface Exercise {
  id: number;
  name: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  category: string;
  description: string;
  instructions: string[];
  videoUrl: string;
}

const Exercises = () => {
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);

  const exercises: Exercise[] = [
    {
      id: 1,
      name: "Push-ups",
      difficulty: "Beginner",
      category: "Chest",
      description: "A fundamental upper body exercise that targets chest, shoulders, and triceps.",
      instructions: [
        "Start in a plank position with hands slightly wider than shoulder-width",
        "Keep your body in a straight line from head to heels",
        "Lower your body until chest nearly touches the floor",
        "Push back up to starting position",
        "Repeat for desired repetitions"
      ],
      videoUrl: "https://www.youtube.com/watch?v=IODxDxX7oi4"
    },
    {
      id: 2,
      name: "Squats",
      difficulty: "Beginner",
      category: "Legs",
      description: "The king of leg exercises, working quads, hamstrings, and glutes.",
      instructions: [
        "Stand with feet shoulder-width apart",
        "Keep chest up and core engaged",
        "Lower down as if sitting in a chair",
        "Keep knees in line with toes",
        "Push through heels to return to standing"
      ],
      videoUrl: "https://www.youtube.com/watch?v=ultWZbUMPL8"
    },
    {
      id: 3,
      name: "Deadlifts",
      difficulty: "Advanced",
      category: "Full Body",
      description: "A compound movement that builds overall strength and muscle mass.",
      instructions: [
        "Stand with feet hip-width apart, bar over mid-foot",
        "Bend down and grip the bar just outside your legs",
        "Keep back straight, chest up, shoulders back",
        "Drive through heels to stand up with the weight",
        "Lower the bar with control back to the floor"
      ],
      videoUrl: "https://www.youtube.com/watch?v=op9kVnSso6Q"
    },
    {
      id: 4,
      name: "Bench Press",
      difficulty: "Intermediate",
      category: "Chest",
      description: "A classic chest builder that also works shoulders and triceps.",
      instructions: [
        "Lie flat on bench with feet on the floor",
        "Grip bar slightly wider than shoulder-width",
        "Lower bar to mid-chest with control",
        "Press bar back up to starting position",
        "Keep shoulder blades retracted throughout"
      ],
      videoUrl: "https://www.youtube.com/watch?v=gRVjAtPip0Y"
    },
    {
      id: 5,
      name: "Pull-ups",
      difficulty: "Advanced",
      category: "Back",
      description: "An excellent exercise for building back width and arm strength.",
      instructions: [
        "Hang from bar with overhand grip",
        "Pull yourself up until chin is over the bar",
        "Keep core tight and avoid swinging",
        "Lower yourself with control",
        "Repeat for desired reps"
      ],
      videoUrl: "https://www.youtube.com/watch?v=eGo4IYlbE5g"
    },
    {
      id: 6,
      name: "Plank",
      difficulty: "Beginner",
      category: "Core",
      description: "A foundational core exercise that builds stability and endurance.",
      instructions: [
        "Start in forearm plank position",
        "Keep body in straight line from head to heels",
        "Engage core and glutes",
        "Don't let hips sag or pike up",
        "Hold for desired time"
      ],
      videoUrl: "https://www.youtube.com/watch?v=ASdvN_XEl_c"
    }
  ];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Beginner":
        return "bg-success/10 text-success hover:bg-success/20";
      case "Intermediate":
        return "bg-warning/10 text-warning hover:bg-warning/20";
      case "Advanced":
        return "bg-destructive/10 text-destructive hover:bg-destructive/20";
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4">
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-heading font-bold mb-4">Exercise Library</h1>
          <p className="text-lg text-muted-foreground">
            Browse our comprehensive collection of exercises with detailed instructions
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exercises.map((exercise) => (
            <Card
              key={exercise.id}
              className="p-6 card-hover cursor-pointer"
              onClick={() => setSelectedExercise(exercise)}
            >
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-xl font-heading font-bold">{exercise.name}</h3>
                <Badge className={getDifficultyColor(exercise.difficulty)}>
                  {exercise.difficulty}
                </Badge>
              </div>
              <Badge variant="outline" className="mb-3">
                {exercise.category}
              </Badge>
              <p className="text-muted-foreground">{exercise.description}</p>
            </Card>
          ))}
        </div>
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
              <div className="flex gap-2">
                <Badge className={getDifficultyColor(selectedExercise.difficulty)}>
                  {selectedExercise.difficulty}
                </Badge>
                <Badge variant="outline">{selectedExercise.category}</Badge>
              </div>

              <div>
                <h4 className="font-heading font-bold mb-2">Description</h4>
                <p className="text-muted-foreground">{selectedExercise.description}</p>
              </div>

              <div>
                <h4 className="font-heading font-bold mb-3">Step-by-Step Instructions</h4>
                <ol className="space-y-2">
                  {selectedExercise.instructions.map((instruction, index) => (
                    <li key={index} className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </span>
                      <span className="text-muted-foreground">{instruction}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <Button asChild className="w-full">
                <a href={selectedExercise.videoUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Watch Video Tutorial
                </a>
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Exercises;
