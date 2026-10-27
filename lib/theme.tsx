import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

type ThemeMode = 'light' | 'dark';

interface ThemeColors {
  background: string;
  card: string;
  text: string;
  textSecondary: string;
  primary: string;
  primaryDark: string;
  border: string;
  danger: string;
  warning: string;
  success: string;
  expired: string;
  expiring: string;
  ok: string;
}

const lightColors: ThemeColors = {
  background: '#f0fdf4',
  card: '#ffffff',
  text: '#14532d',
  textSecondary: '#4b5563',
  primary: '#16a34a',
  primaryDark: '#15803d',
  border: '#d1fae5',
  danger: '#dc2626',
  warning: '#d97706',
  success: '#16a34a',
  expired: '#fecaca',
  expiring: '#fef3c7',
  ok: '#dcfce7',
};

const darkColors: ThemeColors = {
  background: '#0f172a',
  card: '#1e293b',
  text: '#f1f5f9',
  textSecondary: '#94a3b8',
  primary: '#22c55e',
  primaryDark: '#16a34a',
  border: '#334155',
  danger: '#f87171',
  warning: '#fbbf24',
  success: '#4ade80',
  expired: '#7f1d1d',
  expiring: '#78350f',
  ok: '#14532d',
};

interface ThemeContextType {
  mode: ThemeMode;
  colors: ThemeColors;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>('light');

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem('theme');
      if (saved === 'light' || saved === 'dark') {
        setMode(saved);
      } else {
        setMode(system === 'dark' ? 'dark' : 'light');
      }
    })();
  }, []);

  const setTheme = async (newMode: ThemeMode) => {
    setMode(newMode);
    await AsyncStorage.setItem('theme', newMode);
  };

  const toggleTheme = () => setTheme(mode === 'light' ? 'dark' : 'light');

  return (
    <ThemeContext.Provider
      value={{
        mode,
        colors: mode === 'light' ? lightColors : darkColors,
        toggleTheme,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}