import React, { useState, useEffect } from 'react';
import { useWhitelabel } from '../contexts/WhitelabelContext';
import { RegisteredUser, Role, User, LogEntry, Company, SslStatus, TrackingLog } from '../types';
import { TrashIcon, EditIcon, CheckCircleIcon, XCircleIcon } from './icons/Icons';
import { useLanguage } from '../contexts/LanguageContext';
import Modal from './Modal';
import * as api from '../services/api';
import Spinner from './Spinner';
import { TranslationKey } from '../translations';


interface AdminPanelProps {
    onClose: () => void;
    getUsers: () => Promise<RegisteredUser[]>;
    currentUser: User;
    getLogs: () => Promise<LogEntry[]>;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onClose, getUsers, currentUser, getLogs }) => {
    const { t, language } = useLanguage();
    const [activeTab, setActiveTab] = useState<'settings' | 'users_companies' | 'logs' | 'ssl' | 'rastreio' | 'email'>('settings');
    const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    
    const showNotification = (message: string, type: 'success' | 'error') => {
        setNotification({ message, type });
        const timer = setTimeout(() => {
            setNotification(null);
        }, 5000);
        return () => clearTimeout(timer);
    };

    useEffect(() => {
        const loadLogs = async () => {
            if (activeTab === 'logs') {
                setLogs(await getLogs());
            }
        };
        loadLogs();
    }, [activeTab, getLogs]);
    
    const TabButton: React.FC<{tabId: 'settings' | 'users_companies' | 'logs' | 'ssl' | 'rastreio' | 'email', label: string}> = ({ tabId, label}) => (
         <button
            onClick={() => setActiveTab(tabId)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === tabId
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
        >
            {label}
        </button>
    );

    const formatLogTimestamp = (isoString: string) => {
        return new Date(isoString).toLocaleString(language === 'pt' ? 'pt-BR' : 'en-US', {
            dateStyle: 'short',
            timeStyle: 'medium',
            timeZone: 'America/Sao_Paulo'
        });
    };
    
    const SettingsTab = () => {
        const { appName, logoUrl, setAppName, setLogoUrl } = useWhitelabel();
        
        // Local form states
        const [currentAppName, setCurrentAppName] = useState(appName);
        const [currentLogoUrl, setCurrentLogoUrl] = useState(logoUrl);
        const [jwtSecret, setJwtSecret] = useState('');
        const [cardsPerPage, setCardsPerPage] = useState('10');
        const [isLoading, setIsLoading] = useState(true);

        useEffect(() => {
            const loadSettings = async () => {
                setIsLoading(true);
                try {
                    const settings = await api.fetchAllSettings();
                    setCurrentAppName(settings.whitelabel_appName || appName);
                    setCurrentLogoUrl(settings.whitelabel_logoUrl || logoUrl);
                    setJwtSecret(settings.JWT_SECRET || '');
                    setCardsPerPage(String(settings.pagination_cardsPerPage || 10));
                } catch (error) {
                    console.error("Failed to load settings", error);
                    showNotification(t('settingsLoadError' as TranslationKey), 'error');
                } finally {
                    setIsLoading(false);
                }
            };
            loadSettings();
        }, [appName, logoUrl]);
        
        const handleGenerateJwt = () => {
            const array = new Uint8Array(32);
            window.crypto.getRandomValues(array);
            const secret = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
            setJwtSecret(secret);
        };
        
        const handleSaveAllSettings = async () => {
            const settingsToSave = {
                whitelabel_appName: currentAppName,
                whitelabel_logoUrl: currentLogoUrl,
                JWT_SECRET: jwtSecret,
                pagination_cardsPerPage: Number(cardsPerPage) || 10,
            };

            try {
                await api.updateAllSettings(settingsToSave);
                
                // Update local contexts after successful save
                setAppName(currentAppName);
                setLogoUrl(currentLogoUrl);
                
                showNotification(t('settingsSavedSuccess'), 'success');
                 setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } catch (error: any) {
                showNotification(t('settingsSaveError' as TranslationKey) || error.message, 'error');
            }
        };

        if (isLoading) {
            return <div className="flex justify-center items-center h-64"><Spinner /></div>;
        }

        return (
            <div className="space-y-6">
                 <div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 border-b dark:border-gray-600 pb-2 mb-4">Configurações de Aparência</h3>
                    <div className="space-y-4 mt-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome da Aplicação</label>
                            <input type="text" value={currentAppName} onChange={(e) => setCurrentAppName(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">URL do Logotipo (Opcional)</label>
                            <input type="text" value={currentLogoUrl} onChange={(e) => setCurrentLogoUrl(e.target.value)} placeholder="https://example.com/logo.png" className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                        </div>
                    </div>
                </div>

                <hr className="my-6 border-t border-gray-200 dark:border-gray-600"/>

                <div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 border-b dark:border-gray-600 pb-2 mb-4">{t('paginationSettingsTitle')}</h3>
                    <div className="mt-4 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('cardsPerPageLabel')}</label>
                            <input
                                type="number"
                                value={cardsPerPage}
                                onChange={(e) => setCardsPerPage(e.target.value)}
                                min="1"
                                className="mt-1 block w-full max-w-xs px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{t('cardsPerPageDescription')}</p>
                        </div>
                    </div>
                </div>

                <hr className="my-6 border-t border-gray-200 dark:border-gray-600"/>
                
                <div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 border-b dark:border-gray-600 pb-2 mb-4">{t('credentialsAndSecurityTitle')}</h3>
                    <div className="mt-4 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('jwtSecretLabel')}</label>
                            <div className="flex items-center space-x-2">
                                <input type="password" value={jwtSecret} onChange={(e) => setJwtSecret(e.target.value)} placeholder={t('jwtSecretPlaceholder')} className="mt-1 block w-full input-field"/>
                                <button onClick={handleGenerateJwt} className="mt-1 px-4 py-2 text-sm font-semibold text-white bg-gray-600 rounded-lg hover:bg-gray-700 whitespace-nowrap">{t('generateButton')}</button>
                            </div>
                            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{t('jwtSecretDescription')}</p>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4 mt-4 border-t dark:border-gray-600">
                    <button onClick={handleSaveAllSettings} className="px-6 py-2 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                        {t('saveAllSettingsButton')}
                    </button>
                </div>
                <style>{`.input-field { background-color: #F3F4F6; color: #1F2937; border: 1px solid #D1D5DB; border-radius: 0.5rem; padding: 0.5rem 0.75rem; } .dark .input-field { background-color: #374151; color: #F9FAFB; border-color: #4B5563; }`}</style>
            </div>
        )
    };

    const UsersAndCompaniesTab = () => {
        const [users, setUsers] = useState<RegisteredUser[]>([]);
        const [companies, setCompanies] = useState<Company[]>([]);
        const [isUserModalOpen, setIsUserModalOpen] = useState(false);
        const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
        const [selectedUser, setSelectedUser] = useState<RegisteredUser | null>(null);
        const [userForm, setUserForm] = useState({ username: '', name: '', password: '', role: 'viewer' as Role, companyId: '' });
        const [companyForm, setCompanyForm] = useState({ name: '', cnpj: '', address: ''});
        const [folderPaths, setFolderPaths] = useState<Record<string, string>>({});

        const roleClassMap: Record<Role, string> = {
            admin: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
            editor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
            viewer: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
        };

        const refreshData = async () => {
            try {
                const [fetchedUsers, fetchedCompanies] = await Promise.all([getUsers(), api.fetchCompanies()]);
                setUsers(fetchedUsers || []);
                setCompanies(fetchedCompanies || []);
                const initialPaths = (fetchedCompanies || []).reduce((acc, company) => {
                    acc[company.id] = company.monitoredFolderPath || '';
                    return acc;
                }, {} as Record<string, string>);
                setFolderPaths(initialPaths);
            } catch (error) {
                console.error("Failed to refresh data:", error);
                showNotification("Failed to load user and company data.", 'error');
            }
        };

        useEffect(() => { refreshData(); }, []);

        const openAddUserModal = () => {
            setModalMode('add'); setSelectedUser(null);
            setUserForm({ username: '', name: '', password: '', role: 'viewer', companyId: '' });
            setIsUserModalOpen(true);
        };

        const openEditUserModal = (user: RegisteredUser) => {
            setModalMode('edit'); setSelectedUser(user);
            setUserForm({ username: user.username, name: user.name || '', password: '', role: user.role, companyId: user.companyId || '' });
            setIsUserModalOpen(true);
        };
        
        const handleUserFormSubmit = async () => {
            try {
                if (modalMode === 'add') {
                    await api.createUser({ username: userForm.username, name: userForm.name, password: userForm.password, role: userForm.role, companyId: userForm.companyId || undefined });
                    showNotification(t('userAddedSuccess'), 'success');
                } else if (modalMode === 'edit' && selectedUser) {
                    const updates: Partial<Omit<RegisteredUser, 'id'>> = {};
                    if (userForm.username !== selectedUser.username) updates.username = userForm.username;
                    if (userForm.name !== (selectedUser.name || '')) updates.name = userForm.name;
                    if (userForm.password) updates.password = userForm.password;
                    if (userForm.role !== selectedUser.role) updates.role = userForm.role;
                    if (userForm.companyId !== (selectedUser.companyId || '')) updates.companyId = userForm.companyId;

                    if (Object.keys(updates).length > 0) {
                        await api.updateUser(selectedUser.id, updates);
                        showNotification(t('userUpdatedSuccess'), 'success');
                    }
                }
                await refreshData();
                setIsUserModalOpen(false);
            } catch (error: any) {
                showNotification(t(error.message as TranslationKey) || error.message, 'error');
            }
        };
        
        const handleDeleteUser = async (userId: string) => {
            if (currentUser.id === userId) {
                showNotification(t('deleteSelfError'), 'error');
                return;
            }
            if (window.confirm(t('confirmUserDeletion'))) {
                try {
                    await api.deleteUser(userId);
                    await refreshData();
                    showNotification(t('userDeletedSuccess'), 'success');
                } catch (error: any) {
                    showNotification(t((error.message as TranslationKey) || 'deleteUserError'), 'error');
                }
            }
        };

        const handleAddCompany = async (e: React.FormEvent) => {
            e.preventDefault();
            if (!companyForm.name || !companyForm.cnpj) return;
            try {
                await api.createCompany(companyForm);
                setCompanyForm({ name: '', cnpj: '', address: '' });
                await refreshData();
                showNotification(t('companyAddedSuccess'), 'success');
            } catch (error: any) {
                showNotification(t((error.message as TranslationKey) || 'companyAddError'), 'error');
            }
        };

        const handleDeleteCompany = async (id: string) => {
            if (window.confirm('Tem certeza que deseja excluir esta empresa?')) {
                try {
                    await api.deleteCompany(id);
                    await refreshData();
                    showNotification(t('companyDeletedSuccess'), 'success');
                } catch (error: any) {
                    showNotification(t((error.message as TranslationKey) || 'companyDeleteError'), 'error');
                }
            }
        }
        
        const handleSaveFolder = async (companyId: string) => {
            const path = folderPaths[companyId];
            try {
                await api.setCompanyMonitoredFolder(companyId, path);
                showNotification('Caminho da pasta salvo com sucesso!', 'success');
                // Refresh data to ensure UI is consistent with DB
                await refreshData();
            } catch (error: any) {
                showNotification('Falha ao salvar o caminho da pasta.', 'error');
            }
        };
        
        return (
            <div className="space-y-8">
                <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-xl shadow-md">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 border-b dark:border-gray-600 pb-2 mb-4">{t('adminCompaniesTitle')}</h3>
                    <form onSubmit={handleAddCompany} className="p-4 bg-white dark:bg-gray-800 rounded-lg space-y-4 border dark:border-gray-700">
                        <h4 className="font-semibold">{t('adminAddCompanyTitle')}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <input value={companyForm.name} onChange={e => setCompanyForm({...companyForm, name: e.target.value})} placeholder={t('companyNameLabel')} required className="w-full input-field"/>
                            <input value={companyForm.cnpj} onChange={e => setCompanyForm({...companyForm, cnpj: e.target.value})} placeholder={t('cnpjLabel')} required className="w-full input-field"/>
                            <input value={companyForm.address} onChange={e => setCompanyForm({...companyForm, address: e.target.value})} placeholder={t('addressLabel')} className="w-full input-field"/>
                        </div>
                        <div className="flex justify-end"><button type="submit" className="px-4 py-2 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 text-sm">{t('addCompanyButton')}</button></div>
                    </form>

                    <div className="mt-6 space-y-4">
                        {companies.map(company => (
                            <div key={company.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-bold text-gray-900 dark:text-gray-100">{company.name}</h4>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">CNPJ: {company.cnpj}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('addressLabel')}: {company.address}</p>
                                    </div>
                                    <button onClick={() => handleDeleteCompany(company.id)} className="text-red-600 hover:text-red-900"><TrashIcon className="w-5 h-5"/></button>
                                </div>
                                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                    <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('usersInThisCompany')}</h5>
                                    <ul className="text-sm space-y-1">
                                        {users.filter(u => u.companyId === company.id).map(user => (<li key={user.id} className="text-gray-600 dark:text-gray-400">{user.name || user.username}</li>))}
                                        {users.filter(u => u.companyId === company.id).length === 0 && <p className="text-xs text-gray-400 italic">{t('noUsersInCompany')}</p>}
                                    </ul>
                                </div>
                                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('monitorFolderServerPathLabel')}</label>
                                    <div className="flex items-center space-x-2 mt-1">
                                        <input
                                            type="text"
                                            value={folderPaths[company.id] || ''}
                                            onChange={(e) => setFolderPaths(prev => ({...prev, [company.id]: e.target.value}))}
                                            placeholder={t('monitorFolderServerPathPlaceholder')}
                                            className="w-full input-field text-sm"
                                        />
                                        <button
                                            onClick={() => handleSaveFolder(company.id)}
                                            className="px-3 py-2 font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 text-xs whitespace-nowrap"
                                        >
                                            {t('saveButton')}
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('monitorFolderServerDescription')}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                 </div>

                <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-xl shadow-md">
                    <div className="flex justify-between items-center border-b dark:border-gray-600 pb-2 mb-4">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">Gerenciamento de Usuários</h3>
                        <button onClick={openAddUserModal} className="px-4 py-2 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 text-sm">{t('addUserButton')}</button>
                    </div>
                    <div className="overflow-x-auto border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                             <thead className="bg-gray-50 dark:bg-gray-700"><tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">{t('userFormNameLabel')}</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Email</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">{t('companyLabel')}</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Permissão</th>
                                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Ações</span></th>
                            </tr></thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
                                {users.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{user.name || <span className="italic text-gray-400">N/A</span>}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{user.username}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{companies.find(c => c.id === user.companyId)?.name || <span className="italic">{t('noCompany')}</span>}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${roleClassMap[user.role]}`}>{user.role}</span></td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                                            <button onClick={() => openEditUserModal(user)} className="text-blue-600 hover:text-blue-900"><EditIcon className="w-5 h-5 inline-block"/></button>
                                            <button onClick={() => handleDeleteUser(user.id)} className={`text-red-600 hover:text-red-900 ${currentUser.id === user.id ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={currentUser.id === user.id}><TrashIcon className="w-5 h-5 inline-block" /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                 </div>
                 <Modal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} title={modalMode === 'add' ? t('addUserModalTitle') : t('editUserModalTitle')}>
                    <div className="space-y-4">
                        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('userFormNameLabel')}</label><input type="text" value={userForm.name} onChange={(e) => setUserForm({...userForm, name: e.target.value})} className="mt-1 block w-full input-field"/></div>
                        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('userFormEmailLabel')}</label><input type="email" value={userForm.username} onChange={(e) => setUserForm({...userForm, username: e.target.value})} className="mt-1 block w-full input-field"/></div>
                        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('userFormPasswordLabel')}</label><input type="password" value={userForm.password} onChange={(e) => setUserForm({...userForm, password: e.target.value})} placeholder={modalMode === 'edit' ? t('userFormPasswordPlaceholder') : ''} className="mt-1 block w-full input-field"/></div>
                        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('companyLabel')}</label><select value={userForm.companyId} onChange={(e) => setUserForm({...userForm, companyId: e.target.value})} className="mt-1 block w-full input-field"><option value="">{t('noCompany')}</option>{companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('userFormRoleLabel')}</label>
                            <select value={userForm.role} onChange={(e) => setUserForm({...userForm, role: e.target.value as Role})} className="mt-1 block w-full input-field">
                                <option value="viewer">Viewer</option>
                                <option value="editor">Editor</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                        <div className="flex justify-end pt-4 space-x-2"><button onClick={() => setIsUserModalOpen(false)} className="px-4 py-2 font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">{t('cancelButton')}</button><button onClick={handleUserFormSubmit} className="px-4 py-2 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700">{t('saveButton')}</button></div>
                    </div>
                </Modal>
                <style>{`.input-field { background-color: #FFF; color: #1F2937; border: 1px solid #D1D5DB; border-radius: 0.5rem; padding: 0.5rem 0.75rem; } .dark .input-field { background-color: #374151; color: #F9FAFB; border-color: #4B5563; }`}</style>
            </div>
        )
    };
    
    const LogsTab = () => (
         <div className="mt-4">
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 border-b dark:border-gray-600 pb-2 mb-4">Logs de Atividades do Sistema</h3>
            <div className="overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg max-h-[60vh]">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                    <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0"><tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">{t('logDate')}</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">{t('logUser')}</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">{t('logAction')}</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">{t('logDetails')}</th>
                    </tr></thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
                        {logs.length > 0 ? logs.map((log) => (
                            <tr key={log.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatLogTimestamp(log.timestamp)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{log.username}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"><span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">{log.action}</span></td>
                                <td className="px-6 py-4 whitespace-normal text-sm text-gray-700 dark:text-gray-300">{log.details}</td>
                            </tr>
                        )) : (<tr><td colSpan={4} className="text-center py-10 text-gray-500">Nenhum registro de atividade.</td></tr>)}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const SslTab = () => {
        const [domain, setDomain] = useState('gerenciaboleto.abildeveloper.com.br');
        const [status, setStatus] = useState<SslStatus | null>(null);
        const [isLoading, setIsLoading] = useState(false);

        useEffect(() => {
            // Pre-check status on tab load
            handleCheckStatus();
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }, []);

        const handleCheckStatus = async () => {
            if (!domain) return;
            setIsLoading(true);
            setStatus(null);
            try {
                const result = await api.checkSslStatus(domain);
                setStatus(result);
            } catch (e: any) {
                setStatus({ isValid: false, expiresAt: null, issuedAt: null, error: e.message });
            } finally {
                setIsLoading(false);
            }
        };

        const formatDate = (dateString: string | null) => {
            if (!dateString) return 'N/A';
            return new Date(dateString).toLocaleString(language === 'pt' ? 'pt-BR' : 'en-US');
        };

        return (
            <div className="space-y-6">
                <div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 border-b dark:border-gray-600 pb-2 mb-4">Gerenciamento de Certificado SSL</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        Verifique o status do certificado SSL para o domínio configurado no servidor.
                    </p>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg space-y-4">
                    <div>
                        <label htmlFor="ssl-domain" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Domínio do Servidor</label>
                        <input
                            type="text"
                            id="ssl-domain"
                            value={domain}
                            readOnly
                            className="mt-1 block w-full input-field bg-gray-200 dark:bg-gray-800 cursor-not-allowed"
                        />
                    </div>
                    <div className="flex justify-end space-x-2">
                        <button onClick={handleCheckStatus} disabled={!domain || isLoading} className="px-4 py-2 font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm">
                            {isLoading ? 'Verificando...' : 'Verificar Status Novamente'}
                        </button>
                    </div>
                </div>

                {isLoading && <div className="flex justify-center"><Spinner /></div>}
                
                {status && (
                    <div className={`p-4 rounded-lg ${status.isValid ? 'bg-green-100 dark:bg-green-900/40' : 'bg-red-100 dark:bg-red-900/40'}`}>
                        <h4 className={`text-lg font-bold ${status.isValid ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                            {status.isValid ? 'Certificado Válido' : 'Falha na Verificação'}
                        </h4>
                        {status.error && <p className="text-sm text-red-700 dark:text-red-300 mt-1">{status.error}</p>}
                        {status.isValid && (
                            <div className="mt-2 text-sm text-gray-700 dark:text-gray-300 space-y-1">
                                <p><strong>Emitido em:</strong> {formatDate(status.issuedAt)}</p>
                                <p><strong>Expira em:</strong> {formatDate(status.expiresAt)}</p>
                            </div>
                        )}
                    </div>
                )}
                
                <div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 border-b dark:border-gray-600 pb-2 mb-4">Instalação do Certificado</h3>
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                        <p>
                            O script de implantação (`deploy.txt`) foi aprimorado para instalar o <strong>Certbot</strong> e solicitar automaticamente um certificado SSL para o domínio <strong>{domain}</strong>.
                        </p>
                         <p>
                            A renovação também é configurada para ser automática. Se o status acima indicar um problema, conecte-se ao seu servidor via SSH e verifique os logs do Nginx e do Certbot para diagnosticar o problema.
                         </p>
                         <pre className="bg-gray-800 text-white p-3 rounded-md"><code># Comando para testar a renovação no servidor
sudo certbot renew --dry-run</code></pre>
                    </div>
                </div>
                 <style>{`.input-field { background-color: #F3F4F6; color: #1F2937; border: 1px solid #D1D5DB; border-radius: 0.5rem; padding: 0.5rem 0.75rem; } .dark .input-field { background-color: #374151; color: #F9FAFB; border-color: #4B5563; }`}</style>
            </div>
        );
    };

    const TrackingTab = () => {
        const [trackingEmail, setTrackingEmail] = useState('');
        const [trackingEnabled, setTrackingEnabled] = useState(false);
        const [isLoadingSettings, setIsLoadingSettings] = useState(true);
        const [trackingLogs, setTrackingLogs] = useState<TrackingLog[]>([]);
        const [isLoadingLogs, setIsLoadingLogs] = useState(true);

        useEffect(() => {
            const loadData = async () => {
                setIsLoadingSettings(true);
                setIsLoadingLogs(true);
                try {
                    const settings = await api.fetchAllSettings();
                    setTrackingEmail(settings.tracking_notification_email || '');
                    setTrackingEnabled(!!settings.tracking_notification_enabled);
                } catch (error) {
                    showNotification(t('settingsLoadError' as TranslationKey), 'error');
                } finally {
                    setIsLoadingSettings(false);
                }

                try {
                    const logs = await api.fetchTrackingLogs();
                    setTrackingLogs(logs);
                } catch (error: any) {
                    showNotification(error.message || "Failed to load tracking logs.", 'error');
                } finally {
                    setIsLoadingLogs(false);
                }
            };
            loadData();
        }, []);

        const handleSaveTrackingSettings = async () => {
            const settingsToSave = {
                tracking_notification_email: trackingEmail,
                tracking_notification_enabled: trackingEnabled,
            };
            try {
                await api.updateAllSettings(settingsToSave);
                showNotification(t('settingsSavedSuccess'), 'success');
            } catch (error: any) {
                showNotification(t('settingsSaveError' as TranslationKey) || error.message, 'error');
            }
        };

        return (
             <div className="space-y-6">
                 <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl shadow-md">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 border-b dark:border-gray-600 pb-2 mb-4">{t('trackingSettings')}</h3>
                    {isLoadingSettings ? <Spinner /> : (
                        <div className="space-y-4">
                             <div>
                                <label htmlFor="trackingEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('trackingEmailLabel')}</label>
                                <input type="email" id="trackingEmail" value={trackingEmail} onChange={e => setTrackingEmail(e.target.value)} placeholder={t('trackingEmailPlaceholder')} className="mt-1 block w-full input-field"/>
                            </div>
                            <div className="flex items-center">
                                <input id="trackingEnabled" type="checkbox" checked={trackingEnabled} onChange={e => setTrackingEnabled(e.target.checked)} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                                <label htmlFor="trackingEnabled" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">{t('enableTrackingEmail')}</label>
                            </div>
                             <div className="flex justify-end">
                                <button onClick={handleSaveTrackingSettings} className="px-4 py-2 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 text-sm">
                                    {t('saveButton')}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl shadow-md">
                     <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 border-b dark:border-gray-600 pb-2 mb-4">{t('trackingLogHistory')}</h3>
                    {isLoadingLogs ? <Spinner /> : (
                        <div className="overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg max-h-[50vh]">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                                <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0"><tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">{t('logDate')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">{t('logUser')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">{t('ipAddress')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">{t('location')}</th>
                                </tr></thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
                                    {trackingLogs.length > 0 ? trackingLogs.map((log) => (
                                        <tr key={log.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatLogTimestamp(log.timestamp)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{log.username}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">{log.ipAddress || 'N/A'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {log.latitude && log.longitude ? (
                                                    <a href={`https://www.google.com/maps?q=${log.latitude},${log.longitude}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                                        {t('viewOnMap')}
                                                    </a>
                                                ) : 'N/A'}
                                            </td>
                                        </tr>
                                    )) : (<tr><td colSpan={4} className="text-center py-10 text-gray-500">{t('noTrackingLogs')}</td></tr>)}
                                </tbody>
                            </table>
                        </div>
                    )}
                 </div>
                 <style>{`.input-field { background-color: #F3F4F6; color: #1F2937; border: 1px solid #D1D5DB; border-radius: 0.5rem; padding: 0.5rem 0.75rem; } .dark .input-field { background-color: #374151; color: #F9FAFB; border-color: #4B5563; }`}</style>
            </div>
        );
    };

    const EmailTab = () => {
        const [smtpSettings, setSmtpSettings] = useState({
            host: '',
            port: 587,
            user: '',
            pass: '',
            from: '',
            secure: true,
        });
        const [isLoading, setIsLoading] = useState(true);
        const [isSaving, setIsSaving] = useState(false);
        const [isTesting, setIsTesting] = useState(false);

        useEffect(() => {
            const loadSettings = async () => {
                setIsLoading(true);
                try {
                    const settings = await api.fetchAllSettings();
                    setSmtpSettings({
                        host: settings.smtp_host || '',
                        port: settings.smtp_port || 587,
                        user: settings.smtp_user || '',
                        pass: settings.smtp_pass || '',
                        from: settings.smtp_from || '',
                        secure: settings.smtp_secure !== undefined ? settings.smtp_secure : true,
                    });
                } catch (error) {
                    showNotification(t('settingsLoadError' as TranslationKey), 'error');
                } finally {
                    setIsLoading(false);
                }
            };
            loadSettings();
        }, []);

        const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const { name, value, type, checked } = e.target;
            setSmtpSettings(prev => ({
                ...prev,
                [name]: type === 'checkbox' ? checked : value,
            }));
        };

        const handleSaveSettings = async () => {
            setIsSaving(true);
            const settingsToSave = {
                smtp_host: smtpSettings.host,
                smtp_port: Number(smtpSettings.port),
                smtp_user: smtpSettings.user,
                smtp_pass: smtpSettings.pass,
                smtp_from: smtpSettings.from,
                smtp_secure: smtpSettings.secure,
            };
            try {
                await api.updateAllSettings(settingsToSave);
                showNotification(t('settingsSavedSuccess'), 'success');
            } catch (error: any) {
                showNotification(t('settingsSaveError' as TranslationKey) || error.message, 'error');
            } finally {
                setIsSaving(false);
            }
        };

        const handleSendTestEmail = async () => {
            setIsTesting(true);
            const settingsToTest = {
                smtp_host: smtpSettings.host,
                smtp_port: Number(smtpSettings.port),
                smtp_user: smtpSettings.user,
                smtp_pass: smtpSettings.pass,
                smtp_from: smtpSettings.from,
                smtp_secure: smtpSettings.secure,
            };
            try {
                const response = await api.sendTestEmail(settingsToTest);
                showNotification(t(response.message as TranslationKey) || response.message, 'success');
            } catch (error: any) {
                showNotification(t((error.message as TranslationKey) || 'testEmailSentError'), 'error');
            } finally {
                setIsTesting(false);
            }
        };

        if (isLoading) {
            return <div className="flex justify-center items-center h-64"><Spinner /></div>;
        }

        return (
            <div className="space-y-6">
                 <div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 border-b dark:border-gray-600 pb-2 mb-4">{t('emailSettingsTitle' as TranslationKey)}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{t('emailSettingsDescription' as TranslationKey)}</p>
                    <div className="space-y-4 mt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('smtpHost' as TranslationKey)}</label>
                                <input type="text" name="host" value={smtpSettings.host} onChange={handleInputChange} className="mt-1 block w-full input-field" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('smtpPort' as TranslationKey)}</label>
                                <input type="number" name="port" value={smtpSettings.port} onChange={handleInputChange} className="mt-1 block w-full input-field" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('smtpUser' as TranslationKey)}</label>
                            <input type="text" name="user" value={smtpSettings.user} onChange={handleInputChange} className="mt-1 block w-full input-field" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('smtpPass' as TranslationKey)}</label>
                            <input type="password" name="pass" value={smtpSettings.pass} onChange={handleInputChange} className="mt-1 block w-full input-field" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('smtpFrom' as TranslationKey)}</label>
                            <input type="email" name="from" value={smtpSettings.from} onChange={handleInputChange} placeholder={t('smtpFromPlaceholder' as TranslationKey)} className="mt-1 block w-full input-field" />
                        </div>
                        <div className="flex items-center">
                            <input type="checkbox" name="secure" checked={smtpSettings.secure} onChange={handleInputChange} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                            <label className="ml-2 block text-sm text-gray-900 dark:text-gray-300">{t('smtpSecure' as TranslationKey)}</label>
                        </div>
                    </div>
                </div>
                 <div className="flex justify-end pt-4 mt-4 border-t dark:border-gray-600 space-x-3">
                    <button onClick={handleSendTestEmail} disabled={isTesting || isSaving} className="px-4 py-2 font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center min-w-[160px] justify-center">
                        {isTesting ? <><div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin mr-2"></div>{t('sendingTestEmail' as TranslationKey)}</> : t('sendTestEmailButton' as TranslationKey)}
                    </button>
                    <button onClick={handleSaveSettings} disabled={isSaving || isTesting} className="px-6 py-2 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center min-w-[120px] justify-center">
                        {isSaving ? <><div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin mr-2"></div>{t('saving' as TranslationKey)}</> : t('saveButton')}
                    </button>
                </div>
                <style>{`.input-field { background-color: #F3F4F6; color: #1F2937; border: 1px solid #D1D5DB; border-radius: 0.5rem; padding: 0.5rem 0.75rem; } .dark .input-field { background-color: #374151; color: #F9FAFB; border-color: #4B5563; }`}</style>
            </div>
        )
    };

    return (
        <>
             {notification && (
                <div
                    className={`fixed top-24 right-5 z-50 flex items-center p-4 w-full max-w-xs rounded-lg shadow-lg text-white ${
                    notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'
                    } animate-fade-in-up`}
                    role="alert"
                >
                    <div className="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg bg-black bg-opacity-20">
                        {notification.type === 'success' ? <CheckCircleIcon className="w-5 h-5"/> : <XCircleIcon className="w-5 h-5"/>}
                    </div>
                    <div className="ml-3 text-sm font-normal">{notification.message}</div>
                    <button type="button" onClick={() => setNotification(null)} className="ml-auto -mx-1.5 -my-1.5 rounded-lg p-1.5 inline-flex h-8 w-8 hover:bg-black hover:bg-opacity-20 focus:ring-2 focus:ring-gray-300" aria-label="Close">
                        <span className="sr-only">Close</span>
                        <svg className="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
                        </svg>
                    </button>
                </div>
            )}
            <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
                <nav className="flex space-x-2 overflow-x-auto pb-2">
                    <TabButton tabId="settings" label={t('adminPanelSettingsTab')} />
                    <TabButton tabId="users_companies" label={t('adminPanelUsersCompaniesTab')} />
                    <TabButton tabId="ssl" label="Certificado SSL" />
                    <TabButton tabId="rastreio" label={t('trackingTab')} />
                    <TabButton tabId="email" label={t('adminPanelEmailTab')} />
                    <TabButton tabId="logs" label={t('adminPanelLogsTab')} />
                </nav>
            </div>
            
            {activeTab === 'settings' && <SettingsTab />}
            {activeTab === 'users_companies' && <UsersAndCompaniesTab />}
            {activeTab === 'ssl' && <SslTab />}
            {activeTab === 'rastreio' && <TrackingTab />}
            {activeTab === 'email' && <EmailTab />}
            {activeTab === 'logs' && <LogsTab />}
            
            <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700 mt-6">
                 <button onClick={onClose} className="px-6 py-2 font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Fechar Painel</button>
            </div>
        </>
    );
};

export default AdminPanel;