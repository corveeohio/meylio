import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { CommonActions, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { API_BASE_URL } from '../config/api';
import { useUser } from '../context/UserContext';
import type { RootStackParamList } from '../navigation/RootNavigator';

export function SelfieVerificationScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { userId, hasBasicInfo } = useUser();
  const [selfieUri, setSelfieUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function takeSelfie() {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return;

      const result = await ImagePicker.launchCameraAsync({ quality: 0.6 });
      if (!result.canceled) setSelfieUri(result.assets[0].uri);
    } catch (error) {
      // Caméra indisponible (ex: navigateur sans webcam) — l'étape reste facultative.
    }
  }

  async function handleContinue() {
    if (selfieUri && userId) {
      setBusy(true);
      try {
        const blob = await (await fetch(selfieUri)).blob();
        const formData = new FormData();
        formData.append('selfie', blob, 'selfie.jpg');
        await fetch(`${API_BASE_URL}/users/${userId}/selfie`, { method: 'POST', body: formData });
      } catch (error) {
        // Non bloquant : l'utilisateur peut continuer même si l'envoi échoue.
      } finally {
        setBusy(false);
      }
    }
    if (hasBasicInfo) {
      navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'MainTabs' }] }));
    } else {
      navigation.navigate('BasicInfo');
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Confirme ton identité</Text>
      <Text style={styles.description}>Prends un selfie pour vérifier que tes photos sont bien toi</Text>

      {selfieUri ? (
        <Image source={{ uri: selfieUri }} style={styles.preview} />
      ) : (
        <Pressable style={styles.captureTile} onPress={takeSelfie} testID="take-selfie-button">
          <Text style={styles.captureTileText}>📷</Text>
        </Pressable>
      )}

      <Pressable
        style={[styles.button, styles.buttonSecondary]}
        onPress={handleContinue}
        disabled={busy}
        testID="selfie-continue-button"
      >
        {busy ? (
          <ActivityIndicator color={colors.text} />
        ) : (
          <Text style={styles.buttonText}>{selfieUri ? 'Continuer' : 'Passer cette étape'}</Text>
        )}
      </Pressable>
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
  captureTile: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  captureTileText: {
    fontSize: 40,
  },
  preview: {
    width: 140,
    height: 140,
    borderRadius: 70,
    marginBottom: 24,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  buttonSecondary: {
    backgroundColor: colors.surface,
  },
  buttonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
});
