import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { PuterProvider } from './contexts/PuterContext';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PuterProvider>
      <App />
    </PuterProvider>
  </React.StrictMode>
);