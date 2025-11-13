import React, { useEffect } from 'react';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';
import { useAuth } from './hooks/useAuth';
import { useWhitelabel } from './contexts/WhitelabelContext';
import NotificationContainer from './components/NotificationContainer';
import * as api from './services/api';

const App: React.FC = () => {
  const { user, login, logout, register, authError, setAuthError, getUsers, getLogs } = useAuth();
  const { appName, logoUrl } = useWhitelabel();

  useEffect(() => {
    document.title = appName;
    const favicon = document.querySelector<HTMLLinkElement>("link[rel*='icon']");
    if (favicon) {
      favicon.href = logoUrl || '/vite.svg';
    }
  }, [appName, logoUrl]);

  useEffect(() => {
    if (user) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          api.logTrackingInfo({ latitude, longitude }).catch(err => console.error("Failed to log tracking info:", err));
        },
        (error) => {
          console.warn(`Geolocation error: ${error.message}. Logging without location.`);
          api.logTrackingInfo({ latitude: null, longitude: null }).catch(err => console.error("Failed to log tracking info:", err));
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }
      );
    }
  }, [user]);

  return (
    <div className="bg-gradient-to-br from-white to-gray-100 dark:from-gray-900 dark:to-slate-800 min-h-screen text-gray-800 dark:text-gray-200 font-sans flex flex-col">
      <NotificationContainer />
      <main className="flex-grow">
        {user ? (
          <Dashboard 
            onLogout={logout} 
            user={user} 
            getUsers={getUsers}
            getLogs={getLogs}
          />
        ) : (
          <LoginScreen 
            login={login} 
            register={register}
            authError={authError}
            setAuthError={setAuthError}
          />
        )}
      </main>
      <footer className="p-4 text-gray-600 dark:text-gray-300 text-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
            <span>© {new Date().getFullYear()} ABILDEVELOPER. Todos os direitos reservados.</span>
             <a 
                href="https://github.com/dimviana/Gestor-de-Boleto.git" 
                target="_blank" 
                rel="noopener noreferrer"
                className="font-mono hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                title="Ver repositório no GitHub"
            >
                v1.5.0
            </a>
        </div>
      </footer>
    </div>
  );
};

export default App;
