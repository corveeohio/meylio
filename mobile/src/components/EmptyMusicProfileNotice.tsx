import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { PressableScale } from './PressableScale';
import type { RootStackParamList } from '../navigation/RootNavigator';

/** Error code the API returns when the viewer's own music profile has no genre nor artist. */
export const EMPTY_MUSIC_PROFILE_ERROR = 'empty_music_profile';

/**
 * Shown instead of a feed while the viewer's own music profile is empty: without tastes
 * every compatibility would read 0 %, so the only useful action is to fill them in.
 */
export function EmptyMusicProfileNotice() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return (
    <View style={styles.container}>
      <Ionicons name="musical-notes-outline" size={44} color={colors.primary} />
      <Text style={styles.title}>Ton profil musical est vide</Text>
      <Text style={styles.text}>
        Sans tes goûts, impossible de calculer ta compatibilité avec les autres. Connecte Spotify ou Apple Music, ou
        choisis tes genres et artistes à la main.
      </Text>
      <PressableScale
        style={styles.button}
        onPress={() => navigation.navigate('MusicConnect')}
        testID="fill-music-profile-button"
      >
        <Text style={styles.buttonText}>Compléter mes goûts</Text>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    gap: 12,
    marginTop: 32,
    paddingHorizontal: 8,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  text: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
    marginTop: 8,
  },
  buttonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
});
