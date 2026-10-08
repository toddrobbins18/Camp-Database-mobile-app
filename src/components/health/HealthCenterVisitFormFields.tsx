import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme/theme';
import { useCampBrandTheme } from '../../hooks/useCampBrandTheme';
import {
  HEALTH_VISIT_CALLED_HOME_OPTIONS,
  HEALTH_VISIT_LOCATIONS,
  HEALTH_VISIT_NURSE_NAMES,
  HEALTH_VISIT_REASON_SUGGESTIONS,
  HEALTH_VISIT_TREATMENTS,
  HEALTH_VISIT_YES_NO,
  type HealthCenterVisitExtraFields,
} from '../../lib/healthCenterVisitOptions';

export type HealthCenterVisitFormState = HealthCenterVisitExtraFields & {
  reason: string;
  notes: string;
};

export const emptyHealthCenterVisitForm = (): HealthCenterVisitFormState => ({
  reason: '',
  treatment: '',
  incident_location: '',
  group_name: '',
  counselor_name: '',
  nurse_name: '',
  sent_home: '',
  called_home: '',
  notes: '',
});

function OptionPicker({
  label,
  value,
  options,
  onChange,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const { brand, brandMuted } = useCampBrandTheme();
  const [open, setOpen] = useState(false);
  const display = value || placeholder || '—';

  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity
        style={[styles.pickerBtn, disabled && styles.disabled]}
        onPress={() => !disabled && setOpen(true)}
        disabled={disabled}
      >
        <Text style={[styles.pickerBtnText, !value && styles.placeholderText]} numberOfLines={1}>
          {display}
        </Text>
        <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.optionSheet}>
            <ScrollView>
              {options.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.pickerOption, value === opt && { backgroundColor: brandMuted }]}
                  onPress={() => {
                    onChange(opt);
                    setOpen(false);
                  }}
                >
                  <Text style={[styles.pickerOptionText, value === opt && { color: brand, fontWeight: '600' }]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function SuggestField({
  label,
  value,
  options,
  onChange,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const { brand } = useCampBrandTheme();
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.suggestRow}>
        <TextInput
          style={[styles.textInput, styles.suggestInput, disabled && styles.disabled]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textSecondary}
          editable={!disabled}
        />
        <TouchableOpacity
          style={styles.suggestBtn}
          onPress={() => !disabled && setOpen(true)}
          disabled={disabled}
        >
          <Ionicons name="list-outline" size={18} color={brand} />
        </TouchableOpacity>
      </View>
      <Modal visible={open} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.optionSheet}>
            <ScrollView keyboardShouldPersistTaps="handled">
              {options.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={styles.pickerOption}
                  onPress={() => {
                    onChange(opt);
                    setOpen(false);
                  }}
                >
                  <Text style={styles.pickerOptionText}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

type Props = {
  value: HealthCenterVisitFormState;
  onChange: (next: HealthCenterVisitFormState) => void;
  groupOptions: string[];
  counselorOptions: string[];
  nurseOptions: string[];
  disabled?: boolean;
};

export function HealthCenterVisitFormFields({
  value,
  onChange,
  groupOptions,
  counselorOptions,
  nurseOptions,
  disabled,
}: Props) {
  const patch = (partial: Partial<HealthCenterVisitFormState>) =>
    onChange({ ...value, ...partial });

  const nurseList = [...new Set([...HEALTH_VISIT_NURSE_NAMES, ...nurseOptions])];

  return (
    <View style={styles.container}>
      <View style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>Reason *</Text>
        <TextInput
          style={[styles.textInput, styles.textArea, disabled && styles.disabled]}
          value={value.reason}
          onChangeText={(reason) => patch({ reason })}
          placeholder="Chief complaint / injury description..."
          placeholderTextColor={theme.colors.textSecondary}
          multiline
          numberOfLines={3}
          editable={!disabled}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {HEALTH_VISIT_REASON_SUGGESTIONS.map((s) => (
            <TouchableOpacity
              key={s}
              style={styles.chip}
              onPress={() => patch({ reason: s })}
              disabled={disabled}
            >
              <Text style={styles.chipText}>{s}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <SuggestField
        label="Treatment"
        value={value.treatment ?? ''}
        options={HEALTH_VISIT_TREATMENTS}
        onChange={(treatment) => patch({ treatment })}
        placeholder="Ice, bandaged, going home..."
        disabled={disabled}
      />

      <SuggestField
        label="Location of incident"
        value={value.incident_location ?? ''}
        options={HEALTH_VISIT_LOCATIONS}
        onChange={(incident_location) => patch({ incident_location })}
        placeholder="Pool, Gaga, Bunk..."
        disabled={disabled}
      />

      <SuggestField
        label="Group name"
        value={value.group_name ?? ''}
        options={groupOptions}
        onChange={(group_name) => patch({ group_name })}
        placeholder="Camper group / bunk"
        disabled={disabled}
      />

      <SuggestField
        label="Counselor name"
        value={value.counselor_name ?? ''}
        options={['Self', ...counselorOptions]}
        onChange={(counselor_name) => patch({ counselor_name })}
        placeholder="Counselor on duty"
        disabled={disabled}
      />

      <OptionPicker
        label="Nurse name"
        value={value.nurse_name ?? ''}
        options={nurseList}
        onChange={(nurse_name) => patch({ nurse_name })}
        placeholder="Select nurse..."
        disabled={disabled}
      />

      <View style={styles.row}>
        <View style={styles.half}>
          <OptionPicker
            label="Sent home"
            value={value.sent_home ?? ''}
            options={HEALTH_VISIT_YES_NO}
            onChange={(sent_home) => patch({ sent_home })}
            placeholder="—"
            disabled={disabled}
          />
        </View>
        <View style={styles.half}>
          <OptionPicker
            label="Called home"
            value={value.called_home ?? ''}
            options={HEALTH_VISIT_CALLED_HOME_OPTIONS}
            onChange={(called_home) => patch({ called_home })}
            placeholder="—"
            disabled={disabled}
          />
        </View>
      </View>

      <View style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>Additional notes (optional)</Text>
        <TextInput
          style={[styles.textInput, styles.textArea, disabled && styles.disabled]}
          value={value.notes}
          onChangeText={(notes) => patch({ notes })}
          placeholder="Extra details..."
          placeholderTextColor={theme.colors.textSecondary}
          multiline
          numberOfLines={2}
          editable={!disabled}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  fieldBlock: { marginBottom: 4 },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
  },
  textArea: { minHeight: 72, textAlignVertical: 'top' },
  suggestRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  suggestInput: { flex: 1 },
  suggestBtn: {
    padding: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    backgroundColor: theme.colors.card,
  },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: theme.colors.background,
  },
  pickerBtnText: { fontSize: 15, color: theme.colors.text, flex: 1 },
  placeholderText: { color: theme.colors.textSecondary },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  optionSheet: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    maxHeight: '70%',
    overflow: 'hidden',
  },
  pickerOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  pickerOptionText: { fontSize: 15, color: theme.colors.text },
  chipScroll: { marginTop: 8 },
  chip: {
    marginRight: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  chipText: { fontSize: 12, color: theme.colors.textSecondary },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  disabled: { opacity: 0.6 },
});
