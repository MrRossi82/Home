// Browser Notification Manager for Smart Building App
// Handles permission requests and sending standard/ServiceWorker-based browser notifications

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.warn('This browser does not support desktop notifications');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    localStorage.setItem('browser_notifications_enabled', permission === 'granted' ? 'true' : 'false');
    return permission === 'granted';
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
};

export const isNotificationPermissionGranted = (): boolean => {
  return 'Notification' in window && Notification.permission === 'granted';
};

export const sendBrowserNotification = async (title: string, body: string, type: 'issue' | 'meeting' | 'announcement' | 'payment') => {
  if (!isNotificationPermissionGranted()) {
    console.log('Notification permission not granted, skipping:', title);
    return;
  }

  // Get localized icon/badge color or standard icons
  const icon = '/icon.svg';

  // Try to use Service Worker registration for better background/PWA support
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      if (registration) {
        registration.showNotification(title, {
          body,
          icon,
          badge: icon,
          dir: 'rtl',
          lang: 'ar-JO',
          tag: `smart-bldg-${type}-${Date.now()}`,
          vibrate: [100, 50, 100],
          data: {
            url: window.location.origin
          }
        } as any);
        return;
      }
    } catch (swErr) {
      console.warn('Could not trigger notification via Service Worker, falling back to native Notification API', swErr);
    }
  }

  // Fallback to standard native Notification API
  try {
    new Notification(title, {
      body,
      icon,
      dir: 'rtl',
      lang: 'ar-JO'
    });
  } catch (err) {
    console.error('Error displaying standard notification:', err);
  }
};
