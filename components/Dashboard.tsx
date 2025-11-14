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
import { HourglassIcon, CheckCircleIcon, TrashIcon, PaymentTerminalIcon, KanbanIcon, CalendarIcon, WalletIcon } from './icons/Icons';
import AdminPanel from './AdminPanel';
import FolderWatcher from './FolderWatcher';
import * as api from '../services/api';
import UploadProgress, { UploadStatus } from './UploadProgress';
import FloatingMenu from './FloatingMenu';
import CalendarView from './CalendarView';
import OverviewView from './OverviewView';
import EditProfileModal from './EditProfileModal';
import { useFolderWatcher } from '../hooks/useFolderWatcher';
import { useOfflineSync } from '../hooks/useOfflineSync';
import * as offlineService from '../services/offlineService';
import { QueuedFile } from '../services/offlineService';


interface DashboardProps {
  onLogout: () => void;
  user: User;
  getUsers: () => Promise<RegisteredUser[]>;
  getLogs: () => Promise<LogEntry[]>;
}

const Dashboard: React.FC<DashboardProps> = ({ onLogout, user, getUsers, getLogs }) => {
  const { boletos, fetchBoletos, updateBoletoStatus, updateBoletoComments, uploadProof, deleteBoleto, isLoading: isLoadingBoletos, error: dbError } = useBoletos(user);
  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const { t } = useLanguage();
  
  const [uploadStatuses, setUploadStatuses] = useState<UploadStatus[]>([]);
  const [selectedBoletoIds, setSelectedBoletoIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentView, setCurrentView] = useState<'kanban' | 'calendar' | 'overview'>('kanban');
  const [activeKanbanTab, setActiveKanbanTab] = useState<BoletoStatus>(BoletoStatus.TO_PAY);
  const [cardsPerPage, setCardsPerPage] = useState<number>(10);


  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

  const activeCompanyId = user.role === 'admin' ? selectedCompanyFilter : user.companyId;
  const isUploadDisabled = !activeCompanyId;

  // --- Offline Sync Logic ---
  const { isOnline } = useOfflineSync({
    onSyncStart: (item: QueuedFile) => {
        setUploadStatuses(prev => prev.map(up =>
            up.id === item.id
            ? { ...up, status: 'processing', message: 'Sincronizando...' }
            : up
        ));
    },
    onSyncSuccess: async (item: QueuedFile) => {
        setUploadStatuses(prev => prev.map(up =>
            up.id === item.id
            ? { ...up, status: 'success', message: 'Sincronizado com sucesso!', progress: 100 }
            : up
        ));
        await fetchBoletos();
        setTimeout(() => {
            setUploadStatuses(prev => prev.filter(status => status.id !== item.id));
        }, 5000);
    },
    onSyncError: (item: QueuedFile, error: Error) => {
        const errorMessage = `Falha na sincronização: ${error.message}`;
        setUploadStatuses(prev => prev.map(up =>
            up.id === item.id
            ? { ...up, status: 'error', message: errorMessage }
            : up
        ));
    },
  });

  useEffect(() => {
    const loadQueuedFiles = async () => {
        try {
            const queuedFiles = await offlineService.getQueuedFiles();
            const queuedStatuses: UploadStatus[] = queuedFiles.map(item => ({
                id: item.id,
                fileName: item.fileName,
                status: 'queued',
                message: 'Aguardando conexão...',
                progress: 0,
            }));
            setUploadStatuses(prev => [...queuedStatuses, ...prev.filter(p => !queuedStatuses.some(q => q.id === p.id))]);
        } catch (e) {
            console.warn("Could not load queued files, IndexedDB may not be available.");
        }
    };
    loadQueuedFiles();
  }, []);
  // --- End Offline Sync Logic ---
  
   useEffect(() => {
        const loadPaginationSettings = async () => {
            try {
                const settings = await api.fetchAllSettings();
                const perPage = settings.pagination_cardsPerPage;
                if (perPage && Number(perPage) > 0) {
                    setCardsPerPage(Number(perPage));
                }
            } catch (err) {
                console.error("Failed to load pagination settings", err);
            }
        };
        loadPaginationSettings();
    }, []);

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

    if (!isOnline) {
        try {
            const queuedItem = await offlineService.queueFileForUpload(file, activeCompanyId);
            setUploadStatuses(prev => [{
                id: queuedItem.id,
                fileName: file.name,
                status: 'queued',
                message: 'Aguardando conexão...',
                progress: 0,
            }, ...prev]);
        } catch (e) {
            console.error("Failed to queue file offline:", e);
            setUploadStatuses(prev => [{
                id: crypto.randomUUID(),
                fileName: file.name,
                status: 'error',
                message: 'Falha ao salvar para envio posterior.',
                progress: 0
            }, ...prev]);
        }
        return;
    }

    const uploadId = crypto.randomUUID();
    setUploadStatuses(prev => [{ id: uploadId, fileName: file.name, status: 'processing', message: 'Enviando e processando...', progress: 0 }, ...prev]);

    const onProgress = (progress: number) => {
        setUploadStatuses(prev => prev.map(up =>
            up.id === uploadId
            ? { ...up, progress: progress, message: progress < 95 ? 'Enviando e processando...' : 'Finalizando...' }
            : up
        ));
    };

    try {
      await api.uploadAndProcessBoleto(file, activeCompanyId, onProgress);
      
      setUploadStatuses(prev => prev.map(up => 
        up.id === uploadId ? { ...up, status: 'success', message: t('uploadSuccess'), progress: 100 } : up
      ));

      await fetchBoletos();

      setTimeout(() => {
        setUploadStatuses(prev => prev.filter(status => status.id !== uploadId));
      }, 5000);


    } catch (error: any) {
      console.error("Upload failed:", error);
      
      const messageFromServer = error.message || 'genericErrorText';
      let errorMessage = '';

      if (messageFromServer.startsWith('Duplicate barcode:')) {
          const substitutions = { identifier: messageFromServer.split(': ')[1] || 'N/A' };
          errorMessage = t('duplicateBarcodeErrorText', substitutions);
      } else if (messageFromServer.startsWith('Duplicate guide number:')) {
          const substitutions = { identifier: messageFromServer.split(': ')[1] || 'N/A' };
          errorMessage = t('duplicateGuideNumberErrorText', substitutions);
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

  const folderWatcher = useFolderWatcher(handleFileUploads);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUploads(Array.from(e.target.files));
      e.target.value = ''; // Reset input
    }
  };

  const loadCompanies = useCallback(async () => {
    try {
      const fetchedCompanies = await api.fetchCompanies();
      setCompanies(fetchedCompanies);
    } catch (error) {
      console.error("Failed to load companies", error);
    }
  }, []);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

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

  const handleUploadProof = useCallback(async (id: string, file: File) => {
    await uploadProof(id, file);
  }, [uploadProof]);


  const handleBulkUpdateStatus = async (status: BoletoStatus) => {
      const statusMap = {
          [BoletoStatus.VERIFYING]: t('kanbanTitleVerifying'),
          [BoletoStatus.PAID]: t('kanbanTitlePaid'),
          [BoletoStatus.TO_PAY]: t('kanbanTitleToDo'),
      };
      const newStatusText = statusMap[status];

      if (window.confirm(t('confirmBulkStatusChange' as TranslationKey, { count: selectedBoletoIds.length.toString(), newStatus: newStatusText }))) {
        await Promise.all(
            selectedBoletoIds.map(id => updateBoletoStatus(user, id, status))
        );
        setSelectedBoletoIds([]);
      }
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
      } else {
        // If admin has no filter selected, show nothing to force a selection
        return [];
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

  const boletosToDo = useMemo(() => 
    filteredBoletos
      .filter(b => b.status === BoletoStatus.TO_PAY)
      .sort((a, b) => {
        // Handle cases where dueDate is null or undefined
        if (!a.dueDate) return 1; // a comes after b
        if (!b.dueDate) return -1; // b comes after a

        try {
          const dateA = new Date(`${a.dueDate}T00:00:00`);
          const dateB = new Date(`${b.dueDate}T00:00:00`);
          
          // Check for invalid dates
          if (isNaN(dateA.getTime())) return 1;
          if (isNaN(dateB.getTime())) return -1;

          return dateA.getTime() - dateB.getTime();
        } catch (e) {
            // If date parsing fails, treat them as equal to avoid crashes
            return 0;
        }
      }), 
    [filteredBoletos]
  );

  const boletosVerifying = useMemo(() => filteredBoletos.filter(b => b.status === BoletoStatus.VERIFYING), [filteredBoletos]);
  
  const boletosPaidKanban = useMemo(() => {
      const thirtyThreeDaysAgo = new Date();
      thirtyThreeDaysAgo.setDate(thirtyThreeDaysAgo.getDate() - 33);
      thirtyThreeDaysAgo.setHours(0, 0, 0, 0);

      return filteredBoletos.filter(b => {
          if (b.status !== BoletoStatus.PAID) return false;
          // If updatedAt is not available, keep it in the list to be safe.
          if (!b.updatedAt) return true;
          try {
              const paidDate = new Date(b.updatedAt);
              return paidDate >= thirtyThreeDaysAgo;
          } catch (e) {
              // If date is invalid, keep it.
              return true;
          }
      });
  }, [filteredBoletos]);

  const allPaidBoletos = useMemo(() => 
    filteredBoletos.filter(b => b.status === BoletoStatus.PAID), 
  [filteredBoletos]);

  const calculateTotal = (boletosList: Boleto[]) => boletosList.reduce((sum, boleto) => sum + (boleto.amount || 0), 0);
  
  const totalToDo = useMemo(() => calculateTotal(boletosToDo), [boletosToDo]);
  const totalVerifying = useMemo(() => calculateTotal(boletosVerifying), [boletosVerifying]);
  const totalPaid = useMemo(() => calculateTotal(allPaidBoletos), [allPaidBoletos]);

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
          if (daysUntilDue <= 7) return { boleto, type: 'dueSoon', daysUntilDue };
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
            <p className="text-base font-semibold text-gray-500 dark:text-gray-300">{title}</p>
        </div>
        <p className="text-4xl font-bold text-gray-800 dark:text-white self-end tracking-tight">{formatCurrency(value)}</p>
    </div>
  );
  
  return (
    <>
      <Header 
        user={user}
        companies={companies}
        onLogout={onLogout} 
        onOpenDocs={() => setIsDocsOpen(true)}
        onOpenAdminPanel={() => setIsAdminPanelOpen(true)}
        onOpenEditProfile={() => setIsEditProfileOpen(true)}
        notifications={allNotifications}
        onSearch={setSearchTerm}
        activeCompanyId={activeCompanyId}
        isOnline={isOnline}
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
                disabled={isUploadDisabled}
                isMonitoring={folderWatcher.isMonitoring}
                folderName={folderWatcher.folderName}
                error={folderWatcher.error}
                isPermissionDenied={folderWatcher.isPermissionDenied}
                startMonitoring={folderWatcher.startMonitoring}
                stopMonitoring={folderWatcher.stopMonitoring}
                reselectFolder={folderWatcher.reselectFolder}
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
                     <button onClick={() => setCurrentView('overview')} className={`px-4 py-2 text-sm font-semibold rounded-md flex items-center transition-colors ${currentView === 'overview' ? 'bg-white text-blue-600 shadow dark:bg-gray-800' : 'text-gray-600 dark:text-gray-300'}`}>
                        <WalletIcon className="w-5 h-5 mr-2" /> {t('viewOverview')}
                    </button>
                </div>
            </div>

            {isLoadingBoletos ? <div className="order-3 flex justify-center items-center h-64"><Spinner /></div> : (
              <div className="order-3">
                {currentView === 'kanban' ? (
                  <>
                    {/* Controles de abas para visualização em dispositivos móveis */}
                    <div className="md:hidden mb-4">
                        <div className="flex border-b border-gray-200 dark:border-gray-700">
                            <button onClick={() => setActiveKanbanTab(BoletoStatus.TO_PAY)} className={`w-1/3 py-3 text-center font-medium text-sm transition-colors duration-300 ${activeKanbanTab === BoletoStatus.TO_PAY ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 dark:text-gray-300'}`}>{t('kanbanTitleToDo')} ({boletosToDo.length})</button>
                            <button onClick={() => setActiveKanbanTab(BoletoStatus.VERIFYING)} className={`w-1/3 py-3 text-center font-medium text-sm transition-colors duration-300 ${activeKanbanTab === BoletoStatus.VERIFYING ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 dark:text-gray-300'}`}>{t('kanbanTitleVerifying')} ({boletosVerifying.length})</button>
                            <button onClick={() => setActiveKanbanTab(BoletoStatus.PAID)} className={`w-1/3 py-3 text-center font-medium text-sm transition-colors duration-300 ${activeKanbanTab === BoletoStatus.PAID ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 dark:text-gray-300'}`}>{t('kanbanTitlePaid')} ({boletosPaidKanban.length})</button>
                        </div>
                    </div>

                    {/* Visualização em Abas para Dispositivos Móveis */}
                    <div className="md:hidden -mx-2">
                        {activeKanbanTab === BoletoStatus.TO_PAY && <KanbanColumn userRole={user.role} title={t('kanbanTitleToDo')} boletos={boletosToDo} status={BoletoStatus.TO_PAY} onUpdateStatus={handleUpdateStatus} onDelete={handleDelete} onUpdateComments={handleUpdateComments} onUploadProof={handleUploadProof} selectedBoletoIds={selectedBoletoIds} onToggleSelection={handleToggleBoletoSelection} onToggleSelectAll={handleToggleSelectAll} cardsPerPage={cardsPerPage} />}
                        {activeKanbanTab === BoletoStatus.VERIFYING && <KanbanColumn userRole={user.role} title={t('kanbanTitleVerifying')} boletos={boletosVerifying} status={BoletoStatus.VERIFYING} onUpdateStatus={handleUpdateStatus} onDelete={handleDelete} onUpdateComments={handleUpdateComments} onUploadProof={handleUploadProof} selectedBoletoIds={selectedBoletoIds} onToggleSelection={handleToggleBoletoSelection} onToggleSelectAll={handleToggleSelectAll} cardsPerPage={cardsPerPage} />}
                        {activeKanbanTab === BoletoStatus.PAID && <KanbanColumn userRole={user.role} title={t('kanbanTitlePaid')} boletos={boletosPaidKanban} status={BoletoStatus.PAID} onUpdateStatus={handleUpdateStatus} onDelete={handleDelete} onUpdateComments={handleUpdateComments} onUploadProof={handleUploadProof} selectedBoletoIds={selectedBoletoIds} onToggleSelection={handleToggleBoletoSelection} onToggleSelectAll={handleToggleSelectAll} cardsPerPage={cardsPerPage} />}
                    </div>
                    
                    {/* Visualização de 3 Colunas para Desktop */}
                    <div className="hidden md:flex flex-row -mx-2">
                      <KanbanColumn userRole={user.role} title={t('kanbanTitleToDo')} boletos={boletosToDo} status={BoletoStatus.TO_PAY} onUpdateStatus={handleUpdateStatus} onDelete={handleDelete} onUpdateComments={handleUpdateComments} onUploadProof={handleUploadProof} selectedBoletoIds={selectedBoletoIds} onToggleSelection={handleToggleBoletoSelection} onToggleSelectAll={handleToggleSelectAll} cardsPerPage={cardsPerPage} />
                      <KanbanColumn userRole={user.role} title={t('kanbanTitleVerifying')} boletos={boletosVerifying} status={BoletoStatus.VERIFYING} onUpdateStatus={handleUpdateStatus} onDelete={handleDelete} onUpdateComments={handleUpdateComments} onUploadProof={handleUploadProof} selectedBoletoIds={selectedBoletoIds} onToggleSelection={handleToggleBoletoSelection} onToggleSelectAll={handleToggleSelectAll} cardsPerPage={cardsPerPage} />
                      <KanbanColumn userRole={user.role} title={t('kanbanTitlePaid')} boletos={boletosPaidKanban} status={BoletoStatus.PAID} onUpdateStatus={handleUpdateStatus} onDelete={handleDelete} onUpdateComments={handleUpdateComments} onUploadProof={handleUploadProof} selectedBoletoIds={selectedBoletoIds} onToggleSelection={handleToggleBoletoSelection} onToggleSelectAll={handleToggleSelectAll} cardsPerPage={cardsPerPage} />
                    </div>
                  </>
                ) : currentView === 'calendar' ? (
                   <CalendarView boletos={filteredBoletos} />
                ) : (
                   <OverviewView boletos={allPaidBoletos} />
                )}
              </div>
            )}
        </div>
        {dbError && <p className="text-red-500 text-center mt-4">{dbError}</p>}
      </main>
      
      <FloatingMenu 
        onFileUploadClick={() => fileInputRef.current?.click()}
        onFolderWatchClick={folderWatcher.startMonitoring}
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

      {isEditProfileOpen && (
        <EditProfileModal
            onClose={() => setIsEditProfileOpen(false)}
            currentUser={user}
        />
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

    </>
  );
};

export default Dashboard;