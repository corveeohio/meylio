import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { File, UploadType } from 'expo-file-system';
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
      // Caméra indisponible (ex: navigateur sans webcam) — le selfie reste obligatoire pour continuer.
    }
  }

  async function handleContinue() {
    if (!selfieUri || !userId) return;
    setBusy(true);
    let faceMatch = false;
    try {
      let response: Response;
      if (Platform.OS === 'web') {
        const blob = await (await fetch(selfieUri)).blob();
        const formData = new FormData();
        formData.append('selfie', blob, 'selfie.jpg');
        response = await fetch(`${API_BASE_URL}/users/${userId}/selfie`, { method: 'POST', body: formData });
      } else {
        const file = new File(selfieUri);
        const result = await file.upload(`${API_BASE_URL}/users/${userId}/selfie`, {
          httpMethod: 'POST',
          uploadType: UploadType.MULTIPART,
          fieldName: 'selfie',
          mimeType: 'image/jpeg',
        });
        response = new Response(result.body, { status: result.status });
      }
      const data = await response.json();
      if (!response.ok) {
        Alert.alert('Selfie refusé', data.error ?? 'Réessaie avec un meilleur éclairage.');
        setBusy(false);
        return;
      }
      faceMatch = !!data.faceMatch;
    } catch (error) {
      Alert.alert('Erreur', "Impossible d'envoyer ton selfie pour le moment. Réessaie.");
      setBusy(false);
      return;
    }
    setBusy(false);
    if (!faceMatch) {
      Alert.alert(
        'Profil non vérifié',
        "Ton selfie ne correspond pas clairement à tes photos de profil. Tu peux continuer, mais ton profil n'aura pas le badge vérifié."
      );
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
        style={[styles.button, !selfieUri && styles.buttonDisabled]}
        onPress={handleContinue}
        disabled={busy || !selfieUri}
        testID="selfie-continue-button"
      >
        {busy ? <ActivityIndicator color={colors.text} /> : <Text style={styles.buttonText}>Continuer</Text>}
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
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
});
