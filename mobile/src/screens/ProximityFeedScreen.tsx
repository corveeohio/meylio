import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { API_BASE_URL } from '../config/api';
import { useUser } from '../context/UserContext';
import type { CompatibilityBreakdown } from '../types/compatibility';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Candidate = {
  userId: string;
  distanceKm: number;
  score: number;
  breakdown: CompatibilityBreakdown;
};

type State = 'loading' | 'location-disabled' | 'permission-denied' | 'ready' | 'error';

export function ProximityFeedScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { userId } = useUser();
  const [state, setState] = useState<State>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let cancelled = false;

      (async () => {
        setState('loading');

        const userResponse = await fetch(`${API_BASE_URL}/users/${userId}`);
        const user = await userResponse.json();
        if (cancelled) return;

        if (!user.locationOptIn) {
          setState('location-disabled');
          return;
        }

        const permission = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (!permission.granted) {
          setState('permission-denied');
          return;
        }

        const position = await Location.getCurrentPositionAsync({});
        if (cancelled) return;

        await fetch(`${API_BASE_URL}/users/${userId}/location`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }),
        });

        const poolResponse = await fetch(`${API_BASE_URL}/discovery/proximity?userId=${userId}`);
        const data = await poolResponse.json();
        if (cancelled) return;

        if (Array.isArray(data)) {
          setCandidates(data);
          setState('ready');
        } else {
          setErrorMessage(data.error ?? 'Erreur inconnue');
          setState('error');
        }
      })().catch(() => !cancelled && setState('error'));

      return () => {
        cancelled = true;
      };
    }, [userId])
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>À proximité</Text>
      <Text style={styles.description}>Personnes compatibles autour de toi</Text>

      {state === 'loading' && <ActivityIndicator style={styles.loader} color={colors.primary} />}

      {state === 'location-disabled' && (
        <View style={styles.messageBlock}>
          <Text style={styles.message}>Active la géolocalisation dans Paramètres pour utiliser ce mode.</Text>
          <Pressable style={styles.button} onPress={() => navigation.navigate('Settings')}>
            <Text style={styles.buttonText}>Aller aux paramètres</Text>
          </Pressable>
        </View>
      )}

      {state === 'permission-denied' && (
        <Text style={styles.message}>
          Autorise l'accès à ta position dans les réglages de ton navigateur/téléphone pour utiliser ce mode.
        </Text>
      )}

      {state === 'error' && <Text style={styles.message}>{errorMessage ?? 'Une erreur est survenue.'}</Text>}

      {state === 'ready' && candidates.length === 0 && (
        <Text style={styles.message}>Personne de compatible à proximité pour l'instant.</Text>
      )}

      {state === 'ready' && (
        <FlatList
          style={styles.list}
          data={candidates}
          keyExtractor={(item) => item.userId}
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              testID={`proximity-candidate-${item.userId}`}
              onPress={() =>
                navigation.navigate('PreMatchProfile', {
                  targetUserId: item.userId,
                  score: item.score,
                  breakdown: item.breakdown,
                })
              }
            >
              <Text style={styles.cardDistance}>{item.distanceKm} km</Text>
              <Text style={styles.cardScore}>{item.score}% compatible</Text>
            </Pressable>
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
    maxWidth: 320,
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
    maxWidth: 320,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  cardDistance: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardScore: {
    color: colors.textMuted,
    fontSize: 13,
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
