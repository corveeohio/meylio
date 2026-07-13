import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, type CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { colors } from '../theme/colors';
import { API_BASE_URL } from '../config/api';
import { useUser } from '../context/UserContext';
import { ProximityMap } from '../components/ProximityMap';
import { RadiusSlider } from '../components/RadiusSlider';
import { hashToAngle } from '../utils/proximityRadarMath';
import { destinationPoint } from '../utils/geoDestination';
import type { CompatibilityBreakdown } from '../types/compatibility';
import type { RootStackParamList } from '../navigation/RootNavigator';
import type { MainTabParamList } from '../navigation/MainTabNavigator';

type Candidate = {
  userId: string;
  distanceKm: number;
  score: number;
  breakdown: CompatibilityBreakdown;
  crossedAt: string | null;
  crossedDistanceM: number | null;
};

const DEFAULT_RADIUS_KM = 25;
const MIN_RADIUS_KM = 1;
const MAX_RADIUS_KM = 50;

function formatCrossing(crossedAt: string, distanceMeters: number): string {
  const hoursAgo = Math.round((Date.now() - new Date(crossedAt).getTime()) / (1000 * 60 * 60));
  const when = hoursAgo <= 0 ? "à l'instant" : hoursAgo === 1 ? 'il y a 1h' : `il y a ${hoursAgo}h`;
  return `Croisé(e) à ${distanceMeters}m, ${when}`;
}

type State = 'loading' | 'location-disabled' | 'permission-denied' | 'ready' | 'error';
type ViewMode = 'map' | 'list' | 'history';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Proximity'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export function ProximityFeedScreen() {
  const navigation = useNavigation<Nav>();
  const { userId } = useUser();
  const [state, setState] = useState<State>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);
  const [retryToken, setRetryToken] = useState(0);
  const [myLocation, setMyLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const crossedCandidates = useMemo(
    () =>
      candidates
        .filter((c): c is Candidate & { crossedAt: string } => c.crossedAt !== null)
        .sort((a, b) => new Date(b.crossedAt).getTime() - new Date(a.crossedAt).getTime()),
    [candidates]
  );

  const mapMarkers = useMemo(() => {
    if (!myLocation) return [];
    return candidates.map((candidate) => {
      const bearing = hashToAngle(candidate.userId);
      const { latitude, longitude } = destinationPoint(
        myLocation.latitude,
        myLocation.longitude,
        bearing,
        Math.min(candidate.distanceKm, radiusKm)
      );
      return {
        id: candidate.userId,
        latitude,
        longitude,
        score: candidate.score,
        crossed: candidate.crossedAt !== null,
      };
    });
  }, [candidates, myLocation, radiusKm]);

  function openProfile(candidate: Candidate) {
    navigation.navigate('PreMatchProfile', {
      targetUserId: candidate.userId,
      score: candidate.score,
      breakdown: candidate.breakdown,
    });
  }

  function openProfileByUserId(candidateUserId: string) {
    const candidate = candidates.find((c) => c.userId === candidateUserId);
    if (candidate) openProfile(candidate);
  }

  async function fetchCandidates(radius: number) {
    if (!userId) return;
    const poolResponse = await fetch(`${API_BASE_URL}/discovery/proximity?userId=${userId}&maxDistanceKm=${radius}`);
    const data = await poolResponse.json();
    if (Array.isArray(data)) {
      setCandidates(data);
      setState('ready');
    } else {
      setErrorMessage(data.error ?? 'Erreur inconnue');
      setState('error');
    }
  }

  function handleRadiusChange(nextRadius: number) {
    setRadiusKm(nextRadius);
  }

  function handleRadiusChangeEnd(nextRadius: number) {
    setRadiusKm(nextRadius);
    fetchCandidates(nextRadius).catch(() => setState('error'));
    if (userId) {
      fetch(`${API_BASE_URL}/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxDistanceKm: nextRadius }),
      }).catch(() => {});
    }
  }

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

        const initialRadius = user.maxDistanceKm ?? DEFAULT_RADIUS_KM;
        setRadiusKm(initialRadius);

        const permission = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (!permission.granted) {
          setState('permission-denied');
          return;
        }

        let position;
        try {
          position = await Location.getCurrentPositionAsync({});
        } catch {
          if (!cancelled) {
            setErrorMessage(
              "Impossible d'obtenir ta position. Vérifie que les Services de localisation sont activés sur ton appareil (Réglages système > Confidentialité et sécurité > Service de localisation) et pour ton navigateur."
            );
            setState('error');
          }
          return;
        }
        if (cancelled) return;
        setMyLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });

        await fetch(`${API_BASE_URL}/users/${userId}/location`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }),
        });
        if (cancelled) return;

        await fetchCandidates(initialRadius);
      })().catch(() => !cancelled && setState('error'));

      return () => {
        cancelled = true;
      };
    }, [userId, retryToken])
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>À proximité</Text>
      <Text style={styles.description}>Personnes compatibles autour de toi</Text>

      {state === 'ready' && (
        <View style={styles.viewToggle}>
          <Pressable
            style={[styles.viewToggleButton, viewMode === 'map' && styles.viewToggleButtonActive]}
            onPress={() => setViewMode('map')}
            testID="proximity-view-map"
          >
            <Ionicons name="map-outline" size={15} color={viewMode === 'map' ? colors.text : colors.textMuted} />
            <Text style={[styles.viewToggleText, viewMode === 'map' && styles.viewToggleTextActive]}>Carte</Text>
          </Pressable>
          <Pressable
            style={[styles.viewToggleButton, viewMode === 'list' && styles.viewToggleButtonActive]}
            onPress={() => setViewMode('list')}
            testID="proximity-view-list"
          >
            <Ionicons name="list-outline" size={15} color={viewMode === 'list' ? colors.text : colors.textMuted} />
            <Text style={[styles.viewToggleText, viewMode === 'list' && styles.viewToggleTextActive]}>Liste</Text>
          </Pressable>
          <Pressable
            style={[styles.viewToggleButton, viewMode === 'history' && styles.viewToggleButtonActive]}
            onPress={() => setViewMode('history')}
            testID="proximity-view-history"
          >
            <Ionicons name="footsteps-outline" size={15} color={viewMode === 'history' ? colors.text : colors.textMuted} />
            <Text style={[styles.viewToggleText, viewMode === 'history' && styles.viewToggleTextActive]}>
              Croisements
            </Text>
          </Pressable>
        </View>
      )}

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
        <View style={styles.messageBlock}>
          <Text style={styles.message}>
            Autorise l'accès à ta position dans les réglages de ton navigateur/téléphone pour utiliser ce mode.
          </Text>
          <Pressable
            style={styles.button}
            onPress={() => setRetryToken((t) => t + 1)}
            testID="proximity-retry-permission"
          >
            <Text style={styles.buttonText}>Réessayer</Text>
          </Pressable>
        </View>
      )}

      {state === 'error' && <Text style={styles.message}>{errorMessage ?? 'Une erreur est survenue.'}</Text>}

      {state === 'ready' && viewMode === 'map' && (
        <>
          <RadiusSlider
            value={radiusKm}
            min={MIN_RADIUS_KM}
            max={MAX_RADIUS_KM}
            onChange={handleRadiusChange}
            onChangeEnd={handleRadiusChangeEnd}
            testID="proximity-radius-slider"
          />
          {myLocation && (
            <View style={styles.mapWrapper}>
              <ProximityMap
                center={myLocation}
                radiusKm={radiusKm}
                markers={mapMarkers}
                onSelect={openProfileByUserId}
              />
            </View>
          )}
          <View style={styles.legend}>
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, styles.legendDotCrossed]}>
                <Ionicons name="musical-notes" size={9} color={colors.text} />
              </View>
              <Text style={styles.legendText}>Croisé(e) récemment</Text>
            </View>
            <View style={styles.legendRow}>
              <View style={styles.legendDot}>
                <Ionicons name="ellipse" size={6} color={colors.textMuted} />
              </View>
              <Text style={styles.legendText}>À proximité</Text>
            </View>
          </View>
          {candidates.length === 0 && (
            <Text style={styles.message}>Personne de compatible à proximité pour l'instant.</Text>
          )}
        </>
      )}

      {state === 'ready' && viewMode === 'list' && (
        candidates.length === 0 ? (
          <Text style={styles.message}>Personne de compatible à proximité pour l'instant.</Text>
        ) : (
          <FlatList
            style={styles.list}
            data={candidates}
            keyExtractor={(item) => item.userId}
            renderItem={({ item }) => (
              <Pressable
                style={styles.card}
                testID={`proximity-candidate-${item.userId}`}
                onPress={() => openProfile(item)}
              >
                <Text style={styles.cardDistance}>{item.distanceKm} km</Text>
                <Text style={styles.cardScore}>{item.score}% compatible</Text>
                {item.crossedAt !== null && item.crossedDistanceM !== null && (
                  <View style={styles.crossingPill}>
                    <Ionicons name="navigate-circle-outline" size={13} color={colors.accent} />
                    <Text style={styles.crossingPillText}>{formatCrossing(item.crossedAt, item.crossedDistanceM)}</Text>
                  </View>
                )}
              </Pressable>
            )}
          />
        )
      )}

      {state === 'ready' && viewMode === 'history' && (
        <>
          {crossedCandidates.length === 0 ? (
            <Text style={styles.message}>Aucun croisement récent. Reviens plus tard !</Text>
          ) : (
            <FlatList
              style={styles.list}
              data={crossedCandidates}
              keyExtractor={(item) => item.userId}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.card}
                  testID={`proximity-history-${item.userId}`}
                  onPress={() => openProfile(item)}
                >
                  <View style={styles.crossingPill}>
                    <Ionicons name="footsteps" size={13} color={colors.accent} />
                    <Text style={styles.crossingPillText}>{formatCrossing(item.crossedAt, item.crossedDistanceM!)}</Text>
                  </View>
                  <Text style={styles.cardScore}>{item.score}% compatible</Text>
                </Pressable>
              )}
            />
          )}
        </>
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
  viewToggle: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 4,
    marginBottom: 20,
  },
  viewToggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 8,
  },
  viewToggleButtonActive: {
    backgroundColor: colors.primary,
  },
  viewToggleText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  viewToggleTextActive: {
    color: colors.text,
  },
  loader: {
    marginTop: 16,
  },
  mapWrapper: {
    width: '100%',
    maxWidth: 480,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 14,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendDotCrossed: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  legendText: {
    color: colors.textMuted,
    fontSize: 12,
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
  crossingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  crossingPillText: {
    color: colors.accent,
    fontSize: 11,
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
