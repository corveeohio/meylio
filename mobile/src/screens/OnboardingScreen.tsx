import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { MeylioLogo } from '../components/MeylioLogo';
import { SoundWaveBackground } from '../components/SoundWaveBackground';
import type { RootStackParamList } from '../navigation/RootNavigator';

export function OnboardingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={styles.container}>
      <SoundWaveBackground />
      <View style={styles.content}>
        <MeylioLogo size={72} showWordmark={false} />
        <Text style={styles.title}>Bienvenue sur Meylio</Text>
        <Text style={styles.description}>Connexion par email ou téléphone, sans mot de passe</Text>

        <View style={styles.buttonGroup}>
          <Pressable
            style={styles.button}
            onPress={() => navigation.navigate('Login', { mode: 'login' })}
            testID="nav-button-Login"
          >
            <Text style={styles.buttonText}>Se connecter</Text>
          </Pressable>
          <Pressable
            style={[styles.button, styles.buttonSecondary]}
            onPress={() => navigation.navigate('Login', { mode: 'signup' })}
            testID="nav-button-Signup"
          >
            <Text style={styles.buttonSecondaryText}>Créer un compte</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
  buttonGroup: {
    marginTop: 32,
    width: '100%',
    maxWidth: 320,
    gap: 12,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
  },
  buttonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  buttonSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonSecondaryText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
});
