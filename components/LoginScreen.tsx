import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useWhitelabel } from '../contexts/WhitelabelContext';
import { User } from '../types';

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const { t } = useLanguage();
  const { appName, logoUrl } = useWhitelabel();
  const [username, setUsername] = useState('');

  const handleLogin = () => {
    const role = username.toLowerCase() === 'admin' ? 'admin' : 'user';
    onLogin({ username, role });
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-2xl shadow-2xl">
        <div className="text-center">
           <div className="flex flex-col items-center justify-center space-y-4 mb-4">
            {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-32 h-32 rounded-full object-cover shadow-lg" />
            ) : (
                <div className="w-32 h-32 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
            )}
        </div>
          <h1 className="text-4xl font-bold text-blue-600">{appName}</h1>
          <p className="mt-2 text-gray-500">{t('loginSubtitle')}</p>
        </div>
        
        <div>
            <label htmlFor="username" className="text-sm font-medium text-gray-700">Usuário</label>
            <input 
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Digite 'admin' para acesso de administrador"
                className="w-full px-4 py-2 mt-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
        </div>
       
        <button
          onClick={handleLogin}
          className="w-full px-4 py-3 font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-all duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!username}
        >
          {t('loginButton')}
        </button>
      </div>
    </div>
  );
};

export default LoginScreen;