import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
import { colors } from '../theme/colors';

const BAR_COUNT = 20;

function Bar({ index }: { index: number }) {
  const height = useSharedValue(10);

  useEffect(() => {
    height.value = withDelay(
      index * 55,
      withRepeat(
        withTiming(16 + Math.random() * 54, {
          duration: 400 + Math.random() * 420,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true
      )
    );
  }, []);

  const style = useAnimatedStyle(() => ({ height: height.value }));

  return (
    <Animated.View
      style={[styles.bar, style, { backgroundColor: index % 2 === 0 ? colors.primary : colors.accent }]}
    />
  );
}

export function EqualizerBars() {
  return (
    <View style={styles.row} pointerEvents="none">
      {Array.from({ length: BAR_COUNT }).map((_, index) => (
        <Bar key={index} index={index} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 5,
    height: 70,
    opacity: 0.55,
  },
  bar: {
    width: 6,
    borderRadius: 3,
  },
});
