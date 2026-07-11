import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { API_BASE_URL } from '../config/api';

const STORAGE_KEY = 'meylio.userId';

type LoggedInUser = {
  id: string;
  musicProfile: unknown | null;
  displayName?: string | null;
  age?: number | null;
  gender?: string | null;
  photos?: string[];
  termsAcceptedAt?: string | null;
};

type UserContextValue = {
  userId: string | null;
  isLoading: boolean;
  hasMusicProfile: boolean;
  hasDisplayName: boolean;
  hasPhotos: boolean;
  hasBasicInfo: boolean;
  hasAcceptedTerms: boolean;
  needsBiometricUnlock: boolean;
  login: (user: LoggedInUser) => Promise<void>;
  logout: () => Promise<void>;
  unlock: () => void;
  setHasMusicProfile: (value: boolean) => void;
  setHasDisplayName: (value: boolean) => void;
  setHasPhotos: (value: boolean) => void;
  setHasBasicInfo: (value: boolean) => void;
  setHasAcceptedTerms: (value: boolean) => void;
};

const UserContext = createContext<UserContextValue>({
  userId: null,
  isLoading: true,
  hasMusicProfile: false,
  hasDisplayName: false,
  hasPhotos: false,
  hasBasicInfo: false,
  hasAcceptedTerms: false,
  needsBiometricUnlock: false,
  login: async () => {},
  logout: async () => {},
  unlock: () => {},
  setHasMusicProfile: () => {},
  setHasDisplayName: () => {},
  setHasPhotos: () => {},
  setHasBasicInfo: () => {},
  setHasAcceptedTerms: () => {},
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [hasMusicProfile, setHasMusicProfile] = useState(false);
  const [hasDisplayName, setHasDisplayName] = useState(false);
  const [hasPhotos, setHasPhotos] = useState(false);
  const [hasBasicInfo, setHasBasicInfo] = useState(false);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [needsBiometricUnlock, setNeedsBiometricUnlock] = useState(false);

  useEffect(() => {
    (async () => {
      const storedUserId = await AsyncStorage.getItem(STORAGE_KEY);
      if (!storedUserId) {
        setIsLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/users/${storedUserId}`).catch(() => null);
      if (response?.ok) {
        const user = await response.json();
        setUserId(storedUserId);
        setHasMusicProfile(!!user.musicProfile);
        setHasDisplayName(!!user.displayName);
        setHasPhotos((user.photos?.length ?? 0) > 0);
        setHasBasicInfo(!!user.age && !!user.gender);
        setHasAcceptedTerms(!!user.termsAcceptedAt);

        const [hasHardware, isEnrolled] = await Promise.all([
          LocalAuthentication.hasHardwareAsync().catch(() => false),
          LocalAuthentication.isEnrolledAsync().catch(() => false),
        ]);
        setNeedsBiometricUnlock(hasHardware && isEnrolled);
      } else {
        await AsyncStorage.removeItem(STORAGE_KEY);
      }
      setIsLoading(false);
    })();
  }, []);

  async function login(user: LoggedInUser) {
    await AsyncStorage.setItem(STORAGE_KEY, user.id);
    setUserId(user.id);
    setHasMusicProfile(!!user.musicProfile);
    setHasDisplayName(!!user.displayName);
    setHasPhotos((user.photos?.length ?? 0) > 0);
    setHasBasicInfo(!!user.age && !!user.gender);
    setHasAcceptedTerms(!!user.termsAcceptedAt);
    setNeedsBiometricUnlock(false);
  }

  async function logout() {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setUserId(null);
    setHasMusicProfile(false);
    setHasDisplayName(false);
    setHasPhotos(false);
    setHasBasicInfo(false);
    setHasAcceptedTerms(false);
    setNeedsBiometricUnlock(false);
  }

  function unlock() {
    setNeedsBiometricUnlock(false);
  }

  return (
    <UserContext.Provider
      value={{
        userId,
        isLoading,
        hasMusicProfile,
        hasDisplayName,
        hasPhotos,
        hasBasicInfo,
        hasAcceptedTerms,
        needsBiometricUnlock,
        login,
        logout,
        unlock,
        setHasMusicProfile,
        setHasDisplayName,
        setHasPhotos,
        setHasBasicInfo,
        setHasAcceptedTerms,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
