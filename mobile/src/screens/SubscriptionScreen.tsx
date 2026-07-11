import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { API_BASE_URL } from '../config/api';
import { useUser } from '../context/UserContext';
import type { RootStackParamList } from '../navigation/RootNavigator';

const PERKS = [
  'Likes illimités',
  'Mode proximité',
  'Voir qui t’a liké',
  'Filtres de recherche avancés',
];

export function SubscriptionScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { userId } = useUser();
  const [upgrading, setUpgrading] = useState(false);

  async function handleUpgrade() {
    if (!userId) return;
    setUpgrading(true);
    try {
      await fetch(`${API_BASE_URL}/users/${userId}/upgrade`, { method: 'POST' });
      navigation.navigate('MainTabs');
    } finally {
      setUpgrading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Meylio Premium</Text>
      <Text style={styles.description}>Débloque tout le potentiel de Meylio</Text>

      <View style={styles.perkList}>
        {PERKS.map((perk) => (
          <Text key={perk} style={styles.perk}>
            ✓ {perk}
          </Text>
        ))}
      </View>

      <Pressable style={styles.button} onPress={handleUpgrade} disabled={upgrading} testID="upgrade-submit-button">
        {upgrading ? (
          <ActivityIndicator color={colors.text} />
        ) : (
          <Text style={styles.buttonText}>Passer en Premium</Text>
        )}
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
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  perkList: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 20,
    gap: 12,
    marginBottom: 24,
  },
  perk: {
    color: colors.text,
    fontSize: 15,
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
});
