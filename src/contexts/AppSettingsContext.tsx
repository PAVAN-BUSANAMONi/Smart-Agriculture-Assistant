import { createContext, ReactNode, useContext, useMemo, useState } from 'react';

type AppSettingsContextType = {
  simpleMode: boolean;
  setSimpleMode: (value: boolean) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (value: boolean) => void;
  toggleSidebar: () => void;
};

const AppSettingsContext = createContext<AppSettingsContextType | undefined>(undefined);

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [simpleMode, setSimpleModeState] = useState<boolean>(() => localStorage.getItem('simpleMode') === 'true');
  const [sidebarOpen, setSidebarOpenState] = useState<boolean>(() => {
    const saved = localStorage.getItem('sidebarOpen');
    return saved !== null ? saved === 'true' : false; // default collapsed for maximum clean workspace
  });

  const setSimpleMode = (value: boolean) => {
    setSimpleModeState(value);
    localStorage.setItem('simpleMode', String(value));
  };

  const setSidebarOpen = (value: boolean) => {
    setSidebarOpenState(value);
    localStorage.setItem('sidebarOpen', String(value));
  };

  const toggleSidebar = () => {
    setSidebarOpenState((prev) => {
      const next = !prev;
      localStorage.setItem('sidebarOpen', String(next));
      return next;
    });
  };

  const value = useMemo(
    () => ({ simpleMode, setSimpleMode, sidebarOpen, setSidebarOpen, toggleSidebar }),
    [simpleMode, sidebarOpen]
  );

  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
}

export function useAppSettings() {
  const context = useContext(AppSettingsContext);
  if (!context) {
    throw new Error('useAppSettings must be used inside AppSettingsProvider');
  }
  return context;
}