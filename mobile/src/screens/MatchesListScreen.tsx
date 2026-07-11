import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { API_BASE_URL } from '../config/api';
import { useUser } from '../context/UserContext';
import { PressableScale } from '../components/PressableScale';
import { SkeletonCard } from '../components/Skeleton';
import type { RootStackParamList } from '../navigation/RootNavigator';

type MatchListItem = {
  id: string;
  userAId: string;
  userBId: string;
  compatibilityScore: number;
  unreadCount: number;
  lastMessage: { content: string; senderId: string } | null;
};

export function MatchesListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { userId } = useUser();
  const [matches, setMatches] = useState<MatchListItem[] | null>(null);

  const loadMatches = useCallback(() => {
    if (!userId) return;
    fetch(`${API_BASE_URL}/matches?userId=${userId}`)
      .then((response) => response.json())
      .then((data) => Array.isArray(data) && setMatches(data))
      .catch(() => {});
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      loadMatches();
    }, [loadMatches])
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Conversations</Text>

      {!matches && (
        <View style={styles.list}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      )}
      {matches && matches.length === 0 && (
        <Text style={styles.empty}>Aucun match pour l’instant.</Text>
      )}

      <FlatList
        style={styles.list}
        data={matches ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const otherUserId = item.userAId === userId ? item.userBId : item.userAId;
          return (
            <PressableScale
              scaleTo={0.98}
              style={styles.card}
              testID={`match-${item.id}`}
              onPress={() => navigation.navigate('Chat', { matchId: item.id, otherUserId })}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardScore}>{item.compatibilityScore}% compatible</Text>
                {item.unreadCount > 0 && (
                  <View style={styles.badge} testID={`unread-badge-${item.id}`}>
                    <Text style={styles.badgeText}>{item.unreadCount}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.cardPreview} numberOfLines={1}>
                {item.lastMessage ? item.lastMessage.content : 'Dites bonjour pour démarrer la conversation'}
              </Text>
            </PressableScale>
          );
        }}
      />
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
    marginBottom: 16,
    textAlign: 'center',
  },
  loader: {
    marginTop: 16,
  },
  empty: {
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardScore: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  cardPreview: {
    color: colors.textMuted,
    fontSize: 13,
  },
  badge: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
});
