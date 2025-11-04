import React from 'react';
import { Boleto } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import Modal from './Modal';
import { CalendarIcon, DollarSignIcon, BarcodeIcon, IdIcon, UserIcon, QrCodeIcon, FileTextIcon } from './icons/Icons';

interface BoletoConfirmationModalProps {
  boleto: Omit<Boleto, 'id' | 'status' | 'comments' | 'companyId'>;
  onConfirm: () => void;
  onCancel: () => void;
}

const BoletoConfirmationModal: React.FC<BoletoConfirmationModalProps> = ({ boleto, onConfirm, onCancel }) => {
  const { t, language } = useLanguage();

  const formatDate = (dateString: string | null) => {
    if (!dateString) return <span className="italic text-gray-500">{t('notAvailable')}</span>;
    try {
      const date = new Date(`${dateString}T00:00:00`);
      return new Intl.DateTimeFormat(language === 'pt' ? 'pt-BR' : 'en-US').format(date);
    } catch (e) {
      return dateString;
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return <span className="italic text-gray-500">{t('notAvailable')}</span>;
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const DetailRow: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode; mono?: boolean }> = ({ icon, label, value, mono }) => {
      if (!value) return null;
      return (
          <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4 items-center">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                  {icon}
                  <span className="ml-2">{label}</span>
              </dt>
              <dd className={`mt-1 text-sm text-gray-900 dark:text-gray-100 sm:mt-0 sm:col-span-2 break-words ${mono ? 'font-mono text-xs' : ''}`}>
                  {value}
              </dd>
          </div>
      );
  };


  return (
    <Modal isOpen={true} onClose={onCancel} title={t('confirmExtractionTitle')}>
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">{t('confirmExtractionMessage')}</p>
        
        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
            <dl>
                <DetailRow icon={<FileTextIcon className="w-5 h-5"/>} label={t('fileNameLabel')} value={boleto.fileName} />
                <DetailRow icon={<UserIcon className="w-5 h-5"/>} label={t('recipient')} value={boleto.recipient} />
                <DetailRow icon={<UserIcon className="w-5 h-5"/>} label={t('drawee')} value={boleto.drawee} />
                <DetailRow icon={<DollarSignIcon className="w-5 h-5 text-green-500"/>} label={t('amount')} value={<span className="font-bold text-lg text-green-600 dark:text-green-400">{formatCurrency(boleto.amount)}</span>} />
                <DetailRow icon={<CalendarIcon className="w-5 h-5 text-red-500"/>} label={t('dueDate')} value={<span className="font-bold text-lg text-red-600 dark:text-red-400">{formatDate(boleto.dueDate)}</span>} />
                <DetailRow icon={<DollarSignIcon className="w-5 h-5"/>} label={t('discount')} value={formatCurrency(boleto.discount)} />
                <DetailRow icon={<DollarSignIcon className="w-5 h-5"/>} label={t('interestAndFines')} value={formatCurrency(boleto.interestAndFines)} />
                <DetailRow icon={<BarcodeIcon className="w-5 h-5"/>} label={t('barcode')} value={boleto.barcode} mono />
                <DetailRow icon={<IdIcon className="w-5 h-5"/>} label={t('guideNumber')} value={boleto.guideNumber} />
                <DetailRow icon={<CalendarIcon className="w-5 h-5"/>} label={t('documentDate')} value={formatDate(boleto.documentDate)} />
                <DetailRow icon={<QrCodeIcon className="w-5 h-5"/>} label={t('pixQrCode')} value={boleto.pixQrCodeText} mono/>
            </dl>
        </div>

        <div className="flex justify-end pt-4 space-x-4">
          <button
            onClick={onCancel}
            className="px-6 py-2 font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          >
            {t('cancelButton')}
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-2 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            {t('confirmAndSaveButton')}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default BoletoConfirmationModal;
