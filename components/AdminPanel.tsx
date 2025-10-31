import React, { useState } from 'react';
import { useWhitelabel } from '../contexts/WhitelabelContext';

interface AdminPanelProps {
    onClose: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
    const { appName, logoUrl, setAppName, setLogoUrl } = useWhitelabel();
    const [currentAppName, setCurrentAppName] = useState(appName);
    const [currentLogoUrl, setCurrentLogoUrl] = useState(logoUrl);

    const handleSave = () => {
        setAppName(currentAppName);
        setLogoUrl(currentLogoUrl);
        onClose();
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

    return (
        <div className="space-y-6">
            <p className="text-gray-600">
                Personalize a aparência da aplicação. As alterações serão salvas e aplicadas para todos os usuários.
            </p>

            <div className="space-y-4">
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

            <div className="flex justify-end pt-4">
                <button
                    onClick={handleSave}
                    className="px-6 py-2 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-all duration-300"
                >
                    Salvar Alterações
                </button>
            </div>
        </div>
    );
};

export default AdminPanel;
