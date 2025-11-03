import React, { useState } from 'react';
import { Boleto, BoletoStatus } from '../types';
import { CalendarIcon, CheckIcon, DollarSignIcon, TrashIcon, ArrowRightIcon, BarcodeIcon, IdIcon, FileTextIcon, UserIcon, QrCodeIcon, CopyIcon, ChatBubbleIcon } from './icons/Icons';
import { useLanguage } from '../contexts/LanguageContext';

interface BoletoCardProps {
  boleto: Boleto;
  onUpdateStatus: (id: string, newStatus: BoletoStatus) => void;
  onDelete: (id: string) => void;
  onUpdateComments: (id: string, comments: string) => void;
  isSelected: boolean;
  onToggleSelection: (id: string) => void;
  onViewDetails: (boleto: Boleto) => void;
}

const BoletoCard: React.FC<BoletoCardProps> = ({ boleto, onUpdateStatus, onDelete, onUpdateComments, isSelected, onToggleSelection, onViewDetails }) => {
  const { t, language } = useLanguage();
  const { id, recipient, drawee, documentDate, dueDate, amount, discount, interestAndFines, barcode, status, fileName, guideNumber, fileData, pixQrCodeText, comments } = boleto;
  const [copyButtonText, setCopyButtonText] = useState(t('copyPixCode'));
  const [barcodeCopied, setBarcodeCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [commentText, setCommentText] = useState(comments || '');

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
    if (value === null || value === undefined) return t('notAvailable');
    return value.toLocaleString('pt-BR', { 
        style: 'currency', 
        currency: 'BRL'
    });
  };

  const handleOpenPdf = (e: React.MouseEvent) => {
    e.stopPropagation();
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

  const handleCopyPix = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (pixQrCodeText) {
        navigator.clipboard.writeText(pixQrCodeText).then(() => {
            setCopyButtonText(t('pixCodeCopied'));
            setTimeout(() => setCopyButtonText(t('copyPixCode')), 2000);
        });
    }
  };

  const handleCopyBarcode = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (barcode) {
        navigator.clipboard.writeText(barcode).then(() => {
            setBarcodeCopied(true);
            setTimeout(() => setBarcodeCopied(false), 2000);
        });
    }
  };
  
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('boletoId', id);
    e.dataTransfer.setData('sourceStatus', status);
    e.dataTransfer.effectAllowed = 'move';
    setIsDragging(true);
  };
  
  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const toggleCommentSection = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCommentOpen(!isCommentOpen);
  };

  const handleSaveComment = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateComments(id, commentText);
    setIsCommentOpen(false);
  };

  const getAction = () => {
    const baseButtonClasses = "w-full flex items-center justify-center px-3 py-2 text-sm font-medium text-white rounded-md transition-colors";
    const handleActionClick = (e: React.MouseEvent, newStatus: BoletoStatus) => {
        e.stopPropagation();
        onUpdateStatus(id, newStatus);
    };

    switch (status) {
      case BoletoStatus.TO_PAY:
        return (
          <button
            onClick={(e) => handleActionClick(e, BoletoStatus.VERIFYING)}
            className={`${baseButtonClasses} bg-blue-600 hover:bg-blue-700`}
          >
            {t('markAsPaid')} <ArrowRightIcon className="w-4 h-4 ml-2" />
          </button>
        );
      case BoletoStatus.VERIFYING:
        return (
          <button
            onClick={(e) => handleActionClick(e, BoletoStatus.PAID)}
            className={`${baseButtonClasses} bg-yellow-500 hover:bg-yellow-600`}
          >
            {t('verifyPayment')} <CheckIcon className="w-4 h-4 ml-2" />
          </button>
        );
      case BoletoStatus.PAID:
        return <p className="text-sm font-semibold text-center text-green-600 dark:text-green-400 py-2">{t('paymentCompleted')}</p>;
      default:
        return null;
    }
  };

  return (
    <div 
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`bg-white dark:bg-gray-700 rounded-lg shadow-md dark:shadow-lg p-4 border transition-all duration-200 hover:shadow-xl hover:-translate-y-1 animate-fade-in cursor-pointer
      ${isSelected ? 'border-blue-500 ring-2 ring-blue-500/30' : 'border-gray-200 dark:border-gray-600'}
      ${isDragging ? 'opacity-50' : ''}`}
      onClick={() => onToggleSelection(id)}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0 pr-2">
            <h3 
              className="font-bold text-gray-800 dark:text-gray-100 break-words cursor-pointer hover:underline"
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails(boleto);
              }}
            >
              {drawee || recipient || t('recipientNotFound')}
            </h3>
            {recipient && (
              <div className="flex items-center mt-1">
                <UserIcon className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate" title={recipient}>
                  <span className="font-normal">{t('recipient')}:</span> {recipient}
                </p>
              </div>
            )}
        </div>
        <div className="flex items-center space-x-2 flex-shrink-0">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onDelete(id);
            }} 
            className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
          >
            <TrashIcon className="w-5 h-5" />
          </button>
          <input
            type="checkbox"
            className="h-5 w-5 rounded text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-500 dark:bg-gray-600 dark:focus:ring-offset-gray-700 cursor-pointer"
            checked={isSelected}
            readOnly // The card's onClick handles the logic
          />
        </div>
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 mb-3 truncate">{fileName}</p>
      
      <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
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
        {(discount !== null && discount > 0) && (
            <div className="flex items-center">
                <DollarSignIcon className="w-4 h-4 mr-2 text-red-500" />
                <span>{t('discount')} <span className="font-semibold text-red-600 dark:text-red-400">{formatCurrency(discount)}</span></span>
            </div>
        )}
        {(interestAndFines !== null && interestAndFines > 0) && (
            <div className="flex items-center">
                <DollarSignIcon className="w-4 h-4 mr-2 text-orange-500" />
                <span>{t('interestAndFines')} <span className="font-semibold text-orange-600 dark:text-orange-400">{formatCurrency(interestAndFines)}</span></span>
            </div>
        )}
        {guideNumber && (
            <div className="flex items-center">
                <IdIcon className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" />
                <span>{t('guideNumber')} <span className="font-semibold">{guideNumber}</span></span>
            </div>
        )}
        {barcode && (
            <div className="flex items-start justify-between">
              <div className="flex items-start flex-1 min-w-0">
                <BarcodeIcon className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                <span className="break-all">{t('barcode')} <span className="font-mono text-xs">{barcode}</span></span>
              </div>
              <button
                onClick={handleCopyBarcode}
                title={t('copyBarcode')}
                className="ml-2 p-1 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors flex-shrink-0 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-700 focus:ring-blue-500"
              >
                {barcodeCopied ? <CheckIcon className="w-4 h-4 text-green-500" /> : <CopyIcon className="w-4 h-4" />}
              </button>
            </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-600 space-y-2">
        <div className="flex items-center space-x-2">
            <div className="flex-1">
                {getAction()}
            </div>
            <button
                title={t('addComment')}
                onClick={toggleCommentSection}
                className={`flex-shrink-0 flex items-center justify-center p-2 text-sm font-medium rounded-md transition-colors ${
                    comments ? 'text-blue-600 bg-blue-100 dark:bg-blue-900/50 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900' : 'text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500'
                }`}
            >
                <ChatBubbleIcon className="w-5 h-5" />
            </button>
        </div>
        <div>
            <button
                title={t('openPdf')}
                onClick={handleOpenPdf}
                disabled={!fileData}
                className="w-full flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <FileTextIcon className="w-4 h-4 mr-2" />
                <span>{t('openPdf')}</span>
            </button>
        </div>
      </div>

      {!isCommentOpen && comments && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-600">
            <p className="text-xs text-gray-500 dark:text-gray-400 italic whitespace-pre-wrap break-words">
                <strong>{t('commentsLabel')}:</strong> {comments}
            </p>
        </div>
      )}

      {isCommentOpen && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-600" onClick={e => e.stopPropagation()}>
            <label htmlFor={`comment-${id}`} className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('addCommentLabel')}</label>
            <textarea
                id={`comment-${id}`}
                rows={3}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={t('commentPlaceholder')}
                className="mt-1 w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-200"
            />
            <div className="flex justify-end mt-2">
                <button
                    onClick={handleSaveComment}
                    className="px-4 py-1.5 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                    {t('saveCommentButton')}
                </button>
            </div>
        </div>
      )}

      {pixQrCodeText && (
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-600 text-center">
            <div className="flex items-center justify-center font-semibold text-gray-700 dark:text-gray-200 mb-2">
                <QrCodeIcon className="w-5 h-5 mr-2" />
                <span>{t('pixQrCode')}</span>
            </div>
            <button 
                onClick={handleCopyPix}
                className="mt-2 flex items-center justify-center w-full px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500 transition-all duration-200"
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