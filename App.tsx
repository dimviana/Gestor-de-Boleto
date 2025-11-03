

import React from 'react';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';
import { useAuth } from './hooks/useAuth';

const App: React.FC = () => {
  const { user, login, logout, register, authError, setAuthError, getUsers, getLogs } = useAuth();

  return (
    <div className="bg-gradient-to-br from-blue-50 to-blue-200 dark:from-gray-900 dark:to-slate-800 min-h-screen text-gray-800 dark:text-gray-200 font-sans flex flex-col">
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
      <footer className="p-4 text-gray-600 dark:text-gray-400 text-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
            <span>© {new Date().getFullYear()} ABILDEVELOPER. Todos os direitos reservados.</span>
             <a 
                href="https://github.com/dimviana/Gestor-de-Boleto.git" 
                target="_blank" 
                rel="noopener noreferrer"
                className="font-mono hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                title="Ver repositório no GitHub"
            >
                v1.2.0
            </a>
        </div>
      </footer>
    </div>
  );
};

export default App;