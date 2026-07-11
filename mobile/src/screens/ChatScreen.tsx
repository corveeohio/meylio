import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { API_BASE_URL } from '../config/api';
import { useUser } from '../context/UserContext';
import { PressableScale } from '../components/PressableScale';
import { ScreenStub } from './ScreenStub';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = RouteProp<RootStackParamList, 'Chat'>;

type ChatMessage = {
  id: string;
  matchId: string;
  senderId: string;
  content: string;
  createdAt: string;
};

type RevealState = {
  revealedByMe: boolean;
  revealedByOther: boolean;
  otherPhotos: string[];
};

export function ChatScreen() {
  const route = useRoute<Props>();

  if (!route.params) {
    return <ScreenStub title="Chat" description="Messagerie post-match" />;
  }

  return <ChatConversation matchId={route.params.matchId} otherUserId={route.params.otherUserId} />;
}

function ChatConversation({ matchId, otherUserId }: { matchId: string; otherUserId: string }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { userId } = useUser();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [revealState, setRevealState] = useState<RevealState | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [confirmingLeave, setConfirmingLeave] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadMessages = useCallback(() => {
    fetch(`${API_BASE_URL}/messages/${matchId}`)
      .then((response) => response.json())
      .then((data) => Array.isArray(data) && setMessages(data))
      .catch(() => {});
  }, [matchId]);

  const loadRevealState = useCallback(() => {
    if (!userId) return;
    fetch(`${API_BASE_URL}/matches/${matchId}/photos?userId=${userId}`)
      .then((response) => response.json())
      .then((data) => setRevealState(data))
      .catch(() => {});
  }, [matchId, userId]);

  async function handleToggleReveal(next: boolean) {
    if (!userId) return;
    setRevealing(true);
    try {
      const response = await fetch(`${API_BASE_URL}/matches/${matchId}/reveal-photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, revealed: next }),
      });
      const data = await response.json();
      setRevealState(data);
    } finally {
      setRevealing(false);
    }
  }

  const markAsRead = useCallback(() => {
    if (!userId) return;
    fetch(`${API_BASE_URL}/matches/${matchId}/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    }).catch(() => {});
  }, [matchId, userId]);

  useFocusEffect(
    useCallback(() => {
      loadMessages();
      loadRevealState();
      markAsRead();
      pollRef.current = setInterval(() => {
        loadMessages();
        loadRevealState();
        markAsRead();
      }, 3000);
      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
      };
    }, [loadMessages, loadRevealState, markAsRead])
  );

  async function handleLeaveMatch() {
    if (!userId) return;
    setLeaving(true);
    try {
      await fetch(`${API_BASE_URL}/matches/${matchId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      navigation.navigate('MainTabs');
    } finally {
      setLeaving(false);
    }
  }

  async function handleSend() {
    const content = draft.trim();
    if (content.length === 0 || !userId) return;
    setSending(true);
    setDraft('');
    try {
      await fetch(`${API_BASE_URL}/messages/${matchId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderId: userId, content }),
      });
      loadMessages();
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={styles.container}>
      {!confirmingLeave ? (
        <View style={styles.topBar}>
          <Pressable
            onPress={() => navigation.navigate('Report', { reportedUserId: otherUserId })}
            testID="report-chat-link"
          >
            <Text style={styles.reportBarText}>Signaler / Bloquer</Text>
          </Pressable>
          <Text style={styles.topBarSeparator}>·</Text>
          <Pressable onPress={() => setConfirmingLeave(true)} testID="leave-match-link">
            <Text style={styles.reportBarText}>Quitter la conversation</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.leaveConfirmBlock}>
          <Text style={styles.leaveConfirmText}>
            Le match sera supprimé pour vous deux. Vous pourrez matcher à nouveau plus tard si vous vous likez de
            nouveau.
          </Text>
          <View style={styles.leaveConfirmRow}>
            <Pressable
              style={styles.leaveCancelButton}
              onPress={() => setConfirmingLeave(false)}
              testID="cancel-leave-match-button"
            >
              <Text style={styles.leaveCancelButtonText}>Annuler</Text>
            </Pressable>
            <Pressable
              style={styles.leaveConfirmButton}
              onPress={handleLeaveMatch}
              disabled={leaving}
              testID="confirm-leave-match-button"
            >
              {leaving ? (
                <ActivityIndicator color={colors.text} size="small" />
              ) : (
                <Text style={styles.leaveConfirmButtonText}>Quitter</Text>
              )}
            </Pressable>
          </View>
        </View>
      )}

      {revealState?.revealedByOther && revealState.otherPhotos.length > 0 && (
        <View style={styles.revealedBlock}>
          <Text style={styles.revealedLabel}>Profil débloqué</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.revealedRow}>
            {revealState.otherPhotos.map((photo) => (
              <Image key={photo} source={{ uri: `${API_BASE_URL}${photo}` }} style={styles.revealedPhoto} />
            ))}
          </ScrollView>
        </View>
      )}

      {revealState && (
        <PressableScale
          style={[styles.revealButton, revealState.revealedByMe && styles.revealButtonActive]}
          onPress={() => handleToggleReveal(!revealState.revealedByMe)}
          disabled={revealing}
          testID="reveal-profile-button"
        >
          <Ionicons
            name={revealState.revealedByMe ? 'lock-open-outline' : 'eye-outline'}
            size={16}
            color={revealState.revealedByMe ? colors.success : colors.primary}
          />
          <Text style={[styles.revealButtonText, revealState.revealedByMe && styles.revealButtonTextActive]}>
            {revealing
              ? 'Envoi…'
              : revealState.revealedByMe
                ? 'Profil débloqué — appuie pour reverrouiller'
                : 'Débloquer mon profil'}
          </Text>
        </PressableScale>
      )}

      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isMine = item.senderId === userId;
          return (
            <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
              <Text style={styles.bubbleText}>{item.content}</Text>
            </View>
          );
        }}
      />
      <View style={styles.inputRow}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={handleSend}
          placeholder="Écris un message…"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          testID="chat-input"
        />
        <PressableScale onPress={handleSend} disabled={sending} style={styles.sendButton} testID="chat-send-button">
          <Text style={styles.sendButtonText}>Envoyer</Text>
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  topBarSeparator: {
    color: colors.textMuted,
    fontSize: 12,
  },
  reportBarText: {
    color: colors.textMuted,
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  leaveConfirmBlock: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  leaveConfirmText: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
  },
  leaveConfirmRow: {
    flexDirection: 'row',
    gap: 8,
  },
  leaveCancelButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  leaveCancelButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  leaveConfirmButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: colors.error,
  },
  leaveConfirmButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  revealedBlock: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  revealedLabel: {
    color: colors.textMuted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  revealedRow: {
    gap: 8,
  },
  revealedPhoto: {
    width: 72,
    height: 72,
    borderRadius: 12,
  },
  revealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  revealButtonText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  revealButtonActive: {
    borderColor: colors.success,
  },
  revealButtonTextActive: {
    color: colors.success,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 8,
  },
  bubble: {
    maxWidth: '75%',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 4,
  },
  bubbleMine: {
    backgroundColor: colors.primary,
    alignSelf: 'flex-end',
  },
  bubbleTheirs: {
    backgroundColor: colors.surface,
    alignSelf: 'flex-start',
  },
  bubbleText: {
    color: colors.text,
    fontSize: 15,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.surface,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.text,
  },
  sendButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 10,
  },
  sendButtonText: {
    color: colors.text,
    fontWeight: '600',
  },
});
