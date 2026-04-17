import React, { useState, useEffect, useCallback } from 'react';
import { apiService } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Plus, Pencil, Trash2, RefreshCw, ClipboardList, ChevronLeft, ChevronRight, X, Users, Calendar } from 'lucide-react';

const CATEGORIES = ['weight-loss', 'muscle-gain', 'strength', 'endurance', 'flexibility', 'general-fitness', 'rehabilitation', 'sports-specific'];
const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];
const GOALS = ['lose-weight', 'build-muscle', 'increase-strength', 'improve-endurance', 'enhance-flexibility', 'general-fitness', 'sport-performance', 'rehabilitation'];
const EQUIPMENT_LIST = ['none', 'dumbbells', 'barbell', 'kettlebell', 'resistance-bands', 'pull-up-bar', 'bench', 'cable-machine', 'treadmill', 'stationary-bike', 'rowing-machine', 'medicine-ball', 'stability-ball', 'foam-roller', 'yoga-mat'];

const DIFF_COLORS: Record<string, string> = {
  beginner: 'bg-green-100 text-green-800',
  intermediate: 'bg-yellow-100 text-yellow-800',
  advanced: 'bg-red-100 text-red-800',
};

const CAT_COLORS: Record<string, string> = {
  'weight-loss': 'bg-orange-100 text-orange-800',
  'muscle-gain': 'bg-blue-100 text-blue-800',
  'strength': 'bg-purple-100 text-purple-800',
  'endurance': 'bg-cyan-100 text-cyan-800',
  'flexibility': 'bg-pink-100 text-pink-800',
  'general-fitness': 'bg-indigo-100 text-indigo-800',
  'rehabilitation': 'bg-teal-100 text-teal-800',
  'sports-specific': 'bg-rose-100 text-rose-800',
};

interface WorkoutExercise {
  exerciseId: string;
  exerciseName: string;
  sets: number;
  reps: number;
  duration: number;
  restTime: number;
  notes: string;
}

interface WorkoutDay {
  day: number;
  week: number;
  name: string;
  description: string;
  exercises: WorkoutExercise[];
}

const emptyForm = {
  name: '', description: '', category: '', difficulty: '',
  goals: [] as string[], equipment: [] as string[],
  weeks: '4', daysPerWeek: '3', minutesPerSession: '45',
  isPublic: true, isPremium: false,
  tags: '',
};

type FormState = typeof emptyForm;

const emptyDay = (week: number, day: number): WorkoutDay => ({
  week, day, name: `Week ${week} Day ${day}`, description: '', exercises: [],
});

export default function WorkoutPlansTab() {
  const { toast } = useToast();
  const [plans, setPlans] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [workoutDays, setWorkoutDays] = useState<WorkoutDay[]>([]);
  const [saving, setSaving] = useState(false);
  const [activeDayIdx, setActiveDayIdx] = useState<number>(0);

  // Exercise search
  const [exSearch, setExSearch] = useState('');
  const [exResults, setExResults] = useState<any[]>([]);
  const [exLoading, setExLoading] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const LIMIT = 9;

  const fetchPlans = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params: any = { page: p, limit: LIMIT };
      if (search) params.search = search;
      if (categoryFilter !== 'all') params.category = categoryFilter;
      if (difficultyFilter !== 'all') params.difficulty = difficultyFilter;
      const res: any = await apiService.adminGetWorkoutPlans(params);
      setPlans(res.workoutPlans || []);
      setTotal(res.total || 0);
      setPages(res.totalPages || 1);
      setPage(p);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, difficultyFilter]);

  useEffect(() => { fetchPlans(1); }, [fetchPlans]);

  const searchExercises = useCallback(async (q: string) => {
    if (!q.trim()) { setExResults([]); return; }
    setExLoading(true);
    try {
      const res: any = await apiService.adminGetExercises({ search: q, limit: 10 });
      setExResults(res.exercises || []);
    } catch {
      setExResults([]);
    } finally {
      setExLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchExercises(exSearch), 300);
    return () => clearTimeout(t);
  }, [exSearch, searchExercises]);

  const buildDays = (weeks: number, daysPerWeek: number): WorkoutDay[] => {
    const days: WorkoutDay[] = [];
    for (let w = 1; w <= weeks; w++) {
      for (let d = 1; d <= daysPerWeek; d++) {
        days.push(emptyDay(w, d));
      }
    }
    return days;
  };

  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setWorkoutDays(buildDays(4, 3));
    setActiveDayIdx(0);
    setExSearch('');
    setExResults([]);
    setDialogOpen(true);
  };

  const openEdit = (plan: any) => {
    setEditTarget(plan);
    setForm({
      name: plan.name || '',
      description: plan.description || '',
      category: plan.category || '',
      difficulty: plan.difficulty || '',
      goals: plan.goals || [],
      equipment: plan.equipment || [],
      weeks: String(plan.duration?.weeks ?? 4),
      daysPerWeek: String(plan.duration?.daysPerWeek ?? 3),
      minutesPerSession: String(plan.duration?.minutesPerSession ?? 45),
      isPublic: plan.isPublic ?? true,
      isPremium: plan.isPremium ?? false,
      tags: (plan.tags || []).join(', '),
    });
    // Map existing workouts to WorkoutDay format
    const days: WorkoutDay[] = (plan.workouts || []).map((w: any) => ({
      week: w.week,
      day: w.day,
      name: w.name || `Week ${w.week} Day ${w.day}`,
      description: w.description || '',
      exercises: (w.exercises || []).map((ex: any) => ({
        exerciseId: ex.exerciseId?._id || ex.exerciseId || '',
        exerciseName: ex.exerciseId?.name || ex.exerciseName || '',
        sets: ex.sets || 3,
        reps: ex.reps || 10,
        duration: ex.duration || 0,
        restTime: ex.restTime || 60,
        notes: ex.notes || '',
      })),
    }));
    setWorkoutDays(days.length > 0 ? days : buildDays(plan.duration?.weeks ?? 4, plan.duration?.daysPerWeek ?? 3));
    setActiveDayIdx(0);
    setExSearch('');
    setExResults([]);
    setDialogOpen(true);
  };

  const handleWeeksDaysChange = (field: 'weeks' | 'daysPerWeek', val: string) => {
    setForm(p => ({ ...p, [field]: val }));
    const weeks = field === 'weeks' ? Number(val) : Number(form.weeks);
    const days = field === 'daysPerWeek' ? Number(val) : Number(form.daysPerWeek);
    if (weeks > 0 && days > 0) {
      setWorkoutDays(buildDays(weeks, days));
      setActiveDayIdx(0);
    }
  };

  const toggleMulti = (field: 'goals' | 'equipment', value: string) => {
    setForm(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(v => v !== value)
        : [...prev[field], value],
    }));
  };

  const addExerciseToDay = (ex: any) => {
    setWorkoutDays(prev => prev.map((d, i) => i !== activeDayIdx ? d : {
      ...d,
      exercises: [...d.exercises, {
        exerciseId: ex._id,
        exerciseName: ex.name,
        sets: ex.metrics?.defaultSets || 3,
        reps: ex.metrics?.defaultReps || 10,
        duration: ex.metrics?.defaultDuration || 0,
        restTime: ex.metrics?.restTime || 60,
        notes: '',
      }],
    }));
    setExSearch('');
    setExResults([]);
  };

  const removeExerciseFromDay = (dayIdx: number, exIdx: number) => {
    setWorkoutDays(prev => prev.map((d, i) => i !== dayIdx ? d : {
      ...d,
      exercises: d.exercises.filter((_, ei) => ei !== exIdx),
    }));
  };

  const updateExerciseField = (dayIdx: number, exIdx: number, field: keyof WorkoutExercise, value: any) => {
    setWorkoutDays(prev => prev.map((d, i) => i !== dayIdx ? d : {
      ...d,
      exercises: d.exercises.map((ex, ei) => ei !== exIdx ? ex : { ...ex, [field]: value }),
    }));
  };

  const buildPayload = () => ({
    name: form.name.trim(),
    description: form.description.trim(),
    category: form.category,
    difficulty: form.difficulty,
    goals: form.goals,
    equipment: form.equipment,
    duration: {
      weeks: Number(form.weeks),
      daysPerWeek: Number(form.daysPerWeek),
      minutesPerSession: Number(form.minutesPerSession),
    },
    isPublic: form.isPublic,
    isPremium: form.isPremium,
    tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
    workouts: workoutDays.map(d => ({
      week: d.week,
      day: d.day,
      name: d.name,
      description: d.description,
      exercises: d.exercises.map(ex => ({
        exerciseId: ex.exerciseId,
        sets: ex.sets,
        reps: ex.reps || undefined,
        duration: ex.duration || undefined,
        restTime: ex.restTime,
        notes: ex.notes || undefined,
      })),
    })),
  });

  const handleSave = async () => {
    if (!form.name || !form.category || !form.difficulty) {
      toast({ title: 'Validation', description: 'Name, category, and difficulty are required.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      if (editTarget) {
        await apiService.adminUpdateWorkoutPlan(editTarget._id, buildPayload());
        toast({ title: 'Workout plan updated' });
      } else {
        await apiService.adminCreateWorkoutPlan(buildPayload());
        toast({ title: 'Workout plan created' });
      }
      setDialogOpen(false);
      fetchPlans(page);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiService.adminDeleteWorkoutPlan(deleteTarget._id);
      toast({ title: 'Workout plan deleted' });
      setDeleteTarget(null);
      fetchPlans(page);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const activeDay = workoutDays[activeDayIdx];

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
          <Input placeholder="Search workout plans..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c.replace(/-/g, ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Difficulty" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            {DIFFICULTIES.map(d => <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => fetchPlans(1)}><RefreshCw className="w-4 h-4 mr-1" /> Refresh</Button>
        <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> New Plan</Button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">Loading...</div>
      ) : plans.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <ClipboardList className="w-12 h-12 mb-3 opacity-30" />
          <p>No workout plans found</p>
          <Button size="sm" className="mt-4" onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> Create First Plan</Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map(plan => (
              <Card key={plan._id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900 leading-tight">{plan.name}</h3>
                    <div className="flex gap-1 shrink-0">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(plan)}>
                        <Pencil className="w-3.5 h-3.5 text-indigo-600" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setDeleteTarget(plan)}>
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2 mb-3">{plan.description}</p>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <Badge className={`capitalize text-xs ${CAT_COLORS[plan.category] || 'bg-gray-100 text-gray-800'}`}>{plan.category?.replace(/-/g, ' ')}</Badge>
                    <Badge className={`capitalize text-xs ${DIFF_COLORS[plan.difficulty] || ''}`}>{plan.difficulty}</Badge>
                    {plan.isPremium && <Badge className="text-xs bg-yellow-100 text-yellow-800">Premium</Badge>}
                    {!plan.isPublic && <Badge className="text-xs bg-gray-100 text-gray-600">Private</Badge>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{plan.duration?.weeks}w · {plan.duration?.daysPerWeek}d/wk</span>
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{plan.totalEnrollments || 0} enrolled</span>
                  </div>
                  {plan.goals?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {plan.goals.slice(0, 2).map((g: string) => (
                        <Badge key={g} variant="outline" className="text-xs capitalize">{g.replace(/-/g, ' ')}</Badge>
                      ))}
                      {plan.goals.length > 2 && <Badge variant="outline" className="text-xs">+{plan.goals.length - 2}</Badge>}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {pages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-gray-500">Page {page} of {pages} — {total} plans</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => fetchPlans(page - 1)}><ChevronLeft className="w-4 h-4" /></Button>
                <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => fetchPlans(page + 1)}><ChevronRight className="w-4 h-4" /></Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={o => !saving && setDialogOpen(o)}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit Workout Plan' : 'New Workout Plan'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-1">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Plan Name *</Label>
                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. 4-Week Fat Burner" />
              </div>
              <div className="col-span-2">
                <Label>Description *</Label>
                <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} placeholder="Describe this workout plan..." />
              </div>
              <div>
                <Label>Category *</Label>
                <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c.replace(/-/g, ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Difficulty *</Label>
                <Select value={form.difficulty} onValueChange={v => setForm(p => ({ ...p, difficulty: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select difficulty" /></SelectTrigger>
                  <SelectContent>
                    {DIFFICULTIES.map(d => <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Duration */}
            <div>
              <Label className="mb-2 block">Duration</Label>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs text-gray-500">Weeks</Label>
                  <Input type="number" min="1" max="52" value={form.weeks}
                    onChange={e => handleWeeksDaysChange('weeks', e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Days / Week</Label>
                  <Input type="number" min="1" max="7" value={form.daysPerWeek}
                    onChange={e => handleWeeksDaysChange('daysPerWeek', e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Min / Session</Label>
                  <Input type="number" min="10" value={form.minutesPerSession}
                    onChange={e => setForm(p => ({ ...p, minutesPerSession: e.target.value }))} />
                </div>
              </div>
            </div>

            {/* Goals */}
            <div>
              <Label className="mb-2 block">Goals</Label>
              <div className="flex flex-wrap gap-2">
                {GOALS.map(g => (
                  <label key={g} className="flex items-center gap-1.5 cursor-pointer">
                    <Checkbox checked={form.goals.includes(g)} onCheckedChange={() => toggleMulti('goals', g)} />
                    <span className="text-sm capitalize">{g.replace(/-/g, ' ')}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Equipment */}
            <div>
              <Label className="mb-2 block">Equipment Required</Label>
              <div className="flex flex-wrap gap-2">
                {EQUIPMENT_LIST.map(eq => (
                  <label key={eq} className="flex items-center gap-1.5 cursor-pointer">
                    <Checkbox checked={form.equipment.includes(eq)} onCheckedChange={() => toggleMulti('equipment', eq)} />
                    <span className="text-sm capitalize">{eq.replace(/-/g, ' ')}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Visibility */}
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={form.isPublic} onCheckedChange={v => setForm(p => ({ ...p, isPublic: !!v }))} />
                <span className="text-sm">Public</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={form.isPremium} onCheckedChange={v => setForm(p => ({ ...p, isPremium: !!v }))} />
                <span className="text-sm">Premium</span>
              </label>
            </div>

            {/* Tags */}
            <div>
              <Label>Tags (comma-separated)</Label>
              <Input value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} placeholder="fat-loss, beginner-friendly, home-workout" />
            </div>

            {/* Workout Schedule */}
            {workoutDays.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-700">Workout Schedule ({workoutDays.length} sessions)</p>
                  <p className="text-xs text-gray-400">{form.weeks} weeks × {form.daysPerWeek} days/week</p>
                </div>
                <div className="flex">
                  {/* Day list */}
                  <div className="w-44 border-r bg-gray-50 overflow-y-auto max-h-80">
                    {workoutDays.map((d, i) => (
                      <button key={i} onClick={() => setActiveDayIdx(i)}
                        className={`w-full text-left px-3 py-2 text-xs border-b transition-colors ${activeDayIdx === i ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}>
                        <span className="block font-medium">W{d.week} D{d.day}</span>
                        <span className="block text-gray-400 truncate">{d.exercises.length} exercise{d.exercises.length !== 1 ? 's' : ''}</span>
                      </button>
                    ))}
                  </div>

                  {/* Day editor */}
                  {activeDay && (
                    <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-80">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Session Name</Label>
                          <Input value={activeDay.name} onChange={e => setWorkoutDays(prev => prev.map((d, i) => i !== activeDayIdx ? d : { ...d, name: e.target.value }))} className="h-8 text-sm" />
                        </div>
                        <div>
                          <Label className="text-xs">Notes</Label>
                          <Input value={activeDay.description} onChange={e => setWorkoutDays(prev => prev.map((d, i) => i !== activeDayIdx ? d : { ...d, description: e.target.value }))} className="h-8 text-sm" placeholder="optional" />
                        </div>
                      </div>

                      {/* Exercise search */}
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-400" />
                        <Input value={exSearch} onChange={e => setExSearch(e.target.value)} placeholder="Search and add exercises..." className="pl-8 h-8 text-sm" />
                        {exResults.length > 0 && (
                          <div className="absolute z-10 top-full left-0 right-0 bg-white border rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto">
                            {exLoading ? (
                              <p className="text-xs text-gray-400 p-2">Searching...</p>
                            ) : exResults.map(ex => (
                              <button key={ex._id} onClick={() => addExerciseToDay(ex)}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 border-b last:border-0 flex items-center justify-between">
                                <span className="font-medium">{ex.name}</span>
                                <span className="text-gray-400 capitalize">{ex.category} · {ex.difficulty}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Exercises list */}
                      {activeDay.exercises.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-4">No exercises added yet. Search above to add.</p>
                      ) : (
                        <div className="space-y-2">
                          {activeDay.exercises.map((ex, ei) => (
                            <div key={ei} className="border rounded-lg p-2 bg-white">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-gray-800">{ex.exerciseName}</span>
                                <button onClick={() => removeExerciseFromDay(activeDayIdx, ei)} className="text-red-400 hover:text-red-600">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <div className="grid grid-cols-4 gap-2">
                                {[
                                  { label: 'Sets', field: 'sets' as const },
                                  { label: 'Reps', field: 'reps' as const },
                                  { label: 'Dur(s)', field: 'duration' as const },
                                  { label: 'Rest(s)', field: 'restTime' as const },
                                ].map(({ label, field }) => (
                                  <div key={field}>
                                    <Label className="text-xs text-gray-400">{label}</Label>
                                    <Input type="number" min="0" value={ex[field]}
                                      onChange={e => updateExerciseField(activeDayIdx, ei, field, Number(e.target.value))}
                                      className="h-7 text-xs" />
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editTarget ? 'Update Plan' : 'Create Plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Workout Plan</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
