import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Video, ExternalLink, Copy, Check, Clock, AlertCircle } from 'lucide-react';
import { apiService } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface MeetingInfoProps {
  slotId: string;
  slotTitle: string;
  slotDate: string;
  slotStartTime: string;
  slotEndTime: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MeetingInfo: React.FC<MeetingInfoProps> = ({
  slotId,
  slotTitle,
  slotDate,
  slotStartTime,
  slotEndTime,
  open,
  onOpenChange,
}) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [meetingInfo, setMeetingInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchMeetingInfo();
    }
  }, [open, slotId]);

  const fetchMeetingInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getMeetingInfo(slotId);
      setMeetingInfo(data);
    } catch (error: any) {
      setError(error.message || 'Failed to load meeting info');
      toast({
        title: 'Error',
        description: error.message || 'Failed to load meeting info',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast({
      title: 'Copied',
      description: 'Meeting link copied to clipboard',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoinBuiltinCall = () => {
    if (meetingInfo?.meetingInfo?.roomId) {
      navigate(`/video-call?room=${meetingInfo.meetingInfo.roomId}&token=${meetingInfo.meetingInfo.roomToken}`);
    }
  };

  const handleOpenExternalLink = () => {
    if (meetingInfo?.meetingInfo?.link) {
      window.open(meetingInfo.meetingInfo.link, '_blank');
    }
  };

  const formatDateTime = () => {
    const date = new Date(slotDate);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Meeting Information</DialogTitle>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Meeting Information</DialogTitle>
          <DialogDescription>
            {slotTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Session Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Session Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>{formatDateTime()}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>
                  {slotStartTime} - {slotEndTime}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Meeting Info */}
          {meetingInfo?.meetingInfo && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Meeting Access</CardTitle>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Video className="w-3 h-3" />
                    {meetingInfo.meetingInfo.type === 'builtin' ? 'Built-in Call' : 'External Link'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {meetingInfo.meetingInfo.type === 'external' && (
                  <>
                    <div>
                      <label className="text-sm font-medium">Meeting Link</label>
                      <div className="flex gap-2 mt-1">
                        <input
                          type="text"
                          value={meetingInfo.meetingInfo.link}
                          readOnly
                          className="flex-1 px-3 py-2 text-sm border rounded-md bg-muted"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyLink(meetingInfo.meetingInfo.link)}
                        >
                          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>

                    {meetingInfo.meetingInfo.password && (
                      <div>
                        <label className="text-sm font-medium">Meeting Password</label>
                        <div className="flex gap-2 mt-1">
                          <input
                            type="text"
                            value={meetingInfo.meetingInfo.password}
                            readOnly
                            className="flex-1 px-3 py-2 text-sm border rounded-md bg-muted"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopyLink(meetingInfo.meetingInfo.password)}
                          >
                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                    )}

                    <Button onClick={handleOpenExternalLink} className="w-full">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open Meeting Link
                    </Button>
                  </>
                )}

                {meetingInfo.meetingInfo.type === 'builtin' && (
                  <>
                    <Alert>
                      <Video className="h-4 w-4" />
                      <AlertDescription>
                        This session uses the built-in video call system. Click the button below to join the meeting room.
                      </AlertDescription>
                    </Alert>

                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm font-medium mb-1">Room ID</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {meetingInfo.meetingInfo.roomId}
                      </p>
                    </div>

                    <Button onClick={handleJoinBuiltinCall} className="w-full">
                      <Video className="w-4 h-4 mr-2" />
                      Join Video Call
                    </Button>

                    {meetingInfo.meetingInfo.expiresAt && (
                      <p className="text-xs text-muted-foreground text-center">
                        Room expires: {new Date(meetingInfo.meetingInfo.expiresAt).toLocaleString()}
                      </p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {!meetingInfo?.meetingInfo && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No meeting link has been configured for this session. Please contact the trainer for more information.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MeetingInfo;
