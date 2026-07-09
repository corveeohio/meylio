import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { API_BASE_URL } from '../config/api';
import { useUser } from '../context/UserContext';
import type { RootStackParamList } from '../navigation/RootNavigator';

type UserProfile = {
  email: string;
  subscriptionStatus: 'free' | 'premium';
  locationOptIn: boolean;
};

export function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { userId } = useUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [updatingLocation, setUpdatingLocation] = useState(false);

  const loadProfile = useCallback(() => {
    if (!userId) return;
    fetch(`${API_BASE_URL}/users/${userId}`)
      .then((response) => response.json())
      .then(setProfile)
      .catch(() => {});
  }, [userId]);

  useFocusEffect(loadProfile);

  async function toggleLocationOptIn(value: boolean) {
    if (!userId || !profile) return;
    setUpdatingLocation(true);
    setProfile({ ...profile, locationOptIn: value });
    try {
      await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationOptIn: value }),
      });
    } finally {
      setUpdatingLocation(false);
    }
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Paramètres</Text>

      <View style={styles.block}>
        <Text style={styles.blockLabel}>Compte</Text>
        <Text style={styles.value}>{profile.email}</Text>
      </View>

      <View style={styles.block}>
        <Text style={styles.blockLabel}>Abonnement</Text>
        <Text style={styles.value}>{profile.subscriptionStatus === 'premium' ? 'Premium' : 'Gratuit'}</Text>
      </View>

      <View style={[styles.block, styles.row]}>
        <View style={styles.rowText}>
          <Text style={styles.blockLabel}>Géolocalisation</Text>
          <Text style={styles.rowDescription}>Active le mode proximité</Text>
        </View>
        <Switch
          value={profile.locationOptIn}
          onValueChange={toggleLocationOptIn}
          disabled={updatingLocation}
          testID="location-opt-in-switch"
        />
      </View>

      {profile.subscriptionStatus === 'free' && (
        <Pressable
          style={styles.button}
          onPress={() => navigation.navigate('Subscription')}
          testID="upgrade-button"
        >
          <Text style={styles.buttonText}>Passer en Premium</Text>
        </Pressable>
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
    marginBottom: 24,
    textAlign: 'center',
  },
  block: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowText: {
    flex: 1,
  },
  rowDescription: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  blockLabel: {
    color: colors.textMuted,
    fontSize: 12,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  value: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    marginTop: 12,
  },
  buttonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
});
