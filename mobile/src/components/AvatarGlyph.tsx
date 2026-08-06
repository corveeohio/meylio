import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';
import { colors } from '../theme/colors';

type Props = { variant: 'a' | 'b' };

const FACE_COLOR = '#2A2036';

/**
 * Silhouette générique (jamais une vraie photo) utilisée partout où l'app a
 * besoin de représenter "quelqu'un" sans révéler de visage réel — écran de
 * match notamment, où aucune photo ne doit apparaître avant le reveal.
 */
export function AvatarGlyph({ variant }: Props) {
  const gradientColors: [string, string] =
    variant === 'a' ? [colors.primary, colors.accent] : [colors.accent, colors.primaryDark];

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <Svg width="100%" height="100%" viewBox="0 0 200 200">
        {variant === 'a' ? (
          <>
            <Path d="M60,87 Q60,40 100,40 Q140,40 140,87 L140,100 Q100,80 60,100 Z" fill={FACE_COLOR} />
            <Rect x="85" y="127" width="30" height="30" rx="10" fill={FACE_COLOR} />
            <Ellipse cx="100" cy="90" rx="37" ry="42" fill={FACE_COLOR} />
            <Circle cx="63" cy="92" r="6" fill={FACE_COLOR} />
            <Circle cx="137" cy="92" r="6" fill={FACE_COLOR} />
            <Circle cx="85" cy="88" r="4" fill={colors.text} />
            <Circle cx="115" cy="88" r="4" fill={colors.text} />
            <Path d="M85,108 Q100,120 115,108" stroke={colors.text} strokeWidth={3.3} fill="none" strokeLinecap="round" />
          </>
        ) : (
          <>
            <Path d="M58,87 Q58,157 73,173 L73,100 Z" fill={FACE_COLOR} />
            <Path d="M142,87 Q142,157 127,173 L127,100 Z" fill={FACE_COLOR} />
            <Rect x="85" y="127" width="30" height="30" rx="10" fill={FACE_COLOR} />
            <Ellipse cx="100" cy="90" rx="35" ry="40" fill={FACE_COLOR} />
            <Circle cx="64" cy="92" r="5.3" fill={FACE_COLOR} />
            <Circle cx="136" cy="92" r="5.3" fill={FACE_COLOR} />
            <Path d="M63,78 Q100,50 137,78 Q137,63 100,60 Q63,63 63,78 Z" fill={FACE_COLOR} />
            <Circle cx="86" cy="90" r="3.7" fill={colors.text} />
            <Circle cx="114" cy="90" r="3.7" fill={colors.text} />
            <Path d="M87,109 Q100,117 113,109" stroke={colors.text} strokeWidth={3} fill="none" strokeLinecap="round" />
          </>
        )}
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
