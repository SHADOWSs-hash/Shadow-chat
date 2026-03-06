import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ACCENT_COLORS, DARK, AccentKey } from '@/constants/colors';

function generateUUID(): string {
  const hex = () => Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0');
  return `${hex()}${hex()}-${hex()}-4${hex().slice(1)}-${((Math.floor(Math.random() * 4) + 8) * 0x1000 + Math.floor(Math.random() * 0x1000)).toString(16)}-${hex()}${hex()}${hex()}`;
}

const STORAGE_KEY = '@meshchat_device_profile';

export interface DeviceProfile {
  deviceId: string;
  nickname: string;
  accentColor: AccentKey;
  avatarColor: string;
  discoveryMode: 'auto' | 'manual';
  connectionMode: 'both' | 'ble' | 'wifi';
}

const AVATAR_COLORS = [
  '#FF6B6B','#4ECDC4','#45B7D1','#96CEB4','#FFEAA7',
  '#DDA0DD','#98D8C8','#F7DC6F','#BB8FCE','#85C1E9',
];

const defaultProfile: Omit<DeviceProfile, 'deviceId'> = {
  nickname: 'Пользователь',
  accentColor: 'cyan',
  avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
  discoveryMode: 'auto',
  connectionMode: 'both',
};

interface DeviceContextValue {
  profile: DeviceProfile;
  isLoaded: boolean;
  accent: (typeof ACCENT_COLORS)['cyan'];
  theme: typeof DARK;
  updateNickname: (name: string) => Promise<void>;
  updateAccentColor: (color: AccentKey) => Promise<void>;
  updateDiscoveryMode: (mode: 'auto' | 'manual') => Promise<void>;
  updateConnectionMode: (mode: 'both' | 'ble' | 'wifi') => Promise<void>;
  getShortId: () => string;
}

const DeviceContext = createContext<DeviceContextValue | null>(null);

export function DeviceProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<DeviceProfile>({
    deviceId: '',
    ...defaultProfile,
  });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: DeviceProfile = JSON.parse(stored);
        setProfile(parsed);
      } else {
        const newId = generateUUID();
        const avatarColor =
          AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
        const newProfile: DeviceProfile = {
          deviceId: newId,
          ...defaultProfile,
          avatarColor,
        };
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newProfile));
        setProfile(newProfile);
      }
    } catch {
      const newId =
        Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
      setProfile({ deviceId: newId, ...defaultProfile });
    } finally {
      setIsLoaded(true);
    }
  }

  async function saveProfile(updated: DeviceProfile) {
    setProfile(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  const updateNickname = async (name: string) => {
    await saveProfile({ ...profile, nickname: name.trim() || 'Пользователь' });
  };

  const updateAccentColor = async (color: AccentKey) => {
    await saveProfile({ ...profile, accentColor: color });
  };

  const updateDiscoveryMode = async (mode: 'auto' | 'manual') => {
    await saveProfile({ ...profile, discoveryMode: mode });
  };

  const updateConnectionMode = async (mode: 'both' | 'ble' | 'wifi') => {
    await saveProfile({ ...profile, connectionMode: mode });
  };

  const getShortId = () => profile.deviceId.slice(0, 8).toUpperCase();

  const accent = ACCENT_COLORS[profile.accentColor];

  const value = useMemo<DeviceContextValue>(
    () => ({
      profile,
      isLoaded,
      accent,
      theme: DARK,
      updateNickname,
      updateAccentColor,
      updateDiscoveryMode,
      updateConnectionMode,
      getShortId,
    }),
    [profile, isLoaded]
  );

  return (
    <DeviceContext.Provider value={value}>{children}</DeviceContext.Provider>
  );
}

export function useDevice() {
  const ctx = useContext(DeviceContext);
  if (!ctx) throw new Error('useDevice must be used within DeviceProvider');
  return ctx;
}
