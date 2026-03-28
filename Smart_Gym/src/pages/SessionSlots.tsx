import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Calendar as CalendarIcon,
  Clock,
  DollarSign,
  Users,
  Plus,
  Edit,
  Trash2,
  Copy,
  Video,
  MapPin,
  X,
} from 'lucide-react';
import { apiService } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const SESSION_TYPES = [
  { value: 'personal-training', label: 'Personal Training' },
  { value: 'group-class', label: 'Group Class' },
  { value: 'consultation', label: 'Consultation' },
  { value: 'follow-up', label: 'Follow-up' },
];

const MODES = [
  { value: 'online', label: 'Online' },
  { value: 'offline', label: 'Offline' },
  { value: 'hybrid', label: 'Hybrid' },
];

const MEETING_TYPES = [
  { value: 'none', label: 'No Meeting Link' },
  { value: 'external', label: 'External Link (Zoom, Google Meet, etc.)' },
  { value: 'builtin', label: 'Built-in Video Call' },
];

interface SessionSlot {
  _id: string;
  title: string;
  description?: string;
  sessionType: string;
  mode: string;
  location?: string;
  meetingType?: string;
  meetingLink?: string;
  videoCallRoom?: {
    roomId: string;
    roomToken: string;
  };
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  price: number;
  maxParticipants: number;
  currentParticipants: number;
  status: string;
  bookedBy: any[];
}

const SessionSlots: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [slots, setSlots] = useState<SessionSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<SessionSlot | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    sessionType: 'personal-training',
    mode: 'offline',
    location: '',
    meetingType: 'none',
    meetingLink: '',
    date: new Date(),
    startTime: '09:00',
    endTime: '10:00',
    duration: 60,
    price: 50,
    maxParticipants: 1,
    requirements: [] as string[],
    equipment: [] as string[],
    tags: [] as string[],
    cancellationPolicy: '24 hours notice required',
    meetingAccessControl: {
      requiresPassword: false,
      password: '',
      allowEarlyJoin: true,
      earlyJoinMinutes: 10,
      recordSession: false,
    },
  });

  useEffect(() => {
    if (user && user.userType === 'trainer') {
      fetchSlots();
    }
  }, [user]);

  const fetchSlots = async () => {
    try {
      const data = await apiService.getTrainerSessionSlots();
      setSlots(data.slots);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load session slots',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper function to format date without timezone conversion
  const formatDateForAPI = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleCreateSlot = async () => {
    try {
      setSaving(true);
      const slotData = {
        ...formData,
        date: formatDateForAPI(formData.date), // Use helper function instead of toISOString
      };
      
      await apiService.createSessionSlot(slotData);
      
      toast({
        title: 'Success',
        description: 'Session slot created successfully',
      });
      
      setShowCreateDialog(false);
      resetForm();
      fetchSlots();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create session slot',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateSlot = async () => {
    if (!selectedSlot) return;

    try {
      setSaving(true);
      const updateData = {
        ...formData,
        date: formData.date instanceof Date ? formatDateForAPI(formData.date) : formData.date,
      };
      await apiService.updateSessionSlot(selectedSlot._id, updateData);
      
      toast({
        title: 'Success',
        description: 'Session slot updated successfully',
      });
      
      setShowEditDialog(false);
      setSelectedSlot(null);
      fetchSlots();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update session slot',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelSlot = async (slotId: string) => {
    if (!confirm('Are you sure you want to cancel this slot? All bookings will be cancelled.')) {
      return;
    }

    try {
      await apiService.cancelSessionSlot(slotId, 'Trainer cancelled the session');
      
      toast({
        title: 'Success',
        description: 'Session slot cancelled successfully',
      });
      
      fetchSlots();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to cancel session slot',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm('Are you sure you want to delete this slot?')) {
      return;
    }

    try {
      await apiService.deleteSessionSlot(slotId);
      
      toast({
        title: 'Success',
        description: 'Session slot deleted successfully',
      });
      
      fetchSlots();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete session slot',
        variant: 'destructive',
      });
    }
  };

  const handleDuplicateSlot = async (slot: SessionSlot) => {
    setFormData({
      title: slot.title,
      description: slot.description || '',
      sessionType: slot.sessionType,
      mode: slot.mode,
      location: slot.location || '',
      meetingType: slot.meetingType || 'none',
      meetingLink: slot.meetingLink || '',
      date: new Date(),
      startTime: slot.startTime,
      endTime: slot.endTime,
      duration: slot.duration,
      price: slot.price,
      maxParticipants: slot.maxParticipants,
      requirements: [],
      equipment: [],
      tags: [],
      cancellationPolicy: '24 hours notice required',
      meetingAccessControl: {
        requiresPassword: false,
        password: '',
        allowEarlyJoin: true,
        earlyJoinMinutes: 10,
        recordSession: false,
      },
    });
    setShowCreateDialog(true);
  };

  const handleEditSlot = (slot: SessionSlot) => {
    setSelectedSlot(slot);
    setFormData({
      title: slot.title,
      description: slot.description || '',
      sessionType: slot.sessionType,
      mode: slot.mode,
      location: slot.location || '',
      meetingType: slot.meetingType || 'none',
      meetingLink: slot.meetingLink || '',
      date: new Date(slot.date),
      startTime: slot.startTime,
      endTime: slot.endTime,
      duration: slot.duration,
      price: slot.price,
      maxParticipants: slot.maxParticipants,
      requirements: [],
      equipment: [],
      tags: [],
      cancellationPolicy: '24 hours notice required',
      meetingAccessControl: {
        requiresPassword: false,
        password: '',
        allowEarlyJoin: true,
        earlyJoinMinutes: 10,
        recordSession: false,
      },
    });
    setShowEditDialog(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      sessionType: 'personal-training',
      mode: 'offline',
      location: '',
      meetingType: 'none',
      meetingLink: '',
      date: new Date(),
      startTime: '09:00',
      endTime: '10:00',
      duration: 60,
      price: 50,
      maxParticipants: 1,
      requirements: [],
      equipment: [],
      tags: [],
      cancellationPolicy: '24 hours notice required',
      meetingAccessControl: {
        requiresPassword: false,
        password: '',
        allowEarlyJoin: true,
        earlyJoinMinutes: 10,
        recordSession: false,
      },
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'full':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'online':
        return <Video className="w-4 h-4" />;
      case 'offline':
        return <MapPin className="w-4 h-4" />;
      case 'hybrid':
        return (
          <>
            <Video className="w-4 h-4" />
            <MapPin className="w-4 h-4" />
          </>
        );
      default:
        return null;
    }
  };

  const filterSlots = (status: string[]) => {
    return slots.filter((slot) => status.includes(slot.status));
  };

  if (loading) {
    return (
      <div className="min-h-screen py-12 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading session slots...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-heading font-bold mb-4">
              Session Slots
            </h1>
            <p className="text-lg text-muted-foreground">
              Create and manage your training session slots
            </p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Slot
          </Button>
        </div>

        <Tabs defaultValue="available" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="available">
              Available ({filterSlots(['available']).length})
            </TabsTrigger>
            <TabsTrigger value="full">
              Full ({filterSlots(['full']).length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({filterSlots(['completed']).length})
            </TabsTrigger>
            <TabsTrigger value="all">All ({slots.length})</TabsTrigger>
          </TabsList>

          {['available', 'full', 'completed', 'all'].map((tab) => (
            <TabsContent key={tab} value={tab} className="space-y-4">
              {(tab === 'all' ? slots : filterSlots([tab])).length === 0 ? (
                <Card className="p-8 text-center">
                  <CalendarIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Slots Found</h3>
                  <p className="text-muted-foreground mb-4">
                    {tab === 'available' && 'Create your first session slot to get started'}
                    {tab === 'full' && 'No fully booked slots'}
                    {tab === 'completed' && 'No completed slots yet'}
                    {tab === 'all' && 'Create your first session slot'}
                  </p>
                  {tab === 'available' && (
                    <Button onClick={() => setShowCreateDialog(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Slot
                    </Button>
                  )}
                </Card>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(tab === 'all' ? slots : filterSlots([tab])).map((slot) => (
                    <Card key={slot._id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg mb-2">{slot.title}</CardTitle>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className={getStatusColor(slot.status)}>
                                {slot.status}
                              </Badge>
                              <Badge variant="outline" className="flex items-center gap-1">
                                {getModeIcon(slot.mode)}
                                {slot.mode}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-2 text-sm">
                          <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                          <span>
                            {new Date(slot.date).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span>
                            {slot.startTime} - {slot.endTime} ({slot.duration} min)
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span>
                            {slot.currentParticipants}/{slot.maxParticipants} participants
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign className="w-4 h-4 text-muted-foreground" />
                          <span className="font-semibold">${slot.price}</span>
                        </div>

                        {slot.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {slot.description}
                          </p>
                        )}

                        <div className="flex gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditSlot(slot)}
                            disabled={slot.status === 'completed' || slot.status === 'cancelled'}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDuplicateSlot(slot)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          {slot.status === 'available' && slot.currentParticipants === 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteSlot(slot._id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                          {(slot.status === 'available' || slot.status === 'full') && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleCancelSlot(slot._id)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>

        {/* Create/Edit Dialog */}
        <Dialog open={showCreateDialog || showEditDialog} onOpenChange={(open) => {
          if (!open) {
            setShowCreateDialog(false);
            setShowEditDialog(false);
            setSelectedSlot(null);
            resetForm();
          }
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {showEditDialog ? 'Edit Session Slot' : 'Create Session Slot'}
              </DialogTitle>
              <DialogDescription>
                {showEditDialog 
                  ? 'Update the details of your session slot'
                  : 'Create a new training session slot for clients to book'
                }
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Morning HIIT Class"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what this session includes..."
                  rows={3}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Session Type *</Label>
                  <Select
                    value={formData.sessionType}
                    onValueChange={(value) => setFormData({ ...formData, sessionType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SESSION_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Mode *</Label>
                  <Select
                    value={formData.mode}
                    onValueChange={(value) => setFormData({ ...formData, mode: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MODES.map((mode) => (
                        <SelectItem key={mode.value} value={mode.value}>
                          {mode.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {(formData.mode === 'offline' || formData.mode === 'hybrid') && (
                <div>
                  <Label htmlFor="location">Location *</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g., Main Gym, Studio A"
                  />
                </div>
              )}

              {(formData.mode === 'online' || formData.mode === 'hybrid') && (
                <>
                  <div>
                    <Label>Meeting Type *</Label>
                    <Select
                      value={formData.meetingType}
                      onValueChange={(value) => setFormData({ ...formData, meetingType: value, meetingLink: '' })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MEETING_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formData.meetingType === 'external' && 'Provide your own Zoom, Google Meet, or other meeting link'}
                      {formData.meetingType === 'builtin' && 'System will automatically generate a secure video call room'}
                      {formData.meetingType === 'none' && 'No online meeting link will be provided'}
                    </p>
                  </div>

                  {formData.meetingType === 'external' && (
                    <div>
                      <Label htmlFor="meetingLink">Meeting Link *</Label>
                      <Input
                        id="meetingLink"
                        value={formData.meetingLink}
                        onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
                        placeholder="https://zoom.us/j/... or https://meet.google.com/..."
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        This link will only be shared with booked participants
                      </p>
                    </div>
                  )}

                  {formData.meetingType === 'builtin' && (
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="flex items-start gap-2">
                        <Video className="w-5 h-5 text-primary mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Built-in Video Call</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            A secure video call room will be automatically generated for this session.
                            Participants will get access to the room link after booking.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {formData.meetingType === 'builtin' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="allowEarlyJoin">Allow Early Join</Label>
                        <input
                          type="checkbox"
                          id="allowEarlyJoin"
                          checked={formData.meetingAccessControl.allowEarlyJoin}
                          onChange={(e) => setFormData({
                            ...formData,
                            meetingAccessControl: {
                              ...formData.meetingAccessControl,
                              allowEarlyJoin: e.target.checked,
                            },
                          })}
                          className="rounded"
                        />
                      </div>
                      {formData.meetingAccessControl.allowEarlyJoin && (
                        <div>
                          <Label htmlFor="earlyJoinMinutes">Early Join Time (minutes)</Label>
                          <Input
                            id="earlyJoinMinutes"
                            type="number"
                            min="5"
                            max="30"
                            value={formData.meetingAccessControl.earlyJoinMinutes}
                            onChange={(e) => setFormData({
                              ...formData,
                              meetingAccessControl: {
                                ...formData.meetingAccessControl,
                                earlyJoinMinutes: parseInt(e.target.value),
                              },
                            })}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              <div>
                <Label className="mb-2 block">Date *</Label>
                <Calendar
                  mode="single"
                  selected={formData.date}
                  onSelect={(date) => date && setFormData({ ...formData, date })}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  className="rounded-md border"
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="startTime">Start Time *</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="endTime">End Time *</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="duration">Duration (min) *</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">Price ($) *</Label>
                  <Input
                    id="price"
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                  />
                </div>

                <div>
                  <Label htmlFor="maxParticipants">Max Participants *</Label>
                  <Input
                    id="maxParticipants"
                    type="number"
                    min="1"
                    value={formData.maxParticipants}
                    onChange={(e) => setFormData({ ...formData, maxParticipants: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="cancellationPolicy">Cancellation Policy</Label>
                <Input
                  id="cancellationPolicy"
                  value={formData.cancellationPolicy}
                  onChange={(e) => setFormData({ ...formData, cancellationPolicy: e.target.value })}
                  placeholder="e.g., 24 hours notice required"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateDialog(false);
                  setShowEditDialog(false);
                  setSelectedSlot(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={showEditDialog ? handleUpdateSlot : handleCreateSlot}
                disabled={saving || !formData.title}
              >
                {saving ? 'Saving...' : showEditDialog ? 'Update Slot' : 'Create Slot'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default SessionSlots;
