import React, { useState, useRef, useEffect } from 'react';
import { LogoutIcon, BookOpenIcon, SettingsIcon, BellIcon, SearchIcon, MenuIcon, XIcon, UserCircleIcon } from './icons/Icons';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';
import { useWhitelabel } from '../contexts/WhitelabelContext';
import { User, Notification, Company } from '../types';
import NotificationPopover from './NotificationPopover';
import ThemeSwitcher from './ThemeSwitcher';
import UserProfilePopover from './UserProfilePopover';

interface HeaderProps {
  onLogout: () => void;
  onOpenDocs: () => void;
  onOpenAdminPanel: () => void;
  onOpenEditProfile: () => void;
  user: User;
  companies: Company[];
  notifications: Notification[];
  onSearch: (term: string) => void;
}

const Header: React.FC<HeaderProps> = ({ onLogout, onOpenDocs, onOpenAdminPanel, onOpenEditProfile, user, companies, notifications, onSearch }) => {
  const { t } = useLanguage();
  const { appName, logoUrl } = useWhitelabel();
  const [isNotificationPopoverOpen, setNotificationPopoverOpen] = useState(false);
  const [isProfilePopoverOpen, setProfilePopoverOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const notificationCount = notifications.length;

  const hasOverdue = notifications.some(n => n.type === 'overdue');
  const hasDueSoon = notifications.some(n => n.type === 'dueSoon');

  let notificationBadgeClasses = 'bg-red-500 text-white';
  if (hasOverdue) {
    notificationBadgeClasses = 'bg-red-500 text-white';
  } else if (hasDueSoon) {
    notificationBadgeClasses = 'bg-yellow-400 text-black';
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationPopoverOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfilePopoverOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const companyName = companies.find(c => c.id === user.companyId)?.name || t('noCompany');

  const HeaderControls: React.FC<{ isMobile?: boolean }> = ({ isMobile = false }) => (
    <>
      <ThemeSwitcher />
      <LanguageSwitcher />

      {user.role === 'admin' && (
          <button
          onClick={onOpenAdminPanel}
          title="Painel Administrativo"
          className="p-2 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-800 focus:ring-blue-500 transition-colors"
        >
          <SettingsIcon className="w-5 h-5" />
        </button>
      )}
      <button
      onClick={onOpenDocs}
      title={t('documentationTitle')}
      className="p-2 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-800 focus:ring-blue-500 transition-colors"
    >
      <BookOpenIcon className="w-5 h-5" />
    </button>
    <div className="relative" ref={notificationRef}>
        <button
            onClick={() => setNotificationPopoverOpen(!isNotificationPopoverOpen)}
            title={t('notificationsTitle')}
            className="relative p-2 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-800 focus:ring-blue-500 transition-colors"
        >
            <BellIcon className="w-5 h-5" />
            {notificationCount > 0 && (
                <span className={`absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-xs font-bold ${notificationBadgeClasses}`}>
                    {notificationCount}
                </span>
            )}
        </button>
        {isNotificationPopoverOpen && <NotificationPopover notifications={notifications} />}
    </div>
    <button
      onClick={onLogout}
      className={`flex items-center px-4 py-2 text-sm font-medium transition-colors ${isMobile ? 'w-full text-red-600 bg-red-100 dark:bg-red-900/40' : 'text-gray-600 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700'}`}
    >
      <LogoutIcon className="w-5 h-5 mr-2" />
      {t('logoutButton')}
    </button>
  </>
  );

  return (
    <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md shadow-md dark:shadow-lg sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-lg mr-3">
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

           <div className="flex-1 flex justify-center px-2 lg:ml-6 lg:justify-end">
                <div className="w-full max-w-[150px] sm:max-w-xs">
                    <label htmlFor="search" className="sr-only">{t('searchPlaceholder')}</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <SearchIcon className="h-5 w-5 text-gray-500" aria-hidden="true" />
                        </div>
                        <input
                            id="search"
                            name="search"
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 dark:focus:placeholder-gray-500 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder={t('searchPlaceholder')}
                            type="search"
                            onChange={(e) => onSearch(e.target.value)}
                        />
                    </div>
                </div>
            </div>

          <div className="hidden md:flex items-center space-x-2">
            <HeaderControls />
             <div className="relative" ref={profileRef}>
                <button
                    onClick={() => setProfilePopoverOpen(!isProfilePopoverOpen)}
                    title={t('userProfile')}
                    className="p-2 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-800 focus:ring-blue-500 transition-colors"
                >
                    <UserCircleIcon className="w-6 h-6" />
                </button>
                {isProfilePopoverOpen && (
                    <UserProfilePopover 
                        user={user} 
                        companyName={companyName}
                        onEditProfileClick={() => {
                            setProfilePopoverOpen(false);
                            onOpenEditProfile();
                        }}
                    />
                )}
            </div>
          </div>

          <div className="md:hidden ml-2">
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                <MenuIcon className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
      
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)}>
            <div className="fixed top-0 right-0 h-full w-64 bg-white dark:bg-gray-800 shadow-xl p-4 animate-slide-in-right" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="font-bold text-lg">Menu</h2>
                    <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="flex flex-col space-y-4">
                    <HeaderControls isMobile={true}/>
                </div>
            </div>
        </div>
      )}
      <style>{`
        @keyframes slide-in-right {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
        }
        .animate-slide-in-right {
            animation: slide-in-right 0.3s ease-out forwards;
        }
      `}</style>
    </header>
  );
};

export default Header;