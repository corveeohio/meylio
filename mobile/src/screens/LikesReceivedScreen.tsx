import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { API_BASE_URL } from '../config/api';
import { useUser } from '../context/UserContext';
import { PressableScale } from '../components/PressableScale';
import { SkeletonCard } from '../components/Skeleton';
import type { CompatibilityBreakdown } from '../types/compatibility';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Liker = {
  userId: string;
  score: number;
  breakdown: CompatibilityBreakdown;
};

type State = 'loading' | 'premium-required' | 'ready' | 'error';

export function LikesReceivedScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { userId } = useUser();
  const [state, setState] = useState<State>('loading');
  const [likers, setLikers] = useState<Liker[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let cancelled = false;
      setState('loading');

      fetch(`${API_BASE_URL}/matches/likes-received?userId=${userId}`)
        .then(async (response) => {
          const data = await response.json();
          if (cancelled) return;
          if (response.status === 403 && data.error === 'premium_required') {
            setState('premium-required');
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
