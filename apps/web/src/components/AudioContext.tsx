import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Simple audio settings state
interface AudioSettingsState {
  musicVolume: number;
  sfxVolume: number;
  musicEnabled: boolean;
  sfxEnabled: boolean;
  reducedMotion: boolean;
}

// Default values
const defaultSettings: AudioSettingsState = {
  musicVolume: 0.5,
  sfxVolume: 0.5,
  musicEnabled: true,
  sfxEnabled: true,
  reducedMotion: false,
};

// Check for prefers-reduced-motion on init
const useReducedMotion = (): boolean => {
  const [reduced, setReduced] = useState(
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const listener = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, []);
  return reduced;
};

const AudioContext = createContext<{
  state: AudioSettingsState;
  setState: (partial: Partial<AudioSettingsState> | ((prev: AudioSettingsState) => Partial<AudioSettingsState>)) => void;
} | null>(null);

export const useAudio = (): {
  state: AudioSettingsState;
  setState: (partial: Partial<AudioSettingsState> | ((prev: AudioSettingsState) => Partial<AudioSettingsState>)) => void;
} => {
  const context = useContext(AudioContext);
  if (!context) {
    return {
      state: defaultSettings,
      setState: () => {},
    };
  }
  return context;
};

export const AudioProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<AudioSettingsState>(defaultSettings);
  const reducedMotion = useReducedMotion();

  // Apply reduced motion class to html
  useEffect(() => {
    const html = document.documentElement;
    if (reducedMotion) html.classList.add('reduced-motion');
    else html.classList.remove('reduced-motion');
  }, [reducedMotion]);

  const stateWithReducedMotion: AudioSettingsState = {
    ...state,
    reducedMotion,
  };

  return (
    <AudioContext.Provider value={{ state: stateWithReducedMotion, setState }}>
      {children}
    </AudioContext.Provider>
  );
};