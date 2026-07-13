import { useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

const THUMB_SIZE = 22;

type Props = {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  onChangeEnd: (value: number) => void;
  testID?: string;
};

function valueToRatio(value: number, min: number, max: number): number {
  return Math.min(1, Math.max(0, (value - min) / (max - min)));
}

export function RadiusSlider({ value, min, max, onChange, onChangeEnd, testID }: Props) {
  const [trackWidth, setTrackWidth] = useState(0);
  const translateX = useSharedValue(0);
  const startX = useSharedValue(0);

  function handleLayout(event: LayoutChangeEvent) {
    const width = event.nativeEvent.layout.width;
    setTrackWidth(width);
    translateX.value = valueToRatio(value, min, max) * width;
  }

  function commit(x: number, width: number, fireEnd: boolean) {
    const ratio = width > 0 ? Math.min(1, Math.max(0, x / width)) : 0;
    const nextValue = Math.round(min + ratio * (max - min));
    if (fireEnd) onChangeEnd(nextValue);
    else onChange(nextValue);
  }

  const pan = Gesture.Pan()
    .onStart(() => {
      startX.value = translateX.value;
    })
    .onUpdate((event) => {
      const next = Math.min(trackWidth, Math.max(0, startX.value + event.translationX));
      translateX.value = next;
      runOnJS(commit)(next, trackWidth, false);
    })
    .onEnd(() => {
      runOnJS(commit)(translateX.value, trackWidth, true);
    });

  const tap = Gesture.Tap().onEnd((event) => {
    const next = Math.min(trackWidth, Math.max(0, event.x));
    translateX.value = withTiming(next, { duration: 150 });
    runOnJS(commit)(next, trackWidth, true);
  });

  const gesture = Gesture.Race(pan, tap);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value - THUMB_SIZE / 2 }],
  }));
  const fillStyle = useAnimatedStyle(() => ({
    width: translateX.value,
  }));

  return (
    <View style={styles.wrapper} testID={testID}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>Rayon de recherche</Text>
        <Text style={styles.value}>{value} km</Text>
      </View>
      <GestureDetector gesture={gesture}>
        <View style={styles.track} onLayout={handleLayout}>
          <Animated.View style={[styles.fill, fillStyle]} />
          <Animated.View style={[styles.thumb, thumbStyle]} testID={`${testID}-thumb`}>
            <Ionicons name="musical-note" size={12} color={colors.primary} />
          </Animated.View>
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    maxWidth: 320,
    marginBottom: 24,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  label: {
    color: colors.textMuted,
    fontSize: 13,
  },
  value: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  fill: {
    position: 'absolute',
    left: 0,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  thumb: {
    position: 'absolute',
    left: 0,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: colors.text,
    borderWidth: 3,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
