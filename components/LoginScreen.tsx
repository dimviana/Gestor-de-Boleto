import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useWhitelabel } from '../contexts/WhitelabelContext';
import { TranslationKey } from '../translations';

interface LoginScreenProps {
  login: (username: string, password?: string) => Promise<void>;
  register: (username: string, password?: string) => Promise<boolean>;
  authError: string | null;
  setAuthError: (error: string | null) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ login, register, authError, setAuthError }) => {
  const { t } = useLanguage();
  const { appName, logoUrl } = useWhitelabel();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [registrationSuccess, setRegistrationSuccess] = useState(false);


  const handleSwitchMode = (newMode: 'login' | 'register') => {
    setMode(newMode);
    setEmail('');
    setPassword('');
    setAuthError(null);
    setRegistrationSuccess(false);
  };

  const handleSubmit = async () => {
    setAuthError(null);
    setRegistrationSuccess(false);

    if (mode === 'login') {
      await login(email, password);
    } else {
      const success = await register(email, password);
      if (success) {
        setRegistrationSuccess(true);
        setTimeout(() => {
          handleSwitchMode('login');
        }, 2000);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl dark:shadow-blue-900/50">
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
          <p className="mt-2 text-gray-500 dark:text-gray-400">{t('loginSubtitle')}</p>
        </div>
        
        <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
                onClick={() => handleSwitchMode('login')}
                className={`w-1/2 py-4 text-center font-medium text-sm transition-colors duration-300 ${mode === 'login' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
            >
                {t('loginTab')}
            </button>
            <button
                onClick={() => handleSwitchMode('register')}
                className={`w-1/2 py-4 text-center font-medium text-sm transition-colors duration-300 ${mode === 'register' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
            >
                {t('registerTab')}
            </button>
        </div>

        {authError && <div className="p-3 text-sm text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-300 rounded-lg text-center">{t(authError as TranslationKey)}</div>}
        {registrationSuccess && <div className="p-3 text-sm text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-300 rounded-lg text-center">{t('registrationSuccess')}</div>}

        <div className="space-y-4">
            <div>
                <label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('emailLabel')}</label>
                <input 
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={t('emailPlaceholder')}
                    className="w-full px-4 py-2 mt-1 text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
            </div>
            <div>
                 <label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">{mode === 'login' ? t('passwordLabel') : t('passwordLabelRegister')}</label>
                <input 
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={t('passwordPlaceholder')}
                    className="w-full px-4 py-2 mt-1 text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
            </div>
             {mode === 'login' && <p className="text-xs text-center text-gray-500 dark:text-gray-400">{t('adminHint')}</p>}
        </div>
       
        <button
          onClick={handleSubmit}
          className="w-full px-4 py-3 font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-all duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!email || !password}
        >
          {mode === 'login' ? t('loginButton') : t('createAccountButton')}
        </button>
      </div>
    </div>
  );
};

export default LoginScreen;