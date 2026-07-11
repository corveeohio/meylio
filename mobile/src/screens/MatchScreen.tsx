import { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../theme/colors';
import { API_BASE_URL } from '../config/api';
import { useUser } from '../context/UserContext';
import { PressableScale } from '../components/PressableScale';
import { MusicNoteBurst } from '../components/MusicNoteBurst';
import { EqualizerBars } from '../components/EqualizerBars';
import { ScreenStub } from './ScreenStub';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = RouteProp<RootStackParamList, 'Match'>;
type MatchParams = Exclude<RootStackParamList['Match'], undefined>;

const AVATAR_SIZE = 140;

export function MatchScreen() {
  const route = useRoute<Props>();

  if (!route.params) {
    return (
      <ScreenStub
        title="C'est un match !"
        description="Playlist collaborative et icebreaker générés, chat débloqué"
        buttons={[{ label: 'Ouvrir le chat', route: 'Chat' }]}
      />
    );
  }

  return <MatchCelebration {...route.params} />;
}

function MatchCelebration({ matchId, otherUserId, score, breakdown, playlist, icebreaker }: MatchParams) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { userId } = useUser();
  const { height: screenHeight } = useWindowDimensions();
  const [ownPhoto, setOwnPhoto] = useState<string | null>(null);

  const glowScale = useSharedValue(0.85);
  const leftX = useSharedValue(-220);
  const rightX = useSharedValue(220);
  const leftRotate = useSharedValue(-28);
  const rightRotate = useSharedValue(28);
  const collisionScale = useSharedValue(1);
  const idlePulse = useSharedValue(1);
  const badgeProgress = useSharedValue(0);
  const hintProgress = useSharedValue(0);
  const hintBounce = useSharedValue(0);

  useEffect(() => {
    if (!userId) return;
    fetch(`${API_BASE_URL}/users/${userId}`)
      .then((response) => response.json())
      .then((data) => setOwnPhoto(data.photos?.[0] ?? null))
      .catch(() => {});
  }, [userId]);

  useEffect(() => {
    glowScale.value = withRepeat(withTiming(1.15, { duration: 1600, easing: Easing.inOut(Easing.ease) }), -1, true);

    leftX.value = withSpring(-46, { damping: 16, stiffness: 140 });
    rightX.value = withSpring(46, { damping: 16, stiffness: 140 });
    leftRotate.value = withSpring(-9, { damping: 16, stiffness: 140 });
    rightRotate.value = withSpring(9, { damping: 16, stiffness: 140 });
    collisionScale.value = withDelay(
      340,
      withSequence(withTiming(1.18, { duration: 100 }), withSpring(1, { damping: 7, stiffness: 170 }))
    );
    idlePulse.value = withDelay(
      900,
      withRepeat(
        withSequence(
          withTiming(1.045, { duration: 620, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 620, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      )
    );
    badgeProgress.value = withDelay(420, withSpring(1, { damping: 11, stiffness: 140 }));
    hintProgress.value = withDelay(1000, withTiming(1, { duration: 400 }));
    hintBounce.value = withDelay(
      1000,
      withRepeat(
        withSequence(
          withTiming(8, { duration: 550, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 550, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      )
    );
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
  }));

  const leftAvatarStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: leftX.value },
      { rotate: `${leftRotate.value}deg` },
      { scale: collisionScale.value * idlePulse.value },
    ],
  }));

  const rightAvatarStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: rightX.value },
      { rotate: `${rightRotate.value}deg` },
      { scale: collisionScale.value * idlePulse.value },
    ],
  }));

  const badgeStyle = useAnimatedStyle(() => ({
    opacity: badgeProgress.value,
    transform: [{ scale: badgeProgress.value }],
  }));

  const hintStyle = useAnimatedStyle(() => ({
    opacity: hintProgress.value,
    transform: [{ translateY: hintBounce.value }],
  }));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={[styles.hero, { minHeight: screenHeight - 40 }]}>
        <Animated.View style={[styles.glow, glowStyle]}>
          <LinearGradient
            colors={[colors.primary, 'transparent']}
            start={{ x: 0.5, y: 0.5 }}
            end={{ x: 1, y: 1 }}
            style={styles.glowGradient}
          />
        </Animated.View>

        <MusicNoteBurst />

        <View style={styles.avatarStage}>
          <Animated.View style={[styles.avatarCircle, styles.avatarLeft, leftAvatarStyle]}>
            {ownPhoto ? (
              <Image source={{ uri: `${API_BASE_URL}${ownPhoto}` }} style={styles.avatarImage} />
            ) : (
              <LinearGradient colors={colors.gradient} style={styles.avatarImage}>
                <Ionicons name="person" size={40} color={colors.text} />
              </LinearGradient>
            )}
          </Animated.View>
          <Animated.View style={[styles.avatarCircle, styles.avatarRight, rightAvatarStyle]}>
            <LinearGradient colors={[colors.accent, colors.primary]} style={styles.avatarImage}>
              <Ionicons name="musical-notes" size={38} color={colors.text} />
            </LinearGradient>
          </Animated.View>
        </View>

        <Animated.View style={badgeStyle}>
          <Text style={styles.headline}>C'est un match !</Text>
          <Text style={styles.score}>{score}% de compatibilité</Text>
          {(breakdown.sharedGenres.length > 0 || breakdown.sharedArtists.length > 0) && (
            <Text style={styles.shared}>
              En commun : {[...breakdown.sharedGenres, ...breakdown.sharedArtists].join(', ')}
            </Text>
          )}
        </Animated.View>

        <View style={styles.heroSpacer} />

        <EqualizerBars />
        <Animated.View style={hintStyle}>
          <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
          <Text style={styles.hintText}>Icebreaker &amp; playlist</Text>
        </Animated.View>
      </View>

      <View style={styles.content}>
        <View style={styles.block}>
          <Text style={styles.blockLabel}>Icebreaker</Text>
          <Text style={styles.icebreaker}>{icebreaker}</Text>
        </View>

        <View style={styles.block}>
          <Text style={styles.blockLabel}>Playlist collaborative</Text>
          {playlist.map((track, index) => (
            <Text key={`${track}-${index}`} style={styles.track}>
              {index + 1}. {track}
            </Text>
          ))}
        </View>

        <PressableScale
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('Icebreaker', { matchId, otherUserId })}
          testID="open-icebreaker-from-match-button"
        >
          <Text style={styles.secondaryButtonText}>Répondre au quiz icebreaker</Text>
        </PressableScale>

        <PressableScale
          style={styles.button}
          onPress={() => navigation.navigate('Chat', { matchId, otherUserId })}
          testID="open-chat-button"
        >
          <Text style={styles.buttonText}>Ouvrir le chat</Text>
        </PressableScale>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  hero: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
    paddingBottom: 24,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    top: '14%',
    width: 220,
    height: 220,
    borderRadius: 110,
    opacity: 0.22,
  },
  glowGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 210,
  },
  avatarStage: {
    width: '100%',
    height: 170,
    marginBottom: 20,
  },
  avatarCircle: {
    position: 'absolute',
    top: 0,
    left: '50%',
    marginLeft: -AVATAR_SIZE / 2,
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 4,
    borderColor: colors.background,
    overflow: 'hidden',
  },
  avatarLeft: {
    zIndex: 2,
  },
  avatarRight: {
    zIndex: 1,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headline: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  score: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  shared: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 280,
  },
  heroSpacer: {
    flex: 1,
    minHeight: 20,
  },
  hintText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
  content: {
    padding: 24,
    paddingTop: 8,
    paddingBottom: 48,
    alignItems: 'center',
  },
  block: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  blockLabel: {
    color: colors.textMuted,
    fontSize: 12,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  icebreaker: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 20,
  },
  track: {
    color: colors.text,
    fontSize: 14,
    marginBottom: 4,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    marginTop: 8,
  },
  buttonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    marginTop: 16,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
});
