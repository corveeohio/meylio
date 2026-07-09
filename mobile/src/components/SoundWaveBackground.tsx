import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Rect } from 'react-native-svg';
import { colors } from '../theme/colors';

const BAR_HEIGHTS = [18, 34, 52, 30, 46, 60, 40, 24, 48, 36, 20, 44, 58, 32, 26, 50, 38, 22];

export function SoundWaveBackground() {
  return (
    <View style={styles.container} pointerEvents="none">
      <LinearGradient
        colors={[colors.primary + '33', 'transparent']}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.7, y: 0.6 }}
        style={styles.glowTop}
      />
      <LinearGradient
        colors={['transparent', colors.accent + '22']}
        start={{ x: 0.3, y: 0.4 }}
        end={{ x: 1, y: 1 }}
        style={styles.glowBottom}
      />
      <Svg style={styles.waves} width="100%" height={90} viewBox="0 0 360 90" preserveAspectRatio="none">
        {BAR_HEIGHTS.map((height, index) => (
          <Rect
            key={index}
            x={index * 20 + 4}
            y={90 - height}
            width={8}
            height={height}
            rx={4}
            fill={colors.primary}
            fillOpacity={0.12}
          />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  glowTop: {
    position: 'absolute',
    top: -80,
    left: -60,
    width: 360,
    height: 360,
    borderRadius: 360,
  },
  glowBottom: {
    position: 'absolute',
    bottom: -100,
    right: -80,
    width: 320,
    height: 320,
    borderRadius: 320,
  },
  waves: {
    position: 'absolute',
    bottom: 0,
    left: 0,
  },
});
