import React, { useState } from 'react';
import { PlusIcon, XIcon, UploadIcon, FolderOpenIcon } from './icons/Icons';

interface FloatingMenuProps {
  onFileUploadClick: () => void;
  disabled: boolean;
}

const FloatingMenu: React.FC<FloatingMenuProps> = ({ onFileUploadClick, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const ActionButton: React.FC<{ onClick: () => void; children: React.ReactNode; label: string; offset: string; }> = ({ onClick, children, label, offset }) => (
    <div
      className={`absolute bottom-0 right-0 flex items-center justify-end transition-all duration-300 ease-in-out ${offset} ${isOpen ? 'opacity-100' : 'opacity-0 -translate-y-4 pointer-events-none'}`}
    >
      <span className="mr-4 px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg shadow-lg whitespace-nowrap">{label}</span>
      <button
        onClick={() => {
          onClick();
          setIsOpen(false);
        }}
        className="w-14 h-14 bg-white dark:bg-gray-600 rounded-full flex items-center justify-center text-gray-700 dark:text-gray-200 shadow-lg hover:bg-gray-100 dark:hover:bg-gray-500"
      >
        {children}
      </button>
    </div>
  );

  return (
    <div className="md:hidden fixed bottom-6 right-6 z-40">
      <div className={`relative flex items-center justify-center ${disabled ? 'opacity-50' : ''}`}>
        <ActionButton
          onClick={onFileUploadClick}
          label="Enviar PDF"
          offset="transform -translate-y-20"
        >
          <UploadIcon className="w-6 h-6" />
        </ActionButton>

        <button
          onClick={toggleMenu}
          disabled={disabled}
          className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-xl transform transition-transform duration-300 hover:scale-110"
        >
          <div className="relative w-6 h-6">
            <PlusIcon
              className={`absolute inset-0 transition-all duration-300 ${isOpen ? 'opacity-0 transform -rotate-45 scale-50' : 'opacity-100 transform rotate-0 scale-100'}`}
            />
            <XIcon
              className={`absolute inset-0 transition-all duration-300 ${isOpen ? 'opacity-100 transform rotate-0 scale-100' : 'opacity-0 transform rotate-45 scale-50'}`}
            />
          </div>
        </button>
      </div>
    </div>
  );
};

export default FloatingMenu;