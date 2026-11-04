import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Constants from 'expo-constants';
import { colors } from '../theme/colors';
import { API_BASE_URL } from '../config/api';
import { useUser } from '../context/UserContext';
import { PressableScale } from '../components/PressableScale';

const RATING_LABELS = ['', 'Décevante', 'Peut mieux faire', 'Correcte', 'Très bien', 'Je l’adore'];

export function FeedbackScreen() {
  const navigation = useNavigation();
  const { userId } = useUser();
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  async function sendFeedback() {
    if (message.trim().length === 0) {
      Alert.alert('Ton avis est vide', 'Écris quelques mots : une idée, un bug, ce qui te plaît ou pas.');
      return;
    }
    setSending(true);
    try {
      const response = await fetch(`${API_BASE_URL}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          rating: rating || undefined,
          message,
          appVersion: Constants.expoConfig?.version,
        }),
      });
      if (!response.ok) throw new Error('feedback failed');
      Alert.alert('Merci 🎧', 'Ton avis a bien été envoyé à l’équipe Meylio. Il nous aide à améliorer l’app.');
      navigation.goBack();
    } catch {
      Alert.alert('Erreur', 'Impossible d’envoyer ton avis pour le moment. Réessaie dans un instant.');
    } finally {
      setSending(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Donne ton avis</Text>
        <Text style={styles.description}>
          Une idée, un bug, quelque chose qui te plaît ou t’agace ? Chaque message est lu par l’équipe et aide à améliorer
          Meylio.
        </Text>

        <Text style={styles.label}>Ta note</Text>
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((value) => (
            <Pressable key={value} onPress={() => setRating(value)} hitSlop={6} testID={`feedback-star-${value}`}>
              <Ionicons name={value <= rating ? 'star' : 'star-outline'} size={34} color={colors.primary} />
            </Pressable>
          ))}
        </View>
        <Text style={styles.ratingLabel}>{RATING_LABELS[rating] || 'Optionnel'}</Text>

        <Text style={styles.label}>Ton message</Text>
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="J’aimerais pouvoir…"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          multiline
          maxLength={2000}
          textAlignVertical="top"
          testID="feedback-message-input"
        />

        <PressableScale style={styles.button} onPress={sendFeedback} disabled={sending} testID="feedback-send-button">
          {sending ? <ActivityIndicator color={colors.text} /> : <Text style={styles.buttonText}>Envoyer mon avis</Text>}
        </PressableScale>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 24,
    paddingBottom: 48,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  description: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  stars: {
    flexDirection: 'row',
    gap: 10,
  },
  ratingLabel: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 6,
    marginBottom: 24,
  },
  input: {
    minHeight: 140,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    color: colors.text,
    fontSize: 15,
    marginBottom: 24,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
});
