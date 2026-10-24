import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { PublicHome } from './components/PublicHome';
import './index.css';

const isPublicHome =
  window.location.pathname === '/' &&
  !new URLSearchParams(window.location.search).has('resetToken') &&
  !new URLSearchParams(window.location.search).has('auth');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isPublicHome ? <PublicHome /> : <App />}
  </StrictMode>,
);
