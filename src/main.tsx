import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { preloadSpeech } from './lib/speech';
import './index.css';

void preloadSpeech();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Service worker только в продакшене, чтобы не мешать HMR при разработке.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // офлайн-режим просто не будет доступен
    });
  });
}
