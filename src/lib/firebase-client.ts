import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { registerDeviceTokenInDB } from './fcm';

// Database name and store name for dynamic config loading
const DB_NAME = 'fcm_config_db';
const STORE_NAME = 'config_store';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  vapidKey?: string;
}

// Hardcoded Firebase configuration
export const FIXED_FIREBASE_CONFIG: FirebaseConfig = {
  apiKey: "AIzaSyCMXcPWs_qyYvDVt5iS6Wrx-amd3ZM2iJE",
  authDomain: "fazaaapp-84fee.firebaseapp.com",
  projectId: "fazaaapp-84fee",
  storageBucket: "fazaaapp-84fee.firebasestorage.app",
  messagingSenderId: "815777806706",
  appId: "1:815777806706:web:24c299ae78d76d48c885eb",
  vapidKey: "BPCEvNec8cmiKgtwNBc1ehIKgSYtE9LJxUlxCNakcjlFFK_-giNZ29IvMDBFVF7eX070C-uZ3NnZL0zdSPmLw1g"
};

// 1. IndexedDB Helper to Store & Retrieve Configuration dynamically (Stubbed to always succeed/return the fixed config)
export const saveConfigToIndexedDB = async (config: FirebaseConfig): Promise<boolean> => {
  console.log('Using hardcoded config. Dynamic save bypassed.');
  return true;
};

export const getConfigFromIndexedDB = async (): Promise<FirebaseConfig | null> => {
  return FIXED_FIREBASE_CONFIG;
};

// 2. Initialize Firebase Client dynamically
let activeApp: FirebaseApp | null = null;
let activeMessaging: Messaging | null = null;

export const initializeFirebaseClient = async (customConfig?: FirebaseConfig): Promise<{ app: FirebaseApp; messaging: Messaging } | null> => {
  try {
    const config = FIXED_FIREBASE_CONFIG;
    
    // Reuse existing instances if already initialized
    if (getApps().length > 0) {
      activeApp = getApp();
    } else {
      activeApp = initializeApp(config);
    }

    try {
      activeMessaging = getMessaging(activeApp);
    } catch (messagingErr) {
      console.warn('FCM is not supported in this browser context (e.g. private mode or iframe without permissions).', messagingErr);
      return null;
    }

    return { app: activeApp, messaging: activeMessaging };
  } catch (err) {
    console.error('Failed to initialize Firebase Client:', err);
    return null;
  }
};

// 3. Request actual FCM Registration Token from Google FCM server
export const requestFCMToken = async (userId: string, customConfig?: FirebaseConfig): Promise<string | null> => {
  try {
    if (!('Notification' in window)) {
      console.warn('Desktop notifications are not supported by this browser.');
      return null;
    }

    // First request permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission denied by user.');
      return null;
    }

    const firebaseClient = await initializeFirebaseClient();
    if (!firebaseClient || !firebaseClient.messaging) {
      console.warn('Firebase messaging initialization failed.');
      return null;
    }

    const vapidKey = FIXED_FIREBASE_CONFIG.vapidKey || 'BPCEvNec8cmiKgtwNBc1ehIKgSYtE9LJxUlxCNakcjlFFK_-giNZ29IvMDBFVF7eX070C-uZ3NnZL0zdSPmLw1g';

    console.log('Registering with Service Worker...');
    // Register background service worker
   const registration = await navigator.serviceWorker.register('/Home/firebase-messaging-sw.js', {
  scope: '/Home/'
});

    
    console.log('Service Worker registered successfully with scope:', registration.scope);

    console.log('Retrieving FCM Token from Google FCM using VAPID Key...');
    const token = await getToken(firebaseClient.messaging, {
      serviceWorkerRegistration: registration,
      vapidKey: vapidKey
    });

    if (token) {
      console.log('Google FCM Token generated successfully:', token);
      
      // Save it into local storage as active current token
      localStorage.setItem('current_fcm_token', token);
      
      // Upsert the token into Supabase or local storage fallback
      await registerDeviceTokenInDB(userId);
      return token;
    } else {
      console.warn('No registration token available. Request permission to generate one.');
      return null;
    }
  } catch (err) {
    console.error('An error occurred while retrieving the FCM token:', err);
    return null;
  }
};

// 4. Listen to foreground messages (Real-time in-app trigger)
export const listenToForegroundMessages = async (onMessageReceived: (payload: any) => void) => {
  try {
    const client = await initializeFirebaseClient();
    if (client && client.messaging) {
      onMessage(client.messaging, (payload) => {
        console.log('Message received in foreground: ', payload);
        
        // Show native system notification if supported, or bubble it up to UI
        if ('Notification' in window && Notification.permission === 'granted') {
          navigator.serviceWorker.ready.then(registration => {
            registration.showNotification(payload.notification?.title || 'إشعار جديد', {
              body: payload.notification?.body || '',
              icon: '/Home/icon.svg',
              dir: 'rtl',
              lang: 'ar-JO'
            });
          }).catch(err => {
            new Notification(payload.notification?.title || 'إشعار جديد', {
              body: payload.notification?.body || '',
              icon: '/Home/icon.svg',
              dir: 'rtl',
              lang: 'ar-JO'
            });
          });
        }
        
        onMessageReceived(payload);
      });
    }
  } catch (err) {
    console.error('Error setting up foreground message listener:', err);
  }
};
