import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { API_BASE_URL } from '../config/api';
import { useUser } from '../context/UserContext';
import { PressableScale } from '../components/PressableScale';
import { SkeletonCard } from '../components/Skeleton';
import { EmptyMusicProfileNotice, isMusicProfileEmpty } from '../components/EmptyMusicProfileNotice';
import type { CompatibilityBreakdown } from '../types/compatibility';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Liker = {
  userId: string;
  displayName: string | null;
  age: number | null;
  isVerified: boolean;
  score: number;
  breakdown: CompatibilityBreakdown;
};

type State = 'loading' | 'premium-required' | 'ready' | 'error';

export function LikesReceivedScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { userId } = useUser();
  const [state, setState] = useState<State>('loading');
  const [likers, setLikers] = useState<Liker[]>([]);
  const [hiddenLikesCount, setHiddenLikesCount] = useState(0);
  const [musicProfileEmpty, setMusicProfileEmpty] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let cancelled = false;
      setState('loading');

      fetch(`${API_BASE_URL}/matches/likes-received?userId=${userId}`)
        .then(async (response) => {
          const data = await response.json();
          if (cancelled) return;
          setMusicProfileEmpty(isMusicProfileEmpty(response));
          if (response.status === 403 && data.error === 'premium_required') {
            setState('premium-required');
            fetch(`${API_BASE_URL}/matches/likes-count?userId=${userId}`)
              .then((countResponse) => countResponse.json())
              .then((countData) => !cancelled && typeof countData.count === 'number' && setHiddenLikesCount(countData.count))
              .catch(() => {});
            return;
          }
          if (Array.isArray(data)) {
            setLikers(data);
            setState('ready');
          } else {
            setState('error');
          }
        })
        .catch(() => !cancelled && setState('error'));

      return () => {
        cancelled = true;
      };
    }, [userId])
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Qui t'a liké</Text>
      <Text style={styles.description}>Des profils compatibles t'ont déjà liké</Text>

      {state === 'loading' && (
        <View style={styles.list}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      )}

      {state === 'premium-required' && (
        <View style={styles.messageBlock}>
          {hiddenLikesCount > 0 && (
            <View style={styles.teaser}>
              <Ionicons name="heart" size={28} color={colors.accent} />
              <Text style={styles.teaserCount}>
                {hiddenLikesCount === 1 ? '1 personne t’a liké' : `${hiddenLikesCount} personnes t’ont liké`}
              </Text>
            </View>
          )}
          <Text style={styles.message}>Passe en Premium pour découvrir qui t'a liké.</Text>
          <PressableScale style={styles.button} onPress={() => navigation.navigate('Subscription')}>
            <Text style={styles.buttonText}>Passer en Premium</Text>
          </PressableScale>
        </View>
      )}

      {state === 'error' && <Text style={styles.message}>Une erreur est survenue.</Text>}

      {state === 'ready' && likers.length === 0 && (
        <Text style={styles.message}>Personne ne t'a liké pour l'instant.</Text>
      )}

      {state === 'ready' && musicProfileEmpty && <EmptyMusicProfileNotice />}

      {state === 'ready' && (
        <FlatList
          style={styles.list}
          data={likers}
          keyExtractor={(item) => item.userId}
          renderItem={({ item }) => (
            <PressableScale
              scaleTo={0.98}
              style={styles.card}
              testID={`liker-${item.userId}`}
              onPress={() =>
                navigation.navigate('PreMatchProfile', {
                  targetUserId: item.userId,
                  score: item.score,
                  breakdown: item.breakdown,
                })
              }
            >
              <View style={styles.cardNameRow}>
                <Text style={styles.cardName} numberOfLines={1}>
                  {[item.displayName ?? 'Profil Meylio', item.age !== null ? `${item.age} ans` : null]
                    .filter(Boolean)
                    .join(', ')}
                </Text>
                {item.isVerified && <Ionicons name="checkmark-circle" size={16} color={colors.primary} />}
              </View>
              <Text style={styles.cardScore}>{item.score}% compatible</Text>
              <Text style={styles.cardDetail}>
                {item.breakdown.sharedGenres.length > 0
                  ? `Genres en commun : ${item.breakdown.sharedGenres.join(', ')}`
                  : 'Aucun genre en commun'}
              </Text>
              <Text style={styles.cardHint}>T'a liké — like en retour pour matcher</Text>
            </PressableScale>
          )}
        />
      )}
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
    marginBottom: 16,
  },
  loader: {
    marginTop: 16,
  },
  messageBlock: {
    width: '100%',
    maxWidth: 480,
    alignItems: 'center',
    gap: 16,
    marginTop: 16,
  },
  message: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
  },
  list: {
    width: '100%',
    maxWidth: 480,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  cardNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  cardName: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    flexShrink: 1,
  },
  teaser: {
    alignItems: 'center',
    gap: 6,
  },
  teaserCount: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  cardScore: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardDetail: {
    color: colors.textMuted,
    fontSize: 13,
  },
  cardHint: {
    color: colors.accent,
    fontSize: 12,
    marginTop: 6,
    fontWeight: '600',
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
});
