
import { useState, useEffect, useCallback } from 'react';
import { Boleto, BoletoStatus, User, ProcessingMethod } from '../types';
import * as api from '../services/api';
import { addLogEntry } from '../services/logService';

export const useBoletos = (user: User | null) => {
  const [boletos, setBoletos] = useState<Boleto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadBoletos = async () => {
      if (!user) {
        setBoletos([]);
        setIsLoading(false);
        return;
      }
      try {
        setError(null);
        setIsLoading(true);
        const fetchedBoletos = await api.fetchBoletos(user);
        setBoletos(fetchedBoletos);
      } catch (e) {
        console.error("Failed to load boletos:", e);
        setError("Failed to load boletos from the database.");
      } finally {
        setIsLoading(false);
      }
    };
    loadBoletos();
  }, [user]);

  const addBoleto = useCallback(async (user: User, boleto: Omit<Boleto, 'companyId'>, method: ProcessingMethod) => {
    if (!user.companyId) {
        throw new Error('userHasNoCompanyError');
    }

    if (boleto.barcode && boletos.some(b => b.barcode && b.barcode === boleto.barcode)) {
        const existingBoleto = boletos.find(b => b.barcode === boleto.barcode);
        const identifier = existingBoleto?.guideNumber || existingBoleto?.recipient || 'N/A';
        throw new Error(`duplicateBarcodeError:${identifier}`);
    }
    if (!boleto.barcode || boleto.barcode.trim() === '') {
        throw new Error('invalidBarcodeError');
    }
    
    const newBoletoWithCompany: Boleto = { ...boleto, companyId: user.companyId };
    const newBoleto = await api.createBoleto(newBoletoWithCompany);
    setBoletos(prev => [newBoleto, ...prev]);
    
    addLogEntry({
        userId: user.id,
        username: user.username,
        action: 'CREATE_BOLETO',
        details: `Criou o boleto "${newBoleto.recipient || 'N/A'}" (Nº doc: ${newBoleto.guideNumber || 'N/A'}) usando o método ${method.toUpperCase()}.`
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

  const updateBoletoComments = useCallback(async (user: User, id: string, comments: string) => {
    const updatedBoleto = await api.updateBoletoComments(id, comments);
    setBoletos(prev =>
      prev.map(b => (b.id === id ? updatedBoleto : b))
    );
    addLogEntry({
        userId: user.id,
        username: user.username,
        action: 'UPDATE_BOLETO_COMMENT',
        details: `Adicionou/editou comentário no boleto "${updatedBoleto.recipient || 'N/A'}" (Nº doc: ${updatedBoleto.guideNumber || 'N/A'}).`
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

  return { boletos, addBoleto, updateBoletoStatus, updateBoletoComments, deleteBoleto, isLoading, error };
};
