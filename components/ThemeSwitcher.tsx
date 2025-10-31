import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { SunIcon, MoonIcon, DesktopIcon } from './icons/Icons';
import { Theme } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

const ThemeSwitcher: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const themeOptions: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: t('themeLight'), icon: <SunIcon className="w-5 h-5" /> },
    { value: 'dark', label: t('themeDark'), icon: <MoonIcon className="w-5 h-5" /> },
    { value: 'system', label: t('themeSystem'), icon: <DesktopIcon className="w-5 h-5" /> },
  ];

  const currentIcon = themeOptions.find(opt => opt.value === theme)?.icon || <SunIcon className="w-5 h-5" />;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  const handleSetTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    setIsOpen(false);
  }

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center p-2 rounded-full text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-900 focus:ring-blue-500 transition-colors"
        title={t('theme')}
      >
        {currentIcon}
      </button>
      {isOpen && (
        <div className="absolute top-12 left-0 w-36 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 z-30 animate-fade-in-up py-1">
          {themeOptions.map(option => (
            <button
              key={option.value}
              onClick={() => handleSetTheme(option.value)}
              className={`w-full flex items-center px-3 py-2 text-sm text-left
              ${theme === option.value
                ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {option.icon}
              <span className="ml-2">{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ThemeSwitcher;