import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { API_BASE_URL } from '../config/api';
import { useUser } from '../context/UserContext';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = RouteProp<RootStackParamList, 'Report'>;

const REASONS = [
  'Faux profil',
  'Contenu inapproprié',
  'Comportement harcelant',
  'Spam ou arnaque',
  'Autre',
];

export function ReportScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<Props>();
  const { userId } = useUser();
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [blocking, setBlocking] = useState(false);

  async function handleSubmit() {
    if (!selectedReason || !userId) return;
    setSubmitting(true);
    try {
      await fetch(`${API_BASE_URL}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reporterId: userId,
          reportedId: route.params.reportedUserId,
          reason: selectedReason,
        }),
      });
      Alert.alert('Merci', 'Cette personne est bloquée et ne te sera plus proposée.');
      navigation.navigate('MainTabs');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d’envoyer le signalement pour le moment.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleBlock() {
    if (!userId) return;
    setBlocking(true);
    try {
      await fetch(`${API_BASE_URL}/blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockerId: userId, blockedId: route.params.reportedUserId }),
      });
      Alert.alert('Bloqué', 'Cette personne ne pourra plus te contacter ni voir ton profil.');
      navigation.navigate('MainTabs');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de bloquer ce profil pour le moment.');
    } finally {
      setBlocking(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Signaler ce profil</Text>
      <Text style={styles.description}>
        Un signalement bloque automatiquement cette personne : vous ne pourrez plus vous voir ni vous écrire.
      </Text>

      <View style={styles.reasonGroup}>
        {REASONS.map((reason) => {
          const selected = selectedReason === reason;
          return (
            <Pressable
              key={reason}
              onPress={() => setSelectedReason(reason)}
              style={[styles.reasonChip, selected && styles.reasonChipSelected]}
              testID={`report-reason-${reason}`}
            >
              <Text style={[styles.reasonText, selected && styles.reasonTextSelected]}>{reason}</Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        style={styles.button}
        onPress={handleSubmit}
        disabled={!selectedReason || submitting}
        testID="report-submit-button"
      >
        {submitting ? (
          <ActivityIndicator color={colors.text} />
        ) : (
          <Text style={styles.buttonText}>Envoyer le signalement</Text>
        )}
      </Pressable>

      <View style={styles.divider} />

      <Text style={styles.blockHint}>
        Tu peux aussi bloquer cette personne directement, sans déposer de signalement.
      </Text>
      <Pressable
        style={styles.blockButton}
        onPress={handleBlock}
        disabled={blocking}
        testID="block-user-button"
      >
        {blocking ? (
          <ActivityIndicator color={colors.text} />
        ) : (
          <Text style={styles.blockButtonText}>Bloquer sans signaler</Text>
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
    marginBottom: 24,
  },
  reasonGroup: {
    width: '100%',
    maxWidth: 320,
    gap: 10,
    marginBottom: 24,
  },
  reasonChip: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  reasonChipSelected: {
    backgroundColor: colors.primary,
  },
  reasonText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  reasonTextSelected: {
    color: colors.text,
    fontWeight: '600',
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
  divider: {
    width: '100%',
    maxWidth: 320,
    height: 1,
    backgroundColor: colors.surface,
    marginVertical: 24,
  },
  blockHint: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 12,
    maxWidth: 320,
  },
  blockButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.error,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  blockButtonText: {
    color: colors.error,
    fontSize: 15,
    fontWeight: '600',
  },
});
