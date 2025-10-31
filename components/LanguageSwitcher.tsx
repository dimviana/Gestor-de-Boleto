import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { BrazilFlagIcon, UsaFlagIcon } from './icons/Flags';

const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={() => setLanguage('pt')}
        className={`w-8 h-8 rounded-full overflow-hidden border-2 transition-all duration-200 ${language === 'pt' ? 'border-blue-500 scale-110' : 'border-transparent opacity-60 hover:opacity-100'}`}
        title="Mudar para Português"
      >
        <BrazilFlagIcon />
      </button>
      <button
        onClick={() => setLanguage('en')}
        className={`w-8 h-8 rounded-full overflow-hidden border-2 transition-all duration-200 ${language === 'en' ? 'border-blue-500 scale-110' : 'border-transparent opacity-60 hover:opacity-100'}`}
        title="Switch to English"
      >
        <UsaFlagIcon />
      </button>
    </div>
  );
};

export default LanguageSwitcher;
