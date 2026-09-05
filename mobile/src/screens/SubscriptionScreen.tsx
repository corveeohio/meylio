import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import type { PurchasesPackage } from 'react-native-purchases';
import { colors } from '../theme/colors';
import { useUser } from '../context/UserContext';
import { getPremiumPackage, isPurchasesSupported, purchasePremium, restorePurchases } from '../services/purchases';
import { PressableScale } from '../components/PressableScale';
import { EqualizerBars } from '../components/EqualizerBars';
import { MeylioLogo } from '../components/MeylioLogo';
import type { RootStackParamList } from '../navigation/RootNavigator';

const PERKS: { icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { icon: 'heart', label: 'Likes illimités' },
  { icon: 'radio', label: 'Mode proximité' },
  { icon: 'eye', label: 'Voir qui t’a liké' },
  { icon: 'options', label: 'Filtres de recherche avancés' },
];

const FLOATING_NOTES: { top: number; left?: number; right?: number; size: number; opacity: number }[] = [
  { top: 60, left: 24, size: 20, opacity: 0.18 },
  { top: 130, right: 30, size: 14, opacity: 0.14 },
  { top: 300, left: 20, size: 16, opacity: 0.12 },
  { top: 420, right: 24, size: 22, opacity: 0.16 },
];

function VinylGlow() {
  return (
    <View style={styles.vinylGlowWrapper} pointerEvents="none">
      <Svg width={220} height={220} viewBox="0 0 220 220">
        <Defs>
          <RadialGradient id="glow" cx="45%" cy="40%" r="65%">
            <Stop offset="0%" stopColor={colors.primary} stopOpacity={0.55} />
            <Stop offset="70%" stopColor={colors.primaryDark} stopOpacity={0.12} />
            <Stop offset="100%" stopColor={colors.background} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={110} cy={110} r={108} fill="url(#glow)" />
        <Circle cx={110} cy={110} r={90} fill="none" stroke="#FFFFFF22" strokeWidth={1} />
        <Circle cx={110} cy={110} r={64} fill="none" stroke="#FFFFFF1a" strokeWidth={1} />
      </Svg>
    </View>
  );
}

export function SubscriptionScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { userId } = useUser();
  const [pkg, setPkg] = useState<PurchasesPackage | null>(null);
  const [loadingOffer, setLoadingOffer] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    if (!isPurchasesSupported()) {
      setLoadingOffer(false);
      return;
    }
    getPremiumPackage()
      .then(setPkg)
      .finally(() => setLoadingOffer(false));
  }, []);

  async function handleUpgrade() {
    if (!userId || !pkg) return;
    setPurchasing(true);
    try {
      const isNowPremium = await purchasePremium(pkg);
      if (isNowPremium) {
        navigation.navigate('MainTabs');
      }
    } catch (error: any) {
      if (!error?.userCancelled) {
        Alert.alert('Erreur', "L'achat n'a pas pu être finalisé. Réessaie dans un instant.");
      }
    } finally {
      setPurchasing(false);
    }
  }

  async function handleRestore() {
    setRestoring(true);
    try {
      const isNowPremium = await restorePurchases();
      if (isNowPremium) {
        navigation.navigate('MainTabs');
      } else {
        Alert.alert('Aucun achat trouvé', "Aucun abonnement actif n'est associé à ce compte Apple.");
      }
    } catch {
      Alert.alert('Erreur', "Impossible de restaurer tes achats pour le moment. Réessaie dans un instant.");
    } finally {
      setRestoring(false);
    }
  }

  const disabled = purchasing || loadingOffer || !pkg;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1B1230', colors.background]} style={StyleSheet.absoluteFill} />
      <VinylGlow />
      {FLOATING_NOTES.map((note, index) => (
        <Ionicons
          key={index}
          name="musical-note"
          size={note.size}
          color={colors.text}
          style={[
            styles.floatingNote,
            { top: note.top, left: note.left, right: note.right, opacity: note.opacity },
          ]}
        />
      ))}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.logoRow}>
          <MeylioLogo size={22} showWordmark={false} />
        </View>
        <View style={styles.diamondBadge}>
          <LinearGradient colors={colors.gradient} style={styles.diamondBadgeFill}>
            <Ionicons name="diamond" size={36} color={colors.text} />
          </LinearGradient>
        </View>
        <Text style={styles.title}>Meylio Premium</Text>
        <Text style={styles.description}>Débloque tout le potentiel de Meylio</Text>
        <EqualizerBars />

        <View style={styles.perkList}>
          {PERKS.map((perk) => (
            <View key={perk.label} style={styles.perkRow}>
              <LinearGradient
                colors={colors.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.perkIconWrapper}
              >
                <Ionicons name={perk.icon} size={16} color={colors.text} />
              </LinearGradient>
              <Text style={styles.perk}>{perk.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.wavePad}>
          <EqualizerBars />
        </View>

        <PressableScale
          style={styles.buttonWrapper}
          onPress={handleUpgrade}
          disabled={disabled}
          testID="upgrade-submit-button"
        >
          <LinearGradient
            colors={disabled && !loadingOffer && !purchasing ? [colors.surfaceElevated, colors.surfaceElevated] : colors.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.button}
          >
            {purchasing ? (
              <View style={styles.buttonLoadingRow}>
                <ActivityIndicator color={colors.text} />
                <Text style={styles.buttonText}>Achat en cours…</Text>
              </View>
            ) : loadingOffer ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Text style={styles.buttonText}>
                {pkg ? `Passer en Premium — ${pkg.product.priceString}/mois` : 'Indisponible pour le moment'}
              </Text>
            )}
          </LinearGradient>
        </PressableScale>

        <PressableScale onPress={handleRestore} disabled={restoring} testID="restore-purchases-button">
          {restoring ? (
            <ActivityIndicator color={colors.textMuted} size="small" />
          ) : (
            <Text style={styles.restoreText}>Restaurer mes achats</Text>
          )}
        </PressableScale>

        <View style={styles.legalRow}>
          <Text
            style={styles.legalLink}
            onPress={() => Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/')}
            testID="terms-of-use-link"
          >
            Conditions d’utilisation
          </Text>
          <Text style={styles.legalSeparator}>·</Text>
          <Text
            style={styles.legalLink}
            onPress={() => Linking.openURL('https://www.meylio.fr/privacy.html')}
            testID="privacy-policy-link"
          >
            Politique de confidentialité
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  vinylGlowWrapper: {
    position: 'absolute',
    top: 30,
    alignSelf: 'center',
  },
  floatingNote: {
    position: 'absolute',
  },
  logoRow: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  diamondBadge: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  diamondBadgeFill: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 6,
    textAlign: 'center',
  },
  description: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 18,
  },
  perkList: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 20,
    gap: 16,
    marginTop: 28,
  },
  perkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  perkIconWrapper: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  perk: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '500',
    flexShrink: 1,
  },
  wavePad: {
    marginTop: 24,
    marginBottom: 8,
    opacity: 0.6,
  },
  buttonWrapper: {
    width: '100%',
    maxWidth: 320,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    width: '100%',
  },
  buttonLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  buttonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  restoreText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 18,
    textDecorationLine: 'underline',
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
  },
  legalLink: {
    color: colors.textFaint,
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  legalSeparator: {
    color: colors.textFaint,
    fontSize: 12,
  },
});
