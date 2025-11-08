import React, { useCallback, useState } from 'react';
import { UploadIcon } from './icons/Icons';
import { useLanguage } from '../contexts/LanguageContext';

interface FileUploadProps {
  onFileUpload: (files: File[]) => void;
  onClick: () => void;
  disabled: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload, onClick, disabled }) => {
  const [isDragging, setIsDragging] = useState(false);
  const { t } = useLanguage();
  
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (disabled) return;
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          // FIX: Explicitly type `f` as `File` to resolve the "type does not exist on unknown" error.
          const pdfFiles = Array.from(e.dataTransfer.files).filter((f: File) => f.type === 'application/pdf');
          if (pdfFiles.length > 0) {
              onFileUpload(pdfFiles);
          }
      }
  }, [onFileUpload, disabled]);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if(!disabled) setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  return (
    <div 
        className={`flex items-center justify-center w-full transition-all duration-300 ${disabled ? 'cursor-not-allowed' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onClick={onClick}
    >
      <div
        className={`
          flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg transition-colors duration-200
          ${disabled 
            ? 'opacity-50 cursor-not-allowed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50' 
            : `cursor-pointer ${isDragging 
                ? 'border-blue-500 bg-blue-100 dark:bg-blue-900/50' 
                : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`
          }
        `}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <UploadIcon className="w-10 h-10 mb-3 text-gray-400" />
          <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
            <span className="font-semibold">{t('uploadCTA')}</span> {t('uploadOrDrag')}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t('uploadHint')}</p>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;