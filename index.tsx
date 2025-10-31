import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { LanguageProvider } from './contexts/LanguageContext';
import { WhitelabelProvider } from './contexts/WhitelabelContext';
import { ProcessingMethodProvider } from './contexts/ProcessingMethodContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <LanguageProvider>
      <WhitelabelProvider>
        <ProcessingMethodProvider>
          <App />
        </ProcessingMethodProvider>
      </WhitelabelProvider>
    </LanguageProvider>
  </React.StrictMode>
);