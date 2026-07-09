import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { ScreenStub } from './ScreenStub';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = RouteProp<RootStackParamList, 'Match'>;

export function MatchScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<Props>();

  if (!route.params) {
    return (
      <ScreenStub
        title="C'est un match !"
        description="Photo débloquée, playlist collaborative et icebreaker générés"
        buttons={[{ label: 'Ouvrir le chat', route: 'Chat' }]}
      />
    );
  }

  const { matchId, otherUserId, score, breakdown, playlist, icebreaker } = route.params;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.headline}>C'est un match !</Text>
      <Text style={styles.score}>{score}% de compatibilité</Text>

      {(breakdown.sharedGenres.length > 0 || breakdown.sharedArtists.length > 0) && (
        <Text style={styles.shared}>
          En commun : {[...breakdown.sharedGenres, ...breakdown.sharedArtists].join(', ')}
        </Text>
      )}

      <View style={styles.block}>
        <Text style={styles.blockLabel}>Icebreaker</Text>
        <Text style={styles.icebreaker}>{icebreaker}</Text>
      </View>

      <View style={styles.block}>
        <Text style={styles.blockLabel}>Playlist collaborative</Text>
        {playlist.map((track, index) => (
          <Text key={`${track}-${index}`} style={styles.track}>
            {index + 1}. {track}
          </Text>
        ))}
      </View>

      <Pressable
        style={styles.button}
        onPress={() => navigation.navigate('Chat', { matchId, otherUserId })}
        testID="open-chat-button"
      >
        <Text style={styles.buttonText}>Ouvrir le chat</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 24,
    paddingTop: 60,
    alignItems: 'center',
  },
  headline: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  score: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  shared: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
  },
  block: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  blockLabel: {
    color: colors.textMuted,
    fontSize: 12,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  icebreaker: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 20,
  },
  track: {
    color: colors.text,
    fontSize: 14,
    marginBottom: 4,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    marginTop: 8,
  },
  buttonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
});
