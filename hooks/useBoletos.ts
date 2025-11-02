import { useState, useEffect, useCallback } from 'react';
import { Boleto, BoletoStatus, User } from '../types';
import * as api from '../services/api';

export const useBoletos = (user: User | null) => {
  const [boletos, setBoletos] = useState<Boleto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAndSetBoletos = useCallback(async () => {
    if (!user) return;
    try {
      setError(null);
      setIsLoading(true);
      const fetchedBoletos = await api.fetchBoletos();
      setBoletos(fetchedBoletos);
    } catch (e: any) {
      console.error("Failed to load boletos:", e);
      setError(e.message || "Failed to load boletos from the server.");
    } finally {
      setIsLoading(false);
    }
  }, [user]);


  useEffect(() => {
    if (user) {
      fetchAndSetBoletos();
    } else {
        setBoletos([]);
        setIsLoading(false);
    }
  }, [user, fetchAndSetBoletos]);

  const uploadBoletoFile = useCallback(async (user: User, file: File) => {
    if (!user.companyId) {
        throw new Error('userHasNoCompanyError');
    }
    const newBoleto = await api.uploadBoletoFile(file);
    setBoletos(prev => [newBoleto, ...prev]);
  }, []);

  const updateBoletoStatus = useCallback(async (user: User, id: string, status: BoletoStatus) => {
    const originalBoletos = [...boletos];
    setBoletos(prev =>
      prev.map(b => (b.id === id ? { ...b, status } : b))
    );
    try {
        await api.updateBoleto(id, status);
    } catch (e) {
        setBoletos(originalBoletos);
        console.error("Failed to update status:", e);
        setError("Failed to update boleto status.");
    }
  }, [boletos]);

  const updateBoletoComments = useCallback(async (user: User, id: string, comments: string) => {
    const originalBoletos = [...boletos];
    const updatedBoleto = { ...boletos.find(b => b.id === id)!, comments };
    setBoletos(prev =>
      prev.map(b => (b.id === id ? updatedBoleto : b))
    );
     try {
        await api.updateBoletoComments(id, comments);
    } catch (e) {
        setBoletos(originalBoletos);
        console.error("Failed to update comments:", e);
        setError("Failed to update boleto comments.");
    }
  }, [boletos]);


  const deleteBoleto = useCallback(async (user: User, id: string) => {
    const originalBoletos = [...boletos];
    setBoletos(prev => prev.filter(b => b.id !== id));
    try {
        await api.removeBoleto(id);
    } catch(e) {
        setBoletos(originalBoletos);
        console.error("Failed to delete boleto:", e);
        setError("Failed to delete boleto.");
    }
  }, [boletos]);

  return { boletos, uploadBoletoFile, updateBoletoStatus, updateBoletoComments, deleteBoleto, isLoading, error };
};