import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';

const APP_NAME_KEY = 'whitelabel_appName';
const LOGO_URL_KEY = 'whitelabel_logoUrl';
const DEFAULT_APP_NAME = 'Boleto Manager AI';

interface WhitelabelContextType {
  appName: string;
  logoUrl: string;
  setAppName: (name: string) => void;
  setLogoUrl: (url: string) => void;
}

const WhitelabelContext = createContext<WhitelabelContextType | undefined>(undefined);

export const WhitelabelProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [appName, setAppNameState] = useState<string>(() => {
    return localStorage.getItem(APP_NAME_KEY) || DEFAULT_APP_NAME;
  });

  const [logoUrl, setLogoUrlState] = useState<string>(() => {
    return localStorage.getItem(LOGO_URL_KEY) || '';
  });
  
  const setAppName = (name: string) => {
    const newName = name.trim() === '' ? DEFAULT_APP_NAME : name;
    localStorage.setItem(APP_NAME_KEY, newName);
    setAppNameState(newName);
  };
  
  const setLogoUrl = (url: string) => {
    localStorage.setItem(LOGO_URL_KEY, url);
    setLogoUrlState(url);
  };

  return (
    <WhitelabelContext.Provider value={{ appName, logoUrl, setAppName, setLogoUrl }}>
      {children}
    </WhitelabelContext.Provider>
  );
};

export const useWhitelabel = (): WhitelabelContextType => {
  const context = useContext(WhitelabelContext);
  if (!context) {
    throw new Error('useWhitelabel must be used within a WhitelabelProvider');
  }
  return context;
};
