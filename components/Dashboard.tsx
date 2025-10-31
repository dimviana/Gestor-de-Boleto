

import React, { useState, useMemo } from 'react';
import Header from './Header';
import FileUpload from './FileUpload';
import KanbanColumn from './KanbanColumn';
import Spinner from './Spinner';
import Modal from './Modal';
import Documentation from './Documentation';
import { BoletoStatus, Boleto } from '../types';
import { useBoletos } from '../hooks/useBoletos';
import { processBoletoPDF } from '../services/geminiService';
import { CheckCircleIcon, ClockIcon, DocumentTextIcon, XCircleIcon, DollarSignIcon } from './icons/Icons';
import { useLanguage } from '../contexts/LanguageContext';
import { TranslationKey } from '../translations';

interface DashboardProps {
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const { 
    boletos, 
    addBoleto, 
    updateBoletoStatus, 
    deleteBoleto, 
    isLoading: isLoadingBoletos, 
    error: boletosError 
  } = useBoletos();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const { language, t } = useLanguage();

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadError(null);
    try {
      const newBoleto = await processBoletoPDF(file, language);
      await addBoleto(newBoleto);
    } catch (e: any) {
      const message = e.message || 'unknownError';
      let translatedError: string;

      if (message.startsWith('duplicateGuideError:')) {
        const guideNumber = message.split(':')[1];
        translatedError = t('duplicateGuideError', { guideNumber });
      } else {
        translatedError = t(message as TranslationKey);
      }

      setUploadError(translatedError || t('unknownError'));
      setTimeout(() => setUploadError(null), 5000);
    } finally {
      setIsUploading(false);
    }
  };

  const totalPaid = useMemo(() => {
    return boletos
        .filter(boleto => boleto.status === BoletoStatus.PAID)
        .reduce((sum, boleto) => sum + (boleto.amount || 0), 0);
  }, [boletos]);

  const formatCurrency = (value: number) => {
      return value.toLocaleString(language === 'pt' ? 'pt-BR' : 'en-US', {
          style: 'currency',
          currency: language === 'pt' ? 'BRL' : 'USD'
      });
  };

  const columns = [
    { status: BoletoStatus.TO_PAY, title: t('columnToPay'), icon: <DocumentTextIcon className="w-6 h-6 mr-2 text-red-500" /> },
    { status: BoletoStatus.VERIFYING, title: t('columnVerifying'), icon: <ClockIcon className="w-6 h-6 mr-2 text-yellow-500" /> },
    { status: BoletoStatus.PAID, title: t('columnPaid'), icon: <CheckCircleIcon className="w-6 h-6 mr-2 text-green-500" /> },
  ];

  const renderContent = () => {
    if (isLoadingBoletos) {
      return (
        <div className="flex flex-col items-center justify-center h-64">
          <Spinner />
          <p className="mt-4 text-blue-600 font-semibold">{t('loadingBoletos')}</p>
        </div>
      );
    }

    if (boletosError) {
      return (
         <div className="flex items-center justify-center p-4 text-red-800 rounded-lg bg-red-100 h-64" role="alert">
            <XCircleIcon className="w-6 h-6 mr-3" />
            <div>
              <span className="font-medium">{t('errorTitle')}</span> {boletosError}
            </div>
          </div>
      );
    }

    return (
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
    );
  };

  return (
    <>
      <div className="flex flex-col h-screen">
        <Header onLogout={onLogout} onOpenDocs={() => setIsDocModalOpen(true)} />
        <main className="flex-grow p-4 md:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            <div className="relative p-6 mb-8 bg-white/70 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200">
              {isUploading && (
                <div className="absolute inset-0 bg-white/50 flex flex-col items-center justify-center rounded-xl z-10">
                  <Spinner />
                  <p className="mt-4 text-blue-600 font-semibold">{t('uploadTitle')}</p>
                </div>
              )}
              <FileUpload onFileUpload={handleFileUpload} disabled={isUploading} />
            </div>

            {uploadError && (
              <div className="flex items-center p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-100" role="alert">
                <XCircleIcon className="w-5 h-5 mr-3" />
                <span className="font-medium">{t('errorTitle')}</span> {uploadError}
              </div>
            )}
            
            <div className="mb-8">
              <div className="bg-green-100/70 border border-green-200 text-green-800 rounded-xl shadow-lg p-6 flex items-center justify-start">
                <div className="p-3 bg-white rounded-full mr-4 shadow">
                  <DollarSignIcon className="w-8 h-8 text-green-500" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">{t('totalPaid')}</h2>
                  <p className="text-3xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
                </div>
              </div>
            </div>

            {renderContent()}

          </div>
        </main>
      </div>
      <Modal isOpen={isDocModalOpen} onClose={() => setIsDocModalOpen(false)} title={t('documentationTitle')}>
          <Documentation />
      </Modal>
    </>
  );
};

export default Dashboard;