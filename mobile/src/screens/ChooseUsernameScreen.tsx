import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { CommonActions, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { API_BASE_URL } from '../config/api';
import { useUser } from '../context/UserContext';
import { PressableScale } from '../components/PressableScale';
import { resolveOnboardingRoute } from '../navigation/resolveOnboardingRoute';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Availability = 'idle' | 'checking' | 'available' | 'taken' | 'too-short';

export function ChooseUsernameScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { userId, hasMusicProfile, hasPhotos, hasBasicInfo, setHasDisplayName } = useUser();
  const [name, setName] = useState('');
  const [availability, setAvailability] = useState<Availability>('idle');
  const [submitting, setSubmitting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setAvailability(trimmed.length === 0 ? 'idle' : 'too-short');
      return;
    }
    setAvailability('checking');
    debounceRef.current = setTimeout(() => {
      fetch(`${API_BASE_URL}/users/check-display-name?name=${encodeURIComponent(trimmed)}`)
        .then((response) => response.json())
        .then((data) => setAvailability(data.available ? 'available' : 'taken'))
        .catch(() => setAvailability('idle'));
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [name]);

  async function handleContinue() {
    if (!userId || availability !== 'available') return;
    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: name.trim() }),
      });
      const data = await response.json();
      if (!response.ok) {
        Alert.alert('Erreur', data.error ?? 'Impossible d’enregistrer ce pseudo.');
        return;
      }
      setHasDisplayName(true);
      const nextRoute = resolveOnboardingRoute({
        hasAcceptedTerms: true,
        hasDisplayName: true,
        hasMusicProfile,
        hasPhotos,
        hasBasicInfo,
      });
      navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: nextRoute }] }));
    } finally {
      setSubmitting(false);
    }
  }

  const helper =
    availability === 'checking'
      ? 'Vérification…'
      : availability === 'available'
        ? 'Disponible'
        : availability === 'taken'
          ? 'Ce pseudo est déjà pris'
          : availability === 'too-short'
            ? 'Au moins 2 caractères'
            : ' ';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choisis ton pseudo</Text>
      <Text style={styles.description}>
        Il sera visible par les autres et ne pourra plus être changé ensuite.
      </Text>
      <View style={styles.inputRow}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Ex: Léa"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          testID="choose-username-input"
        />
        <View style={styles.status} pointerEvents="none">
          {availability === 'checking' && <ActivityIndicator color={colors.textMuted} size="small" />}
          {availability === 'available' && <Ionicons name="checkmark-circle" size={20} color={colors.success} />}
          {(availability === 'taken' || availability === 'too-short') && (
            <Ionicons name="close-circle" size={20} color={colors.error} />
          )}
        </View>
      </View>
      <Text
        style={[
          styles.helper,
          availability === 'available' && styles.helperSuccess,
          (availability === 'taken' || availability === 'too-short') && styles.helperError,
        ]}
      >
        {helper}
      </Text>

      <PressableScale
        style={[styles.button, availability !== 'available' && styles.buttonDisabled]}
        onPress={handleContinue}
        disabled={availability !== 'available' || submitting}
        testID="choose-username-continue-button"
      >
        {submitting ? <ActivityIndicator color={colors.text} /> : <Text style={styles.buttonText}>Continuer</Text>}
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
    maxWidth: 320,
  },
  inputRow: {
    width: '100%',
    maxWidth: 320,
    justifyContent: 'center',
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    paddingRight: 40,
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  status: {
    position: 'absolute',
    right: 12,
  },
  helper: {
    width: '100%',
    maxWidth: 320,
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 8,
    marginBottom: 16,
    minHeight: 16,
  },
  helperSuccess: {
    color: colors.success,
  },
  helperError: {
    color: colors.error,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
});
