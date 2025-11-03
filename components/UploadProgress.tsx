import React from 'react';
import { CheckCircleIcon, XCircleIcon } from './icons/Icons';
import { useLanguage } from '../contexts/LanguageContext';

export interface UploadStatus {
  id: string;
  fileName: string;
  status: 'processing' | 'success' | 'error';
  message: string;
}

interface UploadProgressProps {
  statuses: UploadStatus[];
  onClear: () => void;
}

const UploadProgress: React.FC<UploadProgressProps> = ({ statuses, onClear }) => {
  const { t } = useLanguage();

  if (statuses.length === 0) {
    return null;
  }

  const getStatusIcon = (status: UploadStatus['status']) => {
    switch (status) {
      case 'processing':
        return <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-500 border-t-blue-600 rounded-full animate-spin"></div>;
      case 'success':
        return <CheckCircleIcon className="w-6 h-6 text-green-500" />;
      case 'error':
        return <XCircleIcon className="w-6 h-6 text-red-500" />;
    }
  };

  return (
    <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg shadow-inner max-h-48 overflow-y-auto">
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('uploadStatusTitle')}</h4>
        <button onClick={onClear} className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
          {t('clearList')}
        </button>
      </div>
      <ul className="space-y-2">
        {statuses.map(upload => (
          <li key={upload.id} className="flex items-center text-sm p-2 bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex-shrink-0 mr-3">
              {getStatusIcon(upload.status)}
            </div>
            <div className="flex-grow min-w-0">
              <p className="font-medium text-gray-800 dark:text-gray-200 truncate">{upload.fileName}</p>
              <p className={`text-xs ${
                upload.status === 'error' ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'
              }`}>{upload.message}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default UploadProgress;
