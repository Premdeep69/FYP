import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/contexts/NotificationContext";
import { useNotificationScheduler } from "@/services/notificationScheduler";
import { Bell, Flame, Target, CheckCircle, MessageSquare, Trophy, Award, UserCheck, Calendar, Clock } from "lucide-react";

const NotificationTest = () => {
  const { addNotification, notifications, unreadCount, markAllAsRead, clearAll } = useNotifications();
  const { sendTestReminder } = useNotificationScheduler();

  const testNotifications = [
    {
      type: 'workout_reminder' as const,
      title: '💪 Time to Workout!',
      message: 'Don\'t forget your Full Body Strength workout today!',
      actionUrl: '/my-workouts',
      icon: <Bell className="w-5 h-5" />
    },
    {
      type: 'streak_milestone' as const,
      title: '🔥 7-Day Streak!',
      message: 'Amazing! You\'ve maintained a 7-day workout streak! Keep it up!',
      actionUrl: '/user-dashboard',
      icon: <Flame className="w-5 h-5" />
    },
    {
      type: 'goal_achieved' as const,
      title: '🎯 Goal Achieved!',
      message: 'Congratulations! You\'ve achieved your goal: Lose 5kg',
      actionUrl: '/user-dashboard',
      icon: <Target className="w-5 h-5" />
    },
    {
      type: 'workout_completed' as const,
      title: '✅ Workout Completed!',
      message: 'Great job on completing Upper Body Blast! You burned 350 calories in 45 minutes.',
      actionUrl: '/user-dashboard',
      icon: <CheckCircle className="w-5 h-5" />
    },
    {
      type: 'new_message' as const,
      title: '💬 New message from John Trainer',
      message: 'Hey! Great progress this week. Let\'s schedule a session to discuss your next goals.',
      actionUrl: '/chat',
      icon: <MessageSquare className="w-5 h-5" />
    },
    {
      type: 'plan_completed' as const,
      title: '🏆 Workout Plan Completed!',
      message: 'Congratulations! You\'ve completed the 12-Week Transformation workout plan!',
      actionUrl: '/my-workouts',
      icon: <Trophy className="w-5 h-5" />
    },
    {
      type: 'achievement_unlocked' as const,
      title: '🏅 Achievement Unlocked!',
      message: 'Early Bird: Complete 10 morning workouts before 8 AM',
      actionUrl: '/user-dashboard',
      icon: <Award className="w-5 h-5" />
    },
    {
      type: 'trainer_response' as const,
      title: '👨‍🏫 Sarah Trainer responded',
      message: 'Your trainer has sent you a message. Check it out!',
      actionUrl: '/chat',
      icon: <UserCheck className="w-5 h-5" />
    },
    {
      type: 'session_reminder' as const,
      title: '📅 Upcoming Session',
      message: 'Your session with Mike Trainer is in 30 minutes',
      actionUrl: '/user-dashboard',
      icon: <Calendar className="w-5 h-5" />
    },
    {
      type: 'success' as const,
      title: '✅ Success',
      message: 'Your profile has been updated successfully!',
      actionUrl: '/user-dashboard',
      icon: <CheckCircle className="w-5 h-5" />
    },
    {
      type: 'warning' as const,
      title: '⚠️ Warning',
      message: 'Your subscription will expire in 3 days. Please renew to continue.',
      actionUrl: '/subscription',
      icon: <Bell className="w-5 h-5" />
    },
    {
      type: 'error' as const,
      title: '❌ Error',
      message: 'Failed to save workout. Please try again.',
      icon: <Bell className="w-5 h-5" />
    }
  ];

  const handleTestNotification = (notification: any) => {
    addNotification({
      type: notification.type,
      title: notification.title,
      message: notification.message,
      actionUrl: notification.actionUrl
    });
  };

  const handleTestAll = () => {
    testNotifications.forEach((notification, index) => {
      setTimeout(() => {
        handleTestNotification(notification);
      }, index * 500); // Stagger notifications by 500ms
    });
  };

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Notification System Test</h1>
          <p className="text-muted-foreground">
            Test different notification types and see how they appear in the notification center.
          </p>
        </div>

        <div className="grid gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Notification Stats</CardTitle>
              <CardDescription>Current notification state</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-3xl font-bold text-primary">{notifications.length}</div>
                  <div className="text-sm text-muted-foreground">Total</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-3xl font-bold text-destructive">{unreadCount}</div>
                  <div className="text-sm text-muted-foreground">Unread</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-3xl font-bold text-success">{notifications.length - unreadCount}</div>
                  <div className="text-sm text-muted-foreground">Read</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <Button onClick={markAllAsRead} variant="outline" className="w-full">
                    Mark All Read
                  </Button>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button onClick={handleTestAll} className="flex-1">
                  Test All Notifications
                </Button>
                <Button onClick={sendTestReminder} variant="secondary" className="flex-1">
                  <Clock className="w-4 h-4 mr-2" />
                  Test Daily Reminder
                </Button>
                <Button onClick={clearAll} variant="destructive" className="flex-1">
                  Clear All
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Test Individual Notifications</CardTitle>
              <CardDescription>Click any button to trigger that notification type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {testNotifications.map((notification, index) => (
                  <Button
                    key={index}
                    onClick={() => handleTestNotification(notification)}
                    variant="outline"
                    className="justify-start h-auto py-3"
                  >
                    <div className="flex items-start gap-3 text-left">
                      <div className="mt-0.5">{notification.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm">{notification.title}</div>
                        <div className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {notification.message}
                        </div>
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How to Use</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Testing Notifications:</h3>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Click any notification button above to trigger it</li>
                  <li>Check the bell icon in the navbar for the unread badge</li>
                  <li>Click the bell to open the notification center</li>
                  <li>Click on a notification to mark it as read and navigate</li>
                  <li>Use "Mark All Read" or "Clear All" to manage notifications</li>
                </ol>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Notification Features:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Toast notifications appear at bottom right</li>
                  <li>Notifications persist in localStorage</li>
                  <li>Unread count shows on bell icon</li>
                  <li>Click notification to navigate to relevant page</li>
                  <li>Relative time display (e.g., "5 minutes ago")</li>
                  <li>Maximum 50 notifications stored</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Real Triggers:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Logging a workout from User Dashboard</li>
                  <li>Completing a workout session</li>
                  <li>Backend FCM notifications (when integrated)</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default NotificationTest;
