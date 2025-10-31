
import React, { useState, useEffect } from 'react';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    const session = sessionStorage.getItem('isAuthenticated');
    if (session === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = () => {
    sessionStorage.setItem('isAuthenticated', 'true');
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('isAuthenticated');
    setIsAuthenticated(false);
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-blue-200 min-h-screen text-gray-800 font-sans flex flex-col">
      <main className="flex-grow">
        {isAuthenticated ? (
          <Dashboard onLogout={handleLogout} />
        ) : (
          <LoginScreen onLogin={handleLogin} />
        )}
      </main>
      <footer className="text-center p-4 text-gray-600 text-sm">
        © {new Date().getFullYear()} ABILDEVELOPER. Todos os direitos reservados.
      </footer>
    </div>
  );
};

export default App;
