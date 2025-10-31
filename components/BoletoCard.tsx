import React, { useState } from 'react';
import { Boleto, BoletoStatus } from '../types';
import { CalendarIcon, CheckIcon, DollarSignIcon, TrashIcon, ArrowRightIcon, BarcodeIcon, HashtagIcon, FileTextIcon, UserIcon, QrCodeIcon, CopyIcon } from './icons/Icons';
import { useLanguage } from '../contexts/LanguageContext';

interface BoletoCardProps {
  boleto: Boleto;
  onUpdateStatus: (id: string, newStatus: BoletoStatus) => void;
  onDelete: (id: string) => void;
}

const BoletoCard: React.FC<BoletoCardProps> = ({ boleto, onUpdateStatus, onDelete }) => {
  const { t, language } = useLanguage();
  const { id, recipient, drawee, documentDate, dueDate, amount, barcode, status, fileName, guideNumber, fileData, pixQrCodeText } = boleto;
  const [copyButtonText, setCopyButtonText] = useState(t('copyPixCode'));

  const formatDate = (dateString: string | null) => {
    if (!dateString) return t('notAvailable');
    // Handles YYYY-MM-DD
    const parts = dateString.split('-');
    if (parts.length === 3) {
      try {
        const date = new Date(`${dateString}T00:00:00`);
        return new Intl.DateTimeFormat(language === 'pt' ? 'pt-BR' : 'en-US').format(date);
      } catch (e) {
        return dateString;
      }
    }
    return dateString;
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return t('notAvailable');
    return value.toLocaleString(language === 'pt' ? 'pt-BR' : 'en-US', { 
        style: 'currency', 
        currency: language === 'pt' ? 'BRL' : 'USD' // Note: Currency symbol will change
    });
  };

  const handleOpenPdf = () => {
    if (!fileData) return;
    const byteCharacters = atob(fileData);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/pdf' });
    const fileURL = URL.createObjectURL(blob);
    window.open(fileURL, '_blank');
  };

  const handleCopyPix = () => {
    if (pixQrCodeText) {
        navigator.clipboard.writeText(pixQrCodeText).then(() => {
            setCopyButtonText(t('pixCodeCopied'));
            setTimeout(() => setCopyButtonText(t('copyPixCode')), 2000);
        });
    }
  };
  
  const getAction = () => {
    const baseButtonClasses = "w-full flex items-center justify-center px-3 py-2 text-sm font-medium text-white rounded-md transition-colors";
    switch (status) {
      case BoletoStatus.TO_PAY:
        return (
          <button
            onClick={() => onUpdateStatus(id, BoletoStatus.VERIFYING)}
            className={`${baseButtonClasses} bg-blue-600 hover:bg-blue-700`}
          >
            {t('markAsPaid')} <ArrowRightIcon className="w-4 h-4 ml-2" />
          </button>
        );
      case BoletoStatus.VERIFYING:
        return (
          <button
            onClick={() => onUpdateStatus(id, BoletoStatus.PAID)}
            className={`${baseButtonClasses} bg-yellow-500 hover:bg-yellow-600`}
          >
            {t('verifyPayment')} <CheckIcon className="w-4 h-4 ml-2" />
          </button>
        );
      case BoletoStatus.PAID:
        return <p className="text-sm font-semibold text-center text-green-600 py-2">{t('paymentCompleted')}</p>;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200 transition-shadow hover:shadow-lg animate-fade-in">
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0 pr-2">
            <h3 className="font-bold text-gray-800 break-words">{recipient || t('recipientNotFound')}</h3>
            {drawee && (
              <p className="text-sm text-gray-500 truncate" title={drawee}>
                <span className="font-normal">{t('drawee')}</span> {drawee}
              </p>
            )}
        </div>
        <button onClick={() => onDelete(id)} className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0">
          <TrashIcon className="w-5 h-5" />
        </button>
      </div>
      <p className="text-xs text-gray-400 mt-1 mb-3 truncate">{fileName}</p>
      
      <div className="space-y-2 text-sm text-gray-600">
         {documentDate && (
            <div className="flex items-center">
                <FileTextIcon className="w-4 h-4 mr-2 text-orange-500" />
                <span>{t('documentDate')} <span className="font-semibold">{formatDate(documentDate)}</span></span>
            </div>
         )}
        {dueDate && (
            <div className="flex items-center">
              <CalendarIcon className="w-4 h-4 mr-2 text-blue-500" />
              <span>{t('dueDate')} <span className="font-semibold">{formatDate(dueDate)}</span></span>
            </div>
        )}
        {(amount !== null && amount !== undefined) && (
            <div className="flex items-center">
              <DollarSignIcon className="w-4 h-4 mr-2 text-green-500" />
              <span>{t('amount')} <span className="font-semibold">{formatCurrency(amount)}</span></span>
            </div>
        )}
        {guideNumber && (
            <div className="flex items-center">
                <HashtagIcon className="w-4 h-4 mr-2 text-gray-500" />
                <span>{t('guideNumber')} <span className="font-semibold">{guideNumber}</span></span>
            </div>
        )}
        {barcode && (
            <div className="flex items-start">
              <BarcodeIcon className="w-4 h-4 mr-2 text-gray-500 mt-0.5 flex-shrink-0" />
              <span className="break-all">{t('barcode')} <span className="font-mono text-xs">{barcode}</span></span>
            </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center space-x-2">
            <div className="flex-1">
                {getAction()}
            </div>
             <button
                title={t('openPdf')}
                onClick={handleOpenPdf}
                disabled={!fileData}
                className="flex-shrink-0 flex items-center justify-center p-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <FileTextIcon className="w-5 h-5" />
            </button>
        </div>
      </div>

      {pixQrCodeText && (
        <div className="mt-4 pt-4 border-t border-gray-100 text-center">
            <div className="flex items-center justify-center font-semibold text-gray-700 mb-2">
                <QrCodeIcon className="w-5 h-5 mr-2" />
                <span>{t('pixQrCode')}</span>
            </div>
            <button 
                onClick={handleCopyPix}
                className="mt-2 flex items-center justify-center w-full px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-all duration-200"
            >
                <CopyIcon className="w-4 h-4 mr-2" />
                {copyButtonText}
            </button>
        </div>
      )}
    </div>
  );
};

export default BoletoCard;
