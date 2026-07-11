import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

const MIN_AGE = 18;
const MAX_AGE = 99;

type Props = {
  label: string;
  value: number | null;
  onChange: (age: number | null) => void;
  placeholder?: string;
  allowClear?: boolean;
  testID?: string;
  fieldStyle?: StyleProp<ViewStyle>;
};

export function AgePickerField({
  label,
  value,
  onChange,
  placeholder = 'Choisir',
  allowClear = false,
  testID,
  fieldStyle,
}: Props) {
  const [open, setOpen] = useState(false);
  const ages = useMemo(() => Array.from({ length: MAX_AGE - MIN_AGE + 1 }, (_, i) => MIN_AGE + i), []);

  function select(age: number | null) {
    onChange(age);
    setOpen(false);
  }

  return (
    <View>
      <Pressable style={[styles.field, fieldStyle]} onPress={() => setOpen(true)} testID={testID}>
        <Text style={value === null ? styles.placeholder : styles.value}>{value ?? placeholder}</Text>
        <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{label}</Text>
            <FlatList
              data={ages}
              keyExtractor={(age) => String(age)}
              style={styles.list}
              initialScrollIndex={value ? Math.max(0, ages.indexOf(value) - 2) : 0}
              getItemLayout={(_, i) => ({ length: 46, offset: 46 * i, index: i })}
              ListHeaderComponent={
                allowClear ? (
                  <Pressable style={styles.row} onPress={() => select(null)} testID={`${testID}-clear`}>
                    <Text style={styles.rowTextMuted}>Peu importe</Text>
                  </Pressable>
                ) : null
              }
              renderItem={({ item }) => {
                const selected = item === value;
                return (
                  <Pressable
                    style={[styles.row, selected && styles.rowSelected]}
                    onPress={() => select(item)}
                    testID={`${testID}-option-${item}`}
                  >
                    <Text style={selected ? styles.rowTextSelected : styles.rowText}>{item} ans</Text>
                    {selected && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                  </Pressable>
                );
              }}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  value: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  placeholder: {
    color: colors.textMuted,
    fontSize: 16,
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
    paddingBottom: 24,
    maxHeight: '60%',
  },
  sheetTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  list: {
    paddingHorizontal: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 46,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowSelected: {},
  rowText: {
    color: colors.text,
    fontSize: 16,
  },
  rowTextMuted: {
    color: colors.textMuted,
    fontSize: 16,
  },
  rowTextSelected: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
});
