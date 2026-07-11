import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { API_BASE_URL } from '../config/api';
import { useUser } from '../context/UserContext';
import { useFilters, EMPTY_FILTERS } from '../context/FiltersContext';
import { AVAILABLE_GENRES } from '../constants/genres';
import { AgePickerField } from '../components/AgePickerField';
import type { RootStackParamList } from '../navigation/RootNavigator';

type State = 'loading' | 'premium-required' | 'ready';

export function FiltersScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { userId } = useUser();
  const { filters, setFilters } = useFilters();
  const [state, setState] = useState<State>('loading');
  const [genres, setGenres] = useState<string[]>(filters.genres);
  const [minAge, setMinAge] = useState(filters.minAge);
  const [maxAge, setMaxAge] = useState(filters.maxAge);
  const [maxDistanceKm, setMaxDistanceKm] = useState(filters.maxDistanceKm);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let cancelled = false;
      fetch(`${API_BASE_URL}/users/${userId}`)
        .then((response) => response.json())
        .then((user) => {
          if (cancelled) return;
          setState(user.subscriptionStatus === 'premium' ? 'ready' : 'premium-required');
        })
        .catch(() => !cancelled && setState('premium-required'));
      return () => {
        cancelled = true;
      };
    }, [userId])
  );

  function toggleGenre(genre: string) {
    setGenres((current) => (current.includes(genre) ? current.filter((g) => g !== genre) : [...current, genre]));
  }

  function handleApply() {
    setFilters({ genres, minAge, maxAge, maxDistanceKm });
    navigation.goBack();
  }

  function handleReset() {
    setGenres(EMPTY_FILTERS.genres);
    setMinAge(EMPTY_FILTERS.minAge);
    setMaxAge(EMPTY_FILTERS.maxAge);
    setMaxDistanceKm(EMPTY_FILTERS.maxDistanceKm);
    setFilters(EMPTY_FILTERS);
    navigation.goBack();
  }

  if (state === 'loading') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (state === 'premium-required') {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>Passe en Premium pour utiliser les filtres de recherche avancés.</Text>
        <Pressable style={styles.button} onPress={() => navigation.navigate('Subscription')}>
          <Text style={styles.buttonText}>Passer en Premium</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Filtres de recherche</Text>

      <Text style={styles.sectionLabel}>Âge</Text>
      <View style={styles.ageRow}>
        <View style={styles.ageField}>
          <AgePickerField
            label="Âge minimum"
            value={minAge ? Number(minAge) : null}
            onChange={(age) => setMinAge(age === null ? '' : String(age))}
            placeholder="Min"
            allowClear
            testID="filter-min-age"
            fieldStyle={styles.ageFieldSurface}
          />
        </View>
        <Text style={styles.ageSeparator}>—</Text>
        <View style={styles.ageField}>
          <AgePickerField
            label="Âge maximum"
            value={maxAge ? Number(maxAge) : null}
            onChange={(age) => setMaxAge(age === null ? '' : String(age))}
            placeholder="Max"
            allowClear
            testID="filter-max-age"
            fieldStyle={styles.ageFieldSurface}
          />
        </View>
      </View>

      <Text style={styles.sectionLabel}>Distance maximale (km)</Text>
      <TextInput
        value={maxDistanceKm}
        onChangeText={setMaxDistanceKm}
        placeholder="Ex: 25"
        placeholderTextColor={colors.textMuted}
        keyboardType="number-pad"
        style={styles.distanceInput}
        testID="filter-max-distance"
      />

      <Text style={styles.sectionLabel}>Genres musicaux</Text>
      <View style={styles.chipGroup}>
        {AVAILABLE_GENRES.map((genre) => {
          const selected = genres.includes(genre);
          return (
            <Pressable
              key={genre}
              onPress={() => toggleGenre(genre)}
              testID={`filter-genre-${genre}`}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{genre}</Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable style={styles.button} onPress={handleApply} testID="filters-apply-button">
        <Text style={styles.buttonText}>Appliquer les filtres</Text>
      </Pressable>
      <Pressable style={styles.resetButton} onPress={handleReset} testID="filters-reset-button">
        <Text style={styles.resetButtonText}>Réinitialiser</Text>
      </Pressable>
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
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  message: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 10,
  },
  ageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ageField: {
    flex: 1,
  },
  ageFieldSurface: {
    backgroundColor: colors.surface,
  },
  ageSeparator: {
    color: colors.textMuted,
  },
  distanceInput: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.text,
  },
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
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
    marginTop: 32,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  resetButton: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  resetButtonText: {
    color: colors.textMuted,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
