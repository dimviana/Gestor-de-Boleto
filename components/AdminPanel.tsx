
import React, { useState, useEffect } from 'react';
import { useWhitelabel } from '../contexts/WhitelabelContext';
import { RegisteredUser, Role, User, LogEntry } from '../types';
import { TrashIcon, EditIcon } from './icons/Icons';
import { useLanguage } from '../contexts/LanguageContext';
import Modal from './Modal';

interface AdminPanelProps {
    onClose: () => void;
    getUsers: () => RegisteredUser[];
    addUser: (actor: User, newUser: Omit<RegisteredUser, 'id'>) => boolean;
    updateUser: (actor: User, userId: string, updates: Partial<Omit<RegisteredUser, 'id'>>) => boolean;
    deleteUser: (actor: User, userId: string) => boolean;
    currentUser: User;
    getLogs: () => LogEntry[];
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onClose, getUsers, addUser, updateUser, deleteUser, currentUser, getLogs }) => {
    const { appName, logoUrl, setAppName, setLogoUrl } = useWhitelabel();
    const { t, language } = useLanguage();
    const [activeTab, setActiveTab] = useState<'users' | 'logs'>('users');
    
    // Whitelabel state
    const [currentAppName, setCurrentAppName] = useState(appName);
    const [currentLogoUrl, setCurrentLogoUrl] = useState(logoUrl);

    // User Management state
    const [users, setUsers] = useState<RegisteredUser[]>([]);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [selectedUser, setSelectedUser] = useState<RegisteredUser | null>(null);
    const [userForm, setUserForm] = useState({ username: '', password: '', role: 'user' as Role });
    const [formError, setFormError] = useState<string | null>(null);

    // Logs state
    const [logs, setLogs] = useState<LogEntry[]>([]);

    useEffect(() => {
        setUsers(getUsers());
        setLogs(getLogs());
    }, [getUsers, getLogs]);
    
    const refreshUsers = () => setUsers(getUsers());

    const handleSaveWhitelabel = () => {
        setAppName(currentAppName);
        setLogoUrl(currentLogoUrl);
    };

    const openAddUserModal = () => {
        setModalMode('add');
        setSelectedUser(null);
        setUserForm({ username: '', password: '', role: 'user' });
        setFormError(null);
        setIsUserModalOpen(true);
    };

    const openEditUserModal = (user: RegisteredUser) => {
        setModalMode('edit');
        setSelectedUser(user);
        setUserForm({ username: user.username, password: '', role: user.role });
        setFormError(null);
        setIsUserModalOpen(true);
    };
    
    const handleUserFormSubmit = () => {
        setFormError(null);
        if (modalMode === 'add') {
            if (!userForm.username || !userForm.password) {
                 setFormError('authErrorInvalidCredentials'); // Re-use translation
                 return;
            }
            const success = addUser(currentUser, { 
                username: userForm.username,
                password: userForm.password,
                role: userForm.role
            });
            if (success) {
                refreshUsers();
                setIsUserModalOpen(false);
            } else {
                setFormError('authErrorEmailExists'); // Or another specific error
            }
        } else if (modalMode === 'edit' && selectedUser) {
            const updates: Partial<Omit<RegisteredUser, 'id'>> = {};
            if (userForm.username !== selectedUser.username) updates.username = userForm.username;
            if (userForm.password) updates.password = userForm.password;
            if (userForm.role !== selectedUser.role) updates.role = userForm.role;

            if (Object.keys(updates).length > 0) {
                 const success = updateUser(currentUser, selectedUser.id, updates);
                 if (success) {
                    refreshUsers();
                    setIsUserModalOpen(false);
                 } else {
                    setFormError('addUserErrorDuplicate');
                 }
            } else {
                 setIsUserModalOpen(false); // No changes made
            }
        }
    };
    
    const handleDeleteUser = (userId: string) => {
        if (window.confirm(t('confirmUserDeletion'))) {
            if (deleteUser(currentUser, userId)) {
                refreshUsers();
            } else {
                alert(t('deleteUserError'));
            }
        }
    };
    
    const formatLogTimestamp = (isoString: string) => {
        return new Date(isoString).toLocaleString(language === 'pt' ? 'pt-BR' : 'en-US', {
            dateStyle: 'short',
            timeStyle: 'medium'
        });
    };
    
    const TabButton: React.FC<{tabId: 'users' | 'logs', label: string}> = ({ tabId, label}) => (
         <button
            onClick={() => setActiveTab(tabId)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === tabId
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-200'
            }`}
        >
            {label}
        </button>
    );

    const SettingsAndUsersTab = () => (
        <div className="space-y-6">
            {/* Whitelabel Settings */}
            <div>
                 <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4">Configurações de Aparência</h3>
                <div className="space-y-4 mt-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Nome da Aplicação</label>
                        <input
                            type="text"
                            value={currentAppName}
                            onChange={(e) => setCurrentAppName(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">URL do Logotipo (Opcional)</label>
                        <input
                            type="text"
                            value={currentLogoUrl}
                            onChange={(e) => setCurrentLogoUrl(e.target.value)}
                            placeholder="https://example.com/logo.png"
                            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                    </div>
                </div>
                 <div className="flex justify-end pt-4 mt-4">
                    <button
                        onClick={handleSaveWhitelabel}
                        className="px-6 py-2 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-all duration-300"
                    >
                        Salvar Aparência
                    </button>
                </div>
            </div>

            <hr className="my-6 border-t border-gray-200"/>

            {/* User Management */}
            <div className="mt-8">
                <div className="flex justify-between items-center border-b pb-2 mb-4">
                    <h3 className="text-lg font-bold text-gray-800">Gerenciamento de Usuários</h3>
                    <button onClick={openAddUserModal} className="px-4 py-2 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-all duration-300 text-sm">
                        {t('addUserButton')}
                    </button>
                </div>
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuário</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Permissão</th>
                                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Ações</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {users.map((user) => (
                                <tr key={user.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.username}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'admin' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                                        <button onClick={() => openEditUserModal(user)} className="text-blue-600 hover:text-blue-900 font-semibold" title={t('editUserButton')}>
                                            <EditIcon className="w-5 h-5 inline-block"/>
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteUser(user.id)} 
                                            className={`text-red-600 hover:text-red-900 ${currentUser.id === user.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            disabled={currentUser.id === user.id}
                                            title={currentUser.id === user.id ? t('deleteSelfError') : ''}
                                        >
                                            <TrashIcon className="w-5 h-5 inline-block" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
    
    const LogsTab = () => (
         <div className="mt-4">
            <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4">Logs de Atividades do Sistema</h3>
            <div className="overflow-y-auto border border-gray-200 rounded-lg max-h-[50vh]">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('logDate')}</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('logUser')}</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('logAction')}</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('logDetails')}</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {logs.length > 0 ? logs.map((log) => (
                            <tr key={log.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatLogTimestamp(log.timestamp)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{log.username}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                        {log.action}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-normal text-sm text-gray-700">{log.details}</td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={4} className="text-center py-10 text-gray-500">Nenhum registro de atividade encontrado.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );


    return (
        <>
            <div className="border-b border-gray-200 mb-4">
                <nav className="flex space-x-2">
                    <TabButton tabId="users" label={t('adminPanelUsersTab')} />
                    <TabButton tabId="logs" label={t('adminPanelLogsTab')} />
                </nav>
            </div>
            
            {activeTab === 'users' ? <SettingsAndUsersTab /> : <LogsTab />}
            
            <div className="flex justify-end pt-4 border-t border-gray-200 mt-6">
                 <button onClick={onClose} className="px-6 py-2 font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-colors">
                    Fechar Painel
                </button>
            </div>
            
             <Modal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} title={modalMode === 'add' ? t('addUserModalTitle') : t('editUserModalTitle')}>
                <div className="space-y-4">
                    {formError && <p className="text-red-500 text-sm text-center">{t(formError as any)}</p>}
                    <div>
                        <label htmlFor="user-email" className="block text-sm font-medium text-gray-700">{t('userFormEmailLabel')}</label>
                        <input
                            type="email"
                            id="user-email"
                            value={userForm.username}
                            onChange={(e) => setUserForm({...userForm, username: e.target.value})}
                            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                    </div>
                     <div>
                        <label htmlFor="user-password" className="block text-sm font-medium text-gray-700">{t('userFormPasswordLabel')}</label>
                        <input
                            type="password"
                            id="user-password"
                            value={userForm.password}
                            onChange={(e) => setUserForm({...userForm, password: e.target.value})}
                            placeholder={modalMode === 'edit' ? t('userFormPasswordPlaceholder') : ''}
                            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                    </div>
                     <div>
                        <label htmlFor="user-role" className="block text-sm font-medium text-gray-700">{t('userFormRoleLabel')}</label>
                        <select
                            id="user-role"
                            value={userForm.role}
                            onChange={(e) => setUserForm({...userForm, role: e.target.value as Role})}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                        >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                     <div className="flex justify-end pt-4 space-x-2">
                        <button onClick={() => setIsUserModalOpen(false)} className="px-4 py-2 font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
                            {t('cancelButton')}
                        </button>
                        <button onClick={handleUserFormSubmit} className="px-4 py-2 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                            {t('saveButton')}
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default AdminPanel;