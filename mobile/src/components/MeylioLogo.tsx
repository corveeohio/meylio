import { StyleSheet, Text, View } from 'react-native';
import Svg, { ClipPath, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { colors } from '../theme/colors';

const HEART_PATH =
  'M12,21.35 L10.55,20.03 C5.4,15.36 2,12.28 2,8.5 C2,5.42 4.42,3 7.5,3 C9.24,3 10.91,3.81 12,5.09 C13.09,3.81 14.76,3 16.5,3 C19.58,3 22,5.42 22,8.5 C22,12.28 18.6,15.36 13.45,20.04 L12,21.35 Z';

const BARS = [
  { x: 6.5, width: 1.6, height: 5, y: 13.5 },
  { x: 9, width: 1.6, height: 8, y: 10.5 },
  { x: 11.5, width: 1.6, height: 11, y: 7.5 },
  { x: 14, width: 1.6, height: 7, y: 11.5 },
  { x: 16.5, width: 1.6, height: 4.5, y: 14 },
];

type Props = {
  size?: number;
  showWordmark?: boolean;
  wordmarkColor?: string;
};

export function MeylioLogo({ size = 40, showWordmark = true, wordmarkColor = colors.text }: Props) {
  return (
    <View style={styles.row}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Defs>
          <LinearGradient id="meylioGradient" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors.primary} />
            <Stop offset="1" stopColor={colors.accent} />
          </LinearGradient>
          <ClipPath id="heartClip">
            <Path d={HEART_PATH} />
          </ClipPath>
        </Defs>
        <Path d={HEART_PATH} fill="url(#meylioGradient)" />
        {BARS.map((bar) => (
          <Rect
            key={bar.x}
            x={bar.x}
            y={bar.y}
            width={bar.width}
            height={bar.height}
            rx={0.8}
            fill={colors.background}
            fillOpacity={0.55}
            clipPath="url(#heartClip)"
          />
        ))}
      </Svg>
      {showWordmark && (
        <Text style={[styles.wordmark, { color: wordmarkColor, fontSize: size * 0.55 }]}>Meylio</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  wordmark: {
    fontWeight: '800',
    letterSpacing: -0.5,
  },
});
