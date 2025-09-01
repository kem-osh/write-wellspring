import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Settings {
  // General
  autoSaveInterval: number; // milliseconds
  defaultCategory: string;
  autoGenerateTitles: boolean;
  exportFormat: 'txt' | 'docx' | 'pdf' | 'md';
  
  // Editor
  theme: 'light' | 'dark' | 'auto';
  fontSize: number;
  fontFamily: 'sans' | 'serif' | 'mono';
  lineHeight: 'compact' | 'normal' | 'relaxed';
  
  // AI
  defaultAIModel: 'gpt-4o-mini';
  voiceLanguage: string;
}

const DEFAULT_SETTINGS: Settings = {
  // General
  autoSaveInterval: 5000, // 5 seconds
  defaultCategory: 'General',
  autoGenerateTitles: true,
  exportFormat: 'txt',
  
  // Editor
  theme: 'auto',
  fontSize: 16,
  fontFamily: 'sans',
  lineHeight: 'normal',
  
  // AI
  defaultAIModel: 'gpt-4o-mini', // Default model
  voiceLanguage: 'en-US',
};

interface SettingsStore {
  settings: Settings;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  resetSettings: () => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      updateSetting: (key, value) =>
        set((state) => ({
          settings: { ...state.settings, [key]: value },
        })),
      resetSettings: () => set({ settings: DEFAULT_SETTINGS }),
    }),
    {
      name: 'logos-settings',
    }
  )
);