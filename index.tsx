
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { LanguageProvider } from './contexts/LanguageContext';
import { WhitelabelProvider } from './contexts/WhitelabelContext';
import { ProcessingMethodProvider } from './contexts/ProcessingMethodContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AiSettingsProvider } from './contexts/AiSettingsContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ThemeProvider>
      <LanguageProvider>
        <WhitelabelProvider>
          <ProcessingMethodProvider>
            <AiSettingsProvider>
              <App />
            </AiSettingsProvider>
          </ProcessingMethodProvider>
        </WhitelabelProvider>
      </LanguageProvider>
    </ThemeProvider>
  </React.StrictMode>
);