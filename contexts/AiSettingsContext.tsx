
import React, { createContext, useState, useContext, ReactNode } from 'react';
import { AiSettings, User } from '../types';
import { addLogEntry } from '../services/logService';

const AI_SETTINGS_KEY = 'ai_settings';

const DEFAULT_SETTINGS: AiSettings = {
  model: 'gemini-2.5-flash',
  temperature: 0.2,
  topK: 1,
  topP: 1,
};

interface AiSettingsContextType {
  aiSettings: AiSettings;
  setAiSettings: (settings: AiSettings, actor: User) => void;
}

const AiSettingsContext = createContext<AiSettingsContextType | undefined>(undefined);

export const AiSettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [aiSettings, setAiSettingsState] = useState<AiSettings>(() => {
    try {
        const storedSettings = localStorage.getItem(AI_SETTINGS_KEY);
        if (storedSettings) {
            return { ...DEFAULT_SETTINGS, ...JSON.parse(storedSettings) };
        }
    } catch (error) {
        console.error("Failed to parse AI settings from localStorage", error);
    }
    return DEFAULT_SETTINGS;
  });

  const setAiSettings = (newSettings: AiSettings, actor: User) => {
    const oldSettings = aiSettings;
    localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(newSettings));
    setAiSettingsState(newSettings);
    
    // Create a detailed log of what changed
    const changes: string[] = [];
    if (oldSettings.model !== newSettings.model) changes.push(`modelo de '${oldSettings.model}' para '${newSettings.model}'`);
    if (oldSettings.temperature !== newSettings.temperature) changes.push(`temperatura de ${oldSettings.temperature} para ${newSettings.temperature}`);
    if (oldSettings.topK !== newSettings.topK) changes.push(`Top-K de ${oldSettings.topK} para ${newSettings.topK}`);
    if (oldSettings.topP !== newSettings.topP) changes.push(`Top-P de ${oldSettings.topP} para ${newSettings.topP}`);

    if (changes.length > 0) {
        addLogEntry({
            userId: actor.id,
            username: actor.username,
            action: 'ADMIN_CHANGE_SETTINGS',
            details: `Alterou as configurações da IA: ${changes.join(', ')}.`
        });
    }
  };

  return (
    <AiSettingsContext.Provider value={{ aiSettings, setAiSettings }}>
      {children}
    </AiSettingsContext.Provider>
  );
};

export const useAiSettings = (): AiSettingsContextType => {
  const context = useContext(AiSettingsContext);
  if (!context) {
    throw new Error('useAiSettings must be used within a AiSettingsProvider');
  }
  return context;
};