import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRoute, type RouteProp } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { API_BASE_URL } from '../config/api';
import { useUser } from '../context/UserContext';
import { PressableScale } from '../components/PressableScale';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = RouteProp<RootStackParamList, 'Icebreaker'>;

type Question = {
  id: string;
  prompt: string;
  order: number;
  myAnswer: string | null;
  otherAnswer: string | null;
  bothAnswered: boolean;
};

export function IcebreakerQuizScreen() {
  const route = useRoute<Props>();
  const { matchId, otherUserId } = route.params;
  const { userId } = useUser();
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [otherName, setOtherName] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadQuestions = useCallback(() => {
    if (!userId) return;
    fetch(`${API_BASE_URL}/matches/${matchId}/icebreaker?userId=${userId}`)
      .then((response) => response.json())
      .then((data) => Array.isArray(data) && setQuestions(data))
      .catch(() => {});
  }, [matchId, userId]);

  useFocusEffect(
    useCallback(() => {
      loadQuestions();
      fetch(`${API_BASE_URL}/users/${otherUserId}`)
        .then((response) => response.json())
        .then((data) => setOtherName(data.displayName ?? null))
        .catch(() => {});
      pollRef.current = setInterval(loadQuestions, 3000);
      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
      };
    }, [loadQuestions, otherUserId])
  );

  async function handleAnswer(questionId: string) {
    const answer = (drafts[questionId] ?? '').trim();
    if (!answer || !userId) return;
    setSubmittingId(questionId);
    try {
      await fetch(`${API_BASE_URL}/matches/${matchId}/icebreaker/${questionId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, answer }),
      });
      setDrafts((current) => ({ ...current, [questionId]: '' }));
      loadQuestions();
    } finally {
      setSubmittingId(null);
    }
  }

  if (!questions) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.intro}>
        <Ionicons name="musical-notes" size={22} color={colors.primary} />
        <Text style={styles.introTitle}>Brisez la glace</Text>
        <Text style={styles.introText}>
          Répondez chacun·e à ces questions. Vos réponses ne s'affichent qu'une fois que vous avez tous les deux
          répondu.
        </Text>
      </View>

      {questions.map((question) => (
        <View key={question.id} style={styles.card} testID={`icebreaker-question-${question.id}`}>
          <Text style={styles.prompt}>{question.prompt}</Text>

          {question.bothAnswered ? (
            <View style={styles.answerBlock}>
              <View style={styles.answerRow}>
                <Text style={styles.answerLabel}>Toi</Text>
                <Text style={styles.answerText}>{question.myAnswer}</Text>
              </View>
              <View style={styles.answerRow}>
                <Text style={styles.answerLabel}>{otherName ?? 'L’autre'}</Text>
                <Text style={styles.answerText}>{question.otherAnswer}</Text>
              </View>
            </View>
          ) : question.myAnswer ? (
            <View style={styles.waitingBlock}>
              <Text style={styles.answerText}>{question.myAnswer}</Text>
              <View style={styles.waitingPill}>
                <Ionicons name="time-outline" size={13} color={colors.textMuted} />
                <Text style={styles.waitingText}>En attente de sa réponse…</Text>
              </View>
            </View>
          ) : (
            <View style={styles.inputRow}>
              <TextInput
                value={drafts[question.id] ?? ''}
                onChangeText={(text) => setDrafts((current) => ({ ...current, [question.id]: text }))}
                onSubmitEditing={() => handleAnswer(question.id)}
                placeholder="Ta réponse…"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                testID={`icebreaker-answer-input-${question.id}`}
              />
              <PressableScale
                style={styles.answerButton}
                onPress={() => handleAnswer(question.id)}
                disabled={submittingId === question.id}
                testID={`icebreaker-answer-button-${question.id}`}
              >
                {submittingId === question.id ? (
                  <ActivityIndicator color={colors.text} size="small" />
                ) : (
                  <Ionicons name="arrow-forward" size={18} color={colors.text} />
                )}
              </PressableScale>
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 48,
    gap: 14,
  },
  intro: {
    alignItems: 'center',
    marginBottom: 8,
  },
  introTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 6,
  },
  introText: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
  },
  prompt: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 14,
  },
  answerButton: {
    width: 42,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waitingBlock: {
    gap: 8,
  },
  waitingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  waitingText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  answerBlock: {
    gap: 10,
  },
  answerRow: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 10,
    padding: 10,
  },
  answerLabel: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  answerText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 19,
  },
});
