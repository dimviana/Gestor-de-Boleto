import React from 'react';
import { Notification } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { CalendarIcon, DollarSignIcon } from './icons/Icons';

interface NotificationPopoverProps {
  notifications: Notification[];
}

const NotificationPopover: React.FC<NotificationPopoverProps> = ({ notifications }) => {
  const { t, language } = useLanguage();

  const formatCurrency = (value: number | null) => {
    if (value === null) return t('notAvailable');
    return value.toLocaleString(language === 'pt' ? 'pt-BR' : 'en-US', {
      style: 'currency',
      currency: language === 'pt' ? 'BRL' : 'USD',
    });
  };

  const getStatusLabel = (notification: Notification) => {
    if (notification.type === 'overdue') {
      return (
        <span className="px-2 py-1 text-xs font-bold text-white bg-red-500 rounded-full">
          {t('overdueAlert')}
        </span>
      );
    }
    if (notification.daysUntilDue === 0) {
        return (
            <span className="px-2 py-1 text-xs font-bold text-yellow-800 bg-yellow-300 rounded-full">
                {t('dueTodayAlert')}
            </span>
        )
    }
    return (
      <span className="px-2 py-1 text-xs font-bold text-orange-800 bg-orange-300 rounded-full">
        {t('dueSoonAlert', { days: String(notification.daysUntilDue) })}
      </span>
    );
  };

  return (
    <div className="absolute top-12 right-0 w-80 bg-white rounded-lg shadow-2xl border border-gray-200 z-30 animate-fade-in-up">
      <div className="p-3 font-bold text-gray-800 border-b border-gray-100">
        {t('notificationsTitle')}
      </div>
      <div className="max-h-80 overflow-y-auto">
        {notifications.length > 0 ? (
          <ul>
            {notifications.map(({ boleto }) => (
              <li key={boleto.id} className="p-3 border-b border-gray-100 hover:bg-gray-50">
                <div className="flex justify-between items-center mb-1">
                  <p className="font-semibold text-sm text-gray-800 truncate pr-2">{boleto.recipient || t('recipientNotFound')}</p>
                  {getStatusLabel(notifications.find(n => n.boleto.id === boleto.id)!)}
                </div>
                <div className="flex items-center text-xs text-gray-500 space-x-4">
                  <span className="flex items-center">
                    <DollarSignIcon className="w-3 h-3 mr-1" />
                    {formatCurrency(boleto.amount)}
                  </span>
                  <span className="flex items-center">
                    <CalendarIcon className="w-3 h-3 mr-1" />
                    {boleto.dueDate}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-6 text-center text-gray-500">
            {t('noNotifications')}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationPopover;
