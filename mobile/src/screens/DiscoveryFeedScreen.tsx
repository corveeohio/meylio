import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { API_BASE_URL } from '../config/api';
import { useUser } from '../context/UserContext';
import type { CompatibilityBreakdown } from '../types/compatibility';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Candidate = {
  userId: string;
  score: number;
  breakdown: CompatibilityBreakdown;
};

export function DiscoveryFeedScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { userId } = useUser();
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let cancelled = false;
      setCandidates(null);
      setError(null);

      fetch(`${API_BASE_URL}/discovery/pool?userId=${userId}`)
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
    }, [userId])
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Découverte</Text>
      <Text style={styles.description}>Profils compatibles, indépendamment de la position</Text>

      {!candidates && !error && <ActivityIndicator style={styles.loader} color={colors.primary} />}
      {error && <Text style={styles.error}>{error}</Text>}
      {candidates && candidates.length === 0 && (
        <Text style={styles.error}>Aucun profil compatible pour l'instant.</Text>
      )}

      <FlatList
        style={styles.list}
        data={candidates ?? []}
        keyExtractor={(item) => item.userId}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            testID={`candidate-${item.userId}`}
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
          </Pressable>
        )}
      />

      <View style={styles.buttonGroup}>
        <Pressable style={styles.button} onPress={() => navigation.navigate('ProximityFeed')}>
          <Text style={styles.buttonText}>Mode proximité</Text>
        </Pressable>
        <Pressable
          style={[styles.button, styles.buttonSecondary]}
          onPress={() => navigation.navigate('Settings')}
        >
          <Text style={styles.buttonText}>Paramètres</Text>
        </Pressable>
      </View>
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
  error: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
  },
  list: {
    width: '100%',
    maxWidth: 320,
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
  buttonGroup: {
    marginTop: 16,
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
});
