import { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
import { colors } from '../theme/colors';

const NOTE_COUNT = 16;
const NOTE_ICONS = ['musical-note', 'musical-notes'] as const;
const NOTE_COLORS = [colors.primary, colors.accent, '#FFFFFF'];

function FloatingNote({ index }: { index: number }) {
  const progress = useSharedValue(0);
  const startX = useMemo(() => (Math.random() - 0.5) * 300, []);
  const drift = useMemo(() => (Math.random() - 0.5) * 70, []);
  const riseDistance = useMemo(() => 320 + Math.random() * 200, []);
  const size = useMemo(() => 16 + Math.random() * 16, []);
  const icon = NOTE_ICONS[index % NOTE_ICONS.length];
  const color = NOTE_COLORS[index % NOTE_COLORS.length];

  useEffect(() => {
    progress.value = withDelay(
      Math.random() * 1400,
      withRepeat(
        withTiming(1, { duration: 2600 + Math.random() * 1400, easing: Easing.out(Easing.ease) }),
        -1,
        false
      )
    );
  }, []);

  const style = useAnimatedStyle(() => {
    const fadeIn = Math.min(progress.value / 0.15, 1);
    const fadeOut = 1 - Math.max((progress.value - 0.75) / 0.25, 0);
    return {
      opacity: Math.min(fadeIn, fadeOut),
      transform: [
        { translateX: startX + progress.value * drift },
        { translateY: -progress.value * riseDistance },
        { rotate: `${(progress.value - 0.5) * 50}deg` },
      ],
    };
  });

  return (
    <Animated.View style={[{ position: 'absolute', bottom: 0, left: '50%' }, style]}>
      <Ionicons name={icon} size={size} color={color} />
    </Animated.View>
  );
}

export function MusicNoteBurst() {
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="none">
      {Array.from({ length: NOTE_COUNT }).map((_, index) => (
        <FloatingNote key={index} index={index} />
      ))}
    </View>
  );
}
