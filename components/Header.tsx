
import React from 'react';
import { LogoutIcon, BookOpenIcon, SettingsIcon } from './icons/Icons';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';
import { useWhitelabel } from '../contexts/WhitelabelContext';
import { User } from '../types';

interface HeaderProps {
  onLogout: () => void;
  onOpenDocs: () => void;
  onOpenAdminPanel: () => void;
  user: User;
}

const Header: React.FC<HeaderProps> = ({ onLogout, onOpenDocs, onOpenAdminPanel, user }) => {
  const { t } = useLanguage();
  const { appName, logoUrl } = useWhitelabel();

  return (
    <header className="bg-white/80 backdrop-blur-md shadow-md sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <LanguageSwitcher />
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-lg mr-3 ml-4">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full rounded-full object-cover" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <h1 className="text-2xl font-bold text-blue-600">{appName}</h1>
          </div>
          <div className="flex items-center space-x-4">
             {user.role === 'admin' && (
                 <button
                  onClick={onOpenAdminPanel}
                  title="Painel Administrativo"
                  className="flex items-center p-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <SettingsIcon className="w-5 h-5" />
                </button>
             )}
             <button
              onClick={onOpenDocs}
              title={t('documentationTitle')}
              className="flex items-center p-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <BookOpenIcon className="w-5 h-5" />
            </button>
            <button
              onClick={onLogout}
              className="flex items-center px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <LogoutIcon className="w-5 h-5 mr-2" />
              {t('logoutButton')}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;