
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useBoletos } from '../hooks/useBoletos';
import { Boleto, BoletoStatus, User, RegisteredUser, LogEntry, Notification, Company, AnyNotification, Role } from '../types';
import { TranslationKey, translations } from '../translations';
import Header from './Header';
import FileUpload from './FileUpload';
import KanbanColumn from './KanbanColumn';
import Spinner from './Spinner';
import { useLanguage } from '../contexts/LanguageContext';
import Modal from './Modal';
import Documentation from './Documentation';
import { HourglassIcon, CheckCircleIcon, TrashIcon, PaymentTerminalIcon, KanbanIcon, CalendarIcon } from './icons/Icons';
import AdminPanel from './AdminPanel';
import FolderWatcher from './FolderWatcher';
import * as api from '../services/api';
import UploadProgress, { UploadStatus } from './UploadProgress';
import FloatingMenu from './FloatingMenu';
import { useFolderWatcher } from '../hooks/useFolderWatcher';
import CalendarView from './CalendarView';
import { BoletoDetailsModal } from './BoletoDetailsModal';


interface DashboardProps {
  onLogout: () => void;
  user: User;
  getUsers: () => Promise<RegisteredUser[]>;
  getLogs: () => Promise<LogEntry[]>;
}

const Dashboard: React.FC<DashboardProps> = ({ onLogout, user, getUsers, getLogs }) => {
  const { boletos, fetchBoletos, updateBoletoStatus, updateBoletoComments, deleteBoleto, isLoading: isLoadingBoletos, error: dbError } = useBoletos(user);
  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const { t } = useLanguage();
  
  const [uploadStatuses, setUploadStatuses] = useState<UploadStatus[]>([]);
  const [selectedBoletoIds, setSelectedBoletoIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingDetailsBoleto, setViewingDetailsBoleto] = useState<Boleto | null>(null);
  const [currentView, setCurrentView] = useState<'kanban' | 'calendar'>('kanban');

  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeCompanyId = user.role === 'admin' ? selectedCompanyFilter : user.companyId;
  const isUploadDisabled = !activeCompanyId;
  
  const processAndUploadFile = async (file: File) => {
    if (!activeCompanyId) {
        const errorKey = user.role === 'admin' ? 'adminMustSelectCompanyErrorText' : 'userHasNoCompanyErrorText';
        const errorMessage = t(errorKey as TranslationKey);
        
        setUploadStatuses(prev => [{ 
            id: crypto.randomUUID(), 
            fileName: file.name, 
            status: 'error', 
            message: errorMessage, 
            progress: 0 
        }, ...prev]);
        return;
    }

    const uploadId = crypto.randomUUID();
    setUploadStatuses(prev => [{ id: uploadId, fileName: file.name, status: 'processing', message: 'Enviando e extraindo...', progress: 0 }, ...prev]);

    const onProgress = (progress: number) => {
        setUploadStatuses(prev => prev.map(up =>
            up.id === uploadId
            ? { ...up, progress: progress }
            : up
        ));
    };

    try {
      const extractedData = await api.extractBoletoData(file, activeCompanyId, onProgress);
      
      setUploadStatuses(prev => prev.map(up => 
        up.id === uploadId 
        ? { ...up, status: 'processing', message: 'Salvando no banco de dados...', progress: 95 } 
        : up
      ));

      await api.saveBoleto(extractedData, activeCompanyId);

      setUploadStatuses(prev => prev.map(up => 
        up.id === uploadId 
        ? { ...up, status: 'success', message: t('uploadSuccess'), progress: 100 } 
        : up
      ));
      
      await fetchBoletos();

    } catch (error: any) {
      console.error("Upload failed:", error);
      
      const messageFromServer = error.message || 'genericErrorText';
      let errorMessage = '';

      if (messageFromServer.startsWith('Duplicate barcode:')) {
          const substitutions = { identifier: messageFromServer.split(': ')[1] || 'N/A' };
          errorMessage = t('duplicateBarcodeErrorText', substitutions);
      } else {
          const isKnownKey = Object.keys(translations.pt).includes(messageFromServer);
          errorMessage = t(isKnownKey ? messageFromServer as TranslationKey : 'genericErrorText');
      }

      setUploadStatuses(prev => prev.map(up => 
            up.id === uploadId 
            ? { ...up, status: 'error', message: errorMessage, progress: 0 } 
            : up
      ));
    }
  };
  
  const handleFileUploads = (files: File[]) => {
    for (const file of files) {
      processAndUploadFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUploads(Array.from(e.target.files));
      e.target.value = ''; // Reset input
    }
  };

  const folderWatcher = useFolderWatcher({ 
    onFileUpload: processAndUploadFile, 
    disabled: isUploadDisabled,
    companyId: activeCompanyId,
  });

  useEffect(() => {
    if (user.role === 'admin') {
      const loadCompanies = async () => {
        const fetchedCompanies = await api.fetchCompanies();
        setCompanies(fetchedCompanies);
      };
      loadCompanies();
    } else if (user.companyId) {
      // For non-admins, we still need their company info for folder monitoring
       const loadCompany = async () => {
        // This is a placeholder; in a real app you might have a getCompanyById endpoint
        const allCompanies = await api.fetchCompanies();
        const userCompany = allCompanies.find(c => c.id === user.companyId);
        if (userCompany) {
            setCompanies([userCompany]);
        }
       };
       loadCompany();
    }
  }, [user.role, user.companyId]);

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
          setSelectedBoletoIds(prev => prev.filter(id => !columnIds.includes(id)));
      } else {
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
    setSelectedBoletoIds(prev => prev.filter(selectedId => selectedId !== id));
  };

  const filteredBoletos = useMemo(() => {
    let baseList: Boleto[] = [];
    if (user.role === 'admin') {
      if (selectedCompanyFilter) {
        baseList = boletos.filter(boleto => boleto.companyId === selectedCompanyFilter);
      }
    } else {
      baseList = boletos;
    }

    if (!searchTerm) {
      return baseList;
    }

    const lowercasedTerm = searchTerm.toLowerCase();
    return baseList.filter(boleto => 
      (boleto.recipient && boleto.recipient.toLowerCase().includes(lowercasedTerm)) ||
      (boleto.drawee && boleto.drawee.toLowerCase().includes(lowercasedTerm)) ||
      (boleto.barcode && boleto.barcode.includes(lowercasedTerm)) ||
      (boleto.guideNumber && boleto.guideNumber.toLowerCase().includes(lowercasedTerm))
    );
  }, [boletos, user.role, selectedCompanyFilter, searchTerm]);

  const boletosToDo = useMemo(() => filteredBoletos.filter(b => b.status === BoletoStatus.TO_PAY), [filteredBoletos]);
  const boletosVerifying = useMemo(() => filteredBoletos.filter(b => b.status === BoletoStatus.VERIFYING), [filteredBoletos]);
  const boletosPaid = useMemo(() => filteredBoletos.filter(b => b.status === BoletoStatus.PAID), [filteredBoletos]);

  const calculateTotal = (boletosList: Boleto[]) => boletosList.reduce((sum, boleto) => sum + (boleto.amount || 0), 0);
  
  const totalToDo = useMemo(() => calculateTotal(boletosToDo), [boletosToDo]);
  const totalVerifying = useMemo(() => calculateTotal(boletosVerifying), [boletosVerifying]);
  const totalPaid = useMemo(() => calculateTotal(boletosPaid), [boletosPaid]);

  const boletoNotifications = useMemo((): Notification[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return filteredBoletos
      .filter(b => b.status === BoletoStatus.TO_PAY && b.dueDate)
      .map(boleto => {
        if (!boleto.dueDate) return null;
        try {
          const dueDate = new Date(`${boleto.dueDate}T00:00:00`);
          const timeDiff = dueDate.getTime() - today.getTime();
          const daysUntilDue = Math.ceil(timeDiff / (1000 * 3600 * 24));
          
          if (daysUntilDue < 0) return { boleto, type: 'overdue', daysUntilDue };
          if (daysUntilDue <= 3) return { boleto, type: 'dueSoon', daysUntilDue };
          return null;
        } catch (e) {
            console.error("Invalid date format for boleto:", boleto.id, boleto.dueDate);
            return null;
        }
      })
      .filter((notification): notification is Notification => notification !== null)
      .sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  }, [filteredBoletos]);

  const allNotifications: AnyNotification[] = useMemo(() => {
    return [...boletoNotifications];
  }, [boletoNotifications]);
  

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const SummaryCard: React.FC<{ icon: React.ReactNode, title: string, value: number, colorClass: string }> = ({ icon, title, value, colorClass }) => (
    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-lg flex flex-col justify-between min-h-[140px] border border-gray-100 dark:border-slate-700">
        <div className="flex items-center space-x-4">
            <div className={`flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full bg-gray-50 dark:bg-slate-900/50 ${colorClass}`}>
                {icon}
            </div>
            <p className="text-base font-semibold text-gray-500 dark:text-gray-400">{title}</p>
        </div>
        <p className="text-4xl font-bold text-gray-800 dark:text-white self-end tracking-tight">{formatCurrency(value)}</p>
    </div>
  );

  const activeCompany = useMemo(() => companies.find(c => c.id === activeCompanyId), [companies, activeCompanyId]);
  
  return (
    <>
      <Header 
        user={user}
        onLogout={onLogout} 
        onOpenDocs={() => setIsDocsOpen(true)}
        onOpenAdminPanel={() => setIsAdminPanelOpen(true)}
        notifications={allNotifications}
        onSearch={setSearchTerm}
      />
      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <input 
          id="file-upload-input" 
          type="file" 
          className="hidden" 
          accept="application/pdf"
          onChange={handleFileChange}
          ref={fileInputRef}
          multiple
        />
        
        <div className="hidden md:block mb-8 p-6 bg-white/60 dark:bg-gray-800/60 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 backdrop-blur-md space-y-4">
          <FileUpload 
            onFileUpload={handleFileUploads} 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadDisabled} 
          />
          <UploadProgress statuses={uploadStatuses} onClear={() => setUploadStatuses([])} />
          {user.role !== 'admin' && !user.companyId && (
              <div className="text-center p-2 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 text-sm rounded-lg">
                  {t('uploadDisabledNoCompany')}
              </div>
          )}
          {user.role === 'admin' && !selectedCompanyFilter && (
             <div className="text-center p-2 bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 text-sm rounded-lg">
                  {t('adminMustSelectCompanyErrorText')}
              </div>
          )}
         
          {user.role === 'admin' && (
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <label htmlFor="company-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('filterByCompany')}</label>
              <select
                id="company-filter"
                value={selectedCompanyFilter}
                onChange={(e) => setSelectedCompanyFilter(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="" disabled>{t('selectCompanyPrompt')}</option>
                {companies.map((company) => (<option key={company.id} value={company.id}>{company.name}</option>))}
              </select>
            </div>
          )}
           <FolderWatcher 
              {...folderWatcher} 
              monitoredFolderPathFromDB={activeCompany?.monitoredFolderPath}
            />
        </div>
        
        <div className="md:hidden mb-4">
            <UploadProgress statuses={uploadStatuses} onClear={() => setUploadStatuses([])} />
        </div>
        
        <div className="flex flex-col">
            <div className="order-2 md:order-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 mt-8 md:mt-0">
                <SummaryCard icon={<PaymentTerminalIcon className="w-6 h-6" />} title={t('totalToPay')} value={totalToDo} colorClass="text-red-500" />
                <SummaryCard icon={<HourglassIcon className="w-6 h-6" />} title={t('totalVerifying')} value={totalVerifying} colorClass="text-yellow-500" />
                <SummaryCard icon={<CheckCircleIcon className="w-6 h-6" />} title={t('totalPaid')} value={totalPaid} colorClass="text-green-500" />
            </div>

            <div className="order-1 md:order-2 mb-6 flex justify-center">
                <div className="inline-flex rounded-lg shadow-sm bg-gray-200 dark:bg-gray-700 p-1">
                    <button onClick={() => setCurrentView('kanban')} className={`px-4 py-2 text-sm font-semibold rounded-md flex items-center transition-colors ${currentView === 'kanban' ? 'bg-white text-blue-600 shadow dark:bg-gray-800' : 'text-gray-600 dark:text-gray-300'}`}>
                        <KanbanIcon className="w-5 h-5 mr-2" /> {t('viewKanban')}
                    </button>
                    <button onClick={() => setCurrentView('calendar')} className={`px-4 py-2 text-sm font-semibold rounded-md flex items-center transition-colors ${currentView === 'calendar' ? 'bg-white text-blue-600 shadow dark:bg-gray-800' : 'text-gray-600 dark:text-gray-300'}`}>
                        <CalendarIcon className="w-5 h-5 mr-2" /> {t('viewCalendar')}
                    </button>
                </div>
            </div>

            {isLoadingBoletos ? <div className="order-3 flex justify-center items-center h-64"><Spinner /></div> : (
              <div className="order-3">
                {currentView === 'kanban' ? (
                  <div className="flex flex-col md:flex-row -mx-2">
                    <KanbanColumn userRole={user.role} title={t('kanbanTitleToDo')} boletos={boletosToDo} status={BoletoStatus.TO_PAY} onUpdateStatus={handleUpdateStatus} onDelete={handleDelete} onUpdateComments={handleUpdateComments} selectedBoletoIds={selectedBoletoIds} onToggleSelection={handleToggleBoletoSelection} onToggleSelectAll={handleToggleSelectAll} onViewDetails={setViewingDetailsBoleto} />
                    <KanbanColumn userRole={user.role} title={t('kanbanTitleVerifying')} boletos={boletosVerifying} status={BoletoStatus.VERIFYING} onUpdateStatus={handleUpdateStatus} onDelete={handleDelete} onUpdateComments={handleUpdateComments} selectedBoletoIds={selectedBoletoIds} onToggleSelection={handleToggleBoletoSelection} onToggleSelectAll={handleToggleSelectAll} onViewDetails={setViewingDetailsBoleto} />
                    <KanbanColumn userRole={user.role} title={t('kanbanTitlePaid')} boletos={boletosPaid} status={BoletoStatus.PAID} onUpdateStatus={handleUpdateStatus} onDelete={handleDelete} onUpdateComments={handleUpdateComments} selectedBoletoIds={selectedBoletoIds} onToggleSelection={handleToggleBoletoSelection} onToggleSelectAll={handleToggleSelectAll} onViewDetails={setViewingDetailsBoleto} />
                  </div>
                ) : (
                   <CalendarView boletos={filteredBoletos} />
                )}
              </div>
            )}
        </div>
        {dbError && <p className="text-red-500 text-center mt-4">{dbError}</p>}
      </main>
      
      <FloatingMenu 
        onFileUploadClick={() => fileInputRef.current?.click()}
        onFolderWatchClick={folderWatcher.handleSelectFolder}
        disabled={isUploadDisabled}
      />

      {selectedBoletoIds.length > 0 && user.role !== 'viewer' && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-4xl p-4 z-30 mb-20 md:mb-0">
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 flex items-center justify-between p-4 animate-fade-in-up">
                <p className="font-semibold text-gray-700 dark:text-gray-200 text-sm sm:text-base">{t('itemsSelected', { count: selectedBoletoIds.length.toString() })}</p>
                <div className="flex items-center space-x-1 sm:space-x-2">
                    <button onClick={() => handleBulkUpdateStatus(BoletoStatus.TO_PAY)} className="px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium text-red-600 bg-red-100 dark:bg-red-900/40 dark:text-red-300 rounded-md hover:bg-red-200 dark:hover:bg-red-900/60">{t('moveTo', { status: t('kanbanTitleToDo')})}</button>
                    <button onClick={() => handleBulkUpdateStatus(BoletoStatus.VERIFYING)} className="px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium text-yellow-600 bg-yellow-100 dark:bg-yellow-900/40 dark:text-yellow-300 rounded-md hover:bg-yellow-200 dark:hover:bg-yellow-900/60">{t('moveTo', { status: t('kanbanTitleVerifying')})}</button>
                    <button onClick={() => handleBulkUpdateStatus(BoletoStatus.PAID)} className="px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium text-green-600 bg-green-100 dark:bg-green-900/40 dark:text-green-300 rounded-md hover:bg-green-200 dark:hover:bg-green-900/60">{t('moveTo', { status: t('kanbanTitlePaid')})}</button>
                    <button onClick={handleBulkDelete} className="p-2 text-red-600 bg-red-100 dark:bg-red-900/40 dark:text-red-300 rounded-md hover:bg-red-200 dark:hover:bg-red-900/60" title={t('deleteSelected')}><TrashIcon className="w-5 h-5"/></button>
                </div>
                <button onClick={() => setSelectedBoletoIds([])} className="text-xs sm:text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline">{t('deselectAll')}</button>
            </div>
        </div>
      )}

      <Modal isOpen={isDocsOpen} onClose={() => setIsDocsOpen(false)} title={t('documentationTitle')}><Documentation /></Modal>
      
      <Modal isOpen={isAdminPanelOpen} onClose={() => setIsAdminPanelOpen(false)} title="Painel Administrativo">
          <AdminPanel 
              onClose={() => setIsAdminPanelOpen(false)} 
              getUsers={getUsers} 
              currentUser={user} 
              getLogs={getLogs} 
          />
      </Modal>

      {viewingDetailsBoleto && (
        <BoletoDetailsModal
          boleto={viewingDetailsBoleto}
          isLoading={false}
          onClose={() => setViewingDetailsBoleto(null)}
        />
      )}
    </>
  );
};

export default Dashboard;
