import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { API_BASE_URL } from '../config/api';
import { useUser } from '../context/UserContext';
import { CountryCodeField } from '../components/CountryCodeField';
import { DEFAULT_COUNTRY, buildPhoneNumber, type Country } from '../constants/countryCodes';
import type { RootStackParamList } from '../navigation/RootNavigator';

export function ChangePhoneScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { userId } = useUser();
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [localNumber, setLocalNumber] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleRequestCode() {
    if (!userId) return;
    const phone = buildPhoneNumber(country.dial, localNumber);
    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}/change-phone/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPhone: phone }),
      });
      const data = await response.json();
      if (!response.ok) {
        Alert.alert('Erreur', data.error ?? 'Impossible d’envoyer le code.');
        return;
      }
      setNewPhone(phone);
      setStep('code');
    } catch {
      Alert.alert('Erreur', 'Impossible de contacter le serveur.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyCode() {
    if (!userId) return;
    if (code.trim().length !== 6) {
      Alert.alert('Le code contient 6 chiffres');
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}/change-phone/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPhone: newPhone.trim(), code: code.trim() }),
      });
      const data = await response.json();
      if (!response.ok) {
        Alert.alert('Erreur', data.error ?? 'Code invalide.');
        return;
      }
      Alert.alert('Téléphone mis à jour', 'Ton nouveau numéro est confirmé.');
      navigation.goBack();
    } catch {
      Alert.alert('Erreur', 'Impossible de contacter le serveur.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      {step === 'phone' ? (
        <>
          <Text style={styles.title}>Numéro de téléphone</Text>
          <Text style={styles.description}>On t’enverra un code de confirmation par SMS.</Text>
          <View style={styles.phoneRow}>
            <CountryCodeField value={country} onChange={setCountry} testID="change-phone-country-code" />
            <TextInput
              value={localNumber}
              onChangeText={setLocalNumber}
              placeholder="6 12 34 56 78"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              keyboardType="phone-pad"
              style={styles.phoneInput}
              testID="new-phone-input"
            />
          </View>
          <Pressable style={styles.button} onPress={handleRequestCode} disabled={submitting} testID="request-phone-change-button">
            {submitting ? <ActivityIndicator color={colors.text} /> : <Text style={styles.buttonText}>Envoyer le code</Text>}
          </Pressable>
        </>
      ) : (
        <>
          <Text style={styles.title}>Vérifie ton numéro</Text>
          <Text style={styles.description}>Code envoyé à {newPhone.trim()}</Text>
          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder="123456"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            maxLength={6}
            style={styles.input}
            testID="confirm-phone-change-input"
          />
          <Pressable style={styles.button} onPress={handleVerifyCode} disabled={submitting} testID="confirm-phone-change-button">
            {submitting ? <ActivityIndicator color={colors.text} /> : <Text style={styles.buttonText}>Confirmer</Text>}
          </Pressable>
        </>
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
    fontSize: 16,
    marginBottom: 16,
  },
  phoneRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    maxWidth: 320,
    marginBottom: 16,
  },
  phoneInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 16,
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
