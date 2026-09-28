import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WelcomeHero } from './WelcomeHero';
import { supabase } from '../../lib/supabase';
import { formatCampDateTime } from '../../lib/campTime';
import {
  absenceTypeLabel,
  camperDisplayGroup,
  camperInitials,
  changeTypeLabel,
  formatFriendlyDate,
  statusBadgeStyle,
  statusDisplayLabel,
  todayIsoDate,
  type Absence,
  type AuthorizedPickup,
  type Camper,
  type ParentPortalView,
  type PickupChange,
  type SwimLesson,
} from '../../constants/parentPortalConstants';
import type { ParentPortalColors } from '../../lib/parentPortalTheme';
import {
  AbsenceForm,
  AuthorizedPickupForm,
  PickupChangeForm,
} from './ParentPortalForms';

export type SharedViewProps = {
  campName: string;
  contactName?: string | null;
  companyId: string;
  familyId: string;
  campers: Camper[];
  pickups: PickupChange[];
  absences: Absence[];
  authPickups: AuthorizedPickup[];
  swimLessons: SwimLesson[];
  onSaved: () => void;
  onNavigate: (view: ParentPortalView) => void;
  camperName: (id: string) => string;
  colors: ParentPortalColors;
};

function SectionEyebrow({ children, colors }: { children: string; colors: ParentPortalColors }) {
  return <Text style={[styles.eyebrow, { color: colors.textSubtle }]}>{children}</Text>;
}

function StatusBadge({ status }: { status: string }) {
  const badge = statusBadgeStyle(status);
  return (
    <View style={[styles.badge, { backgroundColor: badge.bg }]}>
      <Text style={[styles.badgeText, { color: badge.text }]}>{statusDisplayLabel(status)}</Text>
    </View>
  );
}

function CamperCard({
  camper,
  todayIso,
  absences,
  pickups,
  swimLessons,
  onView,
  colors,
}: {
  camper: Camper;
  todayIso: string;
  absences: Absence[];
  pickups: PickupChange[];
  swimLessons: SwimLesson[];
  onView?: () => void;
  colors: ParentPortalColors;
}) {
  const absentToday = absences.some((a) => a.camper_id === camper.id && a.absence_date === todayIso);
  const pickupToday = pickups.find((p) => p.camper_id === camper.id && p.change_date === todayIso);
  const swimToday = swimLessons.find((l) => l.camper_id === camper.id && l.scheduled_at.startsWith(todayIso));
  const group = camperDisplayGroup(camper);

  return (
    <TouchableOpacity
      style={[styles.card, styles.cardShadow, { backgroundColor: colors.elevated, borderColor: colors.border, shadowColor: colors.brandDark }]}
      onPress={onView}
      disabled={!onView}
      activeOpacity={onView ? 0.88 : 1}
    >
      <View style={styles.camperRow}>
        <View style={[styles.avatar, { backgroundColor: colors.brand }]}>
          <Text style={styles.avatarText}>{camperInitials(camper.name)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{camper.name}</Text>
          {group ? <Text style={[styles.cardMeta, { color: colors.textMuted }]}>{group}</Text> : null}
          <View
            style={[
              styles.statusPill,
              absentToday ? styles.statusPillWarn : styles.statusPillOk,
            ]}
          >
            <Ionicons
              name={absentToday ? 'time-outline' : 'checkmark-circle'}
              size={13}
              color={absentToday ? '#b45309' : '#15803d'}
            />
            <Text style={[styles.statusPillText, { color: absentToday ? '#b45309' : '#15803d' }]}>
              {absentToday ? 'Absent today' : 'Expected at camp today'}
            </Text>
          </View>
        </View>
      </View>
      <View style={[styles.scheduleStrip, { backgroundColor: colors.brandSubtle, borderTopColor: colors.border }]}>
        {pickupToday ? (
          <Text style={[styles.cardHint, { color: colors.text }]}>
            Pickup change · {pickupToday.pickup_time || 'Time TBD'}
            {pickupToday.pickup_person_name ? ` · ${pickupToday.pickup_person_name}` : ''}
          </Text>
        ) : swimToday ? (
          <Text style={[styles.cardHint, { color: colors.text }]}>
            Swim lesson ·{' '}
            {new Date(swimToday.scheduled_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
          </Text>
        ) : (
          <Text style={[styles.cardHint, { color: colors.textMuted }]}>
            No special schedule updates for today.
          </Text>
        )}
      </View>
      {onView ? (
        <View style={styles.cardFooter}>
          <Text style={[styles.cardLink, { color: colors.brand }]}>View camper</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.brand} />
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

function QuickAction({
  icon,
  title,
  description,
  onPress,
  colors,
  accent,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  onPress: () => void;
  colors: ParentPortalColors;
  accent?: 'blue' | 'amber' | 'navy' | 'green';
}) {
  const accentBg =
    accent === 'amber'
      ? '#fef3c7'
      : accent === 'green'
        ? '#dcfce7'
        : accent === 'navy'
          ? colors.brandMuted
          : colors.brandSoft;

  return (
    <TouchableOpacity
      style={[
        styles.quickCard,
        styles.cardShadow,
        { backgroundColor: colors.elevated, borderColor: colors.border, shadowColor: colors.brandDark },
      ]}
      onPress={onPress}
      activeOpacity={0.88}
    >
      <View style={styles.quickTop}>
        <View style={[styles.quickIcon, { backgroundColor: accentBg }]}>
          <Ionicons name={icon} size={20} color={colors.brand} />
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textSubtle} />
      </View>
      <Text style={[styles.quickTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.quickDesc, { color: colors.textMuted }]} numberOfLines={2}>
        {description}
      </Text>
    </TouchableOpacity>
  );
}

export function ParentHomeView({
  campName,
  contactName,
  campers,
  pickups,
  absences,
  swimLessons,
  onNavigate,
  colors,
}: Pick<
  SharedViewProps,
  'campName' | 'contactName' | 'campers' | 'pickups' | 'absences' | 'swimLessons' | 'onNavigate' | 'colors'
>) {
  const todayIso = todayIsoDate();
  const todayCount =
    pickups.filter((p) => p.change_date === todayIso).length +
    absences.filter((a) => a.absence_date === todayIso).length +
    swimLessons.filter((l) => l.scheduled_at.startsWith(todayIso)).length;

  return (
    <View style={styles.sectionGap}>
      <WelcomeHero contactName={contactName} campName={campName} colors={colors} />

      <View
        style={[
          styles.panel,
          styles.cardShadow,
          { backgroundColor: colors.elevated, borderColor: colors.border, shadowColor: colors.brandDark },
        ]}
      >
        <View style={styles.panelHeader}>
          <Ionicons name="sparkles" size={16} color={colors.brand} />
          <SectionEyebrow colors={colors}>Today at camp</SectionEyebrow>
        </View>
        <Text style={[styles.panelDate, { color: colors.text }]}>{formatFriendlyDate(todayIso)}</Text>
        <Text style={[styles.panelBody, { color: colors.textMuted }]}>
          {todayCount
            ? `${todayCount} update${todayCount === 1 ? '' : 's'} on file for today. See details on your camper cards below.`
            : 'No schedule changes or lessons on file for today. Your campers follow the regular camp day unless you submit a pickup change or absence.'}
        </Text>
      </View>

      <View>
        <View style={styles.sectionHeader}>
          <View>
            <SectionEyebrow colors={colors}>Your family</SectionEyebrow>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Campers</Text>
          </View>
          {campers.length > 0 ? (
            <TouchableOpacity onPress={() => onNavigate('campers')}>
              <Text style={[styles.link, { color: colors.brand }]}>View all</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        {campers.length === 0 ? (
          <EmptyBlock
            title="No campers linked yet"
            description="Once the camp office connects your campers, they'll appear here."
            colors={colors}
          />
        ) : (
          campers.slice(0, 4).map((camper) => (
            <CamperCard
              key={camper.id}
              camper={camper}
              todayIso={todayIso}
              absences={absences}
              pickups={pickups}
              swimLessons={swimLessons}
              onView={() => onNavigate('campers')}
              colors={colors}
            />
          ))
        )}
      </View>

      <View>
        <SectionEyebrow colors={colors}>Things you may want to do</SectionEyebrow>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick actions</Text>
        <View style={styles.quickGrid}>
          <View style={styles.quickCol}>
            <QuickAction icon="calendar-outline" title="Change pickup" description="Request a different pickup arrangement." onPress={() => onNavigate('pickups')} colors={colors} accent="blue" />
            <QuickAction icon="shield-checkmark-outline" title="Authorized adults" description="Manage approved pickup contacts." onPress={() => onNavigate('authorized')} colors={colors} accent="navy" />
          </View>
          <View style={styles.quickCol}>
            <QuickAction icon="time-outline" title="Report an absence" description="Let camp know about absences or late arrivals." onPress={() => onNavigate('absences')} colors={colors} accent="amber" />
            <QuickAction icon="water-outline" title="Swim lessons" description="View and confirm swim lessons." onPress={() => onNavigate('swim')} colors={colors} accent="green" />
          </View>
        </View>
      </View>
    </View>
  );
}

export function ParentCampersView({
  campers,
  absences,
  pickups,
  swimLessons,
  colors,
}: Pick<SharedViewProps, 'campers' | 'absences' | 'pickups' | 'swimLessons' | 'colors'>) {
  const todayIso = todayIsoDate();
  return (
    <View style={styles.sectionGap}>
      <Text style={[styles.pageTitle, { color: colors.text }]}>My campers</Text>
      <Text style={[styles.pageSub, { color: colors.textMuted }]}>
        A personal overview of each camper in your family.
      </Text>
      {campers.length === 0 ? (
        <EmptyBlock title="No campers on file yet" description="When the camp links your children, they'll appear here." colors={colors} />
      ) : (
        campers.map((camper) => (
          <CamperCard
            key={camper.id}
            camper={camper}
            todayIso={todayIso}
            absences={absences}
            pickups={pickups}
            swimLessons={swimLessons}
            colors={colors}
          />
        ))
      )}
    </View>
  );
}

function SubmissionCard({
  title,
  meta,
  detail,
  status,
  colors,
}: {
  title: string;
  meta: string;
  detail?: string;
  status: string;
  colors: ParentPortalColors;
}) {
  return (
    <View style={[styles.card, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
      <View style={styles.submissionTop}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.cardMeta, { color: colors.textMuted }]}>{meta}</Text>
          {detail ? <Text style={[styles.cardHint, { color: colors.text }]}>{detail}</Text> : null}
        </View>
        <StatusBadge status={status} />
      </View>
    </View>
  );
}

export function ParentPickupsView(props: SharedViewProps) {
  const [formOpen, setFormOpen] = useState(false);
  const todayIso = todayIsoDate();
  const todayPickups = props.pickups.filter((p) => p.change_date === todayIso);

  return (
    <View style={styles.sectionGap}>
      <View style={styles.pageHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.pageTitle, { color: props.colors.text }]}>Pickups</Text>
          <Text style={[styles.pageSub, { color: props.colors.textMuted }]}>
            Request pickup changes and track submitted requests.
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: props.colors.brand }]}
          onPress={() => setFormOpen(true)}
          disabled={props.campers.length === 0}
        >
          <Text style={styles.primaryBtnText}>Change pickup</Text>
        </TouchableOpacity>
      </View>

      {todayPickups.length > 0 ? (
        <View style={[styles.highlightPanel, { backgroundColor: props.colors.brandSubtle, borderColor: props.colors.brandMuted }]}>
          <SectionEyebrow colors={props.colors}>Today&apos;s pickup</SectionEyebrow>
          {todayPickups.map((p) => (
            <View key={p.id} style={[styles.innerCard, { backgroundColor: props.colors.elevated }]}>
              <Text style={[styles.cardTitle, { color: props.colors.text }]}>{props.camperName(p.camper_id)}</Text>
              <Text style={[styles.cardMeta, { color: props.colors.textMuted }]}>
                {changeTypeLabel(p.change_type)}
                {p.pickup_time ? ` · ${p.pickup_time}` : ''}
              </Text>
              <StatusBadge status={p.status} />
            </View>
          ))}
        </View>
      ) : null}

      {props.pickups.length === 0 ? (
        <EmptyBlock title="No pickup changes yet" description="Pickup requests you submit will appear here." colors={props.colors} />
      ) : (
        props.pickups.map((p) => (
          <SubmissionCard
            key={p.id}
            title={`${props.camperName(p.camper_id)} · ${changeTypeLabel(p.change_type)}`}
            meta={`${p.change_date}${p.pickup_time ? ` at ${p.pickup_time}` : ''}${p.pickup_person_name ? ` · ${p.pickup_person_name}` : ''}`}
            detail={p.notes ?? undefined}
            status={p.status}
            colors={props.colors}
          />
        ))
      )}

      <PickupChangeForm
        visible={formOpen}
        onClose={() => setFormOpen(false)}
        companyId={props.companyId}
        familyId={props.familyId}
        campers={props.campers}
        onSaved={props.onSaved}
        colors={props.colors}
      />
    </View>
  );
}

export function ParentAbsencesView(props: SharedViewProps) {
  const [formOpen, setFormOpen] = useState(false);

  return (
    <View style={styles.sectionGap}>
      <View style={styles.pageHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.pageTitle, { color: props.colors.text }]}>Is your camper going to miss a day?</Text>
          <Text style={[styles.pageSub, { color: props.colors.textMuted }]}>
            Report absences, late arrivals, or early departures.
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: props.colors.brand }]}
          onPress={() => setFormOpen(true)}
          disabled={props.campers.length === 0}
        >
          <Text style={styles.primaryBtnText}>Report</Text>
        </TouchableOpacity>
      </View>

      {props.absences.length === 0 ? (
        <EmptyBlock title="No absences reported" description="Submit a report if your camper won't attend or will arrive late." colors={props.colors} />
      ) : (
        props.absences.map((a) => (
          <SubmissionCard
            key={a.id}
            title={`${props.camperName(a.camper_id)} · ${absenceTypeLabel(a.absence_type)}`}
            meta={`${a.absence_date}${a.arrival_time ? ` · ${a.arrival_time}` : ''}`}
            detail={a.reason ? `Reason: ${a.reason}` : a.notes ?? undefined}
            status={a.status}
            colors={props.colors}
          />
        ))
      )}

      <AbsenceForm
        visible={formOpen}
        onClose={() => setFormOpen(false)}
        companyId={props.companyId}
        familyId={props.familyId}
        campers={props.campers}
        onSaved={props.onSaved}
        colors={props.colors}
      />
    </View>
  );
}

export function ParentAuthorizedView(props: SharedViewProps) {
  const [formOpen, setFormOpen] = useState(false);

  return (
    <View style={styles.sectionGap}>
      <View style={styles.pageHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.pageTitle, { color: props.colors.text }]}>Who can pick up your camper?</Text>
          <Text style={[styles.pageSub, { color: props.colors.textMuted }]}>
            Keep your authorized pickup list current.
          </Text>
        </View>
        <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: props.colors.brand }]} onPress={() => setFormOpen(true)}>
          <Text style={styles.primaryBtnText}>Add adult</Text>
        </TouchableOpacity>
      </View>

      {props.authPickups.length === 0 ? (
        <EmptyBlock title="No authorized adults yet" description="Add grandparents, family friends, or other trusted adults." colors={props.colors} />
      ) : (
        props.authPickups.map((adult) => (
          <View key={adult.id} style={[styles.card, { backgroundColor: props.colors.elevated, borderColor: props.colors.border }]}>
            <View style={styles.camperRow}>
              <View style={[styles.avatar, { backgroundColor: props.colors.brandSoft }]}>
                <Text style={[styles.avatarText, { color: props.colors.brandDark }]}>{camperInitials(adult.full_name)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: props.colors.text }]}>{adult.full_name}</Text>
                {adult.relationship ? (
                  <Text style={[styles.cardMeta, { color: props.colors.textMuted }]}>{adult.relationship}</Text>
                ) : null}
                <Text style={[styles.cardHint, { color: props.colors.textMuted }]}>
                  {[adult.phone, adult.email].filter(Boolean).join(' · ') || 'No contact on file'}
                </Text>
                <Text style={[styles.cardHint, { color: props.colors.textSubtle }]}>
                  {adult.camper_id ? `For ${props.camperName(adult.camper_id)}` : 'All campers'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={async () => {
                const { error } = await supabase.from('authorized_pickups').delete().eq('id', adult.id);
                if (error) Alert.alert('Error', error.message);
                else props.onSaved();
              }}
            >
              <Text style={{ color: '#dc2626', fontWeight: '600', marginTop: 8 }}>Remove</Text>
            </TouchableOpacity>
          </View>
        ))
      )}

      <AuthorizedPickupForm
        visible={formOpen}
        onClose={() => setFormOpen(false)}
        companyId={props.companyId}
        familyId={props.familyId}
        campers={props.campers}
        onSaved={props.onSaved}
        colors={props.colors}
      />
    </View>
  );
}

export function ParentSwimView({
  swimLessons,
  onSaved,
  camperName,
  colors,
}: Pick<SharedViewProps, 'swimLessons' | 'onSaved' | 'camperName' | 'colors'>) {
  return (
    <View style={styles.sectionGap}>
      <Text style={[styles.pageTitle, { color: colors.text }]}>Swim lessons</Text>
      <Text style={[styles.pageSub, { color: colors.textMuted }]}>
        Lessons are scheduled by the camp. Confirm attendance once you receive your reminder.
      </Text>

      {swimLessons.length === 0 ? (
        <EmptyBlock title="No swim lessons scheduled" description="Scheduled lessons will appear here for confirmation." colors={colors} />
      ) : (
        swimLessons.map((lesson) => (
          <View key={lesson.id} style={[styles.card, { backgroundColor: colors.brandSubtle, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{camperName(lesson.camper_id)}</Text>
            <Text style={[styles.cardMeta, { color: colors.textMuted }]}>{formatCampDateTime(lesson.scheduled_at)}</Text>
            <Text style={[styles.cardHint, { color: colors.text }]}>
              {lesson.duration_minutes} min
              {lesson.instructor ? ` · Instructor ${lesson.instructor}` : ''}
              {lesson.location ? ` · ${lesson.location}` : ''}
              {' · '}${(lesson.cost_cents / 100).toFixed(2)}
            </Text>
            {lesson.parent_confirmed ? (
              <View style={styles.swimActions}>
                <View style={styles.confirmedBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#15803d" />
                  <Text style={styles.confirmedText}>Confirmed</Text>
                </View>
                <TouchableOpacity
                  onPress={async () => {
                    await supabase
                      .from('swim_lessons')
                      .update({ parent_confirmed: false, parent_confirmed_at: null, transport_status: null })
                      .eq('id', lesson.id);
                    onSaved();
                  }}
                >
                  <Text style={{ color: colors.brand, fontWeight: '600' }}>Undo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.brand, alignSelf: 'flex-start', marginTop: 10 }]}
                onPress={async () => {
                  await supabase
                    .from('swim_lessons')
                    .update({
                      parent_confirmed: true,
                      parent_confirmed_at: new Date().toISOString(),
                      transport_status: 'submitted',
                    })
                    .eq('id', lesson.id);
                  onSaved();
                }}
              >
                <Text style={styles.primaryBtnText}>Confirm attendance</Text>
              </TouchableOpacity>
            )}
          </View>
        ))
      )}
    </View>
  );
}

function EmptyBlock({
  title,
  description,
  colors,
}: {
  title: string;
  description: string;
  colors: ParentPortalColors;
}) {
  return (
    <View
      style={[
        styles.empty,
        styles.cardShadow,
        { backgroundColor: colors.elevated, borderColor: colors.border, shadowColor: colors.brandDark },
      ]}
    >
      <View style={[styles.emptyIcon, { backgroundColor: colors.brandSoft }]}>
        <Ionicons name="people-outline" size={28} color={colors.brand} />
      </View>
      <Text style={[styles.cardTitle, { color: colors.text, textAlign: 'center' }]}>{title}</Text>
      <Text style={[styles.cardMeta, { color: colors.textMuted, textAlign: 'center' }]}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionGap: { gap: 22 },
  cardShadow: Platform.select({
    ios: {
      shadowOpacity: 0.08,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
    },
    android: { elevation: 3 },
    default: {},
  }),
  panel: { borderRadius: 22, borderWidth: 1, padding: 18, overflow: 'hidden' },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  panelDate: { fontSize: 20, fontWeight: '800', marginTop: 6, letterSpacing: -0.3 },
  panelBody: { fontSize: 14, lineHeight: 21, marginTop: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 22, fontWeight: '800', marginTop: 4, letterSpacing: -0.3 },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase' },
  link: { fontSize: 14, fontWeight: '700' },
  pageTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.4 },
  pageSub: { fontSize: 14, lineHeight: 21, marginTop: 6 },
  pageHeaderRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  card: { borderRadius: 22, borderWidth: 1, marginBottom: 14, overflow: 'hidden' },
  cardTitle: { fontSize: 17, fontWeight: '800', letterSpacing: -0.2 },
  cardMeta: { fontSize: 13, marginTop: 4 },
  cardHint: { fontSize: 13, lineHeight: 19 },
  cardLink: { fontSize: 14, fontWeight: '700' },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  scheduleStrip: { paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth },
  camperRow: { flexDirection: 'row', gap: 14, padding: 16, paddingBottom: 14 },
  avatar: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 17, fontWeight: '800', color: '#fff' },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusPillOk: { backgroundColor: '#dcfce7' },
  statusPillWarn: { backgroundColor: '#fef3c7' },
  statusPillText: { fontSize: 12, fontWeight: '700' },
  quickGrid: { flexDirection: 'row', gap: 12, marginTop: 14 },
  quickCol: { flex: 1, gap: 12 },
  quickCard: { borderRadius: 20, borderWidth: 1, padding: 14, minHeight: 130 },
  quickTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  quickIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  quickTitle: { fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },
  quickDesc: { fontSize: 12, marginTop: 4, lineHeight: 17 },
  primaryBtn: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  submissionTop: { flexDirection: 'row', gap: 10 },
  highlightPanel: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 10 },
  innerCard: { borderRadius: 14, padding: 12 },
  empty: { borderRadius: 22, borderWidth: 1, padding: 28, alignItems: 'center' },
  emptyIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  swimActions: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 },
  confirmedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  confirmedText: { color: '#15803d', fontSize: 12, fontWeight: '600' },
});
