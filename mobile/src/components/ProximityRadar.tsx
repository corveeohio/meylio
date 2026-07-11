import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { hashToAngle } from '../utils/proximityRadarMath';
import type { CompatibilityBreakdown } from '../types/compatibility';

export type RadarCandidate = {
  userId: string;
  distanceKm: number;
  score: number;
  breakdown: CompatibilityBreakdown;
  crossedAt: string | null;
  crossedDistanceM: number | null;
};

const MARKER_SIZE = 40;
const MIN_RADIUS_PX = 46;

type Props = {
  candidates: RadarCandidate[];
  radiusKm: number;
  onSelect: (candidate: RadarCandidate) => void;
};

export function ProximityRadar({ candidates, radiusKm, onSelect }: Props) {
  const { width } = useWindowDimensions();
  const size = Math.min(340, width - 48);
  const center = size / 2;
  const maxRadius = center - 30;

  const sweep = useSharedValue(0);
  sweep.value = withRepeat(withTiming(360, { duration: 4000, easing: Easing.linear }), -1, false);
  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${sweep.value}deg` }],
  }));

  const points = useMemo(
    () =>
      candidates.map((candidate, index) => {
        const angleDeg = hashToAngle(candidate.userId);
        const angleRad = (angleDeg * Math.PI) / 180;
        const ratio = Math.min(1, candidate.distanceKm / radiusKm);
        const radiusPx = MIN_RADIUS_PX + (maxRadius - MIN_RADIUS_PX) * ratio;
        const x = center + radiusPx * Math.cos(angleRad);
        const y = center + radiusPx * Math.sin(angleRad);
        return { candidate, x, y, index };
      }),
    [candidates, radiusKm, center, maxRadius]
  );

  return (
    <View style={styles.wrapper}>
      <View style={[styles.radar, { width: size, height: size, borderRadius: size / 2 }]} testID="proximity-radar">
        <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
          <Circle cx={center} cy={center} r={maxRadius} stroke={colors.border} strokeWidth={1} fill="none" />
          <Circle cx={center} cy={center} r={maxRadius * 0.66} stroke={colors.border} strokeWidth={1} fill="none" />
          <Circle cx={center} cy={center} r={maxRadius * 0.33} stroke={colors.border} strokeWidth={1} fill="none" />
        </Svg>

        <Animated.View style={[styles.sweep, { width: size, height: size }, sweepStyle]} pointerEvents="none">
          <View style={[styles.sweepLine, { height: center }]} />
        </Animated.View>

        <Text style={[styles.ringLabel, { left: center - 14, top: center - maxRadius - 14 }]}>{radiusKm} km</Text>
        <Text style={[styles.ringLabel, { left: center - 14, top: center - maxRadius * 0.66 - 14 }]}>
          {Math.round(radiusKm * 0.66)} km
        </Text>
        <Text style={[styles.ringLabel, { left: center - 14, top: center - maxRadius * 0.33 - 14 }]}>
          {Math.round(radiusKm * 0.33)} km
        </Text>

        <View style={[styles.centerDot, { left: center - 18, top: center - 18 }]} testID="radar-center">
          <Ionicons name="person" size={16} color={colors.text} />
        </View>

        {points.map(({ candidate, x, y, index }) => (
          <RadarMarker key={candidate.userId} candidate={candidate} x={x} y={y} index={index} onSelect={onSelect} />
        ))}
      </View>
      <View style={styles.legend}>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, styles.markerCrossed]}>
            <Ionicons name="musical-notes" size={9} color={colors.text} />
          </View>
          <Text style={styles.legendText}>Croisé(e) récemment</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={styles.legendDot}>
            <Ionicons name="ellipse" size={6} color={colors.textMuted} />
          </View>
          <Text style={styles.legendText}>À proximité</Text>
        </View>
      </View>
      <Text style={styles.hint}>Touche un point pour voir le profil</Text>
    </View>
  );
}

function RadarMarker({
  candidate,
  x,
  y,
  index,
  onSelect,
}: {
  candidate: RadarCandidate;
  x: number;
  y: number;
  index: number;
  onSelect: (candidate: RadarCandidate) => void;
}) {
  const crossed = candidate.crossedAt !== null;
  const appear = useSharedValue(0);
  const ping = useSharedValue(0);

  const delay = Math.min(index, 8) * 90;
  appear.value = withDelay(delay, withTiming(1, { duration: 320, easing: Easing.out(Easing.back(1.6)) }));
  ping.value = withDelay(
    delay,
    withSequence(withTiming(1, { duration: 650, easing: Easing.out(Easing.ease) }), withTiming(0, { duration: 0 }))
  );

  const markerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: appear.value }],
    opacity: appear.value,
  }));
  const pingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + ping.value * 1.4 }],
    opacity: (1 - ping.value) * 0.5,
  }));

  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.ping,
          crossed && styles.pingCrossed,
          { left: x - MARKER_SIZE / 2, top: y - MARKER_SIZE / 2 },
          pingStyle,
        ]}
      />
      <Animated.View
        style={[styles.marker, crossed && styles.markerCrossed, { left: x - MARKER_SIZE / 2, top: y - MARKER_SIZE / 2 }, markerStyle]}
      >
        <Pressable
          onPress={() => onSelect(candidate)}
          style={styles.markerPressable}
          testID={`radar-marker-${candidate.userId}`}
        >
          <Ionicons name={crossed ? 'musical-notes' : 'ellipse'} size={crossed ? 15 : 8} color={colors.text} />
          <Text style={styles.markerScore}>{candidate.score}%</Text>
        </Pressable>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  radar: {
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  sweep: {
    position: 'absolute',
    left: 0,
    top: 0,
    alignItems: 'center',
  },
  sweepLine: {
    width: 2,
    backgroundColor: colors.primary,
    opacity: 0.35,
  },
  ringLabel: {
    position: 'absolute',
    color: colors.textFaint,
    fontSize: 10,
  },
  centerDot: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  ping: {
    position: 'absolute',
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    borderRadius: MARKER_SIZE / 2,
    borderWidth: 2,
    borderColor: colors.border,
  },
  pingCrossed: {
    borderColor: colors.accent,
  },
  marker: {
    position: 'absolute',
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    borderRadius: MARKER_SIZE / 2,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 2,
    borderColor: colors.border,
  },
  markerPressable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerCrossed: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  markerScore: {
    color: colors.text,
    fontSize: 8,
    fontWeight: '700',
  },
  legend: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 14,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  hint: {
    marginTop: 10,
    color: colors.textMuted,
    fontSize: 12,
  },
});
