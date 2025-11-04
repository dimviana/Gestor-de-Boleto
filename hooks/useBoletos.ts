import { useState, useEffect, useCallback } from 'react';
import { Boleto, BoletoStatus, User, ProcessingMethod } from '../types';
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

  const addBoleto = useCallback(async (
    user: User, 
    file: File, 
    companyId: string, 
    method: ProcessingMethod,
    onProgress: (progress: number) => void
  ) => {
    await api.createBoleto(file, companyId, method, onProgress);
    await fetchAndSetBoletos(); // Refresh data from the database
  }, [fetchAndSetBoletos]);

  const updateBoletoStatus = useCallback(async (user: User, id: string, status: BoletoStatus) => {
    const updatedBoleto = await api.updateBoletoStatus(id, status);
    // Update state with the returned object from the server
    setBoletos(prev =>
      prev.map(b => (b.id === id ? updatedBoleto : b))
    );
  }, []);

  const updateBoletoComments = useCallback(async (user: User, id:string, comments: string) => {
    const updatedBoleto = await api.updateBoletoComments(id, comments);
    // Update state with the returned object from the server
    setBoletos(prev =>
      prev.map(b => (b.id === id ? updatedBoleto : b))
    );
  }, []);

  const deleteBoleto = useCallback(async (user: User, id: string) => {
    await api.removeBoleto(id);
    setBoletos(prev => prev.filter(b => b.id !== id));
  }, []);

  return { boletos, addBoleto, updateBoletoStatus, updateBoletoComments, deleteBoleto, isLoading, error };
};