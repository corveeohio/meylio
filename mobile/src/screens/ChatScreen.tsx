import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { API_BASE_URL } from '../config/api';
import { useUser } from '../context/UserContext';
import { PressableScale } from '../components/PressableScale';
import { ScreenStub } from './ScreenStub';
import { buildPlaylistMessage, parsePlaylistMessage, trackSearchUrl, type MusicService } from '../utils/playlistMessage';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = RouteProp<RootStackParamList, 'Chat'>;

// A shared playlist shows its first tracks; the rest unfolds on tap to keep bubbles short.
const PLAYLIST_PREVIEW_COUNT = 3;

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

type OtherUserInfo = {
  displayName: string | null;
  age: number | null;
  city: string | null;
  distanceKm: number | null;
};

export function ChatScreen() {
  const route = useRoute<Props>();

  if (!route.params) {
    return <ScreenStub title="Chat" description="Messagerie post-match" />;
  }

  return (
    <ChatConversation
      matchId={route.params.matchId}
      otherUserId={route.params.otherUserId}
      initialDraft={route.params.initialDraft}
    />
  );
}

function ChatConversation({
  matchId,
  otherUserId,
  initialDraft,
}: {
  matchId: string;
  otherUserId: string;
  initialDraft?: string;
}) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { userId } = useUser();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState(initialDraft ?? '');
  const [sending, setSending] = useState(false);
  const [revealState, setRevealState] = useState<RevealState | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [confirmingLeave, setConfirmingLeave] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [otherUser, setOtherUser] = useState<OtherUserInfo | null>(null);
  // Tracks shared in the chat open in the service the viewer uses.
  const [myService, setMyService] = useState<MusicService>('apple_music');
  const [expandedPlaylists, setExpandedPlaylists] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) return;
    fetch(`${API_BASE_URL}/users/${userId}`)
      .then((response) => response.json())
      .then((data) => data.musicProfile?.source === 'spotify' && setMyService('spotify'))
      .catch(() => {});
  }, [userId]);
  const [icebreaker, setIcebreaker] = useState<{ required: boolean; total: number; answered: number; answeredAll: boolean } | null>(null);
  const autoOpenedQuiz = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadOtherUser = useCallback(() => {
    if (!userId) return;
    fetch(`${API_BASE_URL}/users/${otherUserId}?relativeToUserId=${userId}`)
      .then((response) => response.json())
      .then((data) =>
        setOtherUser({ displayName: data.displayName ?? null, age: data.age ?? null, city: data.city ?? null, distanceKm: data.distanceKm ?? null })
      )
      .catch(() => {});
  }, [otherUserId, userId]);

  useEffect(() => {
    navigation.setOptions({ title: otherUser?.displayName ?? 'Conversation' });
  }, [navigation, otherUser?.displayName]);

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

  const loadIcebreakerStatus = useCallback(() => {
    if (!userId) return;
    fetch(`${API_BASE_URL}/matches/${matchId}/icebreaker-status?userId=${userId}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((status) => {
        if (!status) return;
        setIcebreaker(status);
        if (status.required && !status.answeredAll && !autoOpenedQuiz.current) {
          autoOpenedQuiz.current = true;
          navigation.navigate('Icebreaker', { matchId, otherUserId });
        }
      })
      .catch(() => {});
  }, [matchId, otherUserId, userId, navigation]);

  useFocusEffect(
    useCallback(() => {
      loadIcebreakerStatus();
      loadMessages();
      loadRevealState();
      loadOtherUser();
      markAsRead();
      pollRef.current = setInterval(() => {
        loadIcebreakerStatus();
        loadMessages();
        loadRevealState();
        markAsRead();
      }, 3000);
      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
      };
    }, [loadIcebreakerStatus, loadMessages, loadRevealState, loadOtherUser, markAsRead])
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

  // Returns false when the server refused the message (icebreaker not answered, block…).
  async function sendContent(content: string): Promise<boolean> {
    if (!userId) return false;
    setSending(true);
    try {
      const response = await fetch(`${API_BASE_URL}/messages/${matchId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderId: userId, content }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        Alert.alert('Message non envoyé', data.message ?? data.error ?? "Impossible d'envoyer ton message.");
        loadIcebreakerStatus();
        return false;
      }
      loadMessages();
      return true;
    } finally {
      setSending(false);
    }
  }

  async function handleSend() {
    const content = draft.trim();
    if (content.length === 0) return;
    setDraft('');
    if (!(await sendContent(content))) setDraft(content);
  }

  async function shareMyPlaylist() {
    if (!userId) return;
    try {
      const response = await fetch(`${API_BASE_URL}/music/my-playlist?userId=${userId}`);
      const data = await response.json();
      if (!Array.isArray(data.tracks) || data.tracks.length === 0) {
        Alert.alert('Playlist vide', 'Connecte Spotify ou Apple Music, ou ajoute des artistes, pour partager ta playlist.');
        return;
      }
      await sendContent(buildPlaylistMessage(data.tracks));
    } catch {
      Alert.alert('Erreur', 'Impossible de préparer ta playlist pour le moment.');
    }
  }

  async function remixOurPlaylist() {
    if (!userId) return;
    try {
      const response = await fetch(`${API_BASE_URL}/matches/${matchId}/playlist/remix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (!response.ok) throw new Error('remix failed');
      navigation.navigate('Playlist', { matchId });
    } catch {
      Alert.alert('Erreur', 'Impossible de mélanger vos playlists pour le moment.');
    }
  }

  function openMusicActions() {
    Alert.alert('Musique', undefined, [
      { text: 'Partager ma playlist', onPress: shareMyPlaylist },
      { text: 'Mélanger nos playlists', onPress: remixOurPlaylist },
      { text: 'Annuler', style: 'cancel' },
    ]);
  }

  const otherLocationLine = otherUser
    ? [otherUser.city, otherUser.distanceKm !== null ? `à ${otherUser.distanceKm} km` : null].filter(Boolean).join(' · ')
    : '';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {otherUser && (otherUser.displayName || otherLocationLine) && (
        <View style={styles.otherUserHeader}>
          <Text style={styles.otherUserName} numberOfLines={1}>
            {[otherUser.displayName, otherUser.age !== null ? String(otherUser.age) : null].filter(Boolean).join(', ')}
          </Text>
          {otherLocationLine.length > 0 && (
            <View style={styles.otherUserLocation}>
              <Ionicons name="location" size={11} color={colors.textMuted} />
              <Text style={styles.otherUserLocationText}>{otherLocationLine}</Text>
            </View>
          )}
        </View>
      )}
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

      {!confirmingLeave && (
        <PressableScale
          style={styles.icebreakerBanner}
          onPress={() => navigation.navigate('Icebreaker', { matchId, otherUserId })}
          testID="open-icebreaker-button"
        >
          <Ionicons name="musical-notes" size={16} color={colors.primary} />
          <Text style={styles.icebreakerBannerText}>Quiz icebreaker — répondez à quelques questions</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </PressableScale>
      )}

      {!confirmingLeave && (
        <PressableScale
          style={styles.icebreakerBanner}
          onPress={() => navigation.navigate('Playlist', { matchId })}
          testID="open-playlist-button"
        >
          <Ionicons name="headset" size={16} color={colors.primary} />
          <Text style={styles.icebreakerBannerText}>Votre playlist commune — écouter et partager</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </PressableScale>
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
          const playlistTracks = parsePlaylistMessage(item.content);
          return (
            <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
              {playlistTracks ? (
                <View testID={`playlist-message-${item.id}`}>
                  <View style={styles.playlistHeader}>
                    <Ionicons name="headset" size={16} color={colors.text} />
                    <Text style={styles.playlistTitle}>{isMine ? 'Ma playlist' : 'Sa playlist'}</Text>
                  </View>
                  {(expandedPlaylists.has(item.id) ? playlistTracks : playlistTracks.slice(0, PLAYLIST_PREVIEW_COUNT)).map((track, index) => (
                    <Pressable
                      key={`${track}-${index}`}
                      style={styles.playlistTrack}
                      onPress={() => Linking.openURL(trackSearchUrl(track, myService)).catch(() => {})}
                    >
                      <Ionicons name="play-circle" size={16} color={colors.text} />
                      <Text style={styles.playlistTrackText} numberOfLines={1}>
                        {track}
                      </Text>
                    </Pressable>
                  ))}
                  {playlistTracks.length > PLAYLIST_PREVIEW_COUNT && (
                    <Pressable
                      style={styles.playlistTrack}
                      onPress={() =>
                        setExpandedPlaylists((current) => {
                          const next = new Set(current);
                          if (next.has(item.id)) next.delete(item.id);
                          else next.add(item.id);
                          return next;
                        })
                      }
                      testID={`playlist-toggle-${item.id}`}
                    >
                      <Ionicons
                        name={expandedPlaylists.has(item.id) ? 'chevron-up' : 'ellipsis-horizontal'}
                        size={16}
                        color={colors.text}
                      />
                      <Text style={styles.playlistMoreText}>
                        {expandedPlaylists.has(item.id)
                          ? 'Réduire'
                          : `+ ${playlistTracks.length - PLAYLIST_PREVIEW_COUNT} titres`}
                      </Text>
                    </Pressable>
                  )}
                </View>
              ) : (
                <Text style={styles.bubbleText}>{item.content}</Text>
              )}
            </View>
          );
        }}
      />
      {icebreaker?.required && !icebreaker.answeredAll ? (
        <View style={styles.lockedBlock} testID="chat-locked-block">
          <Text style={styles.lockedText}>
            Réponds d'abord au quiz icebreaker ({icebreaker.answered}/{icebreaker.total}) pour pouvoir écrire.
          </Text>
          <PressableScale
            style={styles.lockedButton}
            onPress={() => navigation.navigate('Icebreaker', { matchId, otherUserId })}
            testID="locked-open-icebreaker-button"
          >
            <Ionicons name="musical-notes" size={16} color={colors.text} />
            <Text style={styles.lockedButtonText}>Répondre au quiz</Text>
          </PressableScale>
        </View>
      ) : (
      <View style={styles.inputRow}>
        <PressableScale onPress={openMusicActions} disabled={sending} style={styles.musicButton} testID="chat-music-button">
          <Ionicons name="musical-notes" size={20} color={colors.primary} />
        </PressableScale>
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
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  lockedBlock: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.surface,
    alignItems: 'center',
    gap: 12,
  },
  lockedText: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
  lockedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 12,
  },
  lockedButtonText: { color: colors.text, fontSize: 14, fontWeight: '700' },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  otherUserHeader: {
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 10,
    paddingHorizontal: 16,
  },
  otherUserName: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  otherUserLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  otherUserLocationText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
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
  icebreakerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: colors.surface,
  },
  icebreakerBannerText: {
    flex: 1,
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
  playlistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  playlistTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  playlistTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  playlistTrackText: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
  },
  playlistMoreText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.85,
  },
  musicButton: {
    width: 44,
    borderRadius: 10,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
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
