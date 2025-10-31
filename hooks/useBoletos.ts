import { useState, useEffect, useCallback } from 'react';
import { Boleto, BoletoStatus } from '../types';

export const useBoletos = () => {
  const [boletos, setBoletos] = useState<Boleto[]>([]);

  useEffect(() => {
    try {
      const storedBoletos = localStorage.getItem('boletos');
      if (storedBoletos) {
        setBoletos(JSON.parse(storedBoletos));
      }
    } catch (error) {
      console.error("Failed to parse boletos from localStorage", error);
      localStorage.removeItem('boletos');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('boletos', JSON.stringify(boletos));
  }, [boletos]);

  const addBoleto = useCallback((boleto: Boleto) => {
    if (boleto.guideNumber && boletos.some(b => b.guideNumber && b.guideNumber === boleto.guideNumber)) {
        throw new Error(`duplicateGuideError:${boleto.guideNumber}`);
    }
    if (!boleto.guideNumber || boleto.guideNumber.trim() === '') {
        throw new Error('invalidGuideError');
    }
    setBoletos(prev => [boleto, ...prev]);
  }, [boletos]);

  const updateBoletoStatus = useCallback((id: string, status: BoletoStatus) => {
    setBoletos(prev =>
      prev.map(b => (b.id === id ? { ...b, status } : b))
    );
  }, []);

  const deleteBoleto = useCallback((id: string) => {
    setBoletos(prev => prev.filter(b => b.id !== id));
  }, []);

  return { boletos, addBoleto, updateBoletoStatus, deleteBoleto };
};