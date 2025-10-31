import { useState, useEffect, useCallback } from 'react';
import { Boleto, BoletoStatus } from '../types';
import * as api from '../services/api';

export const useBoletos = () => {
  const [boletos, setBoletos] = useState<Boleto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadBoletos = async () => {
      try {
        setError(null);
        setIsLoading(true);
        const fetchedBoletos = await api.fetchBoletos();
        setBoletos(fetchedBoletos);
      } catch (e) {
        console.error("Failed to load boletos:", e);
        setError("Failed to load boletos from the database.");
      } finally {
        setIsLoading(false);
      }
    };
    loadBoletos();
  }, []);

  const addBoleto = useCallback(async (boleto: Boleto) => {
    // Perform client-side validation before sending to the "API"
    if (boleto.guideNumber && boletos.some(b => b.guideNumber && b.guideNumber === boleto.guideNumber)) {
        throw new Error(`duplicateGuideError:${boleto.guideNumber}`);
    }
    if (!boleto.guideNumber || boleto.guideNumber.trim() === '') {
        throw new Error('invalidGuideError');
    }
    
    // Call the API to persist the new boleto
    const newBoleto = await api.createBoleto(boleto);
    
    // Update the local state for immediate UI feedback
    setBoletos(prev => [newBoleto, ...prev]);
  }, [boletos]);

  const updateBoletoStatus = useCallback(async (id: string, status: BoletoStatus) => {
    const updatedBoleto = await api.updateBoleto(id, status);
    setBoletos(prev =>
      prev.map(b => (b.id === id ? updatedBoleto : b))
    );
  }, []);

  const deleteBoleto = useCallback(async (id: string) => {
    await api.removeBoleto(id);
    setBoletos(prev => prev.filter(b => b.id !== id));
  }, []);

  return { boletos, addBoleto, updateBoletoStatus, deleteBoleto, isLoading, error };
};
