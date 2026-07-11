import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation, useRoute, CommonActions, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { API_BASE_URL } from '../config/api';
import { useUser } from '../context/UserContext';
import { PressableScale } from '../components/PressableScale';
import { resolveOnboardingRoute } from '../navigation/resolveOnboardingRoute';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = RouteProp<RootStackParamList, 'VerifyCode'>;

export function VerifyCodeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<Props>();
  const { login } = useUser();
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);

  async function handleVerify() {
    if (code.trim().length !== 6) {
      Alert.alert('Le code contient 6 chiffres');
      return;
    }

    setVerifying(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: route.params.email, phone: route.params.phone, code: code.trim() }),
      });
      const user = await response.json();
      if (!response.ok) {
        Alert.alert('Erreur', user.error ?? 'Code invalide.');
        return;
      }

      await login(user);
      const nextRoute = resolveOnboardingRoute({
        hasAcceptedTerms: !!user.termsAcceptedAt,
        hasDisplayName: !!user.displayName,
        hasMusicProfile: !!user.musicProfile,
        hasPhotos: (user.photos?.length ?? 0) > 0,
        hasBasicInfo: !!user.age && !!user.gender,
      });
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: nextRoute }],
        })
      );
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de contacter le serveur.');
    } finally {
      setVerifying(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{route.params.phone ? 'Vérifie ton téléphone' : 'Vérifie ton email'}</Text>
      <Text style={styles.description}>Code envoyé à {route.params.email ?? route.params.phone}</Text>
      <TextInput
        value={code}
        onChangeText={setCode}
        placeholder="123456"
        placeholderTextColor={colors.textMuted}
        keyboardType="number-pad"
        maxLength={6}
        style={styles.input}
        testID="verify-code-input"
      />
      <PressableScale style={styles.button} onPress={handleVerify} disabled={verifying} testID="verify-code-button">
        {verifying ? <ActivityIndicator color={colors.text} /> : <Text style={styles.buttonText}>Vérifier</Text>}
      </PressableScale>
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
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: 16,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  buttonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
});
