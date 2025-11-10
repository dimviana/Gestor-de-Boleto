import React from 'react';
import { Boleto } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import Modal from './Modal';
import { FileTextIcon, CalendarIcon, DollarSignIcon, BarcodeIcon, IdIcon, UserIcon, QrCodeIcon, CopyIcon, CheckIcon } from './icons/Icons';
import Spinner from './Spinner';

interface BoletoDetailsModalProps {
  boleto: Boleto;
  isLoading: boolean;
  onClose: () => void;
}

// Reusable component for displaying a piece of data
const DetailItem: React.FC<{ icon: React.ReactNode; label: string; value?: string | number | null; children?: React.ReactNode; mono?: boolean; }> = ({ icon, label, value, children, mono }) => {
  if (!value && !children) return null;

  return (
    <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
        {icon}
        <span className="ml-2">{label}</span>
      </dt>
      <dd className={`mt-1 text-sm text-gray-900 dark:text-gray-100 sm:mt-0 sm:col-span-2 ${mono ? 'font-mono' : ''}`}>
        {value}
        {children}
      </dd>
    </div>
  );
};

export const BoletoDetailsModal: React.FC<BoletoDetailsModalProps> = ({ boleto, isLoading, onClose }) => {
  const { t, language } = useLanguage();
  const [pixCopied, setPixCopied] = React.useState(false);
  const [barcodeCopied, setBarcodeCopied] = React.useState(false);

  const handleOpenPdf = () => {
    if (!boleto.fileData) return;
    const byteCharacters = atob(boleto.fileData);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/pdf' });
    const fileURL = URL.createObjectURL(blob);
    window.open(fileURL, '_blank');
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return t('notAvailable');
    try {
      const date = new Date(`${dateString}T00:00:00`);
      return new Intl.DateTimeFormat(language === 'pt' ? 'pt-BR' : 'en-US').format(date);
    } catch (e) { return dateString; }
  };
  
  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return t('notAvailable');
    return value.toLocaleString('pt-BR', { 
        style: 'currency', 
        currency: 'BRL'
    });
  };

  const handleCopy = (text: string, type: 'pix' | 'barcode') => {
    navigator.clipboard.writeText(text).then(() => {
        if (type === 'pix') {
            setPixCopied(true);
            setTimeout(() => setPixCopied(false), 2000);
        } else {
            setBarcodeCopied(true);
            setTimeout(() => setBarcodeCopied(false), 2000);
        }
    });
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={t('boletoDetailsTitle')}>
        {isLoading ? (
            <div className="flex justify-center items-center h-64">
                <Spinner />
            </div>
        ) : (
            <>
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    <dl>
                        <DetailItem icon={<UserIcon className="w-5 h-5"/>} label={t('recipient')} value={boleto.recipient}/>
                        <DetailItem icon={<UserIcon className="w-5 h-5"/>} label={t('drawee')} value={boleto.drawee}/>
                        <DetailItem icon={<DollarSignIcon className="w-5 h-5"/>} label={t('amount')} value={formatCurrency(boleto.amount)}/>
                        <DetailItem icon={<CalendarIcon className="w-5 h-5"/>} label={t('dueDate')} value={formatDate(boleto.dueDate)}/>
                        <DetailItem icon={<IdIcon className="w-5 h-5"/>} label={t('guideNumber')} value={boleto.guideNumber}/>
                        <DetailItem icon={<CalendarIcon className="w-5 h-5"/>} label={t('documentDate')} value={formatDate(boleto.documentDate)}/>
                        <DetailItem icon={<BarcodeIcon className="w-5 h-5"/>} label={t('barcode')} mono>
                            <div className="flex items-center justify-between">
                                <span className="break-all">{boleto.barcode}</span>
                                {boleto.barcode && (
                                    <button onClick={() => handleCopy(boleto.barcode!, 'barcode')} className="ml-4 p-1.5 text-gray-500 hover:text-blue-600 rounded-md focus:outline-none ring-1 ring-transparent focus:ring-blue-500">
                                        {barcodeCopied ? <CheckIcon className="w-5 h-5 text-green-500"/> : <CopyIcon className="w-5 h-5"/>}
                                    </button>
                                )}
                            </div>
                        </DetailItem>
                        <DetailItem icon={<QrCodeIcon className="w-5 h-5"/>} label={t('pixQrCodeText')}>
                            {boleto.pixQrCodeText ? (
                                <button onClick={() => handleCopy(boleto.pixQrCodeText!, 'pix')} className="w-full mt-1 p-2 bg-gray-100 dark:bg-gray-700 rounded-md text-left flex items-center justify-between hover:bg-gray-200 dark:hover:bg-gray-600">
                                    <span className="text-sm font-medium">{pixCopied ? t('pixCodeCopied') : t('copyPixCode')}</span>
                                    {pixCopied ? <CheckIcon className="w-5 h-5 text-green-500"/> : <CopyIcon className="w-5 h-5 text-gray-500"/>}
                                </button>
                            ) : (
                                <span className="text-sm text-gray-500">{t('notAvailable')}</span>
                            )}
                        </DetailItem>
                    </dl>
                </div>
                
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 flex justify-center">
                        <button
                            onClick={handleOpenPdf}
                            disabled={!boleto.fileData}
                            className="flex items-center px-6 py-3 font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <FileTextIcon className="w-6 h-6 mr-3" />
                            {t('openPdf')}
                        </button>
                </div>
            </>
        )}
    </Modal>
  );
};