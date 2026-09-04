import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ToastProvider } from './components/ui/Toast';

// Scope dedicado por área do app — sem isso, cliente (página pública), profissional (/pro) e
// admin (/admin) compartilhariam a MESMA PushManager subscription no navegador (Service Worker
// é por origem+scope, não por "seção" da SPA), e a última pessoa a ativar push roubaria a
// inscrição das outras. Cada scope vira um registration/subscription independente.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    const path = window.location.pathname;
    const scope = path.startsWith("/admin") ? "/admin/" : path.startsWith("/pro") ? "/pro/" : "/";
    navigator.serviceWorker.register("/sw.js", { scope });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>,
);
