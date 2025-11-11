import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { FolderOpenIcon } from './icons/Icons';
import { TranslationKey } from '../translations';

interface FolderWatcherProps {
  isMonitoring: boolean;
  folderName: string | null;
  error: string | null;
  isPermissionDenied: boolean;
  startMonitoring: () => void;
  stopMonitoring: () => void;
  reselectFolder: () => void;
  disabled: boolean;
}

const FolderWatcher: React.FC<FolderWatcherProps> = ({
  isMonitoring,
  folderName,
  error,
  isPermissionDenied,
  startMonitoring,
  stopMonitoring,
  reselectFolder,
  disabled
}) => {
    const { t } = useLanguage();

    if (error && error !== 'folderWatcherUnsupported') {
        return (
            <div className="mt-4 p-4 border-t border-gray-200 dark:border-gray-700 text-center text-sm text-red-500 dark:text-red-400">
                {t(error as TranslationKey)}
            </div>
        );
    }
    
    // If feature is not supported at all, don't render anything to avoid confusion
    if (error === 'folderWatcherUnsupported') {
        return null;
    }

    return (
      <div className={`mt-4 p-4 border-t border-gray-200 dark:border-gray-700 space-y-3 transition-opacity ${disabled ? 'opacity-50' : ''}`}>
        {isMonitoring ? (
          <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-between">
            <div>
                <p className="text-sm font-semibold text-green-800 dark:text-green-200">{t('monitoringFolderLabel')}</p>
                <p className="text-sm font-mono text-green-700 dark:text-green-300 truncate">{folderName}</p>
            </div>
            <button
              onClick={stopMonitoring}
              disabled={disabled}
              className="px-3 py-1 text-sm font-semibold text-red-600 dark:text-red-400 rounded-md hover:bg-red-100 dark:hover:bg-red-900 disabled:opacity-50"
            >
              {t('stopMonitoringButton')}
            </button>
          </div>
        ) : isPermissionDenied && folderName ? (
          <div className="p-3 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg text-center">
               <p className="text-sm text-yellow-800 dark:text-yellow-300">{t('resumeMonitoringPrompt', { folderName })}</p>
               <button onClick={reselectFolder} className="mt-2 px-4 py-1.5 text-sm font-bold text-white bg-yellow-600 rounded-lg hover:bg-yellow-700">
                  {t('reselectFolderButton')}
              </button>
          </div>
        ) : (
          <>
              <button
                  onClick={startMonitoring}
                  disabled={disabled}
                  className="w-full flex items-center justify-center px-4 py-3 text-sm font-semibold text-white bg-gray-600 rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-4 focus:ring-gray-300 transition-colors disabled:opacity-50"
              >
                  <FolderOpenIcon className="w-5 h-5 mr-2" />
                  {t('monitorFolderButton')}
              </button>
              <p className="text-xs text-center text-gray-500 dark:text-gray-400">{t('folderWatcherDescription')}</p>
          </>
        )}
        {disabled && (
             <p className="text-xs text-center text-yellow-600 dark:text-yellow-400">{t('adminMustSelectCompanyErrorText')}</p>
        )}
      </div>
    );
};

export default FolderWatcher;