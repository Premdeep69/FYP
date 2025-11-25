import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Target, TrendingUp, Flame } from "lucide-react";

type Goal = "slim" | "cut" | "bulk";
type Level = "beginner" | "intermediate" | "advanced";

interface WorkoutPlan {
  id: number;
  name: string;
  goal: Goal;
  level: Level;
  duration: string;
  daysPerWeek: number;
  description: string;
  schedule: { day: string; focus: string }[];
}

const WorkoutPlans = () => {
  const [selectedGoal, setSelectedGoal] = useState<Goal>("slim");

  const goals = [
    { id: "slim" as Goal, name: "Slim Down", icon: TrendingUp, color: "text-success" },
    { id: "cut" as Goal, name: "Get Cut", icon: Target, color: "text-primary" },
    { id: "bulk" as Goal, name: "Build Muscle", icon: Flame, color: "text-warning" },
  ];

  const plans: WorkoutPlan[] = [
    {
      id: 1,
      name: "Fat Loss Starter",
      goal: "slim",
      level: "beginner",
      duration: "8 weeks",
      daysPerWeek: 3,
      description: "Perfect for beginners looking to lose weight and build a foundation",
      schedule: [
        { day: "Monday", focus: "Full Body Workout" },
        { day: "Wednesday", focus: "Cardio & Core" },
        { day: "Friday", focus: "Full Body Workout" },
      ],
    },
    {
      id: 2,
      name: "Lean Body Challenge",
      goal: "slim",
      level: "intermediate",
      duration: "12 weeks",
      daysPerWeek: 4,
      description: "Accelerate fat loss with targeted workouts and cardio",
      schedule: [
        { day: "Monday", focus: "Upper Body" },
        { day: "Tuesday", focus: "HIIT Cardio" },
        { day: "Thursday", focus: "Lower Body" },
        { day: "Saturday", focus: "Full Body Circuit" },
      ],
    },
    {
      id: 3,
      name: "Shred Program",
      goal: "cut",
      level: "intermediate",
      duration: "10 weeks",
      daysPerWeek: 5,
      description: "Intensive training to reveal muscle definition",
      schedule: [
        { day: "Monday", focus: "Chest & Triceps" },
        { day: "Tuesday", focus: "Back & Biceps" },
        { day: "Wednesday", focus: "Legs" },
        { day: "Friday", focus: "Shoulders & Core" },
        { day: "Saturday", focus: "HIIT & Abs" },
      ],
    },
    {
      id: 4,
      name: "Mass Builder",
      goal: "bulk",
      level: "advanced",
      duration: "16 weeks",
      daysPerWeek: 5,
      description: "Maximum muscle growth with progressive overload",
      schedule: [
        { day: "Monday", focus: "Chest & Back" },
        { day: "Tuesday", focus: "Legs" },
        { day: "Thursday", focus: "Shoulders & Arms" },
        { day: "Friday", focus: "Back & Chest" },
        { day: "Saturday", focus: "Legs & Core" },
      ],
    },
  ];

  const filteredPlans = plans.filter((plan) => plan.goal === selectedGoal);

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4">
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-heading font-bold mb-4">Workout Plans</h1>
          <p className="text-lg text-muted-foreground">
            Choose your goal and find the perfect plan for your fitness level
          </p>
        </div>

        {/* Goal Selection */}
        <div className="grid md:grid-cols-3 gap-4 mb-12">
          {goals.map((goal) => (
            <Card
              key={goal.id}
              className={`p-6 cursor-pointer card-hover ${
                selectedGoal === goal.id ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => setSelectedGoal(goal.id)}
            >
              <goal.icon className={`w-10 h-10 ${goal.color} mb-3`} />
              <h3 className="text-xl font-heading font-bold">{goal.name}</h3>
            </Card>
          ))}
        </div>

        {/* Level Tabs */}
        <Tabs defaultValue="beginner" className="w-full">
          <TabsList className="grid w-full md:w-auto grid-cols-3 mb-8">
            <TabsTrigger value="beginner">Beginner</TabsTrigger>
            <TabsTrigger value="intermediate">Intermediate</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          {["beginner", "intermediate", "advanced"].map((level) => (
            <TabsContent key={level} value={level} className="space-y-6">
              {filteredPlans
                .filter((plan) => plan.level === level)
                .map((plan) => (
                  <Card key={plan.id} className="p-6">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                      <div>
                        <h3 className="text-2xl font-heading font-bold mb-2">{plan.name}</h3>
                        <p className="text-muted-foreground mb-3">{plan.description}</p>
                        <div className="flex gap-2">
                          <Badge variant="outline">{plan.duration}</Badge>
                          <Badge variant="outline">{plan.daysPerWeek} days/week</Badge>
                          <Badge className="capitalize">{plan.level}</Badge>
                        </div>
                      </div>
                      <Button>Start Plan</Button>
                    </div>

                    <div className="border-t border-border pt-4 mt-4">
                      <h4 className="font-heading font-bold mb-3">Weekly Schedule</h4>
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {plan.schedule.map((session, index) => (
                          <div
                            key={index}
                            className="p-3 bg-muted rounded-lg"
                          >
                            <div className="font-medium text-sm">{session.day}</div>
                            <div className="text-sm text-muted-foreground">{session.focus}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                ))}
              
              {filteredPlans.filter((plan) => plan.level === level).length === 0 && (
                <Card className="p-12 text-center">
                  <p className="text-muted-foreground">
                    No {level} plans available for this goal yet. Check back soon!
                  </p>
                </Card>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
};

export default WorkoutPlans;
