import { useState } from 'react';
import { Alert, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { API_BASE_URL } from '../config/api';
import { useUser } from '../context/UserContext';
import type { RootStackParamList } from '../navigation/RootNavigator';

type PickedPhoto = { uri: string; fileName: string; mimeType: string };

export function PhotosScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { userId, setHasPhotos } = useUser();
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [uploading, setUploading] = useState(false);

  async function pickPhotos() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission requise', "Autorise l'accès à tes photos pour continuer.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.7,
    });

    if (result.canceled) return;

    const newPhotos = result.assets.map((asset, index) => ({
      uri: asset.uri,
      fileName: asset.fileName ?? `photo-${Date.now()}-${index}.jpg`,
      mimeType: asset.mimeType ?? 'image/jpeg',
    }));
    setPhotos((current) => [...current, ...newPhotos]);
  }

  function removePhoto(uri: string) {
    setPhotos((current) => current.filter((photo) => photo.uri !== uri));
  }

  async function handleContinue() {
    if (photos.length === 0) {
      Alert.alert('Ajoute au moins une photo');
      return;
    }
    if (!userId) {
      Alert.alert('Profil en cours de préparation, réessaie dans un instant');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      for (const photo of photos) {
        if (Platform.OS === 'web') {
          const blob = await (await fetch(photo.uri)).blob();
          formData.append('photos', blob, photo.fileName);
        } else {
          formData.append('photos', {
            uri: photo.uri,
            name: photo.fileName,
            type: photo.mimeType,
          } as unknown as Blob);
        }
      }

      const response = await fetch(`${API_BASE_URL}/users/${userId}/photos`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error('Échec de l’upload');
      setHasPhotos(true);
      navigation.navigate('SelfieVerification');
    } catch (error) {
      Alert.alert('Erreur', "Impossible d'envoyer tes photos pour le moment.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ajoute tes photos</Text>
      <Text style={styles.description}>
        Tu choisiras toi-même si et quand les partager, une fois le match fait
      </Text>

      <View style={styles.grid}>
        {photos.map((photo) => (
          <Pressable key={photo.uri} onPress={() => removePhoto(photo.uri)} style={styles.thumbnailWrapper}>
            <Image source={{ uri: photo.uri }} style={styles.thumbnail} />
            <View style={styles.removeBadge}>
              <Text style={styles.removeBadgeText}>✕</Text>
            </View>
          </Pressable>
        ))}
        <Pressable style={styles.addTile} onPress={pickPhotos} testID="add-photo-button">
          <Text style={styles.addTileText}>+</Text>
        </Pressable>
      </View>

      <Pressable
        style={styles.button}
        onPress={handleContinue}
        disabled={uploading}
        testID="photos-continue-button"
      >
        <Text style={styles.buttonText}>{uploading ? 'Envoi…' : 'Continuer'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    padding: 24,
    paddingTop: 60,
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    width: '100%',
    maxWidth: 320,
    justifyContent: 'center',
  },
  thumbnailWrapper: {
    width: 92,
    height: 92,
  },
  thumbnail: {
    width: 92,
    height: 92,
    borderRadius: 12,
  },
  removeBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: colors.primary,
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBadgeText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  addTile: {
    width: 92,
    height: 92,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surface,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTileText: {
    color: colors.textMuted,
    fontSize: 28,
  },
  button: {
    marginTop: 32,
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
