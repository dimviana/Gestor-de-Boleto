

import React, { useState, useMemo, useCallback } from 'react';
import { useBoletos } from '../hooks/useBoletos';
import { Boleto, BoletoStatus, User, RegisteredUser, LogEntry, Notification } from '../types';
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
import { WalletIcon, HourglassIcon, CheckCircleIcon, TrashIcon } from './icons/Icons';
import AdminPanel from './AdminPanel';
import FolderWatcher from './FolderWatcher';
import { BoletoDetailsModal } from './BoletoDetailsModal';
import { useAiSettings } from '../contexts/AiSettingsContext';

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
  const { boletos, addBoleto, updateBoletoStatus, updateBoletoComments, deleteBoleto, isLoading: isLoadingBoletos, error: dbError } = useBoletos();
  const [isLoadingUpload, setIsLoadingUpload] = useState(false);
  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const { t, language } = useLanguage();
  const { method } = useProcessingMethod();
  const { aiSettings } = useAiSettings();
  
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const [errorModalContent, setErrorModalContent] = useState<{ title: string; message: string }>({ title: '', message: '' });

  const [selectedBoletoIds, setSelectedBoletoIds] = useState<string[]>([]);
  const [viewingBoleto, setViewingBoleto] = useState<Boleto | null>(null);

  const handleFileUpload = async (file: File) => {
    setIsLoadingUpload(true);
    try {
      let newBoleto: Boleto;
      if (method === 'ai') {
          newBoleto = await processBoletoWithAI(file, language, aiSettings);
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

  const handleToggleBoletoSelection = useCallback((id: string) => {
    setSelectedBoletoIds(prevSelected =>
        prevSelected.includes(id)
            ? prevSelected.filter(boletoId => boletoId !== id)
            : [...prevSelected, id]
    );
  }, []);

  const handleToggleSelectAll = useCallback((columnBoletos: Boleto[]) => {
      const columnIds = columnBoletos.map(b => b.id);
      const allSelectedInColumn = columnIds.length > 0 && columnIds.every(id => selectedBoletoIds.includes(id));

      if (allSelectedInColumn) {
          // Deselect all from this column
          setSelectedBoletoIds(prev => prev.filter(id => !columnIds.includes(id)));
      } else {
          // Select all from this column (and keep existing selections from other columns)
          setSelectedBoletoIds(prev => [...new Set([...prev, ...columnIds])]);
      }
  }, [selectedBoletoIds]);

  const handleUpdateStatus = useCallback((id: string, status: BoletoStatus) => {
    updateBoletoStatus(user, id, status);
  }, [user, updateBoletoStatus]);

  const handleUpdateComments = useCallback((id: string, comments: string) => {
    updateBoletoComments(user, id, comments);
  }, [user, updateBoletoComments]);


  const handleBulkUpdateStatus = async (status: BoletoStatus) => {
      await Promise.all(
          selectedBoletoIds.map(id => updateBoletoStatus(user, id, status))
      );
      setSelectedBoletoIds([]);
  };

  const handleBulkDelete = async () => {
      if (window.confirm(t('confirmBulkDelete', { count: selectedBoletoIds.length.toString() }))) {
          await Promise.all(
              selectedBoletoIds.map(id => deleteBoleto(user, id))
          );
          setSelectedBoletoIds([]);
      }
  };

  const handleDelete = (id: string) => {
    deleteBoleto(user, id);
    // Also remove from selection if it was selected
    setSelectedBoletoIds(prev => prev.filter(selectedId => selectedId !== id));
  };

  const handleViewBoletoDetails = useCallback((boleto: Boleto) => {
    setViewingBoleto(boleto);
  }, []);

  const boletosToDo = useMemo(() => boletos.filter(b => b.status === BoletoStatus.TO_PAY), [boletos]);
  const boletosVerifying = useMemo(() => boletos.filter(b => b.status === BoletoStatus.VERIFYING), [boletos]);
  const boletosPaid = useMemo(() => boletos.filter(b => b.status === BoletoStatus.PAID), [boletos]);

  const calculateTotal = (boletosList: Boleto[]) => {
    return boletosList.reduce((sum, boleto) => sum + (boleto.amount || 0), 0);
  };
  
  const totalToDo = useMemo(() => calculateTotal(boletosToDo), [boletosToDo]);
  const totalVerifying = useMemo(() => calculateTotal(boletosVerifying), [boletosVerifying]);
  const totalPaid = useMemo(() => calculateTotal(boletosPaid), [boletosPaid]);

  const notifications = useMemo((): Notification[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to the beginning of the day for accurate comparison

    return boletos
      .filter(b => b.status === BoletoStatus.TO_PAY && b.dueDate)
      .map(boleto => {
        // Ensure dueDate is not null and is a valid date string
        if (!boleto.dueDate) return null;
        
        try {
          const dueDate = new Date(`${boleto.dueDate}T00:00:00`);
          const timeDiff = dueDate.getTime() - today.getTime();
          const daysUntilDue = Math.ceil(timeDiff / (1000 * 3600 * 24));
          
          if (daysUntilDue < 0) {
            return { boleto, type: 'overdue', daysUntilDue };
          }
          if (daysUntilDue <= 3) { // Includes today and the next 3 days
            return { boleto, type: 'dueSoon', daysUntilDue };
          }
          return null;
        } catch (e) {
            console.error("Invalid date format for boleto:", boleto.id, boleto.dueDate);
            return null;
        }

      })
      .filter((notification): notification is Notification => notification !== null)
      .sort((a, b) => a.daysUntilDue - b.daysUntilDue); // Sort by urgency
  }, [boletos]);

  const formatCurrency = (value: number) => {
    return value.toLocaleString(language === 'pt' ? 'pt-BR' : 'en-US', {
      style: 'currency',
      currency: language === 'pt' ? 'BRL' : 'USD',
    });
  };

  const SummaryCard: React.FC<{ icon: React.ReactNode, title: string, value: number, colorClass: string }> = ({ icon, title, value, colorClass }) => (
    <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-md p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 flex items-center space-x-4">
        <div className={`p-3 rounded-full bg-gray-100 dark:bg-gray-700 ${colorClass}`}>
            {icon}
        </div>
        <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{formatCurrency(value)}</p>
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
        notifications={notifications}
      />
      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-8 p-6 bg-white/60 dark:bg-gray-800/60 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 backdrop-blur-md space-y-4">
          <FileUpload onFileUpload={handleFileUpload} disabled={isLoadingUpload} />
          {isLoadingUpload && (
            <div className="flex items-center justify-center mt-4">
              <Spinner />
              <p className="ml-4 text-blue-600 dark:text-blue-400 font-semibold">{method === 'ai' ? t('processingStatusOcr') : t('processingStatusRegex')}</p>
            </div>
          )}
           <FolderWatcher onFileUpload={handleFileUpload} disabled={isLoadingUpload} />
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
                status={BoletoStatus.TO_PAY}
                onUpdateStatus={handleUpdateStatus} 
                onDelete={handleDelete}
                onUpdateComments={handleUpdateComments}
                selectedBoletoIds={selectedBoletoIds}
                onToggleSelection={handleToggleBoletoSelection}
                onToggleSelectAll={handleToggleSelectAll}
                onViewDetails={handleViewBoletoDetails}
            />
            <KanbanColumn 
                title={t('kanbanTitleVerifying')} 
                boletos={boletosVerifying} 
                status={BoletoStatus.VERIFYING}
                onUpdateStatus={handleUpdateStatus} 
                onDelete={handleDelete} 
                onUpdateComments={handleUpdateComments}
                selectedBoletoIds={selectedBoletoIds}
                onToggleSelection={handleToggleBoletoSelection}
                onToggleSelectAll={handleToggleSelectAll}
                onViewDetails={handleViewBoletoDetails}
            />
            <KanbanColumn 
                title={t('kanbanTitlePaid')} 
                boletos={boletosPaid} 
                status={BoletoStatus.PAID}
                onUpdateStatus={handleUpdateStatus} 
                onDelete={handleDelete} 
                onUpdateComments={handleUpdateComments}
                selectedBoletoIds={selectedBoletoIds}
                onToggleSelection={handleToggleBoletoSelection}
                onToggleSelectAll={handleToggleSelectAll}
                onViewDetails={handleViewBoletoDetails}
            />
          </div>
        )}
        {dbError && <p className="text-red-500 text-center mt-4">{dbError}</p>}
      </main>
      
      {selectedBoletoIds.length > 0 && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-4xl p-4 z-30">
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 flex items-center justify-between p-4 animate-fade-in-up">
                <p className="font-semibold text-gray-700 dark:text-gray-200">
                    {t('itemsSelected', { count: selectedBoletoIds.length.toString() })}
                </p>
                <div className="flex items-center space-x-2">
                    <button onClick={() => handleBulkUpdateStatus(BoletoStatus.TO_PAY)} className="px-3 py-2 text-sm font-medium text-red-600 bg-red-100 dark:bg-red-900/40 dark:text-red-300 rounded-md hover:bg-red-200 dark:hover:bg-red-900/60">{t('moveTo', { status: t('kanbanTitleToDo')})}</button>
                    <button onClick={() => handleBulkUpdateStatus(BoletoStatus.VERIFYING)} className="px-3 py-2 text-sm font-medium text-yellow-600 bg-yellow-100 dark:bg-yellow-900/40 dark:text-yellow-300 rounded-md hover:bg-yellow-200 dark:hover:bg-yellow-900/60">{t('moveTo', { status: t('kanbanTitleVerifying')})}</button>
                    <button onClick={() => handleBulkUpdateStatus(BoletoStatus.PAID)} className="px-3 py-2 text-sm font-medium text-green-600 bg-green-100 dark:bg-green-900/40 dark:text-green-300 rounded-md hover:bg-green-200 dark:hover:bg-green-900/60">{t('moveTo', { status: t('kanbanTitlePaid')})}</button>
                    <button onClick={handleBulkDelete} className="p-2 text-red-600 bg-red-100 dark:bg-red-900/40 dark:text-red-300 rounded-md hover:bg-red-200 dark:hover:bg-red-900/60" title={t('deleteSelected')}><TrashIcon className="w-5 h-5"/></button>
                </div>
                <button onClick={() => setSelectedBoletoIds([])} className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                    {t('deselectAll')}
                </button>
            </div>
        </div>
      )}

      <Modal 
          isOpen={isErrorModalOpen} 
          onClose={() => setIsErrorModalOpen(false)} 
          title={errorModalContent.title}
      >
          <div className="text-center p-4">
              <p className="text-gray-600 dark:text-gray-300 mb-6">{errorModalContent.message}</p>
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

      {viewingBoleto && (
          <BoletoDetailsModal
            boleto={viewingBoleto}
            onClose={() => setViewingBoleto(null)}
          />
        )}
    </>
  );
};

export default Dashboard;