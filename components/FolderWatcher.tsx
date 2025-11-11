import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { FolderOpenIcon } from './icons/Icons';
import { TranslationKey } from '../translations';
import { useFolderWatcher } from '../hooks/useFolderWatcher';
import Spinner from './Spinner';

interface FolderWatcherProps {
  disabled: boolean;
  companyId: string | null;
  monitoredFolderPathFromDB?: string | null;
  onPathChange: () => void; // Callback to refresh company data
}

const FolderWatcher: React.FC<FolderWatcherProps> = ({ disabled, companyId, monitoredFolderPathFromDB, onPathChange }) => {
    const { t } = useLanguage();
    const { isLoading, savePath, clearPath } = useFolderWatcher({ companyId });
    const [pathInput, setPathInput] = useState('');
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        setPathInput(monitoredFolderPathFromDB || '');
        setIsEditing(!monitoredFolderPathFromDB);
    }, [monitoredFolderPathFromDB]);

    const handleSave = async () => {
        await savePath(pathInput);
        onPathChange(); // Notify dashboard to refetch company data
        setIsEditing(false);
    };

    const handleClear = async () => {
        await clearPath();
        onPathChange(); // Notify dashboard to refetch company data
    };

    const handleEdit = () => {
        setIsEditing(true);
    };

    return (
        <div className="mt-4 p-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
            <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-300">{t('monitorFolderServerPathLabel')}</h4>
            
            {isEditing ? (
                <>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('monitorFolderServerDescription')}</p>
                    <div className="flex items-center space-x-2">
                        <input
                            type="text"
                            value={pathInput}
                            onChange={(e) => setPathInput(e.target.value)}
                            placeholder={t('monitorFolderServerPathPlaceholder')}
                            className="w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                            disabled={disabled || isLoading}
                        />
                        <button
                            onClick={handleSave}
                            disabled={disabled || isLoading || !pathInput}
                            className="px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
                        >
                            {isLoading ? <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></div> : t('savePathButton')}
                        </button>
                    </div>
                </>
            ) : (
                <div className="p-3 bg-gray-100 dark:bg-gray-900/50 rounded-lg flex items-center justify-between">
                    <p className="text-sm font-mono text-gray-700 dark:text-gray-300 truncate">
                        <FolderOpenIcon className="w-5 h-5 inline-block mr-2 text-blue-500"/>
                        {monitoredFolderPathFromDB}
                    </p>
                    <div className="flex items-center space-x-2">
                        <button onClick={handleEdit} disabled={disabled || isLoading} className="px-3 py-1 text-sm font-semibold text-blue-600 dark:text-blue-400 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900 disabled:opacity-50">{t('changePathButton')}</button>
                        <button onClick={handleClear} disabled={disabled || isLoading} className="px-3 py-1 text-sm font-semibold text-red-600 dark:text-red-400 rounded-md hover:bg-red-100 dark:hover:bg-red-900 disabled:opacity-50">
                            {isLoading ? '...' : t('stopMonitoringButton')}
                        </button>
                    </div>
                </div>
            )}
            
            {disabled && !companyId && (
                <p className="text-xs text-center text-yellow-600 dark:text-yellow-400">{t('adminMustSelectCompanyErrorText')}</p>
            )}
        </div>
    );
};

export default FolderWatcher;