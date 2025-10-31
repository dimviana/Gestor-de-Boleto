import React, { useState } from 'react';
import Header from './Header';
import FileUpload from './FileUpload';
import KanbanColumn from './KanbanColumn';
import Spinner from './Spinner';
import { BoletoStatus, Boleto } from '../types';
import { useBoletos } from '../hooks/useBoletos';
import { processBoletoPDF } from '../services/geminiService';
import { CheckCircleIcon, ClockIcon, DocumentTextIcon, XCircleIcon } from './icons/Icons';
import { useLanguage } from '../contexts/LanguageContext';
import { TranslationKey } from '../translations';

interface DashboardProps {
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const { boletos, addBoleto, updateBoletoStatus, deleteBoleto } = useBoletos();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { language, t } = useLanguage();

  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    setError(null);
    try {
      const newBoleto = await processBoletoPDF(file, language);
      addBoleto(newBoleto);
    } catch (e: any) {
      const message = e.message || 'unknownError';
      let translatedError: string;

      if (message.startsWith('duplicateGuideError:')) {
        const guideNumber = message.split(':')[1];
        translatedError = t('duplicateGuideError', { guideNumber });
      } else {
        translatedError = t(message as TranslationKey);
      }

      setError(translatedError || t('unknownError'));
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const columns = [
    { status: BoletoStatus.TO_PAY, title: t('columnToPay'), icon: <DocumentTextIcon className="w-6 h-6 mr-2 text-red-500" /> },
    { status: BoletoStatus.VERIFYING, title: t('columnVerifying'), icon: <ClockIcon className="w-6 h-6 mr-2 text-yellow-500" /> },
    { status: BoletoStatus.PAID, title: t('columnPaid'), icon: <CheckCircleIcon className="w-6 h-6 mr-2 text-green-500" /> },
  ];

  return (
    <div className="flex flex-col h-screen">
      <Header onLogout={onLogout} />
      <main className="flex-grow p-4 md:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <div className="relative p-6 mb-8 bg-white/70 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200">
            {isLoading && (
              <div className="absolute inset-0 bg-white/50 flex flex-col items-center justify-center rounded-xl z-10">
                <Spinner />
                <p className="mt-4 text-blue-600 font-semibold">{t('uploadTitle')}</p>
              </div>
            )}
            <FileUpload onFileUpload={handleFileUpload} disabled={isLoading} />
          </div>

          {error && (
            <div className="flex items-center p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-100" role="alert">
              <XCircleIcon className="w-5 h-5 mr-3" />
              <span className="font-medium">{t('errorTitle')}</span> {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {columns.map(col => (
              <KanbanColumn
                key={col.status}
                status={col.status}
                title={col.title}
                icon={col.icon}
                boletos={boletos.filter(b => b.status === col.status)}
                onUpdateStatus={updateBoletoStatus}
                onDelete={deleteBoleto}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;