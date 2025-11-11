import React, { useState } from 'react';
import { User } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import Modal from './Modal';
import * as api from '../services/api';
import Spinner from './Spinner';
import { CheckCircleIcon, XCircleIcon } from './icons/Icons';
import { TranslationKey } from '../translations';

interface EditProfileModalProps {
    onClose: () => void;
    currentUser: User;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ onClose, currentUser }) => {
    const { t } = useLanguage();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: TranslationKey | string } | null>(null);

    const showNotification = (message: TranslationKey | string, type: 'success' | 'error') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 5000);
    };

    const handleSubmit = async () => {
        if (password && password !== confirmPassword) {
            showNotification('passwordMismatchError', 'error');
            return;
        }

        setIsLoading(true);
        try {
            if (password) {
                await api.updateUserProfile({ password });
                showNotification('passwordUpdateSuccess', 'success');
                setPassword('');
                setConfirmPassword('');
                setTimeout(onClose, 2000);
            } else {
                 onClose();
            }
        } catch (error: any) {
            showNotification(error.message || 'passwordUpdateError', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={t('editProfileTitle')}>
            <div className="space-y-4">
                {notification && (
                     <div className={`p-3 text-sm rounded-lg flex items-center ${notification.type === 'success' ? 'text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-300' : 'text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-300'}`}>
                        {notification.type === 'success' ? <CheckCircleIcon className="w-5 h-5 mr-2" /> : <XCircleIcon className="w-5 h-5 mr-2" />}
                        {t(notification.message as TranslationKey) || notification.message}
                    </div>
                )}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('userFormEmailLabel')}</label>
                    <input type="email" value={currentUser.username} readOnly className="mt-1 block w-full input-field bg-gray-100 dark:bg-gray-800 cursor-not-allowed" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('newPasswordLabel')}</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={t('newPasswordPlaceholder')}
                        className="mt-1 block w-full input-field"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('confirmNewPasswordLabel')}</label>
                    <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="mt-1 block w-full input-field"
                    />
                </div>
                <div className="flex justify-end pt-4 space-x-2">
                    <button onClick={onClose} className="px-4 py-2 font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">
                        {t('cancelButton')}
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="px-4 py-2 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center justify-center disabled:opacity-50"
                    >
                        {isLoading ? <Spinner /> : t('saveButton')}
                    </button>
                </div>
            </div>
            <style>{`.input-field { color: #1F2937; border: 1px solid #D1D5DB; border-radius: 0.5rem; padding: 0.5rem 0.75rem; background-color: #F9FAFB; } .dark .input-field { background-color: #374151; color: #F9FAFB; border-color: #4B5563; }`}</style>
        </Modal>
    );
};

export default EditProfileModal;