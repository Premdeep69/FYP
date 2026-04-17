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
import { Search, Plus, Pencil, Trash2, RefreshCw, Dumbbell, ChevronLeft, ChevronRight } from 'lucide-react';

const CATEGORIES = ['strength', 'cardio', 'flexibility', 'balance', 'plyometric', 'core', 'functional', 'rehabilitation'];
const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];
const MUSCLE_GROUPS = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms', 'abs', 'obliques', 'quadriceps', 'hamstrings', 'glutes', 'calves', 'traps', 'lats', 'delts', 'core', 'full-body'];
const EQUIPMENT_LIST = ['none', 'dumbbells', 'barbell', 'kettlebell', 'resistance-bands', 'pull-up-bar', 'bench', 'cable-machine', 'treadmill', 'stationary-bike', 'rowing-machine', 'medicine-ball', 'stability-ball', 'foam-roller', 'yoga-mat'];

const DIFF_COLORS: Record<string, string> = {
  beginner: 'bg-green-100 text-green-800',
  intermediate: 'bg-yellow-100 text-yellow-800',
  advanced: 'bg-red-100 text-red-800',
};

const emptyForm = {
  name: '', description: '', category: '', difficulty: '',
  muscleGroups: [] as string[], equipment: [] as string[],
  videoUrl: '', imageUrl: '', imageCaption: '',
  defaultSets: '3', defaultReps: '10', defaultDuration: '', restTime: '60',
  tags: '', tips: '', warnings: '',
};

type FormState = typeof emptyForm;

export default function ExercisesTab() {
  const { toast } = useToast();
  const [exercises, setExercises] = useState<any[]>([]);
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
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const LIMIT = 12;

  const fetchExercises = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params: any = { page: p, limit: LIMIT };
      if (search) params.search = search;
      if (categoryFilter !== 'all') params.category = categoryFilter;
      if (difficultyFilter !== 'all') params.difficulty = difficultyFilter;
      const res: any = await apiService.adminGetExercises(params);
      setExercises(res.exercises || []);
      setTotal(res.pagination?.total || 0);
      setPages(res.pagination?.pages || 1);
      setPage(p);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, difficultyFilter]);

  useEffect(() => { fetchExercises(1); }, [fetchExercises]);

  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (ex: any) => {
    setEditTarget(ex);
    setForm({
      name: ex.name || '',
      description: ex.description || '',
      category: ex.category || '',
      difficulty: ex.difficulty || '',
      muscleGroups: ex.muscleGroups || [],
      equipment: ex.equipment || [],
      videoUrl: ex.videoUrl || '',
      imageUrl: ex.images?.[0]?.url || '',
      imageCaption: ex.images?.[0]?.caption || '',
      defaultSets: String(ex.metrics?.defaultSets ?? 3),
      defaultReps: String(ex.metrics?.defaultReps ?? 10),
      defaultDuration: String(ex.metrics?.defaultDuration ?? ''),
      restTime: String(ex.metrics?.restTime ?? 60),
      tags: (ex.tags || []).join(', '),
      tips: (ex.tips || []).join('\n'),
      warnings: (ex.warnings || []).join('\n'),
    });
    setDialogOpen(true);
  };

  const toggleMulti = (field: 'muscleGroups' | 'equipment', value: string) => {
    setForm(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(v => v !== value)
        : [...prev[field], value],
    }));
  };

  const buildPayload = () => ({
    name: form.name.trim(),
    description: form.description.trim(),
    category: form.category,
    difficulty: form.difficulty,
    muscleGroups: form.muscleGroups,
    equipment: form.equipment,
    videoUrl: form.videoUrl.trim() || undefined,
    images: form.imageUrl ? [{ url: form.imageUrl.trim(), caption: form.imageCaption.trim(), isMain: true }] : [],
    metrics: {
      defaultSets: Number(form.defaultSets) || 3,
      defaultReps: Number(form.defaultReps) || 10,
      defaultDuration: form.defaultDuration ? Number(form.defaultDuration) : undefined,
      restTime: Number(form.restTime) || 60,
    },
    tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
    tips: form.tips.split('\n').map(t => t.trim()).filter(Boolean),
    warnings: form.warnings.split('\n').map(t => t.trim()).filter(Boolean),
  });

  const handleSave = async () => {
    if (!form.name || !form.category || !form.difficulty) {
      toast({ title: 'Validation', description: 'Name, category, and difficulty are required.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      if (editTarget) {
        await apiService.adminUpdateExercise(editTarget._id, buildPayload());
        toast({ title: 'Exercise updated' });
      } else {
        await apiService.adminCreateExercise(buildPayload());
        toast({ title: 'Exercise created' });
      }
      setDialogOpen(false);
      fetchExercises(page);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiService.adminDeleteExercise(deleteTarget._id);
      toast({ title: 'Exercise deleted' });
      setDeleteTarget(null);
      fetchExercises(page);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
          <Input placeholder="Search exercises..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Difficulty" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            {DIFFICULTIES.map(d => <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => fetchExercises(1)}><RefreshCw className="w-4 h-4 mr-1" /> Refresh</Button>
        <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> New Exercise</Button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">Loading...</div>
      ) : exercises.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Dumbbell className="w-12 h-12 mb-3 opacity-30" />
          <p>No exercises found</p>
          <Button size="sm" className="mt-4" onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> Create First Exercise</Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {exercises.map(ex => (
              <Card key={ex._id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-4 pb-4">
                  {ex.images?.[0]?.url && (
                    <img src={ex.images[0].url} alt={ex.name} className="w-full h-36 object-cover rounded-lg mb-3" />
                  )}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900 leading-tight">{ex.name}</h3>
                    <div className="flex gap-1 shrink-0">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(ex)}>
                        <Pencil className="w-3.5 h-3.5 text-indigo-600" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setDeleteTarget(ex)}>
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2 mb-3">{ex.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge className="capitalize text-xs bg-indigo-100 text-indigo-800">{ex.category}</Badge>
                    <Badge className={`capitalize text-xs ${DIFF_COLORS[ex.difficulty] || ''}`}>{ex.difficulty}</Badge>
                    {ex.muscleGroups?.slice(0, 2).map((m: string) => (
                      <Badge key={m} variant="outline" className="text-xs capitalize">{m}</Badge>
                    ))}
                    {ex.muscleGroups?.length > 2 && (
                      <Badge variant="outline" className="text-xs">+{ex.muscleGroups.length - 2}</Badge>
                    )}
                  </div>
                  {ex.videoUrl && (
                    <p className="text-xs text-indigo-500 mt-2 truncate">🎬 Video attached</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-gray-500">Page {page} of {pages} — {total} exercises</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => fetchExercises(page - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => fetchExercises(page + 1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={o => !saving && setDialogOpen(o)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit Exercise' : 'New Exercise'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            {/* Basic info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Exercise Name *</Label>
                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Barbell Squat" />
              </div>
              <div className="col-span-2">
                <Label>Description *</Label>
                <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} placeholder="Describe the exercise..." />
              </div>
              <div>
                <Label>Category *</Label>
                <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
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

            {/* Muscle Groups */}
            <div>
              <Label className="mb-2 block">Targeted Muscle Groups</Label>
              <div className="flex flex-wrap gap-2">
                {MUSCLE_GROUPS.map(m => (
                  <label key={m} className="flex items-center gap-1.5 cursor-pointer">
                    <Checkbox
                      checked={form.muscleGroups.includes(m)}
                      onCheckedChange={() => toggleMulti('muscleGroups', m)}
                    />
                    <span className="text-sm capitalize">{m}</span>
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
                    <Checkbox
                      checked={form.equipment.includes(eq)}
                      onCheckedChange={() => toggleMulti('equipment', eq)}
                    />
                    <span className="text-sm capitalize">{eq.replace(/-/g, ' ')}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Metrics */}
            <div>
              <Label className="mb-2 block">Default Metrics</Label>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs text-gray-500">Sets</Label>
                  <Input type="number" min="1" value={form.defaultSets} onChange={e => setForm(p => ({ ...p, defaultSets: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Reps</Label>
                  <Input type="number" min="1" value={form.defaultReps} onChange={e => setForm(p => ({ ...p, defaultReps: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Duration (sec)</Label>
                  <Input type="number" min="0" value={form.defaultDuration} onChange={e => setForm(p => ({ ...p, defaultDuration: e.target.value }))} placeholder="optional" />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Rest Time (sec)</Label>
                  <Input type="number" min="0" value={form.restTime} onChange={e => setForm(p => ({ ...p, restTime: e.target.value }))} />
                </div>
              </div>
            </div>

            {/* Media */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Demo Video URL</Label>
                <Input value={form.videoUrl} onChange={e => setForm(p => ({ ...p, videoUrl: e.target.value }))} placeholder="https://youtube.com/..." />
              </div>
              <div>
                <Label>Image URL</Label>
                <Input value={form.imageUrl} onChange={e => setForm(p => ({ ...p, imageUrl: e.target.value }))} placeholder="https://..." />
              </div>
              <div>
                <Label>Image Caption</Label>
                <Input value={form.imageCaption} onChange={e => setForm(p => ({ ...p, imageCaption: e.target.value }))} placeholder="optional" />
              </div>
            </div>

            {/* Tips / Warnings / Tags */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tips (one per line)</Label>
                <Textarea value={form.tips} onChange={e => setForm(p => ({ ...p, tips: e.target.value }))} rows={3} placeholder="Keep your back straight&#10;Breathe out on exertion" />
              </div>
              <div>
                <Label>Warnings (one per line)</Label>
                <Textarea value={form.warnings} onChange={e => setForm(p => ({ ...p, warnings: e.target.value }))} rows={3} placeholder="Avoid if you have knee pain" />
              </div>
              <div className="col-span-2">
                <Label>Tags (comma-separated)</Label>
                <Input value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} placeholder="compound, lower-body, beginner-friendly" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editTarget ? 'Update Exercise' : 'Create Exercise'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Exercise</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
