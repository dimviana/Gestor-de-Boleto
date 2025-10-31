import { useState, useEffect, useCallback } from 'react';
import { Boleto, BoletoStatus, User } from '../types';
import * as api from '../services/api';
import { addLogEntry } from '../services/logService';

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

  const addBoleto = useCallback(async (user: User, boleto: Boleto) => {
    if (boleto.guideNumber && boletos.some(b => b.guideNumber && b.guideNumber === boleto.guideNumber)) {
        throw new Error(`duplicateGuideError:${boleto.guideNumber}`);
    }
    if (!boleto.guideNumber || boleto.guideNumber.trim() === '') {
        throw new Error('invalidGuideError');
    }
    
    const newBoleto = await api.createBoleto(boleto);
    setBoletos(prev => [newBoleto, ...prev]);
    
    addLogEntry({
        userId: user.id,
        username: user.username,
        action: 'CREATE_BOLETO',
        details: `Criou o boleto "${newBoleto.recipient}" (Nº: ${newBoleto.guideNumber}).`
    });

  }, [boletos]);

  const updateBoletoStatus = useCallback(async (user: User, id: string, status: BoletoStatus) => {
    const updatedBoleto = await api.updateBoleto(id, status);
    setBoletos(prev =>
      prev.map(b => (b.id === id ? updatedBoleto : b))
    );

     addLogEntry({
        userId: user.id,
        username: user.username,
        action: 'UPDATE_BOLETO_STATUS',
        details: `Atualizou o status do boleto "${updatedBoleto.recipient}" para ${status}.`
    });
  }, []);

  const deleteBoleto = useCallback(async (user: User, id: string) => {
    const boletoToDelete = boletos.find(b => b.id === id);
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
  }, [boletos]);

  return { boletos, addBoleto, updateBoletoStatus, deleteBoleto, isLoading, error };
};