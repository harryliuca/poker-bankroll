import React, { createContext, useContext, useState } from 'react';

type Screen = 'dashboard' | 'start-session' | 'live-session' | 'history' | 'stats' | 'settings' | 'import';

interface NavigationContextType {
  currentScreen: Screen;
  screenParams?: any;
  navigateTo: (screen: Screen, params?: any) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('dashboard');
  const [screenParams, setScreenParams] = useState<any>(undefined);

  const navigateTo = (screen: Screen, params?: any) => {
    setCurrentScreen(screen);
    setScreenParams(params);
  };

  return (
    <NavigationContext.Provider value={{ currentScreen, screenParams, navigateTo }}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};
