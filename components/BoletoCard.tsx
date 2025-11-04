

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
  userRole: Role;
}

const BoletoCard: React.FC<BoletoCardProps> = ({ boleto, onUpdateStatus, onDelete, onUpdateComments, isSelected, onToggleSelection, onViewPdf, userRole }) => {
  const { t, language } = useLanguage();
  const { id, recipient, drawee, documentDate, dueDate, amount, discount, interestAndFines, barcode, status, fileName, guideNumber, fileData, pixQrCodeText, comments } = boleto;
  const [pixCopied, setPixCopied] = useState(false);
  const [barcodeCopied, setBarcodeCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [commentText, setCommentText] = useState(comments || '');
  const [isDetailsOpen, setIsDetailsOpen] = useState(true);


  const formatDate = (dateString: string | null) => {
    if (!dateString) return t('notAvailable');
    try {
      const date = new Date(`${dateString}T00:00:00`);
      return new Intl.DateTimeFormat(language === 'pt' ? 'pt-BR' : 'en-US').format(date);
    } catch (e) {
      return dateString;
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return t('notAvailable');
    return value.toLocaleString('pt-BR', { 
        style: 'currency', 
        currency: 'BRL'
    });
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

  const handleCopyPix = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (pixQrCodeText) {
        navigator.clipboard.writeText(pixQrCodeText).then(() => {
            setPixCopied(true);
            setTimeout(() => setPixCopied(false), 2000);
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

  const DetailItem: React.FC<{ icon: React.ReactNode; label: string; value: string | null; onCopy?: (e: React.MouseEvent) => void; copyState?: boolean; copyLabel?: string; }> = ({ icon, label, value, onCopy, copyState, copyLabel }) => {
    if (!value && value !== 0) return null;
    return (
      <div className="flex items-start">
        <div className="flex-shrink-0 w-5 h-5 text-gray-400 dark:text-gray-500">{icon}</div>
        <div className="ml-3 flex-1 min-w-0">
            <p className="text-sm text-gray-600 dark:text-gray-300 break-words">
                <span className="font-medium">{label} </span>
                <span className={`${label.toLowerCase().includes('barras') ? 'font-mono text-xs' : ''}`}>{value}</span>
            </p>
        </div>
        {onCopy && (
            <button onClick={onCopy} title={copyLabel} className="ml-2 p-1 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors flex-shrink-0 rounded-md">
                {copyState ? <CheckIcon className="w-4 h-4 text-green-500" /> : <CopyIcon className="w-4 h-4" />}
            </button>
        )}
      </div>
    );
  };

  const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="mt-4">
        <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">{title}</h4>
        <div className="space-y-3 p-3 bg-gray-50 dark:bg-slate-900/50 rounded-md border border-gray-200 dark:border-slate-700/50">
            {children}
        </div>
    </div>
  );

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

      <div className="grid grid-cols-2 gap-x-6 my-4 border-t border-gray-100 dark:border-slate-700 pt-4">
          <div>
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('amount')}</p>
              <p className="text-2xl font-extrabold text-green-500 dark:text-green-400">{formatCurrency(amount)}</p>
          </div>
          <div>
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('dueDate')}</p>
              <p className="text-2xl font-extrabold text-blue-500 dark:text-blue-400">{formatDate(dueDate)}</p>
          </div>
      </div>
      
      <div 
        onClick={(e) => {
            e.stopPropagation();
            setIsDetailsOpen(!isDetailsOpen);
        }}
        className="mt-2 pt-2 border-t border-gray-100 dark:border-slate-700 cursor-pointer"
      >
        <button className="w-full flex justify-center items-center text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline">
          {isDetailsOpen ? t('hideDetails') : t('showMoreDetails')}
          {isDetailsOpen ? <ArrowUpIcon className="w-4 h-4 ml-1" /> : <ArrowDownIcon className="w-4 h-4 ml-1" />}
        </button>
      </div>

      {isDetailsOpen && (
        <div className="animate-fade-in-up-fast mt-2">
            <Section title={t('parties')}>
                <DetailItem icon={<UserIcon />} label={`${t('recipient')}:`} value={recipient} />
                <DetailItem icon={<UserIcon />} label={`${t('drawee')}:`} value={drawee} />
            </Section>

            {(discount || interestAndFines) ? (
                <Section title={t('detailedValues')}>
                    <DetailItem icon={<DollarSignIcon />} label={`${t('discount')}:`} value={formatCurrency(discount)} />
                    <DetailItem icon={<DollarSignIcon />} label={`${t('interestAndFines')}:`} value={formatCurrency(interestAndFines)} />
                </Section>
            ) : null}

            <Section title={t('documentInfo')}>
                <DetailItem icon={<CalendarIcon />} label={`${t('documentDate')}:`} value={formatDate(documentDate)} />
                <DetailItem icon={<IdIcon />} label={`${t('guideNumber')}:`} value={guideNumber} />
            </Section>

            {(barcode || pixQrCodeText) && (
                 <Section title={t('paymentCodes')}>
                    <DetailItem 
                        icon={<BarcodeIcon />} 
                        label={`${t('barcode')}:`} 
                        value={barcode}
                        onCopy={handleCopyBarcode}
                        copyState={barcodeCopied}
                        copyLabel={t('copyBarcode')}
                    />
                    {pixQrCodeText && (
                        <div className="flex items-start">
                            <div className="flex-shrink-0 w-5 h-5 text-gray-400 dark:text-gray-500"><QrCodeIcon /></div>
                            <div className="ml-3 flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{t('pixQrCode')}</p>
                                <div className="relative mt-1 p-3 bg-gray-100 dark:bg-slate-900 rounded-md">
                                    <p className="text-xs text-gray-600 dark:text-gray-300 font-mono break-all pr-10 leading-relaxed">
                                        {pixQrCodeText}
                                    </p>
                                    <button
                                        onClick={handleCopyPix}
                                        title={t('copyPixCode')}
                                        className="absolute top-2 right-2 p-1.5 text-gray-500 hover:text-blue-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        {pixCopied ? <CheckIcon className="w-5 h-5 text-green-500" /> : <CopyIcon className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </Section>
            )}
        </div>
      )}

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
        <div className="flex items-center justify-center space-x-6">
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