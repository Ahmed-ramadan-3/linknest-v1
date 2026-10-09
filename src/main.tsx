import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/index.css';

declare const __DEV__: boolean | undefined;

const container = document.getElementById('root');
if (!container) throw new Error('Missing #root element');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Offline support: register the service worker in production only.
if ('serviceWorker' in navigator && !(typeof __DEV__ !== 'undefined' && __DEV__)) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // The app works without it; offline caching just will not be available.
    });
  });
}
