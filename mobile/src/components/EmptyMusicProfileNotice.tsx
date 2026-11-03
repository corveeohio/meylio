import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { PressableScale } from './PressableScale';
import type { RootStackParamList } from '../navigation/RootNavigator';

/** Header the API sets on feeds when the viewer's own music profile has no genre nor artist. */
export const EMPTY_MUSIC_PROFILE_HEADER = 'X-Meylio-Empty-Music-Profile';

export function isMusicProfileEmpty(response: Response): boolean {
  return response.headers.get(EMPTY_MUSIC_PROFILE_HEADER) === '1';
}

/**
 * Banner above a feed while the viewer's music profile is empty. The feed still shows
 * underneath: the banner only explains why scores are low and how to fix it.
 */
export function EmptyMusicProfileNotice() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return (
    <PressableScale
      scaleTo={0.98}
      style={styles.banner}
      onPress={() => navigation.navigate('MusicConnect')}
      testID="fill-music-profile-banner"
    >
      <Ionicons name="musical-notes" size={20} color={colors.primary} />
      <View style={styles.texts}>
        <Text style={styles.title}>Complète tes goûts musicaux</Text>
        <Text style={styles.text}>Pour voir ta vraie compatibilité avec chaque profil.</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    maxWidth: 480,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  texts: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  text: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
});
