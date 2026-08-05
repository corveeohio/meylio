import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { API_BASE_URL } from '../config/api';
import { useUser } from '../context/UserContext';
import { ScreenStub } from './ScreenStub';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = RouteProp<RootStackParamList, 'PreMatchProfile'>;

export function PreMatchProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<Props>();
  const { userId } = useUser();
  const [liking, setLiking] = useState(false);
  const [location, setLocation] = useState<{ city: string | null; distanceKm: number | null } | null>(null);
  const [anthem, setAnthem] = useState<string | null>(null);
  const [curator, setCurator] = useState<{ isCurator: boolean; discoveredArtist: string | null }>({
    isCurator: false,
    discoveredArtist: null,
  });
  const targetUserIdParam = route.params?.targetUserId;

  useEffect(() => {
    if (!targetUserIdParam || !userId) return;
    fetch(`${API_BASE_URL}/users/${targetUserIdParam}?relativeToUserId=${userId}`)
      .then((response) => response.json())
      .then((data) => {
        setLocation({ city: data.city ?? null, distanceKm: data.distanceKm ?? null });
        setAnthem(data.musicProfile?.topTracks?.[0] ?? null);
        setCurator({ isCurator: !!data.isCurator, discoveredArtist: data.discoveredArtist ?? null });
      })
      .catch(() => {});
  }, [targetUserIdParam, userId]);

  if (!route.params) {
    return (
      <ScreenStub
        title="Profil musical"
        description="Score de compatibilité et goûts musicaux, sans photo"
        buttons={[{ label: 'Liker', route: 'Match' }]}
      />
    );
  }

  const { targetUserId, score, breakdown } = route.params;

  async function handleLike() {
    if (!userId) return;
    setLiking(true);
    try {
      const response = await fetch(`${API_BASE_URL}/matches/like/${targetUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await response.json();

      if (response.status === 403 && data.error === 'daily_limit_reached') {
        Alert.alert('Limite atteinte', data.message);
        navigation.navigate('Subscription');
        return;
      }

      if (data.status === 'matched') {
        navigation.navigate('Match', {
          matchId: data.match.id,
          otherUserId: targetUserId,
          score: data.match.compatibilityScore,
          breakdown: {
            genreScore: data.match.compatibilityBreakdown.genreScore,
            artistScore: data.match.compatibilityBreakdown.artistScore,
            audioFeatureScore: data.match.compatibilityBreakdown.audioFeatureScore,
            sharedGenres: data.match.compatibilityBreakdown.sharedGenres,
            sharedArtists: data.match.compatibilityBreakdown.sharedArtists,
          },
          playlist: data.match.playlist.trackUris,
          icebreaker: data.match.compatibilityBreakdown.icebreaker,
        });
      } else {
        Alert.alert('Like envoyé', 'En attente que cette personne te like en retour.');
        navigation.navigate('MainTabs');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d’envoyer le like pour le moment.');
    } finally {
      setLiking(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.score}>{score}%</Text>
      <Text style={styles.title}>compatible</Text>

      {location && (location.city || location.distanceKm !== null) && (
        <View style={styles.locationPill}>
          <Ionicons name="location" size={13} color={colors.textMuted} />
          <Text style={styles.locationPillText}>
            {[location.city, location.distanceKm !== null ? `à ${location.distanceKm} km` : null]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>
      )}

      {anthem && (
        <View style={styles.anthemPill}>
          <Ionicons name="musical-notes" size={13} color={colors.primary} />
          <Text style={styles.anthemPillText} numberOfLines={1}>{anthem}</Text>
        </View>
      )}

      {curator.isCurator && curator.discoveredArtist && (
        <View style={styles.anthemPill}>
          <Ionicons name="compass" size={13} color={colors.accent} />
          <Text style={styles.anthemPillText} numberOfLines={1}>
            Découvreur de {curator.discoveredArtist}
          </Text>
        </View>
      )}

      <View style={styles.detailBlock}>
        <Text style={styles.detailLabel}>Genres</Text>
        <Text style={styles.detailValue}>{breakdown.genreScore}% de correspondance</Text>
        {breakdown.sharedGenres.length > 0 && (
          <Text style={styles.detailShared}>En commun : {breakdown.sharedGenres.join(', ')}</Text>
        )}
      </View>

      <View style={styles.detailBlock}>
        <Text style={styles.detailLabel}>Artistes</Text>
        <Text style={styles.detailValue}>{breakdown.artistScore}% de correspondance</Text>
        {breakdown.sharedArtists.length > 0 && (
          <Text style={styles.detailShared}>En commun : {breakdown.sharedArtists.join(', ')}</Text>
        )}
      </View>

      <Text style={styles.noPhoto}>Pas de photo — uniquement les goûts musicaux pour l'instant</Text>

      <Pressable style={styles.button} onPress={handleLike} disabled={liking} testID="like-button">
        {liking ? <ActivityIndicator color={colors.text} /> : <Text style={styles.buttonText}>Liker</Text>}
      </Pressable>

      <Pressable
        style={styles.reportLink}
        onPress={() => navigation.navigate('Report', { reportedUserId: targetUserId })}
        testID="report-profile-link"
      >
        <Text style={styles.reportLinkText}>Signaler ce profil</Text>
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
  score: {
    color: colors.primary,
    fontSize: 48,
    fontWeight: '800',
  },
  title: {
    color: colors.text,
    fontSize: 16,
    marginBottom: 24,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 20,
  },
  locationPillText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  anthemPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 20,
    maxWidth: 320,
  },
  anthemPillText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  detailBlock: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  detailLabel: {
    color: colors.textMuted,
    fontSize: 12,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  detailValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  detailShared: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 6,
  },
  noPhoto: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginVertical: 16,
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
  reportLink: {
    marginTop: 16,
  },
  reportLinkText: {
    color: colors.textMuted,
    fontSize: 13,
    textDecorationLine: 'underline',
  },
});
