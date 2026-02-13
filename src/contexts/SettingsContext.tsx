import React, { createContext, useContext, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { settingsApi } from '../api/settings';
import type { Settings } from '../types';
import { hexToHSL } from '@/lib/utils';

interface SettingsContextType {
  settings: Settings | null;
  isLoading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  const settings = data?.data || null;

  useEffect(() => {
    if (!settings) return;

    const root = document.documentElement;

    root.style.setProperty('--primary', hexToHSL(settings.primary_color));
    root.style.setProperty('--secondary', hexToHSL(settings.secondary_color));
    root.style.setProperty('--accent', hexToHSL(settings.accent_color));

  }, [settings]);

  return (
    <SettingsContext.Provider value={{ settings, isLoading }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
