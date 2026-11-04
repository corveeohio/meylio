import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { API_BASE_URL } from '../config/api';
import { useUser } from '../context/UserContext';
import { PressableScale } from './PressableScale';

type PlaylistTrack = { label: string; spotifyUrl: string; appleMusicUrl: string };
type PlaylistResponse = { preferredService: 'spotify' | 'apple_music'; tracks: PlaylistTrack[] };

const SERVICE_NAMES = { spotify: 'Spotify', apple_music: 'Apple Music' } as const;

/**
 * The match's shared playlist: each track opens in the viewer's own music app, and the
 * whole list can be sent through the share sheet (Messages, WhatsApp, Instagram…).
 */
export function MatchPlaylist({ matchId }: { matchId: string }) {
  const { userId } = useUser();
  const [playlist, setPlaylist] = useState<PlaylistResponse | null>(null);
  const [failed, setFailed] = useState(false);
  const [remixing, setRemixing] = useState(false);

  useEffect(() => {
    if (!userId) return;
    fetch(`${API_BASE_URL}/matches/${matchId}/playlist?userId=${userId}`)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then(setPlaylist)
      .catch(() => setFailed(true));
  }, [matchId, userId]);

  function urlFor(track: PlaylistTrack) {
    return playlist?.preferredService === 'spotify' ? track.spotifyUrl : track.appleMusicUrl;
  }

  async function openTrack(track: PlaylistTrack) {
    try {
      await Linking.openURL(urlFor(track));
    } catch {
      Alert.alert('Erreur', 'Impossible d’ouvrir ce titre pour le moment.');
    }
  }

  // Rebuilds the playlist from both people's current tastes, in a new order.
  async function remixPlaylist() {
    if (!userId) return;
    setRemixing(true);
    try {
      const response = await fetch(`${API_BASE_URL}/matches/${matchId}/playlist/remix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (!response.ok) throw new Error('remix failed');
      setPlaylist(await response.json());
    } catch {
      Alert.alert('Erreur', 'Impossible de mélanger vos playlists pour le moment.');
    } finally {
      setRemixing(false);
    }
  }

  async function sharePlaylist() {
    if (!playlist) return;
    const lines = playlist.tracks.map((track, index) => `${index + 1}. ${track.label}\n${urlFor(track)}`);
    await Share.share({ message: `Notre playlist Meylio 🎧\n\n${lines.join('\n\n')}` });
  }

  if (failed) return <Text style={styles.muted}>Playlist indisponible pour le moment.</Text>;
  if (!playlist) return <ActivityIndicator color={colors.primary} style={styles.loader} />;
  if (playlist.tracks.length === 0) {
    return <Text style={styles.muted}>Pas encore de titres : échangez vos coups de cœur dans le chat !</Text>;
  }

  return (
    <View style={styles.container}>
      {playlist.tracks.map((track, index) => (
        <Pressable
          key={`${track.label}-${index}`}
          style={styles.track}
          onPress={() => openTrack(track)}
          testID={`playlist-track-${index}`}
        >
          <Text style={styles.trackIndex}>{index + 1}</Text>
          <Text style={styles.trackLabel} numberOfLines={2}>
            {track.label}
          </Text>
          <Ionicons name="play-circle" size={22} color={colors.primary} />
        </Pressable>
      ))}
      <Text style={styles.hint}>Touche un titre pour l’écouter sur {SERVICE_NAMES[playlist.preferredService]}</Text>
      <View style={styles.actions}>
        <PressableScale
          style={[styles.shareButton, styles.remixButton]}
          onPress={remixPlaylist}
          disabled={remixing}
          testID="remix-playlist-button"
        >
          {remixing ? (
            <ActivityIndicator color={colors.text} size="small" />
          ) : (
            <>
              <Ionicons name="shuffle" size={16} color={colors.text} />
              <Text style={styles.shareButtonText}>Mélanger</Text>
            </>
          )}
        </PressableScale>
        <PressableScale style={[styles.shareButton, styles.actionFlex]} onPress={sharePlaylist} testID="share-playlist-button">
          <Ionicons name="share-outline" size={16} color={colors.text} />
          <Text style={styles.shareButtonText}>Partager</Text>
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  loader: {
    marginVertical: 12,
  },
  muted: {
    color: colors.textMuted,
    fontSize: 14,
  },
  track: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  trackIndex: {
    color: colors.textMuted,
    fontSize: 13,
    width: 18,
    textAlign: 'right',
  },
  trackLabel: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 6,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionFlex: {
    flex: 1,
  },
  remixButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 12,
  },
  shareButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
});
