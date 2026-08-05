import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CommonActions, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { API_BASE_URL } from '../config/api';
import { useUser } from '../context/UserContext';
import { AgePickerField } from '../components/AgePickerField';
import { PressableScale } from '../components/PressableScale';
import type { RootStackParamList } from '../navigation/RootNavigator';

const GENDERS = [
  { value: 'homme', label: 'Homme' },
  { value: 'femme', label: 'Femme' },
  { value: 'autre', label: 'Autre' },
];

const INTENTS = [
  { value: 'serieux', label: 'Sérieux' },
  { value: 'amitie', label: 'Amitié' },
];

export function BasicInfoScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { userId, setHasBasicInfo } = useUser();
  const [age, setAge] = useState<number | null>(null);
  const [gender, setGender] = useState<string | null>(null);
  const [genderPreference, setGenderPreference] = useState<string[]>([]);
  const [relationshipIntent, setRelationshipIntent] = useState<string | null>(null);
  const [city, setCity] = useState('');
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const query = city.trim();
    if (query.length < 2) {
      setCitySuggestions([]);
      return;
    }
    const timeout = setTimeout(() => {
      fetch(`${API_BASE_URL}/geo/search-cities?q=${encodeURIComponent(query)}`)
        .then((response) => response.json())
        .then((data) => {
          if (Array.isArray(data)) setCitySuggestions(data.filter((name) => name !== query));
        })
        .catch(() => setCitySuggestions([]));
    }, 300);
    return () => clearTimeout(timeout);
  }, [city]);

  function selectCity(name: string) {
    setCity(name);
    setCitySuggestions([]);
  }

  function toggleGenderPreference(value: string) {
    setGenderPreference((current) =>
      current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
    );
  }

  async function handleContinue() {
    if (!userId || age === null || !gender || !city.trim()) return;
    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ age, gender, city: city.trim(), genderPreference, relationshipIntent }),
      });
      if (!response.ok) {
        Alert.alert('Erreur', "Impossible d'enregistrer ton profil pour le moment. Réessaie.");
        return;
      }
      setHasBasicInfo(true);
      navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'MainTabs' }] }));
    } finally {
      setSubmitting(false);
    }
  }

  const canContinue = age !== null && !!gender && city.trim().length > 0;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Encore deux infos</Text>
        <Text style={styles.description}>Pour te montrer aux bonnes personnes.</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Ton âge</Text>
          <AgePickerField
            label="Ton âge"
            value={age}
            onChange={setAge}
            testID="basic-info-age-field"
            fieldStyle={styles.fieldSurface}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Ton genre</Text>
          <View style={styles.chipRow}>
            {GENDERS.map((option) => {
              const selected = gender === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setGender(option.value)}
                  testID={`basic-info-gender-${option.value}`}
                  style={[styles.chip, selected && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Tu recherches</Text>
          <View style={styles.chipRow}>
            {GENDERS.map((option) => {
              const selected = genderPreference.includes(option.value);
              return (
                <Pressable
                  key={option.value}
                  onPress={() => toggleGenderPreference(option.value)}
                  testID={`basic-info-preference-${option.value}`}
                  style={[styles.chip, selected && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.hint}>Aucune sélection = tout le monde</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Tu cherches quoi ?</Text>
          <View style={styles.chipRow}>
            {INTENTS.map((option) => {
              const selected = relationshipIntent === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setRelationshipIntent(option.value)}
                  testID={`basic-info-intent-${option.value}`}
                  style={[styles.chip, selected && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Ta ville</Text>
          <TextInput
            value={city}
            onChangeText={setCity}
            placeholder="Paris, Lyon, Marseille…"
            placeholderTextColor={colors.textMuted}
            style={[styles.fieldSurface, styles.cityInput]}
            testID="basic-info-city-field"
            autoCorrect={false}
            onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150)}
          />
          {citySuggestions.length > 0 && (
            <View style={styles.suggestionBox}>
              {citySuggestions.map((name) => (
                <Pressable
                  key={name}
                  onPress={() => selectCity(name)}
                  style={styles.suggestionRow}
                  testID={`basic-info-city-suggestion-${name}`}
                >
                  <Text style={styles.suggestionText}>{name}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <PressableScale
          style={[styles.button, !canContinue && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={!canContinue || submitting}
          testID="basic-info-continue-button"
        >
          {submitting ? <ActivityIndicator color={colors.text} /> : <Text style={styles.buttonText}>Continuer</Text>}
        </PressableScale>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    paddingBottom: 120,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 28,
  },
  field: {
    width: '100%',
    maxWidth: 320,
    marginBottom: 20,
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 10,
  },
  fieldSurface: {
    backgroundColor: colors.surface,
  },
  cityInput: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.text,
    fontSize: 15,
  },
  suggestionBox: {
    marginTop: 6,
    backgroundColor: colors.surface,
    borderRadius: 10,
    overflow: 'hidden',
  },
  suggestionRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  suggestionText: {
    color: colors.text,
    fontSize: 14,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.surface,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  chipTextSelected: {
    color: colors.text,
    fontWeight: '600',
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    marginTop: 12,
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
