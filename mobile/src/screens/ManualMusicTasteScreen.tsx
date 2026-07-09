import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { API_BASE_URL } from '../config/api';
import { useUser } from '../context/UserContext';
import type { RootStackParamList } from '../navigation/RootNavigator';

const AVAILABLE_GENRES = [
  'Pop',
  'Hip-Hop',
  'R&B',
  'Rock',
  'Électro',
  'Jazz',
  'Indie',
  'Rap FR',
  'Afrobeat',
  'Reggae',
  'Metal',
  'Classique',
];

export function ManualMusicTasteScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { userId } = useUser();
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [artistInput, setArtistInput] = useState('');
  const [artists, setArtists] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function toggleGenre(genre: string) {
    setSelectedGenres((current) =>
      current.includes(genre) ? current.filter((g) => g !== genre) : [...current, genre]
    );
  }

  function addArtist() {
    const trimmed = artistInput.trim();
    if (trimmed.length === 0 || artists.includes(trimmed)) return;
    setArtists((current) => [...current, trimmed]);
    setArtistInput('');
  }

  function removeArtist(artist: string) {
    setArtists((current) => current.filter((a) => a !== artist));
  }

  async function handleSubmit() {
    if (selectedGenres.length === 0) {
      Alert.alert('Sélectionne au moins un genre musical');
      return;
    }
    if (!userId) {
      Alert.alert('Profil en cours de préparation, réessaie dans un instant');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/music/manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, genres: selectedGenres, artists }),
      });
      if (!response.ok) throw new Error('Échec de l’enregistrement');
      navigation.navigate('Photos');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d’enregistrer tes goûts musicaux pour le moment.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Tes goûts musicaux</Text>
      <Text style={styles.sectionLabel}>Genres (sélectionne-en un ou plusieurs)</Text>
      <View style={styles.chipGroup}>
        {AVAILABLE_GENRES.map((genre) => {
          const selected = selectedGenres.includes(genre);
          return (
            <Pressable
              key={genre}
              onPress={() => toggleGenre(genre)}
              testID={`genre-chip-${genre}`}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{genre}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.sectionLabel}>Artistes favoris</Text>
      <View style={styles.artistInputRow}>
        <TextInput
          value={artistInput}
          onChangeText={setArtistInput}
          onSubmitEditing={addArtist}
          placeholder="Ex: Dirge"
          placeholderTextColor={colors.textMuted}
          style={styles.artistInput}
          testID="artist-input"
        />
        <Pressable onPress={addArtist} style={styles.addButton} testID="add-artist-button">
          <Text style={styles.addButtonText}>Ajouter</Text>
        </Pressable>
      </View>
      <View style={styles.chipGroup}>
        {artists.map((artist) => (
          <Pressable
            key={artist}
            onPress={() => removeArtist(artist)}
            style={[styles.chip, styles.chipSelected]}
          >
            <Text style={styles.chipTextSelected}>{artist} ✕</Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        onPress={handleSubmit}
        style={styles.submitButton}
        disabled={submitting}
        testID="submit-manual-taste"
      >
        <Text style={styles.submitButtonText}>{submitting ? 'Enregistrement…' : 'Continuer'}</Text>
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
  artistInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  artistInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.text,
  },
  addButton: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 10,
  },
  addButtonText: {
    color: colors.text,
    fontWeight: '600',
  },
  submitButton: {
    marginTop: 32,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
});
