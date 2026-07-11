import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CommonActions, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { API_BASE_URL } from '../config/api';
import { useUser } from '../context/UserContext';
import { PressableScale } from '../components/PressableScale';
import { resolveOnboardingRoute } from '../navigation/resolveOnboardingRoute';
import type { RootStackParamList } from '../navigation/RootNavigator';

export function TermsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { userId, hasDisplayName, hasMusicProfile, hasPhotos, hasBasicInfo, setHasAcceptedTerms } = useUser();
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleContinue() {
    if (!userId || !checked) return;
    setSubmitting(true);
    try {
      await fetch(`${API_BASE_URL}/users/${userId}/accept-terms`, { method: 'POST' });
      setHasAcceptedTerms(true);
      const nextRoute = resolveOnboardingRoute({
        hasAcceptedTerms: true,
        hasDisplayName,
        hasMusicProfile,
        hasPhotos,
        hasBasicInfo,
      });
      navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: nextRoute }] }));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Avant de continuer</Text>
        <Text style={styles.intro}>
          Meylio est réservé aux personnes de 18 ans et plus. Merci de lire ces quelques points avant de créer ton
          compte.
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tes données</Text>
          <Text style={styles.sectionText}>
            Tes goûts musicaux, tes photos et ta position (si tu l'actives) ne servent qu'à te proposer des
            profils compatibles. Tes photos ne sont jamais visibles par les autres sans ton accord explicite,
            même après un match.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sécurité et modération</Text>
          <Text style={styles.sectionText}>
            Tout comportement abusif, contenu inapproprié ou faux profil peut être signalé. Un compte signalé ou
            bloqué peut voir son accès restreint, y compris de façon définitive.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ton compte</Text>
          <Text style={styles.sectionText}>
            Tu peux supprimer ton compte et toutes tes données à tout moment depuis Profil. La suppression est
            définitive et immédiate.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact</Text>
          <Text style={styles.sectionText}>
            Pour toute question sur tes données ou ce compte, tu peux nous écrire depuis Profil, section « Aide &amp;
            Assistance ».
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.checkboxRow} onPress={() => setChecked((v) => !v)} testID="terms-checkbox">
          <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
            {checked && <Ionicons name="checkmark" size={14} color={colors.text} />}
          </View>
          <Text style={styles.checkboxText}>
            J'ai lu et j'accepte les Conditions d'Utilisation et la Politique de Confidentialité de Meylio.
          </Text>
        </Pressable>

        <PressableScale
          style={[styles.button, !checked && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={!checked || submitting}
          testID="terms-continue-button"
        >
          {submitting ? <ActivityIndicator color={colors.text} /> : <Text style={styles.buttonText}>Continuer</Text>}
        </PressableScale>
      </View>
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
    padding: 24,
    paddingBottom: 12,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  intro: {
    color: colors.textMuted,
    fontSize: 14,
    marginBottom: 24,
    lineHeight: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  sectionText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  footer: {
    padding: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.surface,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 16,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
});
