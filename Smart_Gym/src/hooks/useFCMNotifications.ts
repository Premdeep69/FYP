import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiService } from '@/services/api';

// Registers the browser notification permission and FCM token with the backend.
// FCM push delivery requires a Firebase project with a VAPID key — until that is
// configured this hook simply requests browser permission so in-app toasts work.
export const useFCMNotifications = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const requestPermission = async () => {
      if (!('Notification' in window)) return;
      if (Notification.permission === 'granted') return;
      if (Notification.permission === 'denied') return;

      try {
        await Notification.requestPermission();
      } catch {
        // Browser may block the request — ignore silently
      }
    };

    requestPermission();
  }, [user]);
};
