import { StyleSheet, View } from 'react-native';
import Svg, { Ellipse, G, Line } from 'react-native-svg';
import { colors } from '../theme/colors';

type Props = { seed: string };

const VB_WIDTH = 400;
const VB_HEIGHT = 220;
const NOTE_COLORS = [colors.primary, colors.accent, colors.primaryDark];
// Bandes hautes/basses uniquement, pour laisser le centre libre pour le score.
const BANDS: [number, number][] = [
  [14, 46],
  [174, 206],
];

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seedValue: number) {
  let a = seedValue;
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Motif de notes de musique généré de façon déterministe à partir de l'id
 * utilisateur : chaque profil garde toujours le même motif, sans photo.
 */
export function MusicIdentityPattern({ seed }: Props) {
  const random = mulberry32(hashSeed(seed));
  const noteCount = 8;
  const notes = Array.from({ length: noteCount }, (_, i) => {
    const isTopBand = i % 2 === 0;
    const [bandStart, bandEnd] = BANDS[i % BANDS.length];
    // La bande du haut évite le coin gauche, réservé au logo Meylio.
    const xStart = isTopBand ? 110 : 24;
    const x = xStart + random() * (VB_WIDTH - 24 - xStart);
    const y = bandStart + random() * (bandEnd - bandStart);
    const scale = 0.7 + random() * 0.6;
    const color = NOTE_COLORS[Math.floor(random() * NOTE_COLORS.length)];
    const flip = random() > 0.5;
    return { x, y, scale, color, flip, key: i };
  });

  return (
    <View style={styles.container} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox={`0 0 ${VB_WIDTH} ${VB_HEIGHT}`} preserveAspectRatio="xMidYMid slice">
        <Line x1={0} y1={110} x2={VB_WIDTH} y2={110} stroke={colors.text} strokeOpacity={0.08} strokeWidth={1} />
        {notes.map(({ x, y, scale, color, flip, key }) => {
          const stemDir = flip ? -1 : 1;
          const headRx = 8 * scale;
          const headRy = 6 * scale;
          const stemHeight = 30 * scale;
          return (
            <G key={key}>
              <Line
                x1={x + headRx * 0.85}
                y1={y}
                x2={x + headRx * 0.85}
                y2={y - stemHeight * stemDir}
                stroke={color}
                strokeWidth={2.2}
                strokeOpacity={0.55}
              />
              <Ellipse cx={x} cy={y} rx={headRx} ry={headRy} fill={color} fillOpacity={0.55} />
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
});
