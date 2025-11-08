



import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { FolderOpenIcon } from './icons/Icons';
import { TranslationKey } from '../translations';

// This is an experimental browser feature.
// Add type definitions for the File System Access API to avoid TypeScript errors.
interface FileSystemDirectoryHandle extends FileSystemHandle {
    kind: 'directory';
    values: () => AsyncIterableIterator<FileSystemHandle>;
}

interface FileSystemFileHandle extends FileSystemHandle {
    kind: 'file';
    getFile: () => Promise<File>;
}

declare global {
    interface Window {
        showDirectoryPicker: () => Promise<FileSystemDirectoryHandle>;
    }
}

const isApiSupported = 'showDirectoryPicker' in window;

interface FolderWatcherProps {
  directoryHandle: FileSystemDirectoryHandle | null;
  error: string | null;
  disabled: boolean;
  handleSelectFolder: () => void;
  stopWatching: () => void;
  monitoredFolderPathFromDB?: string | null;
}

const FolderWatcher: React.FC<FolderWatcherProps> = ({ directoryHandle, error, disabled, handleSelectFolder, stopWatching, monitoredFolderPathFromDB }) => {
    const { t } = useLanguage();

    if (!isApiSupported) {
        return (
            <div className="text-center p-2 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 text-sm rounded-lg">
                {t('folderWatcherUnsupported')}
            </div>
        );
    }

    const monitoredFolderName = directoryHandle?.name || monitoredFolderPathFromDB;

    if (monitoredFolderName) {
        return (
            <div className="mt-4 p-4 border-t border-gray-200 dark:border-gray-700 text-center">
                 <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {t('monitoringFolderLabel')} <span className="font-bold text-blue-600 dark:text-blue-400">{monitoredFolderName}</span>
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('folderWatcherTabMustBeOpen')}</p>
                <button 
                    onClick={stopWatching}
                    className="mt-2 px-4 py-2 text-sm font-bold text-white bg-red-500 rounded-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-400"
                >
                    {t('stopMonitoringButton')}
                </button>
            </div>
        );
    }

    return (
        <div className="mt-4 p-4 border-t border-gray-200 dark:border-gray-700">
            <button 
                onClick={handleSelectFolder} 
                disabled={disabled}
                className="w-full flex items-center justify-center px-4 py-2 font-semibold text-blue-600 bg-blue-100 rounded-lg hover:bg-blue-200 dark:text-blue-300 dark:bg-blue-900/40 dark:hover:bg-blue-900/60 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <FolderOpenIcon className="w-5 h-5 mr-2" />
                {t('monitorFolderButton')}
            </button>
            <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">{t('folderWatcherDescription')}</p>
            {error && (
                <div className="text-center mt-2 p-2 bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 text-sm rounded-lg">
                    {t(error as TranslationKey)}
                </div>
            )}
        </div>
    );
};

export default FolderWatcher;