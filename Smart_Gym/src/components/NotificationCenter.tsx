import { Bell, X, Check, CheckCheck, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNotifications } from "@/contexts/NotificationContext";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import NotificationCategories from "./NotificationCategories";

const NotificationCenter = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotification, clearAll } = useNotifications();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Categorize notifications
  const getNotificationCategory = (type: string) => {
    const categoryMap: { [key: string]: string } = {
      'new_message': 'chat',
      'trainer_response': 'chat',
      'workout_completed': 'workout',
      'workout_reminder': 'reminder',
      'plan_completed': 'achievement',
      'streak_milestone': 'achievement',
      'goal_achieved': 'achievement',
      'achievement_unlocked': 'achievement',
      'session_reminder': 'reminder',
      'session_booked': 'system',
      'session_cancelled': 'system',
      'payment_success': 'payment',
      'payment_failed': 'payment',
      'subscription_expiring': 'payment',
      'subscription_renewed': 'payment',
      'system_update': 'system',
      'maintenance': 'system',
      'account_update': 'system',
    };
    return categoryMap[type] || 'system';
  };

  // Filter notifications by category
  const filteredNotifications = selectedCategory === 'all' 
    ? notifications 
    : notifications.filter(n => getNotificationCategory(n.type) === selectedCategory);

  // Count notifications by category
  const categoryCounts = {
    all: notifications.length,
    chat: notifications.filter(n => getNotificationCategory(n.type) === 'chat').length,
    workout: notifications.filter(n => getNotificationCategory(n.type) === 'workout').length,
    achievement: notifications.filter(n => getNotificationCategory(n.type) === 'achievement').length,
    reminder: notifications.filter(n => getNotificationCategory(n.type) === 'reminder').length,
    payment: notifications.filter(n => getNotificationCategory(n.type) === 'payment').length,
    system: notifications.filter(n => getNotificationCategory(n.type) === 'system').length,
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'workout_reminder':
        return '💪';
      case 'streak_milestone':
        return '🔥';
      case 'goal_achieved':
        return '🎯';
      case 'workout_completed':
        return '✅';
      case 'new_message':
        return '💬';
      case 'plan_completed':
        return '🏆';
      case 'achievement_unlocked':
        return '🏅';
      case 'trainer_response':
        return '👨‍🏫';
      case 'session_reminder':
        return '📅';
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return 'ℹ️';
    }
  };

  const handleNotificationClick = (notification: any) => {
    markAsRead(notification.id);
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="h-8 text-xs"
              >
                <CheckCheck className="w-4 h-4 mr-1" />
                Mark all read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="h-8 text-xs"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Clear all
              </Button>
            )}
          </div>
        </div>

        <NotificationCategories
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          categoryCounts={categoryCounts}
        />

        <ScrollArea className="h-[450px]">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bell className="w-12 h-12 mb-2 opacity-20" />
              <p className="text-sm">
                {selectedCategory === 'all' 
                  ? 'No notifications yet' 
                  : `No ${selectedCategory} notifications`}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-accent cursor-pointer transition-colors ${
                    !notification.read ? 'bg-accent/50' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-medium text-sm leading-tight">
                          {notification.title}
                        </h4>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification.id);
                              }}
                            >
                              <Check className="w-3 h-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              clearNotification(notification.id);
                            }}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationCenter;
