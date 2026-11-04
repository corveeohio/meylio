import { Alert, Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';

const DISMISSED_KEY = 'meylio.update.dismissedVersion';

/** True when `latest` is a higher "x.y.z" version than `current`. */
export function isNewerVersion(latest: string, current: string): boolean {
  const a = latest.split('.').map(Number);
  const b = current.split('.').map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff > 0;
  }
  return false;
}

/**
 * Asks to update when the App Store has a newer version. "Plus tard" silences that
 * version only, so each new release is announced once.
 */
export async function promptForUpdateIfNeeded(): Promise<void> {
  if (Platform.OS !== 'ios') return;
  const current = Constants.expoConfig?.version;
  if (!current) return;
  try {
    const response = await fetch(`${API_BASE_URL}/app-version/latest`);
    const { ios } = (await response.json()) as { ios?: { version: string | null; storeUrl: string } };
    if (!ios?.version || !isNewerVersion(ios.version, current)) return;
    const dismissed = await AsyncStorage.getItem(DISMISSED_KEY).catch(() => null);
    if (dismissed === ios.version) return;

    Alert.alert(
      'Nouvelle version de Meylio',
      `La version ${ios.version} est disponible avec des nouveautés et des corrections. Mets à jour pour en profiter.`,
      [
        { text: 'Plus tard', style: 'cancel', onPress: () => AsyncStorage.setItem(DISMISSED_KEY, ios.version!).catch(() => {}) },
        { text: 'Mettre à jour', onPress: () => Linking.openURL(ios.storeUrl).catch(() => {}) },
      ]
    );
  } catch {
    // No network or App Store unreachable: try again next launch.
  }
}
