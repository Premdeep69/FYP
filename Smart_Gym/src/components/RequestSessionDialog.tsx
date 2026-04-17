import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar, Clock, Send } from 'lucide-react';
import { apiService } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

const SESSION_TYPES = [
  { value: 'personal-training', label: 'Personal Training' },
  { value: 'group-class', label: 'Group Class' },
  { value: 'consultation', label: 'Consultation' },
  { value: 'follow-up', label: 'Follow-up' },
];
const MODES = [
  { value: 'offline', label: 'In-Person' },
  { value: 'online', label: 'Online' },
  { value: 'hybrid', label: 'Hybrid' },
];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  trainer: { _id: string; name: string; trainerProfile?: any } | null;
}

export default function RequestSessionDialog({ open, onOpenChange, trainer }: Props) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    sessionType: 'personal-training',
    preferredDate: '',
    preferredTime: '09:00',
    duration: '60',
    mode: 'offline',
    location: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const initials = trainer?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  const minDate = new Date().toISOString().split('T')[0];

  const handleSubmit = async () => {
    if (!trainer) {
      // No trainer selected — shouldn't happen from Trainers page, but guard anyway
      return;
    }
    if (!form.preferredDate) {
      toast({ title: 'Please select a preferred date', variant: 'destructive' });
      return;
    }
    if (!trainer) return;
    setSubmitting(true);
    try {
      await apiService.createSessionRequest({
        trainerId: trainer._id,
        sessionType: form.sessionType,
        preferredDate: form.preferredDate,
        preferredTime: form.preferredTime,
        duration: Number(form.duration),
        mode: form.mode,
        location: form.location.trim() || undefined,
        message: form.message.trim() || undefined,
      });
      toast({ title: 'Request sent!', description: `${trainer.name} will review your request shortly.` });
      onOpenChange(false);
      setForm({ sessionType: 'personal-training', preferredDate: '', preferredTime: '09:00', duration: '60', mode: 'offline', location: '', message: '' });
    } catch (e: any) {
      toast({ title: 'Failed to send request', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={o => !submitting && onOpenChange(o)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="w-9 h-9">
              <AvatarImage src={trainer?.trainerProfile?.profileImage} />
              <AvatarFallback className="bg-indigo-100 text-indigo-700 text-sm font-semibold">{initials}</AvatarFallback>
            </Avatar>
            Request a Session
          </DialogTitle>
          <DialogDescription>
            Send a booking request to <span className="font-medium text-foreground">{trainer?.name}</span>. They'll confirm or suggest an alternative.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium mb-1.5 block">Session Type</Label>
              <Select value={form.sessionType} onValueChange={v => setForm(p => ({ ...p, sessionType: v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SESSION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium mb-1.5 block">Mode</Label>
              <Select value={form.mode} onValueChange={v => setForm(p => ({ ...p, mode: v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MODES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Location — only for offline/hybrid */}
          {(form.mode === 'offline' || form.mode === 'hybrid') && (
            <div>
              <Label className="text-xs font-medium mb-1.5 block">Preferred Location <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                value={form.location}
                onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                placeholder="e.g. Main Gym, Studio A, or leave blank"
                className="h-9 text-sm"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium mb-1.5 block flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Preferred Date
              </Label>
              <Input type="date" min={minDate} value={form.preferredDate}
                onChange={e => setForm(p => ({ ...p, preferredDate: e.target.value }))} className="h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs font-medium mb-1.5 block flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Preferred Time
              </Label>
              <Input type="time" value={form.preferredTime}
                onChange={e => setForm(p => ({ ...p, preferredTime: e.target.value }))} className="h-9 text-sm" />
            </div>
          </div>

          <div>
            <Label className="text-xs font-medium mb-1.5 block">Duration (minutes)</Label>
            <Select value={form.duration} onValueChange={v => setForm(p => ({ ...p, duration: v }))}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['30','45','60','90','120'].map(d => <SelectItem key={d} value={d}>{d} min</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-medium mb-1.5 block">Message <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Textarea value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
              placeholder="Share your goals, any injuries, or specific requirements…"
              rows={3} className="text-sm resize-none" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting || !form.preferredDate} className="gap-2">
            {submitting
              ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Sending…</>
              : <><Send className="w-4 h-4" />Send Request</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
