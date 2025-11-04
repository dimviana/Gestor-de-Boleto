import { useState, useEffect, useCallback } from 'react';
import { Boleto, BoletoStatus, User } from '../types';
import * as api from '../services/api';

export const useBoletos = (user: User | null) => {
  const [boletos, setBoletos] = useState<Boleto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAndSetBoletos = useCallback(async () => {
    if (!user) {
      setBoletos([]);
      setIsLoading(false);
      return;
    }
    try {
      setError(null);
      setIsLoading(true);
      const fetchedBoletos = await api.fetchBoletos();
      setBoletos(fetchedBoletos || []);
    } catch (e: any) {
      console.error("Failed to load boletos:", e);
      setError(e.message || "Failed to load boletos from the server.");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAndSetBoletos();
  }, [fetchAndSetBoletos]);

  const addBoleto = useCallback(async (user: User, boletoData: Partial<Boleto>, file: File, companyId?: string) => {
    if (user.role !== 'admin' && !user.companyId) {
        throw new Error('userHasNoCompanyError');
    }
    if (user.role === 'admin' && !companyId) {
        throw new Error('Admin must select a company');
    }
    
    const newBoleto = await api.createBoleto(boletoData, file, companyId);
    setBoletos(prev => [newBoleto, ...prev]);
  }, []);

  const updateBoletoStatus = useCallback(async (user: User, id: string, status: BoletoStatus) => {
    await api.updateBoletoStatus(id, status);
    // Optimistic UI update
    setBoletos(prev =>
      prev.map(b => (b.id === id ? { ...b, status } : b))
    );
    // Optionally re-fetch for consistency
    // await fetchAndSetBoletos();
  }, []);

  const updateBoletoComments = useCallback(async (user: User, id:string, comments: string) => {
    await api.updateBoletoComments(id, comments);
    // Optimistic UI update
    setBoletos(prev =>
      prev.map(b => (b.id === id ? { ...b, comments } : b))
    );
  }, []);

  const deleteBoleto = useCallback(async (user: User, id: string) => {
    await api.removeBoleto(id);
    setBoletos(prev => prev.filter(b => b.id !== id));
  }, []);

  return { boletos, addBoleto, updateBoletoStatus, updateBoletoComments, deleteBoleto, isLoading, error };
};