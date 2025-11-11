import React, { useState } from 'react';
import { Notification, Role } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { CalendarIcon, DollarSignIcon } from './icons/Icons';
import * as api from '../services/api';
import { useNotification } from '../contexts/NotificationContext';
import { TranslationKey } from '../translations';
import Spinner from './Spinner';

interface NotificationPopoverProps {
  notifications: Notification[];
  userRole: Role;
  activeCompanyId: string | null;
}

const NotificationPopover: React.FC<NotificationPopoverProps> = ({ notifications, userRole, activeCompanyId }) => {
  const { t } = useLanguage();
  const { addNotification } = useNotification();
  const [isSending, setIsSending] = useState(false);

  const handleSendReminders = async () => {
    if (!activeCompanyId || isSending) return;
    setIsSending(true);
    try {
      const response = await api.sendEmailReminders(activeCompanyId);
      if (response.count > 0) {
        addNotification(t('remindersSentSuccess', { count: String(response.count) }), 'success');
      } else {
        addNotification(t('noRemindersToSend'), 'info');
      }
    } catch (error) {
      console.error("Failed to send reminders:", error);
      addNotification(t('remindersSentError'), 'error');
    } finally {
      setIsSending(false);
    }
  };


  const formatCurrency = (value: number | null) => {
    if (value === null) return t('notAvailable');
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const getStatusLabel = (notification: Notification) => {
    if (notification.type === 'overdue') {
      return <span className="px-2 py-1 text-xs font-bold text-white bg-red-500 rounded-full">{t('overdueAlert')}</span>;
    }
    if (notification.daysUntilDue === 0) {
      return <span className="px-2 py-1 text-xs font-bold text-yellow-800 bg-yellow-300 rounded-full">{t('dueTodayAlert')}</span>;
    }
    if (notification.daysUntilDue === 1) {
      return <span className="px-2 py-1 text-xs font-bold text-yellow-800 bg-yellow-300 rounded-full">{t('dueTomorrowAlert')}</span>;
    }
    return <span className="px-2 py-1 text-xs font-bold text-yellow-800 bg-yellow-300 rounded-full">{t('dueSoonAlert', { days: String(notification.daysUntilDue) })}</span>;
  };
  
  const renderBoletoNotification = (notification: Notification) => {
      const { boleto } = notification;
      return (
         <li key={boleto.id} className="p-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
            <div className="flex justify-between items-center mb-1">
              <p className="font-semibold text-sm text-gray-800 dark:text-gray-200 truncate pr-2">{boleto.recipient || t('recipientNotFound')}</p>
              {getStatusLabel(notification)}
            </div>
            <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 space-x-4">
              <span className="flex items-center"><DollarSignIcon className="w-3 h-3 mr-1" />{formatCurrency(boleto.amount)}</span>
              <span className="flex items-center"><CalendarIcon className="w-3 h-3 mr-1" />{boleto.dueDate}</span>
            </div>
        </li>
      );
  };

  const canSendReminders = userRole !== 'viewer' && !!activeCompanyId && notifications.length > 0;

  return (
    <div className="absolute top-12 right-0 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 z-30 animate-fade-in-up">
      <div className="p-3 font-bold text-gray-800 dark:text-gray-100 border-b border-gray-100 dark:border-gray-700">
        {t('notificationsTitle')}
      </div>
      <div className="max-h-80 overflow-y-auto">
        {notifications.length > 0 ? (
          <ul>
            {notifications.map((notification) => renderBoletoNotification(notification))}
          </ul>
        ) : (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">
            {t('noNotifications')}
          </div>
        )}
      </div>
      {userRole !== 'viewer' && (
        <div className="p-2 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={handleSendReminders}
            disabled={!canSendReminders || isSending}
            className="w-full px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isSending ? <><div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin mr-2"></div>{t('sendingReminders' as TranslationKey)}</> : t('sendEmailRemindersButton' as TranslationKey)}
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationPopover;