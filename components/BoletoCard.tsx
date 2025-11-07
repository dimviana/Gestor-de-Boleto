import React, { useState } from 'react';
import { Boleto, BoletoStatus, Role } from '../types';
import { HashtagIcon, CalendarIcon, CheckIcon, DollarSignIcon, TrashIcon, ArrowRightIcon, BarcodeIcon, IdIcon, FileTextIcon, UserIcon, QrCodeIcon, CopyIcon, ChatBubbleIcon, DownloadIcon, ArrowDownIcon, ArrowUpIcon } from './icons/Icons';
import { useLanguage } from '../contexts/LanguageContext';

interface BoletoCardProps {
  boleto: Boleto;
  onUpdateStatus: (id: string, newStatus: BoletoStatus) => void;
  onDelete: (id: string) => void;
  onUpdateComments: (id: string, comments: string) => void;
  isSelected: boolean;
  onToggleSelection: (id: string) => void;
  onViewPdf: (boleto: Boleto) => void;
  onViewDetails: (boleto: Boleto) => void;
  userRole: Role;
}

const BoletoCard: React.FC<BoletoCardProps> = ({ boleto, onUpdateStatus, onDelete, onUpdateComments, isSelected, onToggleSelection, onViewPdf, onViewDetails, userRole }) => {
  const { t, language } = useLanguage();
  const { id, recipient, drawee, documentDate, dueDate, documentAmount, amount, discount, interestAndFines, barcode, status, fileName, guideNumber, fileData, pixQrCodeText, comments } = boleto;
  const [pixCopied, setPixCopied] = useState(false);
  const [barcodeCopied, setBarcodeCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [commentText, setCommentText] = useState(comments || '');

  const formatDate = (dateString: string | null) => {
    if (!dateString) return t('notAvailable');
    try {
      const date = new Date(`${dateString}T00:00:00`);
      return new Intl.DateTimeFormat(language === 'pt' ? 'pt-BR' : 'en-US').format(date);
    } catch (e) {
      return dateString;
    }
  };

  const formatCurrency = (value: number | null, options: { color?: boolean } = {}) => {
    if (value === null || value === undefined) return t('notAvailable');
    const formatted = value.toLocaleString('pt-BR', { 
        style: 'currency', 
        currency: 'BRL'
    });
    if (!options.color) return formatted;
    
    if (value > 0) return <span className="text-orange-600 dark:text-orange-400 font-semibold">{`+ ${formatted}`}</span>
    if (value < 0) return <span className="text-red-600 dark:text-red-400 font-semibold">{`- ${formatted.replace("R$", "")}`}</span>
    return formatted;
  };

  const handleDownloadPdf = (e: React.MouseEvent) => {
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
    const link = document.createElement('a');
    link.href = fileURL;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(fileURL);
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
    const baseButtonClasses = "w-full flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-white rounded-lg transition-colors";
    const handleActionClick = (e: React.MouseEvent, newStatus: BoletoStatus) => {
        e.stopPropagation();
        onUpdateStatus(id, newStatus);
    };

    if (userRole === 'viewer') {
        let statusText = '';
        let statusColor = 'text-gray-500 dark:text-gray-400';
        switch (status) {
            case BoletoStatus.TO_PAY:
                statusText = t('kanbanTitleToDo');
                statusColor = 'text-red-500 dark:text-red-400';
                break;
            case BoletoStatus.VERIFYING:
                statusText = t('kanbanTitleVerifying');
                statusColor = 'text-yellow-500 dark:text-yellow-400';
                break;
            case BoletoStatus.PAID:
                statusText = t('kanbanTitlePaid');
                statusColor = 'text-green-500 dark:text-green-400';
                break;
        }
        return <p className={`text-sm font-semibold text-center py-2 ${statusColor}`}>{statusText}</p>;
    }

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

  const FinancialRow: React.FC<{ label: string, value: React.ReactNode }> = ({ label, value}) => {
    if (value === null || value === undefined || value === t('notAvailable')) return null;
    return (
        <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500 dark:text-gray-400">{label}</span>
            <span className="text-gray-800 dark:text-gray-200">{value}</span>
        </div>
    );
  };

  return (
    <>
    <div 
      draggable={userRole !== 'viewer'}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-lg p-4 border transition-all duration-200 hover:shadow-xl hover:-translate-y-1
      ${isSelected ? 'border-blue-500 ring-2 ring-blue-500/30' : 'border-gray-200 dark:border-slate-700'}
      ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0 pr-2">
            <h3 className="font-extrabold text-lg text-gray-800 dark:text-gray-100 break-words">
              {drawee || recipient || t('recipientNotFound')}
            </h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate" title={fileName}>{fileName}</p>
        </div>
        <div className="flex items-center space-x-2 flex-shrink-0">
          {userRole !== 'viewer' && (
            <>
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
                className="h-5 w-5 rounded text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:focus:ring-offset-gray-800 cursor-pointer"
                checked={isSelected}
                onClick={(e) => e.stopPropagation()}
                onChange={() => onToggleSelection(id)}
              />
            </>
          )}
        </div>
      </div>

       <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
            <div className="flex justify-between items-baseline">
                <div>
                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('dueDate').replace(':', '')}</p>
                    <p className="text-2xl font-extrabold text-red-500 dark:text-red-400">{formatDate(dueDate)}</p>
                </div>
                 <div className="text-right">
                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('amount').replace(':', '')}</p>
                    <p className="text-3xl font-extrabold text-green-500 dark:text-green-400">{formatCurrency(amount)}</p>
                </div>
            </div>
            {(documentAmount || discount || interestAndFines) && (
                <div className="mt-3 pt-3 border-t border-dashed border-gray-200 dark:border-slate-600 space-y-1">
                    <FinancialRow label={t('documentAmount')} value={formatCurrency(documentAmount)} />
                    <FinancialRow label={t('discount')} value={formatCurrency(discount, { color: true })} />
                    <FinancialRow label={t('interestAndFines')} value={formatCurrency(interestAndFines, { color: true })} />
                </div>
            )}
        </div>
      
      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700 space-y-3">
        <div className="flex items-center space-x-2">
            <div className="flex-1">
                {getAction()}
            </div>
            {userRole !== 'viewer' && (
              <button
                  title={t('addComment')}
                  onClick={toggleCommentSection}
                  className={`flex-shrink-0 flex items-center justify-center p-3 rounded-md transition-colors ${
                      comments ? 'text-blue-600 bg-blue-100 dark:bg-blue-900/50 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900' : 'text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-600/50 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
              >
                  <ChatBubbleIcon className="w-5 h-5" />
              </button>
            )}
        </div>
        <div className="flex items-center justify-center space-x-4">
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onViewDetails(boleto);
                }}
                className="flex items-center text-sm font-medium text-purple-600 dark:text-purple-400 hover:underline"
            >
                <IdIcon className="w-4 h-4 mr-1.5" />
                <span>{t('viewDetails')}</span>
            </button>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onViewPdf(boleto);
                }}
                disabled={!fileData}
                className="flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <FileTextIcon className="w-4 h-4 mr-1.5" />
                <span>{t('openPdf')}</span>
            </button>
            <button
                onClick={handleDownloadPdf}
                disabled={!fileData}
                className="flex items-center text-sm font-medium text-green-600 dark:text-green-400 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <DownloadIcon className="w-4 h-4 mr-1.5" />
                <span>{t('downloadPdfButton')}</span>
            </button>
        </div>
      </div>
      
      {!isCommentOpen && comments && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 italic whitespace-pre-wrap break-words">
                <strong>{t('commentsLabel')}:</strong> {comments}
            </p>
        </div>
      )}

      {isCommentOpen && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700" onClick={e => e.stopPropagation()}>
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
    </div>
    <style>{`
      @keyframes fade-in-up-fast {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      .animate-fade-in-up-fast {
        animation: fade-in-up-fast 0.3s ease-out forwards;
      }
    `}</style>
    </>
  );
};

export default BoletoCard;