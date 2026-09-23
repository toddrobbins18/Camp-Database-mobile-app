import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { formatCampDateTime } from '../../lib/campTime';
import {
  absenceTypeLabel,
  camperDisplayGroup,
  camperInitials,
  changeTypeLabel,
  formatFriendlyDate,
  greetingForHour,
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
  const pickupToday = pickups.some((p) => p.camper_id === camper.id && p.change_date === todayIso);
  const swimToday = swimLessons.some((l) => l.camper_id === camper.id && l.scheduled_at.startsWith(todayIso));
  const group = camperDisplayGroup(camper);

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.elevated, borderColor: colors.border }]}
      onPress={onView}
      disabled={!onView}
      activeOpacity={onView ? 0.85 : 1}
    >
      <View style={styles.camperRow}>
        <View style={[styles.avatar, { backgroundColor: colors.brandSoft }]}>
          <Text style={[styles.avatarText, { color: colors.brandDark }]}>{camperInitials(camper.name)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{camper.name}</Text>
          {group ? <Text style={[styles.cardMeta, { color: colors.textMuted }]}>{group}</Text> : null}
          <View style={styles.statusRow}>
            <Ionicons
              name={absentToday ? 'close-circle' : 'checkmark-circle'}
              size={14}
              color={absentToday ? '#dc2626' : '#16a34a'}
            />
            <Text style={[styles.statusLine, { color: colors.textMuted }]}>
              {absentToday ? 'Absent today' : 'Expected at camp today'}
            </Text>
          </View>
          <Text style={[styles.cardHint, { color: colors.textSubtle }]}>
            {pickupToday
              ? 'Pickup change on file for today'
              : swimToday
                ? 'Swim lesson scheduled today'
                : 'No special schedule updates for today.'}
          </Text>
        </View>
      </View>
      {onView ? (
        <Text style={[styles.cardLink, { color: colors.brand }]}>View camper ›</Text>
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
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  onPress: () => void;
  colors: ParentPortalColors;
}) {
  return (
    <TouchableOpacity
      style={[styles.quickCard, { backgroundColor: colors.elevated, borderColor: colors.border }]}
      onPress={onPress}
    >
      <View style={[styles.quickIcon, { backgroundColor: colors.brandSubtle }]}>
        <Ionicons name={icon} size={20} color={colors.brand} />
      </View>
      <Text style={[styles.quickTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.quickDesc, { color: colors.textMuted }]}>{description}</Text>
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
  const hour = new Date().getHours();
  const firstName = contactName?.split(' ')[0];

  return (
    <View style={styles.sectionGap}>
      <View style={[styles.hero, { backgroundColor: colors.brand }]}>
        <Text style={styles.heroDate}>{formatFriendlyDate(todayIso)}</Text>
        <Text style={styles.heroGreeting}>
          {greetingForHour(hour)}
          {firstName ? `, ${firstName}` : ''} 👋
        </Text>
        <Text style={styles.heroSub}>
          Here&apos;s what&apos;s happening with your family at {campName}.
        </Text>
      </View>

      <View style={[styles.panel, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
        <SectionEyebrow colors={colors}>Today at camp</SectionEyebrow>
        <Text style={[styles.panelDate, { color: colors.text }]}>{formatFriendlyDate(todayIso)}</Text>
        <Text style={[styles.panelBody, { color: colors.textMuted }]}>
          {pickups.filter((p) => p.change_date === todayIso).length ||
          absences.filter((a) => a.absence_date === todayIso).length ||
          swimLessons.filter((l) => l.scheduled_at.startsWith(todayIso)).length
            ? 'See your campers below for today\'s updates.'
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
          <QuickAction icon="calendar-outline" title="Change pickup" description="Request a different pickup arrangement." onPress={() => onNavigate('pickups')} colors={colors} />
          <QuickAction icon="time-outline" title="Report an absence" description="Let camp know about absences or late arrivals." onPress={() => onNavigate('absences')} colors={colors} />
          <QuickAction icon="shield-checkmark-outline" title="Authorized adults" description="Manage approved pickup contacts." onPress={() => onNavigate('authorized')} colors={colors} />
          <QuickAction icon="water-outline" title="Swim lessons" description="View and confirm swim lessons." onPress={() => onNavigate('swim')} colors={colors} />
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
    <View style={[styles.empty, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
      <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.cardMeta, { color: colors.textMuted }]}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionGap: { gap: 20 },
  hero: { borderRadius: 24, padding: 20 },
  heroDate: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' },
  heroGreeting: { color: '#fff', fontSize: 26, fontWeight: '700', marginTop: 8 },
  heroSub: { color: 'rgba(255,255,255,0.9)', fontSize: 14, lineHeight: 20, marginTop: 8 },
  panel: { borderRadius: 20, borderWidth: 1, padding: 16 },
  panelDate: { fontSize: 16, fontWeight: '600', marginTop: 4 },
  panelBody: { fontSize: 14, lineHeight: 20, marginTop: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 20, fontWeight: '700', marginTop: 4 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  link: { fontSize: 14, fontWeight: '600' },
  pageTitle: { fontSize: 24, fontWeight: '700' },
  pageSub: { fontSize: 14, lineHeight: 20, marginTop: 6 },
  pageHeaderRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  card: { borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardMeta: { fontSize: 13, marginTop: 4 },
  cardHint: { fontSize: 13, marginTop: 6, lineHeight: 18 },
  cardLink: { fontSize: 13, fontWeight: '600', marginTop: 12 },
  camperRow: { flexDirection: 'row', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '700' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  statusLine: { fontSize: 13 },
  quickGrid: { gap: 12, marginTop: 12 },
  quickCard: { borderRadius: 18, borderWidth: 1, padding: 16 },
  quickIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  quickTitle: { fontSize: 15, fontWeight: '700' },
  quickDesc: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  primaryBtn: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  submissionTop: { flexDirection: 'row', gap: 10 },
  highlightPanel: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 10 },
  innerCard: { borderRadius: 14, padding: 12 },
  empty: { borderRadius: 18, borderWidth: 1, padding: 20 },
  swimActions: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 },
  confirmedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  confirmedText: { color: '#15803d', fontSize: 12, fontWeight: '600' },
});
