import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { PurchasesPackage } from 'react-native-purchases';
import { colors } from '../theme/colors';
import { useUser } from '../context/UserContext';
import { getPremiumPackage, isPurchasesSupported, purchasePremium } from '../services/purchases';
import type { RootStackParamList } from '../navigation/RootNavigator';

const PERKS = [
  'Likes illimités',
  'Mode proximité',
  'Voir qui t’a liké',
  'Filtres de recherche avancés',
];

export function SubscriptionScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { userId } = useUser();
  const [pkg, setPkg] = useState<PurchasesPackage | null>(null);
  const [loadingOffer, setLoadingOffer] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

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

  const disabled = purchasing || loadingOffer || !pkg;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Meylio Premium</Text>
      <Text style={styles.description}>Débloque tout le potentiel de Meylio</Text>

      <View style={styles.perkList}>
        {PERKS.map((perk) => (
          <Text key={perk} style={styles.perk}>
            ✓ {perk}
          </Text>
        ))}
      </View>

      <Pressable style={styles.button} onPress={handleUpgrade} disabled={disabled} testID="upgrade-submit-button">
        {purchasing || loadingOffer ? (
          <ActivityIndicator color={colors.text} />
        ) : (
          <Text style={styles.buttonText}>
            {pkg ? `Passer en Premium — ${pkg.product.priceString}/mois` : 'Indisponible pour le moment'}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  perkList: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 20,
    gap: 12,
    marginBottom: 24,
  },
  perk: {
    color: colors.text,
    fontSize: 15,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  buttonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
});
