import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, X, Save } from "lucide-react";
import { apiService } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

interface ExerciseFormProps {
  onExerciseCreated?: () => void;
}

const ExerciseForm: React.FC<ExerciseFormProps> = ({ onExerciseCreated }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    difficulty: "",
    muscleGroups: [] as string[],
    equipment: [] as string[],
    instructions: [{ step: 1, description: "" }],
    tips: [] as string[],
    warnings: [] as string[],
    videoUrl: "",
    defaultSets: 3,
    defaultReps: 10,
    defaultDuration: 0,
    defaultWeight: 0,
    restTime: 60,
    caloriesPerRep: 0,
    caloriesPerMinute: 0
  });

  const [newTip, setNewTip] = useState("");
  const [newWarning, setNewWarning] = useState("");

  const categories = [
    "strength", "cardio", "flexibility", "balance", 
    "plyometric", "core", "functional", "rehabilitation"
  ];

  const difficulties = ["beginner", "intermediate", "advanced"];

  const muscleGroupOptions = [
    "chest", "back", "shoulders", "biceps", "triceps", "forearms",
    "abs", "obliques", "quadriceps", "hamstrings", "glutes", "calves",
    "traps", "lats", "delts", "core", "full-body"
  ];

  const equipmentOptions = [
    "none", "dumbbells", "barbell", "kettlebell", "resistance-bands",
    "pull-up-bar", "bench", "cable-machine", "treadmill", "stationary-bike",
    "rowing-machine", "medicine-ball", "stability-ball", "foam-roller", "yoga-mat"
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.description || !formData.category || !formData.difficulty) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const exerciseData = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        difficulty: formData.difficulty,
        muscleGroups: formData.muscleGroups,
        equipment: formData.equipment.length > 0 ? formData.equipment : ["none"],
        instructions: formData.instructions.filter(inst => inst.description.trim()),
        tips: formData.tips,
        warnings: formData.warnings,
        videoUrl: formData.videoUrl || undefined,
        metrics: {
          defaultSets: formData.defaultSets,
          defaultReps: formData.defaultReps,
          defaultDuration: formData.defaultDuration,
          defaultWeight: formData.defaultWeight,
          restTime: formData.restTime
        },
        calories: {
          perRep: formData.caloriesPerRep || undefined,
          perMinute: formData.caloriesPerMinute || undefined
        }
      };

      await apiService.createExercise(exerciseData);
      
      toast({
        title: "Success",
        description: "Exercise created successfully!",
      });

      // Reset form
      setFormData({
        name: "",
        description: "",
        category: "",
        difficulty: "",
        muscleGroups: [],
        equipment: [],
        instructions: [{ step: 1, description: "" }],
        tips: [],
        warnings: [],
        videoUrl: "",
        defaultSets: 3,
        defaultReps: 10,
        defaultDuration: 0,
        defaultWeight: 0,
        restTime: 60,
        caloriesPerRep: 0,
        caloriesPerMinute: 0
      });

      setOpen(false);
      onExerciseCreated?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create exercise.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addInstruction = () => {
    setFormData(prev => ({
      ...prev,
      instructions: [...prev.instructions, { step: prev.instructions.length + 1, description: "" }]
    }));
  };

  const removeInstruction = (index: number) => {
    setFormData(prev => ({
      ...prev,
      instructions: prev.instructions.filter((_, i) => i !== index)
        .map((inst, i) => ({ ...inst, step: i + 1 }))
    }));
  };

  const updateInstruction = (index: number, description: string) => {
    setFormData(prev => ({
      ...prev,
      instructions: prev.instructions.map((inst, i) => 
        i === index ? { ...inst, description } : inst
      )
    }));
  };

  const addTip = () => {
    if (newTip.trim()) {
      setFormData(prev => ({ ...prev, tips: [...prev.tips, newTip.trim()] }));
      setNewTip("");
    }
  };

  const removeTip = (index: number) => {
    setFormData(prev => ({ ...prev, tips: prev.tips.filter((_, i) => i !== index) }));
  };

  const addWarning = () => {
    if (newWarning.trim()) {
      setFormData(prev => ({ ...prev, warnings: [...prev.warnings, newWarning.trim()] }));
      setNewWarning("");
    }
  };

  const removeWarning = (index: number) => {
    setFormData(prev => ({ ...prev, warnings: prev.warnings.filter((_, i) => i !== index) }));
  };

  const toggleMuscleGroup = (muscle: string) => {
    setFormData(prev => ({
      ...prev,
      muscleGroups: prev.muscleGroups.includes(muscle)
        ? prev.muscleGroups.filter(m => m !== muscle)
        : [...prev.muscleGroups, muscle]
    }));
  };

  const toggleEquipment = (equip: string) => {
    setFormData(prev => ({
      ...prev,
      equipment: prev.equipment.includes(equip)
        ? prev.equipment.filter(e => e !== equip)
        : [...prev.equipment, equip]
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Create Exercise
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Exercise</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Exercise Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Push-ups"
                required
              />
            </div>
            <div>
              <Label htmlFor="category">Category *</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe the exercise and its benefits..."
              required
            />
          </div>

          <div>
            <Label htmlFor="videoUrl">Tutorial Video URL (YouTube)</Label>
            <Input
              id="videoUrl"
              value={formData.videoUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, videoUrl: e.target.value }))}
              placeholder="https://www.youtube.com/watch?v=..."
            />
            <p className="text-xs text-muted-foreground mt-1">
              Paste a YouTube video URL to show a tutorial for this exercise
            </p>
          </div>

          <div>
            <Label htmlFor="difficulty">Difficulty *</Label>
            <Select value={formData.difficulty} onValueChange={(value) => setFormData(prev => ({ ...prev, difficulty: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select difficulty" />
              </SelectTrigger>
              <SelectContent>
                {difficulties.map(diff => (
                  <SelectItem key={diff} value={diff}>
                    {diff.charAt(0).toUpperCase() + diff.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Muscle Groups */}
          <div>
            <Label>Muscle Groups</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {muscleGroupOptions.map(muscle => (
                <Badge
                  key={muscle}
                  variant={formData.muscleGroups.includes(muscle) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleMuscleGroup(muscle)}
                >
                  {muscle.charAt(0).toUpperCase() + muscle.slice(1).replace("-", " ")}
                </Badge>
              ))}
            </div>
          </div>

          {/* Equipment */}
          <div>
            <Label>Equipment</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {equipmentOptions.map(equip => (
                <Badge
                  key={equip}
                  variant={formData.equipment.includes(equip) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleEquipment(equip)}
                >
                  {equip.charAt(0).toUpperCase() + equip.slice(1).replace("-", " ")}
                </Badge>
              ))}
            </div>
          </div>

          {/* Instructions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Instructions</Label>
              <Button type="button" variant="outline" size="sm" onClick={addInstruction}>
                <Plus className="w-4 h-4 mr-1" />
                Add Step
              </Button>
            </div>
            <div className="space-y-2">
              {formData.instructions.map((instruction, index) => (
                <div key={index} className="flex gap-2">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                    {instruction.step}
                  </div>
                  <Input
                    value={instruction.description}
                    onChange={(e) => updateInstruction(index, e.target.value)}
                    placeholder="Describe this step..."
                    className="flex-1"
                  />
                  {formData.instructions.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeInstruction(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div>
            <Label>Tips</Label>
            <div className="flex gap-2 mt-2">
              <Input
                value={newTip}
                onChange={(e) => setNewTip(e.target.value)}
                placeholder="Add a helpful tip..."
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTip())}
              />
              <Button type="button" variant="outline" onClick={addTip}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.tips.map((tip, index) => (
                <Badge key={index} variant="secondary" className="cursor-pointer" onClick={() => removeTip(index)}>
                  {tip} <X className="w-3 h-3 ml-1" />
                </Badge>
              ))}
            </div>
          </div>

          {/* Warnings */}
          <div>
            <Label>Warnings</Label>
            <div className="flex gap-2 mt-2">
              <Input
                value={newWarning}
                onChange={(e) => setNewWarning(e.target.value)}
                placeholder="Add a safety warning..."
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addWarning())}
              />
              <Button type="button" variant="outline" onClick={addWarning}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.warnings.map((warning, index) => (
                <Badge key={index} variant="destructive" className="cursor-pointer" onClick={() => removeWarning(index)}>
                  {warning} <X className="w-3 h-3 ml-1" />
                </Badge>
              ))}
            </div>
          </div>

          {/* Metrics */}
          <div>
            <Label>Default Metrics</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
              <div>
                <Label htmlFor="sets" className="text-sm">Sets</Label>
                <Input
                  id="sets"
                  type="number"
                  value={formData.defaultSets}
                  onChange={(e) => setFormData(prev => ({ ...prev, defaultSets: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <Label htmlFor="reps" className="text-sm">Reps</Label>
                <Input
                  id="reps"
                  type="number"
                  value={formData.defaultReps}
                  onChange={(e) => setFormData(prev => ({ ...prev, defaultReps: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <Label htmlFor="duration" className="text-sm">Duration (sec)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={formData.defaultDuration}
                  onChange={(e) => setFormData(prev => ({ ...prev, defaultDuration: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <Label htmlFor="rest" className="text-sm">Rest Time (sec)</Label>
                <Input
                  id="rest"
                  type="number"
                  value={formData.restTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, restTime: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>
          </div>

          {/* Calories */}
          <div>
            <Label>Calorie Estimates</Label>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div>
                <Label htmlFor="calPerRep" className="text-sm">Calories per Rep</Label>
                <Input
                  id="calPerRep"
                  type="number"
                  step="0.1"
                  value={formData.caloriesPerRep}
                  onChange={(e) => setFormData(prev => ({ ...prev, caloriesPerRep: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <Label htmlFor="calPerMin" className="text-sm">Calories per Minute</Label>
                <Input
                  id="calPerMin"
                  type="number"
                  step="0.1"
                  value={formData.caloriesPerMinute}
                  onChange={(e) => setFormData(prev => ({ ...prev, caloriesPerMinute: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              <Save className="w-4 h-4 mr-2" />
              {loading ? "Creating..." : "Create Exercise"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ExerciseForm;