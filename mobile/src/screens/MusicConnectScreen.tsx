import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { API_BASE_URL } from '../config/api';
import { useUser } from '../context/UserContext';
import {
  SPOTIFY_CLIENT_ID,
  exchangeSpotifyCode,
  fetchSpotifyTopArtists,
  spotifyRedirectUri,
  useSpotifyAuthRequest,
} from '../services/spotifyAuth';
import { connectAppleMusic } from '../services/appleMusicAuth';
import type { RootStackParamList } from '../navigation/RootNavigator';

export function MusicConnectScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { userId, hasPhotos, hasBasicInfo, setHasMusicProfile } = useUser();
  const [request, response, promptAsync] = useSpotifyAuthRequest();
  const [connecting, setConnecting] = useState(false);
  const [connectingApple, setConnectingApple] = useState(false);

  function proceedAfterMusicConnected() {
    setHasMusicProfile(true);
    navigation.navigate(!hasPhotos ? 'Photos' : !hasBasicInfo ? 'BasicInfo' : 'MainTabs');
  }

  useEffect(() => {
    if (response?.type !== 'success' || !request?.codeVerifier || !userId) return;

    (async () => {
      setConnecting(true);
      try {
        const tokens = await exchangeSpotifyCode(response.params.code, request.codeVerifier!);
        const { topArtists, topGenres } = await fetchSpotifyTopArtists(tokens.accessToken);
        await fetch(`${API_BASE_URL}/music/connect/spotify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, topArtists, topGenres, topTracks: [] }),
        });
        proceedAfterMusicConnected();
      } catch (error) {
        Alert.alert('Erreur', 'La connexion à Spotify a échoué.');
      } finally {
        setConnecting(false);
      }
    })();
  }, [response]);

  function handleConnectSpotify() {
    if (!SPOTIFY_CLIENT_ID) {
      Alert.alert(
        'Configuration requise',
        `Ajoute EXPO_PUBLIC_SPOTIFY_CLIENT_ID dans mobile/.env (crée une app sur developer.spotify.com et enregistre cette Redirect URI : ${spotifyRedirectUri})`
      );
      return;
    }
    promptAsync();
  }

  async function handleConnectAppleMusic() {
    if (Platform.OS !== 'web') {
      Alert.alert(
        'Bientôt disponible',
        'La connexion Apple Music nécessite une build native (pas disponible dans Expo Go pour le moment).'
      );
      return;
    }
    if (!userId) return;

    setConnectingApple(true);
    try {
      const tokenResponse = await fetch(`${API_BASE_URL}/music/apple-music/developer-token`);
      if (!tokenResponse.ok) {
        const data = await tokenResponse.json();
        Alert.alert('Configuration requise', data.error ?? 'Apple Music non configuré côté serveur.');
        return;
      }
      const { token } = await tokenResponse.json();

      const { topArtists, topGenres } = await connectAppleMusic(token);
      await fetch(`${API_BASE_URL}/music/connect/apple-music`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, topArtists, topGenres, topTracks: [] }),
      });
      proceedAfterMusicConnected();
    } catch (error) {
      Alert.alert('Erreur', 'La connexion à Apple Music a échoué.');
    } finally {
      setConnectingApple(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Connecte ta musique</Text>
      <Text style={styles.description}>
        Spotify, Apple Music, ou saisie manuelle de tes goûts musicaux
      </Text>
      <View style={styles.buttonGroup}>
        <Pressable
          style={styles.button}
          onPress={handleConnectSpotify}
          disabled={connecting}
          testID="connect-spotify-button"
        >
          {connecting ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <Text style={styles.buttonText}>Connecter Spotify</Text>
          )}
        </Pressable>
        <Pressable
          style={styles.button}
          onPress={handleConnectAppleMusic}
          disabled={connectingApple}
          testID="connect-apple-music-button"
        >
          {connectingApple ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <Text style={styles.buttonText}>Connecter Apple Music</Text>
          )}
        </Pressable>
        <Pressable
          style={[styles.button, styles.buttonSecondary]}
          onPress={() => navigation.navigate('ManualMusicTaste')}
          testID="nav-button-ManualMusicTaste"
        >
          <Text style={styles.buttonText}>Saisir mes goûts manuellement</Text>
        </Pressable>
      </View>
      {__DEV__ && (
        <Text style={styles.redirectUriHint} testID="spotify-redirect-uri-hint">
          Redirect URI à enregistrer sur developer.spotify.com : {spotifyRedirectUri}
        </Text>
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
  },
  buttonGroup: {
    marginTop: 32,
    gap: 12,
    width: '100%',
    maxWidth: 320,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: colors.surface,
  },
  buttonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  redirectUriHint: {
    marginTop: 20,
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 320,
  },
});
