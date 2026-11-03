import { ScrollView, StyleSheet, Text } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { MatchPlaylist } from '../components/MatchPlaylist';
import type { RootStackParamList } from '../navigation/RootNavigator';

export function PlaylistScreen() {
  const { matchId } = useRoute<RouteProp<RootStackParamList, 'Playlist'>>().params;
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Votre playlist commune</Text>
      <Text style={styles.description}>Composée à partir de vos titres et artistes préférés à tous les deux.</Text>
      <MatchPlaylist matchId={matchId} />
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
    paddingBottom: 48,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 6,
  },
  description: {
    color: colors.textMuted,
    fontSize: 14,
    marginBottom: 16,
  },
});
