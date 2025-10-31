
import React, { useState, useEffect } from 'react';
import { useWhitelabel } from '../contexts/WhitelabelContext';
import { RegisteredUser, Role, User } from '../types';
import { TrashIcon } from './icons/Icons';
import { useLanguage } from '../contexts/LanguageContext';

interface AdminPanelProps {
    onClose: () => void;
    getUsers: () => RegisteredUser[];
    updateUser: (userId: string, updates: Partial<Pick<RegisteredUser, 'role'>>) => boolean;
    deleteUser: (userId: string) => boolean;
    currentUser: User;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onClose, getUsers, updateUser, deleteUser, currentUser }) => {
    const { appName, logoUrl, setAppName, setLogoUrl } = useWhitelabel();
    const { t } = useLanguage();
    const [currentAppName, setCurrentAppName] = useState(appName);
    const [currentLogoUrl, setCurrentLogoUrl] = useState(logoUrl);

    const [users, setUsers] = useState<RegisteredUser[]>([]);
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [editedRole, setEditedRole] = useState<Role>('user');

    useEffect(() => {
        setUsers(getUsers());
    }, [getUsers]);

    const handleSaveWhitelabel = () => {
        setAppName(currentAppName);
        setLogoUrl(currentLogoUrl);
        onClose();
    };

    const handleEditClick = (user: RegisteredUser) => {
        setEditingUserId(user.id);
        setEditedRole(user.role);
    };
    
    const handleCancelEdit = () => {
        setEditingUserId(null);
    };

    const handleSaveUser = (userId: string) => {
        if (updateUser(userId, { role: editedRole })) {
            setUsers(getUsers()); // Refresh user list
            setEditingUserId(null);
        } else {
            alert("Failed to update user.");
        }
    };
    
    const handleDeleteUser = (userId: string) => {
        if (window.confirm(t('confirmUserDeletion'))) {
            if (deleteUser(userId)) {
                setUsers(getUsers()); // Refresh user list
            } else {
                alert(t('deleteUserError'));
            }
        }
    };
    
    const InputField: React.FC<{label: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, placeholder?: string}> = ({label, value, onChange, placeholder}) => (
        <div>
            <label className="block text-sm font-medium text-gray-700">{label}</label>
            <input
                type="text"
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
        </div>
    );

    const UserManagement = () => (
        <div className="mt-8">
            <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4">Gerenciamento de Usuários</h3>
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
                                    {editingUserId === user.id ? (
                                        <select 
                                            value={editedRole} 
                                            onChange={(e) => setEditedRole(e.target.value as Role)}
                                            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                                        >
                                            <option value="user">User</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    ) : (
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'admin' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                                            {user.role}
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                                    {editingUserId === user.id ? (
                                        <>
                                            <button onClick={() => handleSaveUser(user.id)} className="text-blue-600 hover:text-blue-900 font-semibold">Salvar</button>
                                            <button onClick={handleCancelEdit} className="text-gray-600 hover:text-gray-900">Cancelar</button>
                                        </>
                                    ) : (
                                        <>
                                            <button onClick={() => handleEditClick(user)} className="text-blue-600 hover:text-blue-900 font-semibold">Editar</button>
                                            <button 
                                                onClick={() => handleDeleteUser(user.id)} 
                                                className={`text-red-600 hover:text-red-900 ${currentUser.id === user.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                disabled={currentUser.id === user.id}
                                                title={currentUser.id === user.id ? t('deleteSelfError') : ''}
                                            >
                                                <TrashIcon className="w-5 h-5 inline-block" />
                                            </button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div>
                 <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4">Configurações de Aparência</h3>
                <p className="text-gray-600">
                    Personalize a aparência da aplicação. As alterações serão salvas e aplicadas para todos os usuários.
                </p>

                <div className="space-y-4 mt-4">
                    <InputField 
                        label="Nome da Aplicação"
                        value={currentAppName}
                        onChange={(e) => setCurrentAppName(e.target.value)}
                    />
                    <InputField 
                        label="URL do Logotipo (Opcional)"
                        value={currentLogoUrl}
                        onChange={(e) => setCurrentLogoUrl(e.target.value)}
                        placeholder="https://example.com/logo.png"
                    />
                </div>
            </div>

            <hr className="my-6 border-t border-gray-200"/>

            <UserManagement />

            <div className="flex justify-end pt-4 border-t border-gray-200 mt-6 space-x-4">
                 <button onClick={onClose} className="px-6 py-2 font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-colors">
                    Fechar
                </button>
                <button
                    onClick={handleSaveWhitelabel}
                    className="px-6 py-2 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-all duration-300"
                >
                    Salvar Aparência e Fechar
                </button>
            </div>
        </div>
    );
};

export default AdminPanel;