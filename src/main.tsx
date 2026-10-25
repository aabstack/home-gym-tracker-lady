import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ensureSeeded, ensureStarterProfile } from './data/seed';
import { registerPwa } from './pwa/register';
import './index.css';

const root = createRoot(document.getElementById('root') as HTMLElement);

// Ask the browser not to evict our IndexedDB data (all workout history lives there).
void navigator.storage?.persist?.().catch(() => {});

ensureSeeded()
  .then(() => ensureStarterProfile())
  .then(() => {
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  })
  .catch((err: unknown) => {
    console.error(err);
    root.render(
      <div style={{ padding: 24 }}>
        <h1>Storage unavailable</h1>
        <p>The app could not open its on-device database. Private browsing can block it.</p>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{String(err)}</pre>
      </div>,
    );
  });

registerPwa();
