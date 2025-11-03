import React, { useState, useEffect } from 'react';
import { useWhitelabel } from '../contexts/WhitelabelContext';
import { RegisteredUser, Role, User, LogEntry, ProcessingMethod, AiSettings, Company, SslStatus } from '../types';
import { TrashIcon, EditIcon } from './icons/Icons';
import { useLanguage } from '../contexts/LanguageContext';
import { useProcessingMethod } from '../contexts/ProcessingMethodContext';
import Modal from './Modal';
import { useAiSettings } from '../contexts/AiSettingsContext';
import * as api from '../services/api';
import Spinner from './Spinner';


interface AdminPanelProps {
    onClose: () => void;
    getUsers: () => Promise<RegisteredUser[]>;
    addUser: (actor: User, newUser: Omit<RegisteredUser, 'id'>) => Promise<boolean>;
    updateUser: (actor: User, userId: string, updates: Partial<Omit<RegisteredUser, 'id'>>) => Promise<boolean>;
    deleteUser: (actor: User, userId: string) => Promise<boolean>;
    currentUser: User;
    getLogs: () => Promise<LogEntry[]>;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onClose, getUsers, addUser, updateUser, deleteUser, currentUser, getLogs }) => {
    const { t, language } = useLanguage();
    const [activeTab, setActiveTab] = useState<'settings' | 'users_companies' | 'logs' | 'ssl'>('settings');
    
    const [logs, setLogs] = useState<LogEntry[]>([]);

    useEffect(() => {
        const loadLogs = async () => {
            if (activeTab === 'logs') {
                setLogs(await getLogs());
            }
        };
        loadLogs();
    }, [activeTab, getLogs]);
    
    const TabButton: React.FC<{tabId: 'settings' | 'users_companies' | 'logs' | 'ssl', label: string}> = ({ tabId, label}) => (
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
            timeStyle: 'medium'
        });
    };
    
    const SettingsTab = () => {
        const { appName, logoUrl, setAppName, setLogoUrl } = useWhitelabel();
        const { method: currentMethod, setMethod } = useProcessingMethod();
        const { aiSettings, setAiSettings } = useAiSettings();
        const [currentAppName, setCurrentAppName] = useState(appName);
        const [currentLogoUrl, setCurrentLogoUrl] = useState(logoUrl);
        const [currentAiSettings, setCurrentAiSettings] = useState<AiSettings>(aiSettings);

        const handleSaveWhitelabel = () => { setAppName(currentAppName); setLogoUrl(currentLogoUrl); };
        const handleSaveAiSettings = () => setAiSettings(currentAiSettings, currentUser);
        const handleMethodChange = (newMethod: ProcessingMethod) => setMethod(newMethod, currentUser);

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
                 <div className="flex justify-end pt-4 mt-4"><button onClick={handleSaveWhitelabel} className="px-6 py-2 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700">Salvar Aparência</button></div>
                </div>
                 <hr className="my-6 border-t border-gray-200 dark:border-gray-600"/>
                 <div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 border-b dark:border-gray-600 pb-2 mb-4">{t('extractionMethodTitle')}</h3>
                    <fieldset className="mt-4"><div className="space-y-4">
                        <div className="flex items-start">
                            <div className="flex items-center h-5"><input id="method-ai" type="radio" checked={currentMethod === 'ai'} onChange={() => handleMethodChange('ai')} className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"/></div>
                            <div className="ml-3 text-sm"><label htmlFor="method-ai" className="font-medium text-gray-800 dark:text-gray-200">{t('extractionMethodAI')}</label><p className="text-gray-500 dark:text-gray-400">{t('extractionMethodAIDescription')}</p></div>
                        </div>
                        <div className="flex items-start">
                            <div className="flex items-center h-5"><input id="method-regex" type="radio" checked={currentMethod === 'regex'} onChange={() => handleMethodChange('regex')} className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"/></div>
                            <div className="ml-3 text-sm"><label htmlFor="method-regex" className="font-medium text-gray-800 dark:text-gray-200">{t('extractionMethodRegex')}</label><p className="text-gray-500 dark:text-gray-400">{t('extractionMethodRegexDescription')}</p></div>
                        </div>
                    </div></fieldset>
                </div>
                 <hr className="my-6 border-t border-gray-200 dark:border-gray-600"/>
                <div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 border-b dark:border-gray-600 pb-2 mb-4">{t('aiSettingsTitle')}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{t('aiSettingsDescription')}</p>
                    <div className="mt-4 space-y-4">
                        <div>
                            <label htmlFor="ai-model" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('modelLabel')}</label>
                            <input type="text" id="ai-model" value={currentAiSettings.model} onChange={(e) => setCurrentAiSettings({...currentAiSettings, model: e.target.value})} className="mt-1 block w-full input-field" />
                            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{t('modelDescription')}</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label htmlFor="ai-temp" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('temperatureLabel')} ({currentAiSettings.temperature})</label>
                                <input type="range" id="ai-temp" min="0" max="1" step="0.1" value={currentAiSettings.temperature} onChange={(e) => setCurrentAiSettings({...currentAiSettings, temperature: parseFloat(e.target.value)})} className="mt-1 block w-full" />
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('temperatureDescription')}</p>
                            </div>
                            <div>
                                <label htmlFor="ai-topk" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('topKLabel')}</label>
                                <input type="number" id="ai-topk" min="1" value={currentAiSettings.topK} onChange={(e) => setCurrentAiSettings({...currentAiSettings, topK: parseInt(e.target.value, 10) || 1})} className="mt-1 block w-full input-field" />
                                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{t('topKDescription')}</p>
                            </div>
                            <div>
                                <label htmlFor="ai-topp" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('topPLabel')} ({currentAiSettings.topP})</label>
                                <input type="range" id="ai-topp" min="0" max="1" step="0.1" value={currentAiSettings.topP} onChange={(e) => setCurrentAiSettings({...currentAiSettings, topP: parseFloat(e.target.value)})} className="mt-1 block w-full" />
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('topPDescription')}</p>
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-sm rounded-lg">{t('apiKeyNote')}</div>
                    <div className="flex justify-end pt-4 mt-4"><button onClick={handleSaveAiSettings} className="px-6 py-2 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700">{t('saveAiSettingsButton')}</button></div>
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
        const [userForm, setUserForm] = useState({ username: '', password: '', role: 'user' as Role, companyId: '' });
        const [formError, setFormError] = useState<string | null>(null);
        const [companyForm, setCompanyForm] = useState({ name: '', cnpj: '', address: ''});

        const refreshData = async () => {
            setUsers(await getUsers());
            setCompanies(await api.fetchCompanies());
        };

        useEffect(() => { refreshData(); }, []);

        const openAddUserModal = () => {
            setModalMode('add'); setSelectedUser(null);
            setUserForm({ username: '', password: '', role: 'user', companyId: '' });
            setFormError(null); setIsUserModalOpen(true);
        };

        const openEditUserModal = (user: RegisteredUser) => {
            setModalMode('edit'); setSelectedUser(user);
            setUserForm({ username: user.username, password: '', role: user.role, companyId: user.companyId || '' });
            setFormError(null); setIsUserModalOpen(true);
        };
        
        const handleUserFormSubmit = async () => {
            setFormError(null);
            if (modalMode === 'add') {
                const success = await addUser(currentUser, { username: userForm.username, password: userForm.password, role: userForm.role, companyId: userForm.companyId || undefined });
                if (success) { await refreshData(); setIsUserModalOpen(false); } else { setFormError('addUserErrorDuplicate'); }
            } else if (modalMode === 'edit' && selectedUser) {
                const updates: Partial<Omit<RegisteredUser, 'id'>> = {};
                if (userForm.username !== selectedUser.username) updates.username = userForm.username;
                if (userForm.password) updates.password = userForm.password;
                if (userForm.role !== selectedUser.role) updates.role = userForm.role;
                if (userForm.companyId !== (selectedUser.companyId || '')) updates.companyId = userForm.companyId;

                const success = await updateUser(currentUser, selectedUser.id, updates);
                if (success) { await refreshData(); setIsUserModalOpen(false); } else { setFormError('genericErrorText'); }
            }
        };
        
        const handleDeleteUser = async (userId: string) => {
            if (window.confirm(t('confirmUserDeletion'))) {
                const success = await deleteUser(currentUser, userId);
                if (success) { await refreshData(); } else { alert(t('deleteUserError')); }
            }
        };

        const handleAddCompany = async (e: React.FormEvent) => {
            e.preventDefault();
            if(!companyForm.name || !companyForm.cnpj) return;
            await api.createCompany(companyForm);
            setCompanyForm({ name: '', cnpj: '', address: ''});
            await refreshData();
        };

        const handleDeleteCompany = async (id: string) => {
            if (window.confirm('Tem certeza que deseja excluir esta empresa?')) {
                await api.deleteCompany(id);
                await refreshData();
            }
        }
        
        return (
            <div className="space-y-8">
                 <div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 border-b dark:border-gray-600 pb-2 mb-4">{t('adminCompaniesTitle')}</h3>
                    <form onSubmit={handleAddCompany} className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg space-y-4">
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
                            <div key={company.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
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
                                        {users.filter(u => u.companyId === company.id).map(user => (<li key={user.id} className="text-gray-600 dark:text-gray-400">{user.username}</li>))}
                                        {users.filter(u => u.companyId === company.id).length === 0 && <p className="text-xs text-gray-400 italic">{t('noUsersInCompany')}</p>}
                                    </ul>
                                </div>
                            </div>
                        ))}
                    </div>
                 </div>

                 <hr className="my-6 border-t border-gray-200 dark:border-gray-600"/>

                 <div>
                    <div className="flex justify-between items-center border-b dark:border-gray-600 pb-2 mb-4">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">Gerenciamento de Usuários</h3>
                        <button onClick={openAddUserModal} className="px-4 py-2 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 text-sm">{t('addUserButton')}</button>
                    </div>
                    <div className="overflow-x-auto border border-gray-200 dark:border-gray-600 rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                             <thead className="bg-gray-50 dark:bg-gray-700"><tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Usuário</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">{t('companyLabel')}</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Permissão</th>
                                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Ações</span></th>
                            </tr></thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
                                {users.map((user) => (
                                    <tr key={user.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{user.username}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{companies.find(c => c.id === user.companyId)?.name || <span className="italic">{t('noCompany')}</span>}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'admin' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>{user.role}</span></td>
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
                        {formError && <p className="text-red-500 text-sm text-center">{t(formError as any)}</p>}
                        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('userFormEmailLabel')}</label><input type="email" value={userForm.username} onChange={(e) => setUserForm({...userForm, username: e.target.value})} className="mt-1 block w-full input-field"/></div>
                        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('userFormPasswordLabel')}</label><input type="password" value={userForm.password} onChange={(e) => setUserForm({...userForm, password: e.target.value})} placeholder={modalMode === 'edit' ? t('userFormPasswordPlaceholder') : ''} className="mt-1 block w-full input-field"/></div>
                        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('companyLabel')}</label><select value={userForm.companyId} onChange={(e) => setUserForm({...userForm, companyId: e.target.value})} className="mt-1 block w-full input-field"><option value="">{t('noCompany')}</option>{companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('userFormRoleLabel')}</label><select value={userForm.role} onChange={(e) => setUserForm({...userForm, role: e.target.value as Role})} className="mt-1 block w-full input-field"><option value="user">User</option><option value="admin">Admin</option></select></div>
                        <div className="flex justify-end pt-4 space-x-2"><button onClick={() => setIsUserModalOpen(false)} className="px-4 py-2 font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">{t('cancelButton')}</button><button onClick={handleUserFormSubmit} className="px-4 py-2 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700">{t('saveButton')}</button></div>
                    </div>
                </Modal>
                <style>{`.input-field { background-color: #F3F4F6; color: #1F2937; border: 1px solid #D1D5DB; border-radius: 0.5rem; padding: 0.5rem 0.75rem; } .dark .input-field { background-color: #374151; color: #F9FAFB; border-color: #4B5563; }`}</style>
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
        const [domain, setDomain] = useState('');
        const [status, setStatus] = useState<SslStatus | null>(null);
        const [isLoading, setIsLoading] = useState(false);
        const [isSaving, setIsSaving] = useState(false);

        useEffect(() => {
            const loadDomain = async () => {
                try {
                    const settings = await api.fetchSslSettings();
                    if (settings.domain) {
                        setDomain(settings.domain);
                    }
                } catch (e) {
                    console.error("Could not load SSL domain settings");
                }
            };
            loadDomain();
        }, []);

        const handleSave = async () => {
            setIsSaving(true);
            try {
                await api.saveSslSettings({ domain });
            } catch (e) {
                console.error("Failed to save domain", e);
            } finally {
                setIsSaving(false);
            }
        };

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
                        Configure o domínio do seu servidor para verificar o status do seu certificado SSL e obter instruções para instalação e renovação.
                    </p>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg space-y-4">
                    <div>
                        <label htmlFor="ssl-domain" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Domínio do Servidor</label>
                        <input
                            type="text"
                            id="ssl-domain"
                            value={domain}
                            onChange={e => setDomain(e.target.value)}
                            placeholder="exemplo.com.br"
                            className="mt-1 block w-full input-field"
                        />
                    </div>
                    <div className="flex justify-end space-x-2">
                        <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm">
                            {isSaving ? 'Salvando...' : 'Salvar Domínio'}
                        </button>
                        <button onClick={handleCheckStatus} disabled={!domain || isLoading} className="px-4 py-2 font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm">
                            {isLoading ? 'Verificando...' : 'Verificar Status'}
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
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 border-b dark:border-gray-600 pb-2 mb-4">Como Instalar/Renovar o Certificado</h3>
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                        <p>
                            Recomendamos o uso do <strong>Certbot</strong> com Let's Encrypt para obter certificados SSL gratuitos e automatizar a renovação. Conecte-se ao seu servidor via SSH e siga os passos abaixo.
                        </p>
                        <h4>Passo 1: Instalar o Certbot</h4>
                        <p>Execute o comando apropriado para o seu sistema operacional (exemplo para Ubuntu com Nginx):</p>
                        <pre className="bg-gray-800 text-white p-3 rounded-md"><code>sudo apt update && sudo apt install certbot python3-certbot-nginx</code></pre>
                        
                        <h4>Passo 2: Gerar o Certificado</h4>
                        <p>Execute o comando abaixo, substituindo `seu_dominio.com` pelo domínio que você salvou acima. O Certbot irá configurar o Nginx automaticamente.</p>
                         <pre className="bg-gray-800 text-white p-3 rounded-md"><code>sudo certbot --nginx -d {domain || 'seu_dominio.com'}</code></pre>
                         
                         <h4>Passo 3: Renovação Automática</h4>
                         <p>O Certbot configura uma renovação automática. Você pode testá-la com o comando:</p>
                         <pre className="bg-gray-800 text-white p-3 rounded-md"><code>sudo certbot renew --dry-run</code></pre>
                         <p>Se o teste for bem-sucedido, o certificado será renovado automaticamente antes de expirar.</p>
                    </div>
                </div>
                 <style>{`.input-field { background-color: #F3F4F6; color: #1F2937; border: 1px solid #D1D5DB; border-radius: 0.5rem; padding: 0.5rem 0.75rem; } .dark .input-field { background-color: #374151; color: #F9FAFB; border-color: #4B5563; }`}</style>
            </div>
        );
    };


    return (
        <>
            <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
                <nav className="flex space-x-2">
                    <TabButton tabId="settings" label={t('adminPanelSettingsTab')} />
                    <TabButton tabId="users_companies" label={t('adminPanelUsersCompaniesTab')} />
                    <TabButton tabId="ssl" label="Certificado SSL" />
                    <TabButton tabId="logs" label={t('adminPanelLogsTab')} />
                </nav>
            </div>
            
            {activeTab === 'settings' && <SettingsTab />}
            {activeTab === 'users_companies' && <UsersAndCompaniesTab />}
            {activeTab === 'ssl' && <SslTab />}
            {activeTab === 'logs' && <LogsTab />}
            
            <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700 mt-6">
                 <button onClick={onClose} className="px-6 py-2 font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Fechar Painel</button>
            </div>
        </>
    );
};

export default AdminPanel;