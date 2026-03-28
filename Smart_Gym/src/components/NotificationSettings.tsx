import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Clock, TestTube } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNotificationScheduler } from "@/services/notificationScheduler";

const NotificationSettings = () => {
  const { toast } = useToast();
  const { setReminderTime, getReminderTime, sendTestReminder } = useNotificationScheduler();
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderHour, setReminderHour] = useState(9);
  const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState(false);

  useEffect(() => {
    // Load saved settings
    const savedHour = getReminderTime();
    setReminderHour(savedHour);

    const savedEnabled = localStorage.getItem('reminderEnabled') !== 'false';
    setReminderEnabled(savedEnabled);

    // Check browser notification permission
    if ('Notification' in window) {
      setBrowserNotificationsEnabled(Notification.permission === 'granted');
    }
  }, []);

  const handleReminderToggle = (enabled: boolean) => {
    setReminderEnabled(enabled);
    localStorage.setItem('reminderEnabled', enabled.toString());
    
    toast({
      title: enabled ? "Reminders Enabled" : "Reminders Disabled",
      description: enabled 
        ? "You'll receive daily workout reminders" 
        : "Daily reminders have been turned off",
    });
  };

  const handleTimeChange = (hour: string) => {
    const hourNum = parseInt(hour);
    setReminderHour(hourNum);
    setReminderTime(hourNum);
    
    toast({
      title: "Reminder Time Updated",
      description: `You'll receive reminders at ${formatHour(hourNum)}`,
    });
  };

  const formatHour = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:00 ${period}`;
  };

  const requestBrowserNotifications = async () => {
    if (!('Notification' in window)) {
      toast({
        title: "Not Supported",
        description: "Your browser doesn't support notifications",
        variant: "destructive",
      });
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setBrowserNotificationsEnabled(permission === 'granted');
      
      if (permission === 'granted') {
        toast({
          title: "Notifications Enabled",
          description: "You'll now receive browser notifications",
        });
        
        // Send test notification
        new Notification('🎉 Notifications Enabled!', {
          body: 'You\'ll now receive workout reminders',
          icon: '/gym_logo.jpg'
        });
      } else {
        toast({
          title: "Permission Denied",
          description: "Please enable notifications in your browser settings",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  };

  const handleTestReminder = () => {
    sendTestReminder();
    toast({
      title: "Test Reminder Sent",
      description: "Check your notifications!",
    });
  };

  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Notification Settings
        </CardTitle>
        <CardDescription>
          Configure your workout reminder preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Daily Reminders Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="daily-reminders" className="text-base">
              Daily Workout Reminders
            </Label>
            <p className="text-sm text-muted-foreground">
              Receive a daily reminder to complete your workout
            </p>
          </div>
          <Switch
            id="daily-reminders"
            checked={reminderEnabled}
            onCheckedChange={handleReminderToggle}
          />
        </div>

        {/* Reminder Time */}
        {reminderEnabled && (
          <div className="space-y-2">
            <Label htmlFor="reminder-time" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Reminder Time
            </Label>
            <Select value={reminderHour.toString()} onValueChange={handleTimeChange}>
              <SelectTrigger id="reminder-time">
                <SelectValue placeholder="Select time" />
              </SelectTrigger>
              <SelectContent>
                {hours.map((hour) => (
                  <SelectItem key={hour} value={hour.toString()}>
                    {formatHour(hour)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              You'll receive a reminder every day at {formatHour(reminderHour)}
            </p>
          </div>
        )}

        {/* Browser Notifications */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Browser Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive notifications even when the app is closed
              </p>
            </div>
            {browserNotificationsEnabled ? (
              <span className="text-sm text-green-600 font-medium">Enabled</span>
            ) : (
              <Button onClick={requestBrowserNotifications} size="sm">
                Enable
              </Button>
            )}
          </div>
        </div>

        {/* Test Reminder */}
        <div className="pt-4 border-t">
          <Button 
            onClick={handleTestReminder} 
            variant="outline" 
            className="w-full"
          >
            <TestTube className="w-4 h-4 mr-2" />
            Send Test Reminder
          </Button>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Test your notification settings
          </p>
        </div>

        {/* Info Box */}
        <div className="bg-muted p-4 rounded-lg space-y-2">
          <h4 className="font-semibold text-sm">How it works:</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• In-app notifications appear in the notification center</li>
            <li>• Browser notifications work even when the app is closed</li>
            <li>• Reminders are sent once per day at your chosen time</li>
            <li>• You can disable reminders anytime</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default NotificationSettings;
