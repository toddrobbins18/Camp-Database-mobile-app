import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import {
  ABSENCE_TYPES,
  CHANGE_TYPES,
  type Camper,
} from '../../constants/parentPortalConstants';
import {
  isSameDayRequestBlocked,
  SAME_DAY_CUTOFF_MESSAGE,
} from '../../lib/parentPortalCutoff';
import type { ParentPortalColors } from '../../lib/parentPortalTheme';

type FormProps = {
  visible: boolean;
  onClose: () => void;
  companyId: string;
  familyId: string;
  campers: Camper[];
  onSaved: () => void;
  colors: ParentPortalColors;
};

function OptionRow({
  label,
  selected,
  onPress,
  colors,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  colors: ParentPortalColors;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        formStyles.optionRow,
        { borderColor: colors.border },
        selected && { borderColor: colors.brand, backgroundColor: colors.brandSubtle },
      ]}
    >
      <Text style={{ color: colors.text, fontWeight: selected ? '600' : '400' }}>{label}</Text>
    </TouchableOpacity>
  );
}

export function PickupChangeForm({
  visible,
  onClose,
  companyId,
  familyId,
  campers,
  onSaved,
  colors,
}: FormProps) {
  const [camperId, setCamperId] = useState('');
  const [changeDate, setChangeDate] = useState(new Date().toISOString().slice(0, 10));
  const [changeType, setChangeType] = useState('early_pickup');
  const [pickupTime, setPickupTime] = useState('');
  const [personName, setPersonName] = useState('');
  const [personPhone, setPersonPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const blocked = isSameDayRequestBlocked(changeDate);

  const submit = async () => {
    if (!camperId) {
      Alert.alert('Missing camper', 'Pick a camper.');
      return;
    }
    if (isSameDayRequestBlocked(changeDate)) {
      Alert.alert('Cutoff passed', SAME_DAY_CUTOFF_MESSAGE);
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('pickup_changes').insert({
      company_id: companyId,
      family_id: familyId,
      camper_id: camperId,
      change_date: changeDate,
      change_type: changeType,
      pickup_time: pickupTime || null,
      pickup_person_name: personName || null,
      pickup_person_phone: personPhone || null,
      notes: notes || null,
    });
    setSaving(false);
    if (error) Alert.alert('Error', error.message);
    else {
      onClose();
      onSaved();
    }
  };

  return (
    <FormModal
      visible={visible}
      onClose={onClose}
      title="Change pickup"
      colors={colors}
      onSubmit={submit}
      saving={saving}
    >
      <Label colors={colors}>Camper</Label>
      {campers.map((c) => (
        <OptionRow key={c.id} label={c.name} selected={camperId === c.id} onPress={() => setCamperId(c.id)} colors={colors} />
      ))}
      <Field label="Date (YYYY-MM-DD)" value={changeDate} onChangeText={setChangeDate} colors={colors} />
      {blocked ? (
        <Text style={[formStyles.warning, { color: '#b45309' }]}>{SAME_DAY_CUTOFF_MESSAGE}</Text>
      ) : null}
      <Label colors={colors}>Type</Label>
      {CHANGE_TYPES.map((t) => (
        <OptionRow key={t.v} label={t.l} selected={changeType === t.v} onPress={() => setChangeType(t.v)} colors={colors} />
      ))}
      <Field label="Pickup time (optional)" value={pickupTime} onChangeText={setPickupTime} placeholder="HH:MM" colors={colors} />
      <Field label="Person picking up" value={personName} onChangeText={setPersonName} colors={colors} />
      <Field label="Their phone" value={personPhone} onChangeText={setPersonPhone} colors={colors} />
      <Field label="Notes" value={notes} onChangeText={setNotes} multiline colors={colors} />
    </FormModal>
  );
}

export function AbsenceForm({
  visible,
  onClose,
  companyId,
  familyId,
  campers,
  onSaved,
  colors,
}: FormProps) {
  const [camperId, setCamperId] = useState('');
  const [absenceDate, setAbsenceDate] = useState(new Date().toISOString().slice(0, 10));
  const [absenceType, setAbsenceType] = useState('absent');
  const [arrivalTime, setArrivalTime] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const blocked = isSameDayRequestBlocked(absenceDate);

  const submit = async () => {
    if (!camperId) {
      Alert.alert('Missing camper', 'Pick a camper.');
      return;
    }
    if (isSameDayRequestBlocked(absenceDate)) {
      Alert.alert('Cutoff passed', SAME_DAY_CUTOFF_MESSAGE);
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('absences').insert({
      company_id: companyId,
      family_id: familyId,
      camper_id: camperId,
      absence_date: absenceDate,
      absence_type: absenceType,
      arrival_time: arrivalTime || null,
      reason: reason || null,
      notes: notes || null,
    });
    setSaving(false);
    if (error) Alert.alert('Error', error.message);
    else {
      onClose();
      onSaved();
    }
  };

  return (
    <FormModal
      visible={visible}
      onClose={onClose}
      title="Report absence"
      colors={colors}
      onSubmit={submit}
      saving={saving}
    >
      <Label colors={colors}>Camper</Label>
      {campers.map((c) => (
        <OptionRow key={c.id} label={c.name} selected={camperId === c.id} onPress={() => setCamperId(c.id)} colors={colors} />
      ))}
      <Field label="Date (YYYY-MM-DD)" value={absenceDate} onChangeText={setAbsenceDate} colors={colors} />
      {blocked ? (
        <Text style={[formStyles.warning, { color: '#b45309' }]}>{SAME_DAY_CUTOFF_MESSAGE}</Text>
      ) : null}
      <Label colors={colors}>Type</Label>
      {ABSENCE_TYPES.map((t) => (
        <OptionRow key={t.v} label={t.l} selected={absenceType === t.v} onPress={() => setAbsenceType(t.v)} colors={colors} />
      ))}
      {(absenceType === 'late_arrival' || absenceType === 'leaving_early') && (
        <Field label="Time" value={arrivalTime} onChangeText={setArrivalTime} placeholder="HH:MM" colors={colors} />
      )}
      <Field label="Reason" value={reason} onChangeText={setReason} colors={colors} />
      <Field label="Notes" value={notes} onChangeText={setNotes} multiline colors={colors} />
    </FormModal>
  );
}

export function AuthorizedPickupForm({
  visible,
  onClose,
  companyId,
  familyId,
  campers,
  onSaved,
  colors,
}: FormProps) {
  const [fullName, setFullName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [appliesTo, setAppliesTo] = useState('all');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!fullName.trim()) {
      Alert.alert('Missing name', 'Enter the adult\'s full name.');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('authorized_pickups').insert({
      company_id: companyId,
      family_id: familyId,
      full_name: fullName.trim(),
      relationship: relationship || null,
      phone: phone || null,
      email: email || null,
      notes: notes || null,
      camper_id: appliesTo === 'all' ? null : appliesTo,
    });
    setSaving(false);
    if (error) Alert.alert('Error', error.message);
    else {
      onClose();
      onSaved();
    }
  };

  return (
    <FormModal
      visible={visible}
      onClose={onClose}
      title="Add authorized adult"
      colors={colors}
      onSubmit={submit}
      saving={saving}
    >
      <Field label="Full name" value={fullName} onChangeText={setFullName} colors={colors} />
      <Field label="Relationship" value={relationship} onChangeText={setRelationship} colors={colors} />
      <Field label="Phone" value={phone} onChangeText={setPhone} colors={colors} />
      <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" colors={colors} />
      <Label colors={colors}>Applies to</Label>
      <OptionRow label="All my campers" selected={appliesTo === 'all'} onPress={() => setAppliesTo('all')} colors={colors} />
      {campers.map((c) => (
        <OptionRow key={c.id} label={c.name} selected={appliesTo === c.id} onPress={() => setAppliesTo(c.id)} colors={colors} />
      ))}
      <Field label="Notes" value={notes} onChangeText={setNotes} multiline colors={colors} />
    </FormModal>
  );
}

function Label({ children, colors }: { children: string; colors: ParentPortalColors }) {
  return <Text style={[formStyles.label, { color: colors.text }]}>{children}</Text>;
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  autoCapitalize,
  colors,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  autoCapitalize?: 'none' | 'sentences';
  colors: ParentPortalColors;
}) {
  return (
    <>
      <Label colors={colors}>{label}</Label>
      <TextInput
        style={[formStyles.input, { borderColor: colors.border, color: colors.text }, multiline && { minHeight: 80 }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSubtle}
        multiline={multiline}
        autoCapitalize={autoCapitalize}
      />
    </>
  );
}

function FormModal({
  visible,
  onClose,
  title,
  colors,
  onSubmit,
  saving,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  colors: ParentPortalColors;
  onSubmit: () => void;
  saving: boolean;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[formStyles.modalRoot, { backgroundColor: colors.elevated }]}>
        <View style={[formStyles.modalHeader, { borderBottomColor: colors.border }]}>
          <Text style={[formStyles.modalTitle, { color: colors.text }]}>{title}</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
        <ScrollView style={formStyles.modalBody} keyboardShouldPersistTaps="handled">
          {children}
          <TouchableOpacity
            style={[formStyles.submitBtn, { backgroundColor: colors.brand }]}
            onPress={onSubmit}
            disabled={saving}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={formStyles.submitText}>Submit</Text>}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const formStyles = StyleSheet.create({
  modalRoot: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalBody: { padding: 16 },
  label: { fontSize: 13, fontWeight: '600', marginTop: 12, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  optionRow: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 6,
  },
  warning: { fontSize: 13, marginVertical: 8, lineHeight: 18 },
  submitBtn: {
    marginTop: 20,
    marginBottom: 32,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
