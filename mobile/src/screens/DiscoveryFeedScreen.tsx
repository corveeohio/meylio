import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation, type CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { colors } from '../theme/colors';
import { API_BASE_URL } from '../config/api';
import { useUser } from '../context/UserContext';
import { useFilters, buildDiscoveryQuery } from '../context/FiltersContext';
import { MeylioLogo } from '../components/MeylioLogo';
import { PressableScale } from '../components/PressableScale';
import type { CompatibilityBreakdown } from '../types/compatibility';
import type { RootStackParamList } from '../navigation/RootNavigator';
import type { MainTabParamList } from '../navigation/MainTabNavigator';

type Candidate = {
  userId: string;
  displayName: string | null;
  age: number | null;
  isVerified: boolean;
  distanceKm: number | null;
  relationshipIntent: string | null;
  lastActiveAt: string | null;
  score: number;
  breakdown: CompatibilityBreakdown;
};

const INTENT_LABELS: Record<string, string> = {
  serieux: 'Relation sérieuse',
  amitie: 'Amitié',
};

function isRecentlyActive(lastActiveAt: string | null): boolean {
  if (!lastActiveAt) return false;
  return Date.now() - new Date(lastActiveAt).getTime() < 24 * 60 * 60 * 1000;
}

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Discovery'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const SWIPE_THRESHOLD = 120;

export function DiscoveryFeedScreen() {
  const navigation = useNavigation<Nav>();
  const { userId } = useUser();
  const { filters } = useFilters();
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [likesRemaining, setLikesRemaining] = useState<{ unlimited: boolean; remaining: number | null } | null>(null);
  const [lastDecision, setLastDecision] = useState<{ candidate: Candidate; liked: boolean } | null>(null);
  const [rewinding, setRewinding] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      fetch(`${API_BASE_URL}/users/${userId}/heartbeat`, { method: 'POST' }).catch(() => {});
    }, [userId])
  );

  const loadLikesRemaining = useCallback(() => {
    if (!userId) return;
    fetch(`${API_BASE_URL}/matches/likes-remaining?userId=${userId}`)
      .then((response) => response.json())
      .then((data) => setLikesRemaining(data))
      .catch(() => {});
  }, [userId]);

  const activeFilterCount =
    filters.genres.length +
    (filters.minAge ? 1 : 0) +
    (filters.maxAge ? 1 : 0) +
    (filters.maxDistanceKm ? 1 : 0);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let cancelled = false;
      setCandidates(null);
      setError(null);
      setIndex(0);

      const query = buildDiscoveryQuery(filters);
      fetch(`${API_BASE_URL}/discovery/pool?userId=${userId}${query ? `&${query}` : ''}`)
        .then((response) => response.json())
        .then((data) => {
          if (cancelled) return;
          if (Array.isArray(data)) setCandidates(data);
          else setError(data.error ?? 'Erreur inconnue');
        })
        .catch(() => !cancelled && setError('Impossible de charger les profils'));

      return () => {
        cancelled = true;
      };
    }, [userId, filters])
  );

  useFocusEffect(loadLikesRemaining);

  async function handleDecision(candidate: Candidate, liked: boolean) {
    setIndex((current) => current + 1);
    setLastDecision({ candidate, liked });
    if (!liked || !userId) return;

    setBusy(true);
    try {
      const response = await fetch(`${API_BASE_URL}/matches/like/${candidate.userId}`, {
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
          otherUserId: candidate.userId,
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
      }
    } catch {
      // Le like a échoué silencieusement — la personne réapparaîtra au prochain chargement.
    } finally {
      setBusy(false);
      loadLikesRemaining();
    }
  }

  async function handleRewind() {
    if (!lastDecision || !userId || rewinding) return;
    setRewinding(true);
    try {
      if (lastDecision.liked) {
        const response = await fetch(`${API_BASE_URL}/matches/like/${lastDecision.candidate.userId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        });
        if (response.status === 403) {
          const data = await response.json();
          Alert.alert('Premium requis', data.message);
          return;
        }
        if (response.status === 409) {
          Alert.alert('Trop tard', 'Un match a déjà été créé, impossible d’annuler.');
          return;
        }
      }
      setIndex((current) => Math.max(0, current - 1));
      setLastDecision(null);
      loadLikesRemaining();
    } finally {
      setRewinding(false);
    }
  }

  const visible = candidates?.slice(index, index + 2) ?? [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Découverte</Text>
        <Pressable
          style={styles.filterButton}
          onPress={() => navigation.navigate('Filters')}
          testID="nav-button-Filters"
        >
          <Ionicons name="options-outline" size={20} color={colors.text} />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      <View style={styles.stack}>
        {!candidates && !error && <ActivityIndicator style={styles.loader} color={colors.primary} />}
        {error && <Text style={styles.message}>{error}</Text>}
        {candidates && visible.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="disc-outline" size={48} color={colors.textFaint} />
            <Text style={styles.message}>Aucun profil compatible pour l'instant.</Text>
          </View>
        )}

        {visible
          .map((candidate, i) => (
            <Card
              key={candidate.userId}
              candidate={candidate}
              isTop={i === 0}
              onDecide={(liked) => handleDecision(candidate, liked)}
            />
          ))
          .reverse()}
      </View>

      {visible.length > 0 && likesRemaining && (
        <View style={styles.likesRemainingPill}>
          <Ionicons
            name={likesRemaining.unlimited ? 'infinite' : 'heart-circle-outline'}
            size={15}
            color={colors.textMuted}
          />
          <Text style={styles.likesRemainingText}>
            {likesRemaining.unlimited
              ? 'Likes illimités'
              : `${likesRemaining.remaining} like${likesRemaining.remaining === 1 ? '' : 's'} restant${likesRemaining.remaining === 1 ? '' : 's'} aujourd'hui`}
          </Text>
        </View>
      )}

      {(visible.length > 0 || lastDecision) && (
        <View style={styles.actionRow}>
          <PressableScale
            scaleTo={0.85}
            style={[styles.actionButton, styles.rewindButton, !lastDecision && styles.actionButtonDisabled]}
            onPress={handleRewind}
            disabled={!lastDecision || rewinding}
            testID="rewind-button"
          >
            {rewinding ? (
              <ActivityIndicator color={colors.accent} size="small" />
            ) : (
              <Ionicons name="arrow-undo" size={20} color={lastDecision ? colors.accent : colors.textFaint} />
            )}
          </PressableScale>
          {visible.length > 0 && (
            <>
              <PressableScale
                scaleTo={0.85}
                style={[styles.actionButton, styles.passButton]}
                onPress={() => handleDecision(visible[0], false)}
                disabled={busy}
                testID="swipe-pass-button"
              >
                <Ionicons name="close" size={30} color={colors.error} />
              </PressableScale>
              <PressableScale
                scaleTo={0.85}
                style={[styles.actionButton, styles.likeButton]}
                onPress={() => handleDecision(visible[0], true)}
                disabled={busy}
                testID="swipe-like-button"
              >
                <Ionicons name="heart" size={26} color={colors.text} />
              </PressableScale>
            </>
          )}
        </View>
      )}
    </View>
  );
}

function Card({
  candidate,
  isTop,
  onDecide,
}: {
  candidate: Candidate;
  isTop: boolean;
  onDecide: (liked: boolean) => void;
}) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  function settle(liked: boolean) {
    'worklet';
    translateX.value = withTiming(liked ? 600 : -600, { duration: 250 }, () => {
      runOnJS(onDecide)(liked);
    });
  }

  const pan = Gesture.Pan()
    .enabled(isTop)
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      if (event.translationX > SWIPE_THRESHOLD) {
        settle(true);
      } else if (event.translationX < -SWIPE_THRESHOLD) {
        settle(false);
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${interpolate(translateX.value, [-300, 300], [-12, 12])}deg` },
    ],
    zIndex: isTop ? 2 : 1,
    opacity: isTop ? 1 : 0.92,
  }));

  const likeStampStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1]),
  }));
  const passStampStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, -SWIPE_THRESHOLD], [0, 1]),
  }));

  const { score, breakdown, displayName, age, isVerified, distanceKm, relationshipIntent, lastActiveAt } = candidate;
  const nameLine = [displayName ?? 'Profil compatible', age !== null ? String(age) : null]
    .filter(Boolean)
    .join(', ');
  const recentlyActive = isRecentlyActive(lastActiveAt);

  const card = (
    <Animated.View style={[styles.card, cardStyle]}>
      <Animated.View style={[styles.stamp, styles.likeStamp, likeStampStyle]}>
        <Text style={[styles.stampText, { color: colors.success }]}>J'AIME</Text>
      </Animated.View>
      <Animated.View style={[styles.stamp, styles.passStamp, passStampStyle]}>
        <Text style={[styles.stampText, { color: colors.error }]}>PASSE</Text>
      </Animated.View>

      <LinearGradient colors={colors.gradient} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.hero}>
        <View style={styles.heroTopRow}>
          <MeylioLogo size={22} showWordmark={false} />
          <View style={styles.noPhotoPill}>
            <Ionicons name="musical-notes" size={11} color={colors.text} />
            <Text style={styles.noPhotoPillText}>Sans photo</Text>
          </View>
        </View>
        <View style={styles.heroScoreBlock}>
          <Text style={styles.heroScore}>{score}%</Text>
          <Text style={styles.heroScoreLabel}>compatible</Text>
        </View>
      </LinearGradient>

      <View style={styles.nameRow}>
        {recentlyActive && <View style={styles.activeDot} testID="recently-active-dot" />}
        <Text style={styles.nameText} numberOfLines={1}>
          {nameLine}
        </Text>
        {isVerified && <Ionicons name="checkmark-circle" size={18} color={colors.primary} />}
        {distanceKm !== null && (
          <View style={styles.distancePill}>
            <Ionicons name="location" size={11} color={colors.textMuted} />
            <Text style={styles.distancePillText}>{distanceKm} km</Text>
          </View>
        )}
      </View>

      {relationshipIntent && INTENT_LABELS[relationshipIntent] && (
        <View style={styles.intentPill}>
          <Ionicons name="heart-outline" size={11} color={colors.accent} />
          <Text style={styles.intentPillText}>{INTENT_LABELS[relationshipIntent]}</Text>
        </View>
      )}

      <View style={styles.cardContent}>
        <View style={styles.detailBlock}>
          <View style={styles.detailLabelRow}>
            <Ionicons name="pricetags-outline" size={13} color={colors.textMuted} />
            <Text style={styles.detailLabel}>Genres en commun</Text>
          </View>
          {breakdown.sharedGenres.length > 0 ? (
            <View style={styles.chipRow}>
              {breakdown.sharedGenres.map((genre) => (
                <View key={genre} style={styles.chip}>
                  <Text style={styles.chipText}>{genre}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.detailEmpty}>Aucun genre en commun</Text>
          )}
        </View>

        {breakdown.sharedArtists.length > 0 && (
          <View style={styles.detailBlock}>
            <View style={styles.detailLabelRow}>
              <Ionicons name="mic-outline" size={13} color={colors.textMuted} />
              <Text style={styles.detailLabel}>Artistes en commun</Text>
            </View>
            <Text style={styles.detailValue}>{breakdown.sharedArtists.join(', ')}</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );

  if (!isTop) return card;

  return <GestureDetector gesture={pan}>{card}</GestureDetector>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.accent,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    color: colors.text,
    fontSize: 10,
    fontWeight: '700',
  },
  stack: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  loader: {
    marginTop: 60,
  },
  message: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  card: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  hero: {
    height: '46%',
    padding: 20,
    justifyContent: 'space-between',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  noPhotoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  noPhotoPillText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '600',
  },
  heroScoreBlock: {
    alignItems: 'center',
    paddingBottom: 28,
  },
  heroScore: {
    color: colors.text,
    fontSize: 56,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  heroScoreLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: -18,
    marginHorizontal: 20,
    marginBottom: 4,
    backgroundColor: colors.surface,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  nameText: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    maxWidth: 220,
  },
  distancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  distancePillText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  intentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    marginHorizontal: 20,
    marginBottom: 10,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  intentPillText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  cardContent: {
    flex: 1,
    padding: 20,
    paddingTop: 12,
  },
  detailBlock: {
    width: '100%',
    marginBottom: 18,
  },
  detailLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  detailLabel: {
    color: colors.textMuted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  detailEmpty: {
    color: colors.textFaint,
    fontSize: 14,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  chipText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  stamp: {
    position: 'absolute',
    top: 32,
    zIndex: 10,
    borderWidth: 3,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  likeStamp: {
    left: 24,
    borderColor: colors.success,
    transform: [{ rotate: '-18deg' }],
  },
  passStamp: {
    right: 24,
    borderColor: colors.error,
    transform: [{ rotate: '18deg' }],
  },
  stampText: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 1,
  },
  likesRemainingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    alignSelf: 'center',
    marginTop: 18,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  likesRemainingText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    paddingVertical: 20,
  },
  actionButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  passButton: {},
  likeButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  rewindButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
});
