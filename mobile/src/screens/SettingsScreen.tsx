import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { CommonActions, useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { API_BASE_URL } from '../config/api';
import { useUser } from '../context/UserContext';
import { MeylioLogo } from '../components/MeylioLogo';
import { PressableScale } from '../components/PressableScale';
import type { RootStackParamList } from '../navigation/RootNavigator';

type UserProfile = {
  email: string | null;
  phone: string | null;
  subscriptionStatus: 'free' | 'premium';
  locationOptIn: boolean;
  age: number | null;
  displayName: string | null;
  gender: string | null;
  genderPreference: string[];
  relationshipIntent: string | null;
  isVerified: boolean;
  photos: string[];
};

type ProfileDraft = {
  age: number | null;
  gender: string | null;
  genderPreference: string[];
  relationshipIntent: string | null;
};

const GENDERS = [
  { value: 'homme', label: 'Homme' },
  { value: 'femme', label: 'Femme' },
  { value: 'autre', label: 'Autre' },
];

const INTENTS = [
  { value: 'serieux', label: 'Sérieux' },
  { value: 'amitie', label: 'Amitié' },
];

export function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { userId, logout } = useUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [updatingLocation, setUpdatingLocation] = useState(false);
  const [draft, setDraft] = useState<ProfileDraft | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadProfile = useCallback(() => {
    if (!userId) return;
    fetch(`${API_BASE_URL}/users/${userId}`)
      .then((response) => response.json())
      .then((user) => {
        setProfile(user);
        setDraft({
          age: user.age,
          gender: user.gender,
          genderPreference: user.genderPreference,
          relationshipIntent: user.relationshipIntent,
        });
      })
      .catch(() => {});
  }, [userId]);

  useFocusEffect(loadProfile);

  async function handleLogout() {
    await logout();
    navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Onboarding' }] }));
  }

  async function handleDeleteAccount() {
    if (!userId) return;
    setDeleting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}`, { method: 'DELETE' });
      if (!response.ok) {
        Alert.alert('Erreur', 'Impossible de supprimer le compte.');
        return;
      }
      await logout();
      navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Onboarding' }] }));
    } finally {
      setDeleting(false);
    }
  }

  function selectGender(value: string) {
    setDraft((current) => (current ? { ...current, gender: current.gender === value ? null : value } : current));
  }

  function selectIntent(value: string) {
    setDraft((current) =>
      current ? { ...current, relationshipIntent: current.relationshipIntent === value ? null : value } : current
    );
  }

  function toggleGenderPreference(value: string) {
    setDraft((current) => {
      if (!current) return current;
      const next = current.genderPreference.includes(value)
        ? current.genderPreference.filter((v) => v !== value)
        : [...current.genderPreference, value];
      return { ...current, genderPreference: next };
    });
  }

  const isDraftDirty =
    !!profile &&
    !!draft &&
    (draft.age !== profile.age ||
      draft.gender !== profile.gender ||
      draft.relationshipIntent !== profile.relationshipIntent ||
      draft.genderPreference.length !== profile.genderPreference.length ||
      draft.genderPreference.some((value) => !profile.genderPreference.includes(value)));

  async function saveProfileChanges() {
    if (!userId || !draft) return;
    setSavingProfile(true);
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          age: draft.age,
          gender: draft.gender,
          genderPreference: draft.genderPreference,
          relationshipIntent: draft.relationshipIntent,
        }),
      });
      const updated = await response.json();
      setProfile((current) => (current ? { ...current, ...updated } : updated));
      setDraft({
        age: updated.age,
        gender: updated.gender,
        genderPreference: updated.genderPreference,
        relationshipIntent: updated.relationshipIntent,
      });
    } finally {
      setSavingProfile(false);
    }
  }

  async function toggleLocationOptIn(value: boolean) {
    if (!userId || !profile) return;
    setUpdatingLocation(true);
    setProfile({ ...profile, locationOptIn: value });
    try {
      await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationOptIn: value }),
      });
    } finally {
      setUpdatingLocation(false);
    }
  }

  async function addPhoto() {
    if (!userId) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission requise', "Autorise l'accès à tes photos pour continuer.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (result.canceled) return;

    setUploadingPhoto(true);
    try {
      const asset = result.assets[0];
      const formData = new FormData();
      const fileName = asset.fileName ?? `photo-${Date.now()}.jpg`;
      const mimeType = asset.mimeType ?? 'image/jpeg';
      if (asset.uri.startsWith('data:') || asset.uri.startsWith('blob:')) {
        const blob = await (await fetch(asset.uri)).blob();
        formData.append('photos', blob, fileName);
      } else {
        formData.append('photos', { uri: asset.uri, name: fileName, type: mimeType } as unknown as Blob);
      }

      const response = await fetch(`${API_BASE_URL}/users/${userId}/photos`, { method: 'POST', body: formData });
      const updated = await response.json();
      setProfile((current) => (current ? { ...current, photos: updated.photos } : current));
    } catch {
      Alert.alert('Erreur', "Impossible d'envoyer la photo.");
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function removePhoto(photoUrl: string) {
    if (!userId) return;
    setProfile((current) => (current ? { ...current, photos: current.photos.filter((p) => p !== photoUrl) } : current));
    await fetch(`${API_BASE_URL}/users/${userId}/photos`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photoUrl }),
    });
  }

  if (!profile || !draft) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const nameLine = [profile.displayName ?? 'Ton profil', profile.age !== null ? String(profile.age) : null]
    .filter(Boolean)
    .join(', ');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.page}>
      <LinearGradient colors={colors.gradient} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.hero}>
        <View style={styles.heroTopRow}>
          <MeylioLogo size={22} showWordmark={false} />
          <View style={styles.subscriptionPill}>
            <Ionicons name={profile.subscriptionStatus === 'premium' ? 'diamond' : 'person'} size={11} color={colors.text} />
            <Text style={styles.subscriptionPillText}>
              {profile.subscriptionStatus === 'premium' ? 'Premium' : 'Gratuit'}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.nameRow}>
        <Text style={styles.nameText} numberOfLines={1}>
          {nameLine}
        </Text>
        {profile.isVerified && <Ionicons name="checkmark-circle" size={18} color={colors.primary} />}
      </View>

      <Text style={styles.sectionTitle}>Tes photos</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
        {profile.photos.map((photo) => (
          <Pressable key={photo} onPress={() => removePhoto(photo)} style={styles.photoWrapper} testID={`photo-${photo}`}>
            <Image source={{ uri: `${API_BASE_URL}${photo}` }} style={styles.photo} />
            <View style={styles.removeBadge}>
              <Ionicons name="close" size={12} color={colors.text} />
            </View>
          </Pressable>
        ))}
        <Pressable style={styles.addPhotoTile} onPress={addPhoto} disabled={uploadingPhoto} testID="add-photo-button">
          {uploadingPhoto ? (
            <ActivityIndicator color={colors.text} size="small" />
          ) : (
            <Ionicons name="add" size={26} color={colors.textMuted} />
          )}
        </Pressable>
      </ScrollView>

      <Text style={styles.sectionTitle}>À propos</Text>
      <View style={styles.section}>
        <View style={styles.fieldGroup}>
          <View style={styles.blockLabelRow}>
            <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
            <Text style={styles.blockLabel}>Ton âge</Text>
          </View>
          <View style={[styles.fieldSurface, styles.readOnlyField]} testID="age-field">
            <Text style={styles.readOnlyFieldText}>{draft.age ?? '—'}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.fieldGroup}>
          <View style={styles.blockLabelRow}>
            <Ionicons name="male-female-outline" size={13} color={colors.textMuted} />
            <Text style={styles.blockLabel}>Ton genre</Text>
          </View>
          <View style={styles.chipRow}>
            {GENDERS.map((option) => {
              const selected = draft.gender === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => selectGender(option.value)}
                  testID={`gender-${option.value}`}
                  style={[styles.chip, selected && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.fieldGroup}>
          <View style={styles.blockLabelRow}>
            <Ionicons name="search-outline" size={13} color={colors.textMuted} />
            <Text style={styles.blockLabel}>Tu recherches</Text>
          </View>
          <View style={styles.chipRow}>
            {GENDERS.map((option) => {
              const selected = draft.genderPreference.includes(option.value);
              return (
                <Pressable
                  key={option.value}
                  onPress={() => toggleGenderPreference(option.value)}
                  testID={`gender-preference-${option.value}`}
                  style={[styles.chip, selected && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.helperText}>Aucune sélection = tout le monde</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.fieldGroup}>
          <View style={styles.blockLabelRow}>
            <Ionicons name="heart-outline" size={13} color={colors.textMuted} />
            <Text style={styles.blockLabel}>Tu cherches quoi ?</Text>
          </View>
          <View style={styles.chipRow}>
            {INTENTS.map((option) => {
              const selected = draft.relationshipIntent === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => selectIntent(option.value)}
                  testID={`intent-${option.value}`}
                  style={[styles.chip, selected && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.fieldGroup}>
          <PressableScale
            style={[styles.saveProfileButton, !isDraftDirty && styles.saveProfileButtonDisabled]}
            onPress={saveProfileChanges}
            disabled={!isDraftDirty || savingProfile}
            testID="save-profile-button"
          >
            {savingProfile ? (
              <ActivityIndicator color={colors.text} size="small" />
            ) : (
              <Text style={styles.saveProfileButtonText}>
                {isDraftDirty ? 'Enregistrer les modifications' : 'Modifications enregistrées'}
              </Text>
            )}
          </PressableScale>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Compte</Text>
      <View style={styles.section}>
        <View style={styles.fieldGroup}>
          <View style={styles.blockLabelRow}>
            <Ionicons name="mail-outline" size={13} color={colors.textMuted} />
            <Text style={styles.blockLabel}>Email</Text>
          </View>
          {profile.email ? (
            <>
              <Text style={styles.value}>{profile.email}</Text>
              <Pressable onPress={() => navigation.navigate('ChangeEmail')} testID="change-email-link">
                <Text style={styles.linkText}>Changer d'email</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.helperText}>Aucun email associé à ce compte</Text>
              <Pressable onPress={() => navigation.navigate('ChangeEmail')} testID="add-email-link">
                <Text style={styles.linkText}>Ajouter un email</Text>
              </Pressable>
            </>
          )}
        </View>

        <View style={styles.divider} />

        <View style={styles.fieldGroup}>
          <View style={styles.blockLabelRow}>
            <Ionicons name="call-outline" size={13} color={colors.textMuted} />
            <Text style={styles.blockLabel}>Téléphone</Text>
          </View>
          {profile.phone ? (
            <>
              <Text style={styles.value}>{profile.phone}</Text>
              <Pressable onPress={() => navigation.navigate('ChangePhone')} testID="change-phone-link">
                <Text style={styles.linkText}>Changer de téléphone</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.helperText}>Aucun téléphone associé à ce compte</Text>
              <Pressable onPress={() => navigation.navigate('ChangePhone')} testID="add-phone-link">
                <Text style={styles.linkText}>Ajouter un téléphone</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>

      {profile.subscriptionStatus === 'free' && (
        <PressableScale style={styles.upgradeButton} onPress={() => navigation.navigate('Subscription')} testID="upgrade-button">
          <Ionicons name="diamond-outline" size={16} color={colors.text} />
          <Text style={styles.upgradeButtonText}>Passer en Premium</Text>
        </PressableScale>
      )}

      <Text style={styles.sectionTitle}>Confidentialité</Text>
      <View style={styles.section}>
        <View style={[styles.fieldGroup, styles.row]}>
          <View style={styles.rowText}>
            <View style={styles.blockLabelRow}>
              <Ionicons name="location-outline" size={13} color={colors.textMuted} />
              <Text style={styles.blockLabel}>Géolocalisation</Text>
            </View>
            <Text style={styles.helperText}>Active le mode proximité</Text>
          </View>
          <Switch
            value={profile.locationOptIn}
            onValueChange={toggleLocationOptIn}
            disabled={updatingLocation}
            testID="location-opt-in-switch"
          />
        </View>
      </View>

      <Pressable
        style={styles.helpLink}
        onPress={() => navigation.navigate('Help')}
        testID="help-link"
      >
        <Ionicons name="help-circle-outline" size={16} color={colors.textMuted} />
        <Text style={styles.helpLinkText}>Aide & Assistance</Text>
      </Pressable>

      <Pressable style={styles.logoutButton} onPress={handleLogout} testID="logout-button">
        <Text style={styles.logoutButtonText}>Se déconnecter</Text>
      </Pressable>

      {!confirmingDelete ? (
        <Pressable style={styles.deleteButton} onPress={() => setConfirmingDelete(true)} testID="delete-account-button">
          <Text style={styles.deleteButtonText}>Supprimer mon compte</Text>
        </Pressable>
      ) : (
        <View style={styles.deleteConfirmBlock}>
          <Text style={styles.deleteConfirmText}>
            Cette action est définitive et supprime toutes tes données (profil, matchs, messages).
          </Text>
          <View style={styles.deleteConfirmRow}>
            <Pressable
              style={styles.cancelDeleteButton}
              onPress={() => setConfirmingDelete(false)}
              testID="cancel-delete-account-button"
            >
              <Text style={styles.cancelDeleteButtonText}>Annuler</Text>
            </Pressable>
            <Pressable
              style={styles.confirmDeleteButton}
              onPress={handleDeleteAccount}
              disabled={deleting}
              testID="confirm-delete-account-button"
            >
              {deleting ? (
                <ActivityIndicator color={colors.text} size="small" />
              ) : (
                <Text style={styles.confirmDeleteButtonText}>Confirmer la suppression</Text>
              )}
            </Pressable>
          </View>
        </View>
      )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: 48,
  },
  page: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  hero: {
    width: '100%',
    height: 120,
    padding: 20,
    justifyContent: 'flex-start',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subscriptionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  subscriptionPillText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '600',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: -18,
    marginRight: 'auto',
    marginLeft: 20,
    marginBottom: 20,
    backgroundColor: colors.surface,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  nameText: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    maxWidth: 220,
  },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginHorizontal: 24,
    marginBottom: 14,
    marginTop: 32,
  },
  photoRow: {
    paddingHorizontal: 24,
    gap: 12,
  },
  photoWrapper: {
    width: 96,
    height: 96,
  },
  photo: {
    width: 96,
    height: 96,
    borderRadius: 14,
  },
  removeBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: colors.error,
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoTile: {
    width: 84,
    height: 84,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surface,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    marginHorizontal: 24,
  },
  fieldGroup: {
    paddingVertical: 18,
  },
  fieldSurface: {
    backgroundColor: colors.surfaceElevated,
  },
  readOnlyField: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  readOnlyFieldText: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowText: {
    flex: 1,
  },
  helperText: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 8,
  },
  blockLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  blockLabel: {
    color: colors.textMuted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  value: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.surfaceElevated,
    backgroundColor: colors.surfaceElevated,
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
  saveProfileButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  saveProfileButtonDisabled: {
    backgroundColor: colors.surfaceElevated,
  },
  saveProfileButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  upgradeButton: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 24,
    marginBottom: 12,
  },
  upgradeButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  helpLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 32,
  },
  helpLinkText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  logoutButton: {
    marginTop: 24,
    paddingVertical: 12,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: colors.error,
    fontSize: 14,
    fontWeight: '600',
  },
  linkText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
  },
  deleteButton: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: colors.textFaint,
    fontSize: 13,
    fontWeight: '600',
  },
  deleteConfirmBlock: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 24,
    marginTop: 12,
  },
  deleteConfirmText: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center',
  },
  deleteConfirmRow: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelDeleteButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  cancelDeleteButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  confirmDeleteButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: colors.error,
  },
  confirmDeleteButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
});
