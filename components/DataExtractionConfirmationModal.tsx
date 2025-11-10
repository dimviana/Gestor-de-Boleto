import React, { useState, useEffect } from 'react';
import { Boleto, BoletoField, CardFieldVisibility } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import Modal from './Modal';
import { TranslationKey } from '../translations';

interface DataExtractionConfirmationModalProps {
  boleto: Omit<Boleto, 'id' | 'status' | 'comments' | 'companyId'>;
  onConfirm: () => void;
  onCancel: () => void;
}

const CARD_VISIBILITY_KEY = 'card_field_visibility';

const ALL_FIELDS: BoletoField[] = [
    'recipient', 'drawee', 'documentDate', 'dueDate', 'amount', 'documentAmount', 'discount', 
    'interestAndFines', 'barcode', 'guideNumber', 'pixQrCodeText', 'fileName'
];

const defaultVisibility: CardFieldVisibility = {
    recipient: true, drawee: false, documentDate: false, dueDate: true, amount: true,
    documentAmount: false, discount: false, interestAndFines: false, barcode: true,
    guideNumber: true, pixQrCodeText: true, fileName: true,
};


const DataExtractionConfirmationModal: React.FC<DataExtractionConfirmationModalProps> = ({ boleto, onConfirm, onCancel }) => {
  const { t, language } = useLanguage();
  const [visibility, setVisibility] = useState<CardFieldVisibility>({});

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

  const handleVisibilityChange = (field: BoletoField, isVisible: boolean) => {
    setVisibility(prev => ({ ...prev, [field]: isVisible }));
  };
  
  const handleConfirm = () => {
    localStorage.setItem(CARD_VISIBILITY_KEY, JSON.stringify(visibility));
    onConfirm();
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return <span className="italic text-gray-500">{t('notAvailable')}</span>;
    try {
      const date = new Date(`${dateString}T00:00:00`);
      return new Intl.DateTimeFormat(language === 'pt' ? 'pt-BR' : 'en-US').format(date);
    } catch (e) { return dateString; }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return <span className="italic text-gray-500">{t('notAvailable')}</span>;
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const renderValue = (field: BoletoField) => {
    const value = boleto[field];
    if (field.toLowerCase().includes('date')) {
        return formatDate(value as string | null);
    }
    if (['amount', 'documentAmount', 'discount', 'interestAndFines'].includes(field)) {
        return formatCurrency(value as number | null);
    }
    return value ? String(value) : <span className="italic text-gray-500">{t('notAvailable')}</span>;
  };

  return (
    <Modal isOpen={true} onClose={onCancel} title={t('confirmExtractionTitle')}>
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">{t('confirmExtractionMessage')}</p>
        
        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border dark:border-gray-700 max-h-96 overflow-y-auto">
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {ALL_FIELDS.map(field => {
                    const fieldValue = boleto[field];
                    if (fieldValue === null || fieldValue === undefined) return null;
                    return (
                        <div key={field} className="py-3 flex items-center space-x-4">
                            <input
                                type="checkbox"
                                id={`vis-${field}`}
                                checked={!!visibility[field]}
                                onChange={(e) => handleVisibilityChange(field, e.target.checked)}
                                className="h-5 w-5 rounded text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700 cursor-pointer"
                            />
                            <label htmlFor={`vis-${field}`} className="flex-1 min-w-0 cursor-pointer">
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{t(field as TranslationKey) || field}</p>
                                <p className={`mt-1 text-sm text-gray-800 dark:text-gray-100 break-words ${['barcode', 'pixQrCodeText'].includes(field) ? 'font-mono text-xs' : ''}`}>
                                    {renderValue(field)}
                                </p>
                            </label>
                        </div>
                    );
                })}
            </div>
        </div>

        <div className="flex justify-end pt-4 space-x-4">
          <button onClick={onCancel} className="px-6 py-2 font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">
            {t('cancelButton')}
          </button>
          <button onClick={handleConfirm} className="px-6 py-2 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700">
            {t('confirmAndSaveButton')}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default DataExtractionConfirmationModal;
