import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { LanguageModeProvider } from './hooks/useLanguageMode';
import './styles/index.css';
import './styles/print.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageModeProvider>
      <App />
    </LanguageModeProvider>
  </StrictMode>,
);
