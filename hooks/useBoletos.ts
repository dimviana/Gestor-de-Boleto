
import { useState, useEffect, useCallback } from 'react';
import { Boleto, BoletoStatus, User } from '../types';
import * as api from '../services/api';
import { addLogEntry } from '../services/logService';

export const useBoletos = (user: User | null) => {
  const [boletos, setBoletos] = useState<Boleto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserBoletos = useCallback(async (currentUser: User, companyId?: string) => {
    try {
        setError(null);
        setIsLoading(true);
        const fetchedBoletos = await api.fetchBoletos(currentUser, companyId);
        setBoletos(fetchedBoletos);
    } catch (e: any) {
        console.error("Failed to load boletos:", e);
        setError(e.message || "Failed to load boletos from the database.");
    } finally {
        setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      // For non-admin users, companyId is not needed as API will scope it.
      // For admins, this initial load can be empty, waiting for company selection.
      fetchUserBoletos(user, user.companyId);
    } else {
      setBoletos([]);
      setIsLoading(false);
    }
  }, [user, fetchUserBoletos]);

  const uploadBoletoFile = useCallback(async (file: File) => {
    if (!user) throw new Error("User not authenticated");
    
    const newBoleto = await api.uploadBoletoFile(file);
    setBoletos(prev => [newBoleto, ...prev]);
    
    addLogEntry({
        userId: user.id,
        username: user.username,
        action: 'CREATE_BOLETO',
        details: `Criou o boleto "${newBoleto.recipient || 'N/A'}" (Nº doc: ${newBoleto.guideNumber || 'N/A'}) via upload.`
    });
  }, [user]);

  const updateBoletoStatus = useCallback(async (id: string, status: BoletoStatus) => {
    if (!user) return;
    try {
        const updatedBoleto = await api.updateBoletoStatus(id, status);
        setBoletos(prev => prev.map(b => (b.id === id ? { ...b, status } : b)));
         addLogEntry({
            userId: user.id,
            username: user.username,
            action: 'UPDATE_BOLETO_STATUS',
            details: `Atualizou o status do boleto "${updatedBoleto.recipient}" para ${status}.`
        });
    } catch(e) {
        console.error("Failed to update status:", e);
    }
  }, [user]);

  const updateBoletoComments = useCallback(async (id: string, comments: string) => {
    if(!user) return;
    try {
        const updatedBoleto = await api.updateBoletoComments(id, comments);
        setBoletos(prev => prev.map(b => (b.id === id ? { ...b, comments } : b)));
        addLogEntry({
            userId: user.id,
            username: user.username,
            action: 'UPDATE_BOLETO_COMMENT',
            details: `Adicionou/editou comentário no boleto "${updatedBoleto.recipient || 'N/A'}" (Nº doc: ${updatedBoleto.guideNumber || 'N/A'}).`
        });
    } catch (e) {
        console.error("Failed to update comments:", e);
    }
  }, [user]);

  const deleteBoleto = useCallback(async (id: string) => {
    if(!user) return;
    const boletoToDelete = boletos.find(b => b.id === id);
    try {
        await api.removeBoleto(id);
        setBoletos(prev => prev.filter(b => b.id !== id));

        if (boletoToDelete) {
            addLogEntry({
                userId: user.id,
                username: user.username,
                action: 'DELETE_BOLETO',
                details: `Excluiu o boleto "${boletoToDelete.recipient}" (Nº: ${boletoToDelete.guideNumber}).`
            });
        }
    } catch(e) {
        console.error("Failed to delete boleto:", e);
    }
  }, [user, boletos]);

  return { boletos, uploadBoletoFile, updateBoletoStatus, updateBoletoComments, deleteBoleto, isLoading, error, fetchUserBoletos };
};