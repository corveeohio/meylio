import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { CommonActions, useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { MeylioLogo } from '../components/MeylioLogo';
import { useUser } from '../context/UserContext';
import { resolveOnboardingRoute } from '../navigation/resolveOnboardingRoute';
import type { RootStackParamList } from '../navigation/RootNavigator';

export function BiometricUnlockScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { unlock, logout, hasMusicProfile, hasDisplayName, hasPhotos, hasBasicInfo, hasAcceptedTerms } = useUser();
  const [status, setStatus] = useState<'prompting' | 'failed'>('prompting');

  const promptUnlock = useCallback(async () => {
    setStatus('prompting');
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Déverrouille Meylio',
      cancelLabel: 'Annuler',
    });
    if (result.success) {
      unlock();
      const nextRoute = resolveOnboardingRoute({
        hasAcceptedTerms,
        hasDisplayName,
        hasMusicProfile,
        hasPhotos,
        hasBasicInfo,
      });
      navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: nextRoute }] }));
    } else {
      setStatus('failed');
    }
  }, [unlock, navigation, hasMusicProfile, hasDisplayName, hasPhotos, hasBasicInfo, hasAcceptedTerms]);

  useFocusEffect(
    useCallback(() => {
      promptUnlock();
    }, [promptUnlock])
  );

  async function handleUseEmailInstead() {
    await logout();
    navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Login', params: { mode: 'login' } }] }));
  }

  return (
    <View style={styles.container}>
      <MeylioLogo size={64} showWordmark={false} />
      <Text style={styles.title}>Content de te revoir</Text>

      {status === 'prompting' && (
        <View style={styles.statusBlock}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.description}>Déverrouillage en cours…</Text>
        </View>
      )}

      {status === 'failed' && (
        <View style={styles.statusBlock}>
          <Text style={styles.description}>Authentification annulée ou échouée.</Text>
          <Pressable style={styles.button} onPress={promptUnlock} testID="retry-biometric-button">
            <Text style={styles.buttonText}>Réessayer</Text>
          </Pressable>
          <Pressable onPress={handleUseEmailInstead} testID="use-email-instead-button">
            <Text style={styles.linkText}>Se connecter avec le code par email</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 20,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  statusBlock: {
    alignItems: 'center',
    gap: 16,
    marginTop: 8,
  },
  description: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  linkText: {
    color: colors.textMuted,
    fontSize: 13,
    textDecorationLine: 'underline',
    marginTop: 4,
  },
});
