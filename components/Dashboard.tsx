
import React, { useState, useMemo } from 'react';
import { useBoletos } from '../hooks/useBoletos';
import { Boleto, BoletoStatus, User, RegisteredUser, LogEntry } from '../types';
import Header from './Header';
import FileUpload from './FileUpload';
import KanbanColumn from './KanbanColumn';
import Spinner from './Spinner';
import { processBoletoPDF as processBoletoWithAI } from '../services/geminiService';
import { processBoletoPDFWithRegex } from '../services/regexService';
import { useLanguage } from '../contexts/LanguageContext';
import { useProcessingMethod } from '../contexts/ProcessingMethodContext';
import Modal from './Modal';
import Documentation from './Documentation';
import { WalletIcon, HourglassIcon, CheckCircleIcon } from './icons/Icons';
import AdminPanel from './AdminPanel';

interface DashboardProps {
  onLogout: () => void;
  user: User;
  getUsers: () => RegisteredUser[];
  addUser: (actor: User, newUser: Omit<RegisteredUser, 'id'>) => boolean;
  updateUser: (actor: User, userId: string, updates: Partial<Omit<RegisteredUser, 'id'>>) => boolean;
  deleteUser: (actor: User, userId: string) => boolean;
  getLogs: () => LogEntry[];
}

const Dashboard: React.FC<DashboardProps> = ({ onLogout, user, getUsers, addUser, updateUser, deleteUser, getLogs }) => {
  const { boletos, addBoleto, updateBoletoStatus, deleteBoleto, isLoading: isLoadingBoletos, error: dbError } = useBoletos();
  const [isLoadingUpload, setIsLoadingUpload] = useState(false);
  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const { t, language } = useLanguage();
  const { method } = useProcessingMethod();
  
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const [errorModalContent, setErrorModalContent] = useState<{ title: string; message: string }>({ title: '', message: '' });

  const handleFileUpload = async (file: File) => {
    setIsLoadingUpload(true);
    try {
      let newBoleto: Boleto;
      if (method === 'ai') {
          newBoleto = await processBoletoWithAI(file, language);
      } else {
          newBoleto = await processBoletoPDFWithRegex(file);
      }
      await addBoleto(user, newBoleto, method);
    } catch (error: any) {
      console.error("Upload failed:", error);
      let errorMessage = t('genericErrorText');
      let errorTitle = t('genericErrorTitle');
      
      if (error.message.startsWith('duplicateBarcodeError:')) {
          const identifier = error.message.split(':')[1];
          errorMessage = t('duplicateBarcodeErrorText', { identifier });
          errorTitle = t('duplicateBarcodeErrorTitle');
      } else if (error.message === 'invalidBarcodeError') {
          errorMessage = t('invalidBarcodeErrorText');
          errorTitle = t('invalidBarcodeErrorTitle');
      } else if (error.message === 'pdfProcessingError') {
          errorMessage = t('pdfProcessingError');
          errorTitle = t('processingErrorTitle');
      }

      setErrorModalContent({ title: errorTitle, message: errorMessage });
      setIsErrorModalOpen(true);
    } finally {
      setIsLoadingUpload(false);
    }
  };

  const handleUpdateStatus = (id: string, status: BoletoStatus) => {
    updateBoletoStatus(user, id, status);
  };

  const handleDelete = (id: string) => {
    deleteBoleto(user, id);
  };

  const boletosToDo = boletos.filter(b => b.status === BoletoStatus.TO_PAY);
  const boletosVerifying = boletos.filter(b => b.status === BoletoStatus.VERIFYING);
  const boletosPaid = boletos.filter(b => b.status === BoletoStatus.PAID);

  const calculateTotal = (boletosList: Boleto[]) => {
    return boletosList.reduce((sum, boleto) => sum + (boleto.amount || 0), 0);
  };
  
  const totalToDo = useMemo(() => calculateTotal(boletosToDo), [boletosToDo]);
  const totalVerifying = useMemo(() => calculateTotal(boletosVerifying), [boletosVerifying]);
  const totalPaid = useMemo(() => calculateTotal(boletosPaid), [boletosPaid]);

  const formatCurrency = (value: number) => {
    return value.toLocaleString(language === 'pt' ? 'pt-BR' : 'en-US', {
      style: 'currency',
      currency: language === 'pt' ? 'BRL' : 'USD',
    });
  };

  const SummaryCard: React.FC<{ icon: React.ReactNode, title: string, value: number, colorClass: string }> = ({ icon, title, value, colorClass }) => (
    <div className="bg-white/70 backdrop-blur-md p-6 rounded-2xl shadow-lg border border-gray-200 flex items-center space-x-4">
        <div className={`p-3 rounded-full bg-gray-100 ${colorClass}`}>
            {icon}
        </div>
        <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-800">{formatCurrency(value)}</p>
        </div>
    </div>
  );

  return (
    <>
      <Header 
        user={user}
        onLogout={onLogout} 
        onOpenDocs={() => setIsDocsOpen(true)}
        onOpenAdminPanel={() => setIsAdminPanelOpen(true)}
      />
      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-8 p-6 bg-white/60 rounded-2xl shadow-lg border border-gray-200 backdrop-blur-md">
          <FileUpload onFileUpload={handleFileUpload} disabled={isLoadingUpload} />
          {isLoadingUpload && (
            <div className="flex items-center justify-center mt-4">
              <Spinner />
              <p className="ml-4 text-blue-600 font-semibold">{t('processingStatus')}...</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <SummaryCard 
                icon={<WalletIcon className="w-6 h-6" />}
                title={t('totalToPay')}
                value={totalToDo}
                colorClass="text-red-500"
            />
            <SummaryCard 
                icon={<HourglassIcon className="w-6 h-6" />}
                title={t('totalVerifying')}
                value={totalVerifying}
                colorClass="text-yellow-500"
            />
            <SummaryCard 
                icon={<CheckCircleIcon className="w-6 h-6" />}
                title={t('totalPaid')}
                value={totalPaid}
                colorClass="text-green-500"
            />
        </div>

        {isLoadingBoletos ? (
          <div className="flex justify-center items-center h-64">
            <Spinner />
          </div>
        ) : (
          <div className="flex flex-col md:flex-row -mx-2">
            <KanbanColumn 
                title={t('kanbanTitleToDo')} 
                boletos={boletosToDo} 
                onUpdateStatus={handleUpdateStatus} 
                onDelete={handleDelete} 
            />
            <KanbanColumn 
                title={t('kanbanTitleVerifying')} 
                boletos={boletosVerifying} 
                onUpdateStatus={handleUpdateStatus} 
                onDelete={handleDelete} 
            />
            <KanbanColumn 
                title={t('kanbanTitlePaid')} 
                boletos={boletosPaid} 
                onUpdateStatus={handleUpdateStatus} 
                onDelete={handleDelete} 
            />
          </div>
        )}
        {dbError && <p className="text-red-500 text-center mt-4">{dbError}</p>}
      </main>
      
      <Modal 
          isOpen={isErrorModalOpen} 
          onClose={() => setIsErrorModalOpen(false)} 
          title={errorModalContent.title}
      >
          <div className="text-center p-4">
              <p className="text-gray-600 mb-6">{errorModalContent.message}</p>
              <button
                  onClick={() => setIsErrorModalOpen(false)}
                  className="px-8 py-2 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-all duration-300"
              >
                  OK
              </button>
          </div>
      </Modal>

      <Modal isOpen={isDocsOpen} onClose={() => setIsDocsOpen(false)} title={t('documentationTitle')}>
          <Documentation />
      </Modal>
      
      <Modal isOpen={isAdminPanelOpen} onClose={() => setIsAdminPanelOpen(false)} title="Painel Administrativo">
          <AdminPanel 
            onClose={() => setIsAdminPanelOpen(false)} 
            getUsers={getUsers}
            addUser={addUser}
            updateUser={updateUser}
            deleteUser={deleteUser}
            currentUser={user}
            getLogs={getLogs}
        />
      </Modal>
    </>
  );
};

export default Dashboard;
