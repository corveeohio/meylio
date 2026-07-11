import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

const SUPPORT_EMAIL = 'support@meylio.app';

const FAQ = [
  {
    question: 'Comment fonctionne le déblocage de mon profil dans un chat ?',
    answer:
      'Après un match, tes photos restent cachées. Depuis le chat, tu peux choisir de « débloquer ton profil » pour que l’autre personne les voie, et reverrouiller à tout moment.',
  },
  {
    question: 'Comment supprimer mon compte ?',
    answer: 'Depuis Profil, tout en bas, « Supprimer mon compte ». La suppression est définitive et immédiate.',
  },
  {
    question: 'Quelqu’un me dérange, que faire ?',
    answer:
      'Depuis une conversation, appuie sur « Signaler / Bloquer ». Un signalement bloque automatiquement cette personne.',
  },
];

export function HelpScreen() {
  function handleContactPress() {
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Assistance Meylio')}`);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Aide & Assistance</Text>
      <Text style={styles.description}>Une question, un problème ? On te répond.</Text>

      <Pressable style={styles.contactCard} onPress={handleContactPress} testID="contact-support-button">
        <Ionicons name="mail-outline" size={20} color={colors.primary} />
        <View style={styles.contactTextGroup}>
          <Text style={styles.contactTitle}>Nous écrire</Text>
          <Text style={styles.contactEmail}>{SUPPORT_EMAIL}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Pressable>

      <Text style={styles.sectionTitle}>Questions fréquentes</Text>
      {FAQ.map((item) => (
        <View key={item.question} style={styles.faqItem}>
          <Text style={styles.faqQuestion}>{item.question}</Text>
          <Text style={styles.faqAnswer}>{item.answer}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 24,
    paddingBottom: 48,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  description: {
    color: colors.textMuted,
    fontSize: 14,
    marginBottom: 24,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 32,
  },
  contactTextGroup: {
    flex: 1,
  },
  contactTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  contactEmail: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  faqItem: {
    marginBottom: 20,
  },
  faqQuestion: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  faqAnswer: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
});
