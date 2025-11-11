import { useState, useCallback } from 'react';
import * as api from '../services/api';
import { useNotification } from '../contexts/NotificationContext';

interface UseFolderWatcherProps {
  companyId: string | null;
}

export const useFolderWatcher = ({ companyId }: UseFolderWatcherProps) => {
    const { addNotification } = useNotification();
    const [isLoading, setIsLoading] = useState(false);

    const savePath = useCallback(async (path: string) => {
        if (!companyId) return;
        setIsLoading(true);
        try {
            await api.setCompanyMonitoredFolder(companyId, path);
            addNotification('Caminho da pasta de monitoramento salvo com sucesso.', 'success');
        } catch (error: any) {
            console.error("Failed to save monitored folder path:", error);
            addNotification(error.message || 'Falha ao salvar o caminho da pasta.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [companyId, addNotification]);

    const clearPath = useCallback(async () => {
        if (!companyId) return;
        setIsLoading(true);
        try {
            await api.clearCompanyMonitoredFolder(companyId);
            addNotification('Monitoramento de pasta desativado.', 'info');
        } catch (error: any) {
            console.error("Failed to clear monitored folder path:", error);
            addNotification(error.message || 'Falha ao limpar o caminho da pasta.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [companyId, addNotification]);

    return {
        isLoading,
        savePath,
        clearPath,
    };
};