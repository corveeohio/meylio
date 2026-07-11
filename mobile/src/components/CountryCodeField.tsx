import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { COUNTRIES, type Country } from '../constants/countryCodes';

type Props = {
  value: Country;
  onChange: (country: Country) => void;
  testID?: string;
  fieldStyle?: StyleProp<ViewStyle>;
};

export function CountryCodeField({ value, onChange, testID, fieldStyle }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const results = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return COUNTRIES;
    return COUNTRIES.filter(
      (country) => country.name.toLowerCase().includes(query) || country.dial.includes(query)
    );
  }, [search]);

  function select(country: Country) {
    onChange(country);
    setOpen(false);
    setSearch('');
  }

  return (
    <View>
      <Pressable style={[styles.field, fieldStyle]} onPress={() => setOpen(true)} testID={testID}>
        <Text style={styles.value}>
          {value.flag} {value.dial}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Indicatif du pays</Text>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Rechercher un pays…"
              placeholderTextColor={colors.textMuted}
              style={styles.search}
              testID={`${testID}-search`}
              autoCapitalize="none"
            />
            <FlatList
              data={results}
              keyExtractor={(country) => country.iso}
              style={styles.list}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const selected = item.iso === value.iso;
                return (
                  <Pressable
                    style={[styles.row, selected && styles.rowSelected]}
                    onPress={() => select(item)}
                    testID={`${testID}-option-${item.iso}`}
                  >
                    <Text style={styles.rowFlag}>{item.flag}</Text>
                    <Text style={[styles.rowText, selected && styles.rowTextSelected]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={[styles.rowDial, selected && styles.rowTextSelected]}>{item.dial}</Text>
                    {selected && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                  </Pressable>
                );
              }}
              ListEmptyComponent={<Text style={styles.empty}>Aucun pays trouvé</Text>}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  value: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 24,
    maxHeight: '70%',
  },
  sheetTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  search: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 15,
    marginBottom: 8,
  },
  list: {
    flexGrow: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 48,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowSelected: {},
  rowFlag: {
    fontSize: 20,
  },
  rowText: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
  },
  rowDial: {
    color: colors.textMuted,
    fontSize: 14,
  },
  rowTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  empty: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
});
