import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Register Service Worker for PWA support
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', async () => {
    try {
      const swUrl = `${import.meta.env.BASE_URL}sw.js`;

      const registration = await navigator.serviceWorker.register(swUrl);

      console.log(
        '[PWA] Service Worker registered successfully:',
        registration.scope,
      );
    } catch (error) {
      console.error(
        '[PWA] Service Worker registration failed:',
        error,
      );
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);