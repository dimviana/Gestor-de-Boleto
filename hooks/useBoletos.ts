import { useState, useEffect, useCallback } from 'react';
import { Boleto, BoletoStatus, User } from '../types';
import * as api from '../services/api';

export const useBoletos = (user: User | null) => {
  const [boletos, setBoletos] = useState<Boleto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBoletos = useCallback(async () => {
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
    fetchBoletos();
  }, [fetchBoletos]);

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

  const uploadProof = useCallback(async (id: string, file: File) => {
    const updatedBoleto = await api.uploadPaymentProof(id, file);
    setBoletos(prev =>
        prev.map(b => (b.id === id ? updatedBoleto : b))
    );
  }, []);

  const deleteBoleto = useCallback(async (user: User, id: string) => {
    await api.removeBoleto(id);
    setBoletos(prev => prev.filter(b => b.id !== id));
  }, []);

  return { boletos, fetchBoletos, updateBoletoStatus, updateBoletoComments, uploadProof, deleteBoleto, isLoading, error };
};