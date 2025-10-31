
import React from 'react';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';
import { useUser } from './hooks/useUser';

const App: React.FC = () => {
  const { user, login, logout } = useUser();

  return (
    <div className="bg-gradient-to-br from-blue-50 to-blue-200 min-h-screen text-gray-800 font-sans flex flex-col">
      <main className="flex-grow">
        {user ? (
          <Dashboard onLogout={logout} user={user} />
        ) : (
          <LoginScreen onLogin={login} />
        )}
      </main>
      <footer className="text-center p-4 text-gray-600 text-sm">
        © {new Date().getFullYear()} ABILDEVELOPER. Todos os direitos reservados.
      </footer>
    </div>
  );
};

export default App;