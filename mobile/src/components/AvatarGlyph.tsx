import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Rect } from 'react-native-svg';
import { colors } from '../theme/colors';

type Props = { variant: 'a' | 'b' };

/**
 * Note de musique générique (jamais une vraie photo) utilisée partout où
 * l'app a besoin de représenter "quelqu'un" sans révéler de visage réel —
 * écran de match notamment, où aucune photo ne doit apparaître avant le reveal.
 */
export function AvatarGlyph({ variant }: Props) {
  const gradientColors: [string, string] =
    variant === 'a' ? [colors.primary, colors.accent] : [colors.accent, colors.primaryDark];

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <Svg width="58%" height="58%" viewBox="0 0 200 200">
        <Rect x="118" y="30" width="16" height="118" rx="4" fill={colors.text} />
        <Path
          d="M134,30 C168,38 178,66 150,84 L150,64 C166,56 162,44 134,40 Z"
          fill={colors.text}
        />
        <Path
          d="M100,150 C100,163 88,174 73,174 C58,174 46,163 46,150 C46,137 58,126 73,126 C79,126 85,128 89,131 L89,60 L118,50 L118,72 L100,79 Z"
          fill={colors.text}
        />
      </Svg>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
