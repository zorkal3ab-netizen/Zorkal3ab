import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

declare global {
  interface Window {
    __ZORK_LOADER_INIT__?: boolean;
    __ZORK_LOADER__?: {
      markDomReady: () => void;
      markBundleLoaded: () => void;
      markMounted: () => void;
      markReady: () => void;
      markError: (message?: string) => void;
      isAutostart: () => boolean;
      getState: () => {
        progress: number;
        mounted: boolean;
        ready: boolean;
        dismissed: boolean;
        failed: boolean;
      };
    };
  }
}

window.__ZORK_LOADER__?.markBundleLoaded();

const rootEl = document.getElementById('root');

if (!rootEl) {
  window.__ZORK_LOADER__?.markError('تعذر العثور على حاوية التطبيق الرئيسية.');
} else {
  try {
    ReactDOM.createRoot(rootEl).render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>
    );
    window.__ZORK_LOADER__?.markMounted();
  } catch (err) {
    console.error('Failed to mount ZORK CRAFT application:', err);
    window.__ZORK_LOADER__?.markError('حدث خطأ أثناء تشغيل واجهة الموقع. يرجى إعادة المحاولة.');
  }
}
