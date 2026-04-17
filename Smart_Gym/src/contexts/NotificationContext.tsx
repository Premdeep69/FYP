import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './AuthContext';
import { NotificationScheduler } from '@/services/notificationScheduler';
import { socketService } from '@/services/socket';

interface Notification {
  id: string;
  type: 'workout_reminder' | 'streak_milestone' | 'goal_achieved' | 'workout_completed' | 
        'new_message' | 'plan_completed' | 'achievement_unlocked' | 'trainer_response' | 
        'session_reminder' | 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  data?: any;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();

  // ── Callbacks defined first so effects can safely reference them ──────────

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      read: false
    };

    setNotifications(prev => [newNotification, ...prev].slice(0, 50));

    const toastVariant = notification.type === 'error' ? 'destructive' : 'default';
    toast({
      title: notification.title,
      description: notification.message,
      variant: toastVariant,
      duration: 5000,
    });

    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Audio('/notification-sound.mp3').play().catch(() => {});
      } catch {
        // ignore audio errors
      }
    }
  }, [toast]);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // ── Effects ───────────────────────────────────────────────────────────────

  // Load notifications from localStorage on mount — prune entries older than 7 days
  useEffect(() => {
    const stored = localStorage.getItem('notifications');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const fresh = parsed
          .map((n: any) => ({ ...n, timestamp: new Date(n.timestamp) }))
          .filter((n: any) => new Date(n.timestamp).getTime() > cutoff)
          .slice(0, 50);
        setNotifications(fresh);
      } catch (error) {
        console.error('Error loading notifications:', error);
        localStorage.removeItem('notifications');
      }
    }

    if (user) {
      const scheduler = NotificationScheduler.getInstance();
      scheduler.initialize(addNotification);
    }
  }, [user, addNotification]);

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('notifications', JSON.stringify(notifications));
  }, [notifications]);

  // Listen for real-time booking/session socket events
  // Re-runs whenever the socket connects so listeners are always attached
  useEffect(() => {
    if (!user) return;

    // Helper that attaches all listeners — called immediately and on reconnect
    const attachListeners = () => {
      const socket = socketService.getSocket();
      if (!socket) return;

      const onBookingConfirmed = (data: any) => {
        addNotification({
          type: 'success',
          title: 'Session Confirmed',
          message: `Your session on ${data.sessionDate ? new Date(data.sessionDate).toLocaleDateString() : 'the scheduled date'} has been confirmed.`,
          actionUrl: '/my-bookings',
        });
      };
      const onBookingCancelled = (data: any) => {
        addNotification({
          type: 'warning',
          title: 'Session Cancelled',
          message: data.reason || 'A session has been cancelled.',
          actionUrl: '/my-bookings',
        });
      };
      const onNewBookingConfirmed = (data: any) => {
        addNotification({
          type: 'success',
          title: 'New Booking Confirmed',
          message: `${data.clientName || 'A client'} confirmed a ${data.sessionType || 'session'} booking.`,
          actionUrl: '/trainer-dashboard',
        });
      };
      const onSessionRequestNew = (data: any) => {
        addNotification({
          type: 'info',
          title: 'New Session Request',
          message: `You have a new session request from ${data.request?.userId?.name || 'a user'}.`,
          actionUrl: '/trainer-dashboard',
        });
      };
      const onSessionRequestAwaitingPayment = (data: any) => {
        addNotification({
          type: 'info',
          title: 'Trainer Accepted Your Request',
          message: `Your session request was accepted. Complete payment to confirm your session.`,
          actionUrl: '/my-requests',
        });
      };
      const onSessionRequestConfirmed = (data: any) => {
        addNotification({
          type: 'success',
          title: 'Session Confirmed',
          message: `Your session has been confirmed and booked successfully.`,
          actionUrl: '/my-bookings',
        });
      };
      const onSessionRequestRejected = (data: any) => {
        addNotification({
          type: 'warning',
          title: 'Session Request Declined',
          message: data.request?.trainerNote || 'Your session request was declined by the trainer.',
          actionUrl: '/my-requests',
        });
      };
      const onSessionRequestExpired = (data: any) => {
        addNotification({
          type: 'warning',
          title: 'Session Request Expired',
          message: 'A session request has expired due to payment deadline passing.',
          actionUrl: '/my-requests',
        });
      };
      const onCancelledByUser = (data: any) => {
        addNotification({
          type: 'warning',
          title: 'Booking Cancelled by Client',
          message: data.message || 'A client cancelled their booking.',
          actionUrl: '/trainer-dashboard',
        });
      };
      const onCancelledByTrainer = (data: any) => {
        addNotification({
          type: 'warning',
          title: 'Session Cancelled by Trainer',
          message: data.message || 'Your trainer cancelled the session.',
          actionUrl: '/my-bookings',
        });
      };

      socket.off('booking:confirmed');
      socket.off('booking:cancelled');
      socket.off('booking:new_confirmed');
      socket.off('sessionRequest:new');
      socket.off('sessionRequest:awaiting_payment');
      socket.off('sessionRequest:confirmed');
      socket.off('sessionRequest:rejected');
      socket.off('sessionRequest:expired');
      socket.off('booking:cancelled_by_user');
      socket.off('booking:cancelled_by_trainer');

      socket.on('booking:confirmed',                onBookingConfirmed);
      socket.on('booking:cancelled',                onBookingCancelled);
      socket.on('booking:new_confirmed',            onNewBookingConfirmed);
      socket.on('sessionRequest:new',               onSessionRequestNew);
      socket.on('sessionRequest:awaiting_payment',  onSessionRequestAwaitingPayment);
      socket.on('sessionRequest:confirmed',         onSessionRequestConfirmed);
      socket.on('sessionRequest:rejected',          onSessionRequestRejected);
      socket.on('sessionRequest:expired',           onSessionRequestExpired);
      socket.on('booking:cancelled_by_user',        onCancelledByUser);
      socket.on('booking:cancelled_by_trainer',     onCancelledByTrainer);
    };

    // Attach now (socket may already be connected)
    attachListeners();

    // Re-attach after every reconnect
    const socket = socketService.getSocket();
    socket?.on('connect', attachListeners);

    return () => {
      const s = socketService.getSocket();
      if (!s) return;
      s.off('connect', attachListeners);
      s.off('booking:confirmed');
      s.off('booking:cancelled');
      s.off('booking:new_confirmed');
      s.off('sessionRequest:new');
      s.off('sessionRequest:awaiting_payment');
      s.off('sessionRequest:confirmed');
      s.off('sessionRequest:rejected');
      s.off('sessionRequest:expired');
      s.off('booking:cancelled_by_user');
      s.off('booking:cancelled_by_trainer');
    };
  }, [user, addNotification]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotification,
        clearAll
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};
