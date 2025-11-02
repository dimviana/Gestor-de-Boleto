import React, { useState, useEffect } from 'react';
import { VpsSettings } from '../types';
import * as api from '../services/api';
import Modal from './Modal';
import Spinner from './Spinner';

interface VpsUpdateModalProps {
  systemUpdateInfo: { sha: string; version: string; message: string; };
  onClose: () => void;
}

const VpsUpdateModal: React.FC<VpsUpdateModalProps> = ({ systemUpdateInfo, onClose }) => {
  const [settings, setSettings] = useState<Partial<VpsSettings>>({ ssh_port: 22 });
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateLog, setUpdateLog] = useState<string>('');
  const [updateError, setUpdateError] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const fetchedSettings = await api.fetchVpsSettings();
        setSettings(fetchedSettings);
      } catch (error) {
        console.log("No existing VPS settings found, using defaults.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaveStatus('saving');
    try {
      await api.saveVpsSettings(settings as VpsSettings);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      setSaveStatus('error');
      console.error("Failed to save VPS settings", error);
    }
  };

  const handleUpdate = async () => {
    setIsUpdating(true);
    setUpdateLog('');
    setUpdateError('');
    try {
      const result = await api.triggerVpsUpdate();
      setUpdateLog(result.output || 'Update completed successfully.');
      // Dismiss the notification in local storage after a successful update
      localStorage.setItem('lastSeenCommitSha', systemUpdateInfo.sha);
    } catch (error: any) {
      console.error("Update failed", error);
      setUpdateError(error.message || 'An unknown error occurred during the update.');
      setUpdateLog(error.stderr || '');
    } finally {
      setIsUpdating(false);
    }
  };
  
  const getSaveButtonText = () => {
      switch (saveStatus) {
          case 'saving': return 'Salvando...';
          case 'success': return 'Salvo com Sucesso!';
          case 'error': return 'Falha ao Salvar';
          default: return 'Salvar Credenciais';
      }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={`Atualização do Sistema (${systemUpdateInfo.version})`}>
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Detalhes da Atualização</h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 italic">"{systemUpdateInfo.message}"</p>
        </div>

        <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Credenciais da VPS para Atualização</h3>
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">Atenção: Estas credenciais são salvas no banco de dados. Use uma conta de serviço com permissões limitadas, se possível.</p>
          
          {isLoading ? <Spinner /> : (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">IP ou Hostname</label>
                <input type="text" value={settings.hostname || ''} onChange={e => setSettings({...settings, hostname: e.target.value})} className="mt-1 w-full input-field"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Porta SSH</label>
                <input type="number" value={settings.ssh_port || 22} onChange={e => setSettings({...settings, ssh_port: parseInt(e.target.value, 10)})} className="mt-1 w-full input-field"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Usuário</label>
                <input type="text" value={settings.username || ''} onChange={e => setSettings({...settings, username: e.target.value})} className="mt-1 w-full input-field"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Senha</label>
                <input type="password" value={settings.password || ''} onChange={e => setSettings({...settings, password: e.target.value})} className="mt-1 w-full input-field"/>
              </div>
            </div>
          )}
          <div className="mt-4 flex justify-end">
            <button
                onClick={handleSave}
                disabled={saveStatus === 'saving'}
                className={`px-4 py-2 font-semibold text-white rounded-lg transition-colors duration-300
                    ${saveStatus === 'success' ? 'bg-green-600' : ''}
                    ${saveStatus === 'error' ? 'bg-red-600' : ''}
                    ${saveStatus === 'idle' || saveStatus === 'saving' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                    disabled:opacity-50`}
            >
                {getSaveButtonText()}
            </button>
          </div>
        </div>

        <div>
          <button
            onClick={handleUpdate}
            disabled={isUpdating || !settings.hostname || !settings.username || !settings.password}
            className="w-full px-6 py-3 font-bold text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-4 focus:ring-green-300 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isUpdating && <Spinner />}
            {isUpdating ? 'Atualizando Sistema...' : 'Iniciar Atualização Remota'}
          </button>
        </div>

        {(updateLog || updateError) && (
          <div className="mt-4 p-4 bg-gray-900 text-white rounded-lg max-h-60 overflow-y-auto">
            <h4 className="font-semibold mb-2">{updateError ? 'Erro na Atualização:' : 'Log da Atualização:'}</h4>
            {updateError && <pre className="text-sm text-red-400 whitespace-pre-wrap">{updateError}</pre>}
            <pre className="text-xs text-gray-300 whitespace-pre-wrap">{updateLog}</pre>
          </div>
        )}
      </div>
      <style>{`.input-field { background-color: #F3F4F6; color: #1F2937; border: 1px solid #D1D5DB; border-radius: 0.5rem; padding: 0.5rem 0.75rem; } .dark .input-field { background-color: #374151; color: #F9FAFB; border-color: #4B5563; }`}</style>
    </Modal>
  );
};

export default VpsUpdateModal;
