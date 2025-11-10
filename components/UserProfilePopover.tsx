import React from 'react';
import { User } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { EditIcon } from './icons/Icons';

interface UserProfilePopoverProps {
  user: User;
  companyName: string;
  onEditProfileClick: () => void;
}

const UserProfilePopover: React.FC<UserProfilePopoverProps> = ({ user, companyName, onEditProfileClick }) => {
  const { t } = useLanguage();

  return (
    <div className="absolute top-14 right-0 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 z-30 animate-fade-in-up">
      <div className="p-4 border-b border-gray-100 dark:border-gray-700">
        <p className="font-bold text-gray-800 dark:text-gray-100 truncate">{user.name || user.username}</p>
        {user.name && <p className="text-xs text-gray-500 dark:text-gray-400">{user.username}</p>}
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{companyName}</p>
      </div>
      <div className="p-2">
        <button
          onClick={onEditProfileClick}
          className="w-full flex items-center px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
        >
          <EditIcon className="w-5 h-5 mr-3" />
          {t('editProfile')}
        </button>
      </div>
    </div>
  );
};

export default UserProfilePopover;