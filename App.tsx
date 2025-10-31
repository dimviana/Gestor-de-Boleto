
import React from 'react';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';
import { useAuth } from './hooks/useAuth';

const App: React.FC = () => {
  const { user, login, logout, register, authError, setAuthError, getUsers, addUser, updateUser, deleteUser, getLogs } = useAuth();

  return (
    <div className="bg-gradient-to-br from-blue-50 to-blue-200 min-h-screen text-gray-800 font-sans flex flex-col">
      <main className="flex-grow">
        {user ? (
          <Dashboard 
            onLogout={logout} 
            user={user} 
            getUsers={getUsers}
            addUser={addUser}
            updateUser={updateUser}
            deleteUser={deleteUser}
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
      <footer className="text-center p-4 text-gray-600 text-sm">
        © {new Date().getFullYear()} ABILDEVELOPER. Todos os direitos reservados.
      </footer>
    </div>
  );
};

export default App;