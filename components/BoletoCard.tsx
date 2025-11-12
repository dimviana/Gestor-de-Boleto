import React, { useState, useEffect, useRef } from 'react';
import { Boleto, BoletoStatus, Role, CardFieldVisibility } from '../types';
import { CalendarIcon, CheckIcon, DollarSignIcon, TrashIcon, ArrowRightIcon, BarcodeIcon, FileTextIcon, UserIcon, QrCodeIcon, CopyIcon, ChatBubbleIcon, DownloadIcon, HashtagIcon, UploadIcon } from './icons/Icons';
import { useLanguage } from '../contexts/LanguageContext';
import { TranslationKey } from '../translations';
import { useNotification } from '../contexts/NotificationContext';

interface BoletoCardProps {
  boleto: Boleto;
  onUpdateStatus: (id: string, newStatus: BoletoStatus) => void;
  onDelete: (id: string) => void;
  onUpdateComments: (id: string, comments: string) => void;
  onUploadProof: (id: string, file: File) => Promise<void>;
  isSelected: boolean;
  onToggleSelection: (id: string) => void;
  userRole: Role;
}

const CARD_VISIBILITY_KEY = 'card_field_visibility';

const defaultVisibility: CardFieldVisibility = {
    recipient: true,
    drawee: false,
    documentDate: false,
    dueDate: true,
    amount: true,
    documentAmount: false,
    discount: false,
    interestAndFines: false,
    barcode: true,
    guideNumber: true,
    pixQrCodeText: true,
    fileName: true,
};


const BoletoCard: React.FC<BoletoCardProps> = ({ boleto, onUpdateStatus, onDelete, onUpdateComments, onUploadProof, isSelected, onToggleSelection, userRole }) => {
  const { t, language } = useLanguage();
  const { addNotification } = useNotification();
  const { id, status, fileData, comments, extractedData } = boleto;
  
  const [pixCopied, setPixCopied] = useState(false);
  const [barcodeCopied, setBarcodeCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [commentText, setCommentText] = useState(comments || '');
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [visibility, setVisibility] = useState<CardFieldVisibility>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States for animations
  const [isMounted, setIsMounted] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    // Set a minimal timeout to ensure the component is rendered before starting the transition
    const timer = setTimeout(() => setIsMounted(true), 10);
    return () => clearTimeout(timer);
  }, []); // Run only on mount

  useEffect(() => {
    try {
        const storedVisibility = localStorage.getItem(CARD_VISIBILITY_KEY);
        if (storedVisibility) {
            setVisibility(JSON.parse(storedVisibility));
        } else {
            setVisibility(defaultVisibility);
        }
    } catch (e) {
        console.error("Failed to parse card visibility settings:", e);
        setVisibility(defaultVisibility);
    }
  }, []);

  const displayRecipient = extractedData?.recipient || boleto.recipient;
  const displayDrawee = extractedData?.drawee || boleto.drawee;
  const displayDueDate = extractedData?.dueDate || boleto.dueDate;
  const displayAmount = extractedData?.amount ?? boleto.amount;
  const displayBarcode = extractedData?.barcode || boleto.barcode;
  const displayGuideNumber = extractedData?.guideNumber || boleto.guideNumber;
  const displayPixCode = extractedData?.pixQrCodeText || boleto.pixQrCodeText;
  const displayFileName = extractedData?.fileName || boleto.fileName;
  const displayDocumentAmount = extractedData?.documentAmount ?? boleto.documentAmount;
  const displayDiscount = extractedData?.discount ?? boleto.discount;
  const displayInterestAndFines = extractedData?.interestAndFines ?? boleto.interestAndFines;
  const displayDocumentDate = extractedData?.documentDate || boleto.documentDate;

  const toggleDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDetailsOpen(!isDetailsOpen);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return t('notAvailable');
    try {
        // Use Date.UTC to create a UTC date object to avoid local timezone shifts
        const [year, month, day] = dateString.split('-').map(Number);
        const date = new Date(Date.UTC(year, month - 1, day));
        if (isNaN(date.getTime())) {
            return t('notAvailable');
        }
        return new Intl.DateTimeFormat(language === 'pt' ? 'pt-BR' : 'en-US', {
            timeZone: 'UTC' // Format it as if it's UTC, preserving the original day
        }).format(date);
    } catch (e) {
        // Fallback for any other unexpected errors during date processing
        return t('notAvailable');
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return t('notAvailable');
    return value.toLocaleString('pt-BR', { 
        style: 'currency', 
        currency: 'BRL'
    });
  };

  const handleCopy = (text: string | null, type: 'pix' | 'barcode') => {
    if (!text) return;
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
    link.download = displayFileName;
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

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(t('confirmBoletoDeletion' as TranslationKey, { guideNumber: displayGuideNumber || 'N/A' }))) {
      setIsDeleting(true); // Trigger the exit animation
      // Call the actual delete function after the animation duration
      setTimeout(() => {
        onDelete(id);
      }, 300); // This duration must match the transition duration
    }
  };

  const handleAttachProofClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
      e.stopPropagation();
      if (e.target.files && e.target.files.length > 0) {
          const file = e.target.files[0];
          try {
            await onUploadProof(id, file);
          } catch (error: any) {
            console.error("Failed to upload proof:", error);
            addNotification(error.message || 'Failed to upload proof', 'error');
          }
      }
      if (e.target) {
          e.target.value = '';
      }
  };

  const handleViewProof = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!boleto.paymentProof) return;
    const byteCharacters = atob(boleto.paymentProof);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/pdf' });
    const fileURL = URL.createObjectURL(blob);
    window.open(fileURL, '_blank');
  };

  const getAction = () => {
    const baseButtonClasses = "w-full flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-white rounded-lg transition-colors";
    const handleActionClick = (e: React.MouseEvent, newStatus: BoletoStatus) => {
        e.stopPropagation();
        const statusMap = {
            [BoletoStatus.VERIFYING]: t('kanbanTitleVerifying'),
            [BoletoStatus.PAID]: t('kanbanTitlePaid'),
            [BoletoStatus.TO_PAY]: t('kanbanTitleToDo'),
        };
        const newStatusText = statusMap[newStatus];

        if (window.confirm(t('confirmStatusChange' as TranslationKey, { guideNumber: displayGuideNumber || 'N/A', newStatus: newStatusText }))) {
            onUpdateStatus(id, newStatus);
        }
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
          <>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileSelected}
              onClick={(e) => e.stopPropagation()}
              className="hidden" 
              accept="application/pdf" 
            />
            <button
              onClick={handleAttachProofClick}
              className={`${baseButtonClasses} bg-yellow-500 hover:bg-yellow-600`}
            >
              {t('attachProofButton')} <UploadIcon className="w-4 h-4 ml-2" />
            </button>
          </>
        );
      case BoletoStatus.PAID:
        return (
          <div className="flex items-center justify-between py-2">
            <p className="text-sm font-semibold text-green-600 dark:text-green-400">{t('paymentCompleted')}</p>
            {boleto.paymentProof && (
                <button
                    onClick={handleViewProof}
                    title={t('viewProofTooltip')}
                    className="p-2 text-gray-500 dark:text-gray-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                    <FileTextIcon className="w-5 h-5" />
                </button>
            )}
        </div>
        );
      default:
        return null;
    }
  };
  
  const CodeItem: React.FC<{ label: string; value: string | null; onCopy: () => void; copied: boolean; icon: React.ReactNode; copyTitle: string; copiedTitle: string; isVisible: boolean; }> = ({ label, value, onCopy, copied, icon, copyTitle, copiedTitle, isVisible }) => {
    if (!value || !isVisible) return null;
    return (
        <div className="mt-3">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center">
                {icon}
                <span className="ml-1.5">{label}</span>
            </label>
            <div className="flex items-center mt-1">
                <p className="flex-1 text-xs text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-700/50 p-2 rounded-l-md font-mono truncate">
                    {value}
                </p>
                <button 
                    onClick={(e) => { e.stopPropagation(); onCopy(); }}
                    className="flex-shrink-0 p-2 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-r-md"
                    title={copied ? copiedTitle : copyTitle}
                >
                    {copied ? <CheckIcon className="w-5 h-5 text-green-500"/> : <CopyIcon className="w-5 h-5"/>}
                </button>
            </div>
        </div>
    );
  };

  const hasExtraDetails = (boleto.documentAmount && boleto.documentAmount !== boleto.amount) || boleto.discount || boleto.interestAndFines;

  return (
    <>
    <style>{`
      @keyframes fade-in {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      .animate-fade-in { animation: fade-in 0.4s ease-out forwards; }
    `}</style>
    <div 
      draggable={userRole !== 'viewer'}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-lg p-4 border 
      transition-all duration-300 ease-out
      hover:shadow-xl hover:-translate-y-1
      ${isSelected ? 'border-blue-500 ring-2 ring-blue-500/30' : 'border-gray-200 dark:border-slate-700'}
      ${isDragging ? 'opacity-50' : ''}
      ${isMounted && !isDeleting ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0 pr-2">
            {visibility.guideNumber && (
                <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 break-words" title={t('guideNumber')}>
                    <div className="flex items-center">
                        <HashtagIcon className="w-4 h-4 mr-2 text-gray-400" />
                        <span className="truncate">{displayGuideNumber || t('notAvailable')}</span>
                    </div>
                </h3>
            )}
            {visibility.drawee && (
                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center mt-1" title={t('drawee')}>
                    <UserIcon className="w-4 h-4 mr-2 text-gray-400"/>
                    <span className="truncate">{displayDrawee || t('drawee')}</span>
                </p>
            )}
            {visibility.recipient && (
                 <p className="text-xs text-gray-400 dark:text-gray-400 mt-1 truncate" title={displayRecipient}>
                    {displayRecipient || t('recipient')}
                </p>
            )}
            {visibility.fileName && (
                <p className="text-xs text-gray-400 dark:text-gray-400 mt-1 truncate" title={displayFileName}>{displayFileName}</p>
            )}
        </div>
        <div className="flex items-center space-x-2 flex-shrink-0">
          {userRole !== 'viewer' && (
            <>
              <button 
                onClick={handleDeleteClick} 
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
                {visibility.dueDate && (
                    <div>
                        <p className="text-xs font-medium text-gray-400 dark:text-gray-400 uppercase tracking-wider">{t('dueDate').replace(':', '')}</p>
                        <p className="text-xl font-extrabold text-red-500 dark:text-red-400 flex items-center">
                            <CalendarIcon className="w-4 h-4 mr-2"/>
                            {formatDate(displayDueDate)}
                        </p>
                    </div>
                )}
                 {visibility.amount && (
                    <div className="text-right">
                        <p className="text-xs font-medium text-gray-400 dark:text-gray-400 uppercase tracking-wider">{t('amount').replace(':', '')}</p>
                        <p className="text-2xl font-extrabold text-green-500 dark:text-green-400">{formatCurrency(displayAmount)}</p>
                    </div>
                )}
            </div>
        </div>

        {hasExtraDetails && (
            <div className="mt-3 text-center">
                <button
                    onClick={toggleDetails}
                    className="px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/50 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
                >
                    {isDetailsOpen ? t('hideDetails') : t('showMoreDetails')}
                </button>
            </div>
        )}

        {isDetailsOpen && (
            <div className="mt-3 pt-3 border-t border-dashed border-gray-200 dark:border-slate-600 space-y-1.5 animate-fade-in">
                <h4 className="text-sm font-bold text-gray-600 dark:text-gray-300 pb-1">{t('documentInfo')}</h4>
                <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-600 dark:text-gray-300">{t('documentDate').replace(':', '')}</span>
                    <span className="font-semibold text-gray-700 dark:text-gray-200">{formatDate(displayDocumentDate)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-600 dark:text-gray-300">{t('documentAmount').replace(':', '')}</span>
                    <span className="font-semibold text-gray-700 dark:text-gray-200">{formatCurrency(displayDocumentAmount)}</span>
                </div>
                {displayDiscount && (
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-600 dark:text-gray-300">{t('discount').replace(':', '')}</span>
                        <span className="font-semibold text-red-500 dark:text-red-400">- {formatCurrency(displayDiscount)}</span>
                    </div>
                )}
                {displayInterestAndFines && (
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-600 dark:text-gray-300">{t('interestAndFines').replace(':', '')}</span>
                        <span className="font-semibold text-orange-500 dark:text-orange-400">+ {formatCurrency(displayInterestAndFines)}</span>
                    </div>
                )}
            </div>
        )}
      
      <div className="mt-2 pt-2 border-t border-dashed border-gray-100 dark:border-slate-700">
        <CodeItem 
            label={t('barcode')}
            value={displayBarcode}
            onCopy={() => handleCopy(displayBarcode, 'barcode')}
            copied={barcodeCopied}
            icon={<BarcodeIcon className="w-5 h-5"/>}
            copyTitle={t('copyBarcode')}
            copiedTitle={t('barcodeCopied')}
            isVisible={!!visibility.barcode}
        />
        <CodeItem 
            label={t('pixQrCodeText')}
            value={displayPixCode}
            onCopy={() => handleCopy(displayPixCode, 'pix')}
            copied={pixCopied}
            icon={<QrCodeIcon className="w-5 h-5"/>}
            copyTitle={t('copyPixCode')}
            copiedTitle={t('pixCodeCopied')}
            isVisible={!!visibility.pixQrCodeText}
        />
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
                onClick={handleOpenPdf}
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
    </>
  );
};

export default BoletoCard;