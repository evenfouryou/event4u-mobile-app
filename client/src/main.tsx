import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./i18n";

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered:', registration.scope);
        
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                const lang = localStorage.getItem('i18nextLng') || 'it';
                const messages: Record<string, string> = {
                  it: 'Nuova versione disponibile! Vuoi aggiornare?',
                  en: 'New version available! Do you want to update?',
                  fr: 'Nouvelle version disponible! Voulez-vous mettre à jour?',
                  de: 'Neue Version verfügbar! Möchten Sie aktualisieren?'
                };
                if (confirm(messages[lang] || messages.en)) {
                  newWorker.postMessage({ type: 'SKIP_WAITING' });
                  window.location.reload();
                }
              }
            });
          }
        });
        
        registration.update();
      })
      .catch((error) => {
        console.log('SW registration failed:', error);
      });
  });
  
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
