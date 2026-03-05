import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// ── Service Worker : prod uniquement (dev = cache-first casse le HMR) ──
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => console.debug('[SW] registered:', reg.scope))
        .catch((err) => console.warn('[SW] registration failed:', err));
    });
  } else {
    // Dev : désenregistrer tous les SW actifs pour vider le cache
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister());
    });
  }
}
