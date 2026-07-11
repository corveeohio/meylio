import { useEffect } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { colors } from '../theme/colors';

type Props = {
  style?: StyleProp<ViewStyle>;
};

export function SkeletonBlock({ style }: Props) {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Animated.View style={[{ backgroundColor: colors.surface, borderRadius: 8 }, style, animatedStyle]} />;
}

export function SkeletonCard({ style }: Props) {
  return (
    <View style={[{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 10 }, style]}>
      <SkeletonBlock style={{ width: '60%', height: 16, marginBottom: 10 }} />
      <SkeletonBlock style={{ width: '85%', height: 13 }} />
    </View>
  );
}
