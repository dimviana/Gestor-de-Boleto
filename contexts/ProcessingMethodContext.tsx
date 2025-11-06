import React, { createContext, useState, useContext, ReactNode } from 'react';
import { ProcessingMethod, User } from '../types';
import { addLogEntry } from '../services/logService';

const PROCESSING_METHOD_KEY = 'processing_method';
const DEFAULT_METHOD: ProcessingMethod = 'ai';

interface ProcessingMethodContextType {
  method: ProcessingMethod;
  setMethod: (method: ProcessingMethod, actor: User) => void;
}

const ProcessingMethodContext = createContext<ProcessingMethodContextType | undefined>(undefined);

export const ProcessingMethodProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [method, setMethodState] = useState<ProcessingMethod>(() => {
    return (localStorage.getItem(PROCESSING_METHOD_KEY) as ProcessingMethod) || DEFAULT_METHOD;
  });

  const setMethod = (newMethod: ProcessingMethod, actor: User) => {
    if (method !== newMethod) {
        localStorage.setItem(PROCESSING_METHOD_KEY, newMethod);
        setMethodState(newMethod);
        addLogEntry({
            userId: actor.id,
            username: actor.username,
            action: 'ADMIN_CHANGE_SETTINGS',
            details: `Alterou o método de extração de boletos para ${newMethod.toUpperCase()}.`
        });
    }
  };

  return (
    <ProcessingMethodContext.Provider value={{ method, setMethod }}>
      {children}
    </ProcessingMethodContext.Provider>
  );
};

export const useProcessingMethod = (): ProcessingMethodContextType => {
  const context = useContext(ProcessingMethodContext);
  if (!context) {
    throw new Error('useProcessingMethod must be used within a ProcessingMethodProvider');
  }
  return context;
};
