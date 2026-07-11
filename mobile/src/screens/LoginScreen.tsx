import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { API_BASE_URL } from '../config/api';
import { PressableScale } from '../components/PressableScale';
import { CountryCodeField } from '../components/CountryCodeField';
import { DEFAULT_COUNTRY, buildPhoneNumber, type Country } from '../constants/countryCodes';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = RouteProp<RootStackParamList, 'Login'>;

type Method = 'email' | 'phone';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[1-9]\d{7,14}$/;

export function LoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<Props>();
  const mode = route.params?.mode ?? 'login';
  const [method, setMethod] = useState<Method>('email');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [localNumber, setLocalNumber] = useState('');
  const [sending, setSending] = useState(false);

  async function handleSendCode() {
    const trimmedEmail = email.trim();
    const phone = buildPhoneNumber(country.dial, localNumber);

    if (method === 'email' && !EMAIL_REGEX.test(trimmedEmail)) {
      Alert.alert('Adresse email invalide');
      return;
    }
    if (method === 'phone' && !PHONE_REGEX.test(phone)) {
      Alert.alert('Numéro de téléphone invalide', 'Vérifie le numéro saisi.');
      return;
    }

    setSending(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/request-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(method === 'email' ? { email: trimmedEmail } : { phone }),
      });
      const data = await response.json();
      if (!response.ok) {
        Alert.alert('Erreur', data.error ?? 'Impossible d’envoyer le code.');
        return;
      }
      navigation.navigate('VerifyCode', method === 'email' ? { email: trimmedEmail } : { phone });
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de contacter le serveur.');
    } finally {
      setSending(false);
    }
  }

  function switchMethod(next: Method) {
    setMethod(next);
    setEmail('');
    setLocalNumber('');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{mode === 'signup' ? 'Crée ton compte' : 'Connecte-toi'}</Text>
      <Text style={styles.description}>
        On t'envoie un code à usage unique, pas besoin de mot de passe.
      </Text>

      <View style={styles.methodRow}>
        <Pressable
          style={[styles.methodTab, method === 'email' && styles.methodTabActive]}
          onPress={() => switchMethod('email')}
          testID="login-method-email"
        >
          <Text style={[styles.methodTabText, method === 'email' && styles.methodTabTextActive]}>Email</Text>
        </Pressable>
        <Pressable
          style={[styles.methodTab, method === 'phone' && styles.methodTabActive]}
          onPress={() => switchMethod('phone')}
          testID="login-method-phone"
        >
          <Text style={[styles.methodTabText, method === 'phone' && styles.methodTabTextActive]}>Téléphone</Text>
        </Pressable>
      </View>

      {method === 'email' ? (
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="ton@email.com"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
          testID="login-value-input"
        />
      ) : (
        <View style={styles.phoneRow}>
          <CountryCodeField value={country} onChange={setCountry} testID="login-country-code" />
          <TextInput
            value={localNumber}
            onChangeText={setLocalNumber}
            placeholder="6 12 34 56 78"
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
            style={styles.phoneInput}
            testID="login-value-input"
          />
        </View>
      )}
      <PressableScale style={styles.button} onPress={handleSendCode} disabled={sending} testID="send-code-button">
        {sending ? <ActivityIndicator color={colors.text} /> : <Text style={styles.buttonText}>Envoyer le code</Text>}
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
  methodRow: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
  },
  methodTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  methodTabActive: {
    backgroundColor: colors.primary,
  },
  methodTabText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  methodTabTextActive: {
    color: colors.text,
  },
  input: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
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
    fontSize: 15,
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
