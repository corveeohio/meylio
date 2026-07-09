import { useCallback, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { API_BASE_URL } from '../config/api';
import { useUser } from '../context/UserContext';
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
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadMessages = useCallback(() => {
    fetch(`${API_BASE_URL}/messages/${matchId}`)
      .then((response) => response.json())
      .then((data) => Array.isArray(data) && setMessages(data))
      .catch(() => {});
  }, [matchId]);

  useFocusEffect(
    useCallback(() => {
      loadMessages();
      pollRef.current = setInterval(loadMessages, 3000);
      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
      };
    }, [loadMessages])
  );

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
      <Pressable
        style={styles.reportBar}
        onPress={() => navigation.navigate('Report', { reportedUserId: otherUserId })}
        testID="report-chat-link"
      >
        <Text style={styles.reportBarText}>Signaler / Bloquer</Text>
      </Pressable>
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
        <Pressable onPress={handleSend} disabled={sending} style={styles.sendButton} testID="chat-send-button">
          <Text style={styles.sendButtonText}>Envoyer</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  reportBar: {
    padding: 10,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  reportBarText: {
    color: colors.textMuted,
    fontSize: 12,
    textDecorationLine: 'underline',
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
