import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ToastProvider } from './components/Toast.tsx';
import { ConfirmationProvider } from './components/ConfirmationDialog.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <ConfirmationProvider>
        <App />
      </ConfirmationProvider>
    </ToastProvider>
  </StrictMode>,
);
