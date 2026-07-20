// Firebase Cloud Messaging Service Worker
// This script runs in the background and is responsible for displaying native system push notifications.

importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Database name and store name for dynamic config loading
const DB_NAME = 'fcm_config_db';
const STORE_NAME = 'config_store';

// Helper function to read Firebase config from IndexedDB
function getFirebaseConfigFromIndexedDB() {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, 1);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = (event) => {
        const db = event.target.result;
        try {
          const transaction = db.transaction(STORE_NAME, 'readonly');
          const store = transaction.objectStore(STORE_NAME);
          const getReq = store.get('firebase_config');
          
          getReq.onsuccess = () => {
            resolve(getReq.result || null);
          };
          
          getReq.onerror = () => {
            console.warn('IndexedDB read request failed, using default fallback.');
            resolve(null);
          };
        } catch (e) {
          console.warn('Transaction error in Service Worker:', e);
          resolve(null);
        }
      };

      request.onerror = () => {
        console.warn('IndexedDB open request failed in Service Worker.');
        resolve(null);
      };
    } catch (e) {
      console.warn('IndexedDB is not supported or accessible in this context.', e);
      resolve(null);
    }
  });
}

// Initialize FCM in the background
async function initMessaging() {
  const firebaseConfig = {
    apiKey: "AIzaSyCMXcPWs_qyYvDVt5iS6Wrx-amd3ZM2iJE",
    authDomain: "fazaaapp-84fee.firebaseapp.com",
    projectId: "fazaaapp-84fee",
    storageBucket: "fazaaapp-84fee.firebasestorage.app",
    messagingSenderId: "815777806706",
    appId: "1:815777806706:web:24c299ae78d76d48c885eb"
  };

  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  // Customize background notifications
  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message: ', payload);

    // Use absolute URLs — relative paths break on GitHub Pages subpath /Home/
    const appOrigin = 'https://mrrossi82.github.io/Home';
    const iconUrl = `${appOrigin}/icon.svg`;

    const notificationTitle = payload.notification?.title || payload.data?.title || 'تنبيه جديد';
    const notificationOptions = {
      body: payload.notification?.body || payload.data?.body || '',
      icon: payload.notification?.image || payload.data?.image || iconUrl,
      badge: iconUrl,
      dir: 'rtl',
      lang: 'ar-JO',
      vibrate: [200, 100, 200],
      data: {
        click_action: payload.data?.click_action || `${appOrigin}/`
      }
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
  });
}

// Run initialization
initMessaging();

// Handle notification click event (focus/open window)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.click_action || self.location.origin;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a tab is already open, focus it
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      // If no tab is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
