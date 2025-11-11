import React, { useEffect, useState } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { AppNotification } from '../types';
import { CheckCircleIcon, XCircleIcon, BellIcon } from './icons/Icons';

interface NotificationToastProps extends AppNotification {
  onClose: () => void;
}

const NotificationToast: React.FC<NotificationToastProps> = ({ message, type, onClose }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(onClose, 300); // Match animation duration
    }, 4700); // Start exit animation slightly before removal

    return () => clearTimeout(timer);
  }, [onClose]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 300);
  };

  const typeStyles = {
    success: {
      bg: 'bg-green-500',
      icon: <CheckCircleIcon className="w-6 h-6" />,
    },
    error: {
      bg: 'bg-red-500',
      icon: <XCircleIcon className="w-6 h-6" />,
    },
    info: {
      bg: 'bg-blue-500',
      icon: <BellIcon className="w-6 h-6" />,
    },
  };

  return (
    <div
      className={`flex items-center p-4 w-full max-w-sm rounded-lg shadow-2xl text-white ${typeStyles[type].bg} transition-all duration-300 ease-in-out ${isExiting ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}`}
      role="alert"
    >
      <div className="flex-shrink-0">{typeStyles[type].icon}</div>
      <div className="ml-3 text-sm font-medium">{message}</div>
      <button
        type="button"
        onClick={handleClose}
        className="ml-auto -mx-1.5 -my-1.5 rounded-lg p-1.5 inline-flex h-8 w-8 hover:bg-black/20 focus:ring-2 focus:ring-white/50"
        aria-label="Close"
      >
        <span className="sr-only">Close</span>
        <svg className="w-3 h-3" fill="none" viewBox="0 0 14 14">
          <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
        </svg>
      </button>
    </div>
  );
};

const NotificationContainer: React.FC = () => {
  const { notifications, removeNotification } = useNotification();

  return (
    <div className="fixed top-20 right-4 z-50 space-y-3">
      {notifications.map(notification => (
        <NotificationToast
          key={notification.id}
          {...notification}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );
};

export default NotificationContainer;
