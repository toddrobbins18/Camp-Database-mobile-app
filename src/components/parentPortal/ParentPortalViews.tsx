import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WelcomeHero } from './WelcomeHero';
import { TodayAtCampBanner } from './TodayAtCampBanner';
import { ParentActionTiles } from './ParentActionTiles';
import { supabase } from '../../lib/supabase';
import { formatCampDateTime } from '../../lib/campTime';
import {
  absenceTypeLabel,
  camperDisplayGroup,
  camperInitials,
  changeTypeLabel,
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
import { PP, ppCard, ppFont, ppPrimaryBtn } from '../../lib/parentPortalUi';
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

function FriendlySection({
  icon,
  title,
  action,
  colors,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  action?: React.ReactNode;
  colors: ParentPortalColors;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <View style={styles.sectionTitleRow}>
          <View style={[styles.sectionIcon, { backgroundColor: colors.brandSubtle }]}>
            <Ionicons name={icon} size={18} color={colors.brand} />
          </View>
          <Text style={[ppFont.titleSm, { color: colors.text, flex: 1 }]}>{title}</Text>
        </View>
        {action}
      </View>
      {children}
    </View>
  );
}

function StatusBadge({ status }: { status: string }) {
  const badge = statusBadgeStyle(status);
  return (
    <View style={[styles.badge, { backgroundColor: badge.bg }]}>
      <Text style={[ppFont.label, { color: badge.text, letterSpacing: 0.3, textTransform: 'none' }]}>
        {statusDisplayLabel(status)}
      </Text>
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

  const firstName = camper.name.trim().split(/\s+/)[0];
  const footerIcon = pickupToday ? 'car-outline' : swimToday ? 'water-outline' : 'sunny-outline';
  const footerText = pickupToday
    ? `Pickup ${pickupToday.pickup_time || 'time TBD'}${pickupToday.pickup_person_name ? ` · ${pickupToday.pickup_person_name}` : ''}`
    : swimToday
      ? `Swim lesson at ${new Date(swimToday.scheduled_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
      : 'Normal camp day';

  const Wrapper = onView ? TouchableOpacity : View;

  return (
    <Wrapper
      style={[ppCard(colors), styles.camperCard]}
      {...(onView ? { onPress: onView, activeOpacity: 0.7 } : {})}
    >
      <View style={styles.camperTop}>
        <View style={[styles.avatar, { backgroundColor: colors.brand }]}>
          <Text style={[ppFont.titleSm, { color: '#fff' }]}>{camperInitials(camper.name)}</Text>
        </View>
        <View style={styles.camperBody}>
          <Text style={[ppFont.titleSm, { color: colors.text }]} numberOfLines={1}>
            {camper.name}
          </Text>
          {group ? (
            <Text style={[ppFont.caption, { color: colors.textMuted, marginTop: 2 }]} numberOfLines={1}>
              {group}
            </Text>
          ) : null}
        </View>
      </View>

      <View
        style={[
          styles.statusBanner,
          { backgroundColor: absentToday ? colors.warningBg : colors.successBg },
        ]}
      >
        <Ionicons
          name={absentToday ? 'home' : 'checkmark-circle'}
          size={22}
          color={absentToday ? colors.warning : colors.success}
        />
        <Text
          style={[
            ppFont.bodyMedium,
            { color: absentToday ? colors.warning : colors.success, marginLeft: PP.sm, flex: 1 },
          ]}
        >
          {absentToday ? `${firstName} is home today` : `${firstName} is at camp`}
        </Text>
      </View>

      <View style={[styles.camperFooter, { borderTopColor: colors.border }]}>
        <Ionicons name={footerIcon} size={18} color={colors.brand} />
        <Text style={[ppFont.body, { color: colors.textMuted, flex: 1, marginLeft: PP.sm }]} numberOfLines={2}>
          {footerText}
        </Text>
      </View>
    </Wrapper>
  );
}

export function ParentHomeView({
  contactName,
  campers,
  pickups,
  absences,
  swimLessons,
  onNavigate,
  colors,
}: Pick<
  SharedViewProps,
  'contactName' | 'campers' | 'pickups' | 'absences' | 'swimLessons' | 'onNavigate' | 'colors'
>) {
  const todayIso = todayIsoDate();
  const camperName = (id: string) => campers.find((c) => c.id === id)?.name?.split(/\s+/)[0] ?? 'Your child';

  return (
    <View style={styles.page}>
      <WelcomeHero contactName={contactName} colors={colors} />

      <TodayAtCampBanner
        todayIso={todayIso}
        pickups={pickups}
        absences={absences}
        swimLessons={swimLessons}
        camperName={camperName}
        colors={colors}
      />

      <FriendlySection
        icon="people"
        title="Your kids"
        colors={colors}
        action={
          campers.length > 0 ? (
            <TouchableOpacity onPress={() => onNavigate('campers')} hitSlop={8}>
              <Text style={[ppFont.bodyMedium, { color: colors.brand }]}>See all</Text>
            </TouchableOpacity>
          ) : undefined
        }
      >
        {campers.length === 0 ? (
          <EmptyBlock
            icon="hourglass-outline"
            title="We're getting your kids ready"
            description="The camp office will link your children here soon. Check back shortly!"
            colors={colors}
          />
        ) : (
          <View style={styles.stack}>
            {campers.slice(0, 4).map((camper) => (
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
            ))}
          </View>
        )}
      </FriendlySection>

      <FriendlySection icon="hand-left-outline" title="Need to tell camp something?" colors={colors}>
        <ParentActionTiles onNavigate={onNavigate} colors={colors} />
      </FriendlySection>
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
    <View style={styles.page}>
      <PageIntro title="Your kids" subtitle="See who's at camp and what's on the schedule." colors={colors} />
      {campers.length === 0 ? (
        <EmptyBlock icon="people-outline" title="No kids linked yet" description="Contact the camp office if you expected to see your children here." colors={colors} />
      ) : (
        <View style={styles.stack}>
          {campers.map((camper) => (
            <CamperCard
              key={camper.id}
              camper={camper}
              todayIso={todayIso}
              absences={absences}
              pickups={pickups}
              swimLessons={swimLessons}
              colors={colors}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function PageIntro({
  title,
  subtitle,
  colors,
}: {
  title: string;
  subtitle: string;
  colors: ParentPortalColors;
}) {
  return (
    <View style={styles.pageIntro}>
      <Text style={[ppFont.title, { color: colors.text }]}>{title}</Text>
      <Text style={[ppFont.body, { color: colors.textMuted, marginTop: PP.sm }]}>{subtitle}</Text>
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
    <View style={[ppCard(colors), styles.submissionCard]}>
      <View style={styles.submissionTop}>
        <View style={{ flex: 1, paddingRight: PP.md }}>
          <Text style={[ppFont.bodyMedium, { color: colors.text }]}>{title}</Text>
          <Text style={[ppFont.caption, { color: colors.textMuted, marginTop: PP.xs }]}>{meta}</Text>
          {detail ? (
            <Text style={[ppFont.caption, { color: colors.text, marginTop: PP.sm }]}>{detail}</Text>
          ) : null}
        </View>
        <StatusBadge status={status} />
      </View>
    </View>
  );
}

function PageHeaderWithAction({
  title,
  subtitle,
  actionLabel,
  onAction,
  disabled,
  colors,
}: {
  title: string;
  subtitle: string;
  actionLabel: string;
  onAction: () => void;
  disabled?: boolean;
  colors: ParentPortalColors;
}) {
  return (
    <View style={styles.pageHeaderBlock}>
      <Text style={[ppFont.title, { color: colors.text }]}>{title}</Text>
      <Text style={[ppFont.body, { color: colors.textMuted, marginTop: PP.sm }]}>{subtitle}</Text>
      <TouchableOpacity
        style={[ppPrimaryBtn(colors), styles.pageHeaderBtn, disabled && { opacity: 0.45 }]}
        onPress={onAction}
        disabled={disabled}
      >
        <Text style={[ppFont.bodyMedium, { color: '#fff', fontSize: 17 }]}>{actionLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

export function ParentPickupsView(props: SharedViewProps) {
  const [formOpen, setFormOpen] = useState(false);
  const todayIso = todayIsoDate();
  const todayPickups = props.pickups.filter((p) => p.change_date === todayIso);

  return (
    <View style={styles.page}>
      <PageHeaderWithAction
        title="Pickup changes"
        subtitle="Tell us if pickup will be different today or another day."
        actionLabel="Tell camp"
        onAction={() => setFormOpen(true)}
        disabled={props.campers.length === 0}
        colors={props.colors}
      />

      {todayPickups.length > 0 ? (
        <View style={[ppCard(props.colors), styles.highlightBox, { backgroundColor: props.colors.brandSubtle }]}>
          <Text style={[ppFont.label, { color: props.colors.brand }]}>Today</Text>
          {todayPickups.map((p) => (
            <View key={p.id} style={[styles.innerRow, { backgroundColor: props.colors.elevated }]}>
              <Text style={[ppFont.bodyMedium, { color: props.colors.text }]}>{props.camperName(p.camper_id)}</Text>
              <Text style={[ppFont.caption, { color: props.colors.textMuted, marginTop: PP.xs }]}>
                {changeTypeLabel(p.change_type)}
                {p.pickup_time ? ` · ${p.pickup_time}` : ''}
              </Text>
              <View style={{ marginTop: PP.sm, alignSelf: 'flex-start' }}>
                <StatusBadge status={p.status} />
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {props.pickups.length === 0 ? (
        <EmptyBlock icon="car-outline" title="No pickup changes yet" description="Tap “Tell camp” when pickup will be different." colors={props.colors} />
      ) : (
        <View style={styles.stack}>
          {props.pickups.map((p) => (
            <SubmissionCard
              key={p.id}
              title={`${props.camperName(p.camper_id)} · ${changeTypeLabel(p.change_type)}`}
              meta={`${p.change_date}${p.pickup_time ? ` · ${p.pickup_time}` : ''}${p.pickup_person_name ? ` · ${p.pickup_person_name}` : ''}`}
              detail={p.notes ?? undefined}
              status={p.status}
              colors={props.colors}
            />
          ))}
        </View>
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
    <View style={styles.page}>
      <PageHeaderWithAction
        title="Absences & late days"
        subtitle="Let us know if your child won't come or will arrive late."
        actionLabel="Let us know"
        onAction={() => setFormOpen(true)}
        disabled={props.campers.length === 0}
        colors={props.colors}
      />

      {props.absences.length === 0 ? (
        <EmptyBlock icon="calendar-outline" title="Nothing reported yet" description="Tap “Let us know” when your child can't make it to camp." colors={props.colors} />
      ) : (
        <View style={styles.stack}>
          {props.absences.map((a) => (
            <SubmissionCard
              key={a.id}
              title={`${props.camperName(a.camper_id)} · ${absenceTypeLabel(a.absence_type)}`}
              meta={`${a.absence_date}${a.arrival_time ? ` · ${a.arrival_time}` : ''}`}
              detail={a.reason ? `Reason: ${a.reason}` : a.notes ?? undefined}
              status={a.status}
              colors={props.colors}
            />
          ))}
        </View>
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
    <View style={styles.page}>
      <PageHeaderWithAction
        title="Who can pick up?"
        subtitle="Grandparents, friends, or anyone approved to pick up your child."
        actionLabel="Add person"
        onAction={() => setFormOpen(true)}
        colors={props.colors}
      />

      {props.authPickups.length === 0 ? (
        <EmptyBlock icon="people-outline" title="No one added yet" description="Add adults who are allowed to pick up your child." colors={props.colors} />
      ) : (
        <View style={styles.stack}>
          {props.authPickups.map((adult) => (
            <View key={adult.id} style={[ppCard(props.colors), styles.adultCard]}>
              <View style={styles.camperTop}>
                <View style={[styles.avatar, { backgroundColor: props.colors.brandSoft }]}>
                  <Text style={[ppFont.titleSm, { color: props.colors.brandDark }]}>
                    {camperInitials(adult.full_name)}
                  </Text>
                </View>
                <View style={styles.camperBody}>
                  <Text style={[ppFont.bodyMedium, { color: props.colors.text }]}>{adult.full_name}</Text>
                  {adult.relationship ? (
                    <Text style={[ppFont.caption, { color: props.colors.textMuted, marginTop: 2 }]}>
                      {adult.relationship}
                    </Text>
                  ) : null}
                  <Text style={[ppFont.caption, { color: props.colors.textMuted, marginTop: PP.sm }]}>
                    {[adult.phone, adult.email].filter(Boolean).join(' · ') || 'No contact on file'}
                  </Text>
                  <Text style={[ppFont.caption, { color: props.colors.textSubtle, marginTop: 2 }]}>
                    {adult.camper_id ? `For ${props.camperName(adult.camper_id)}` : 'All campers'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.removeBtn, { borderTopColor: props.colors.border }]}
                onPress={async () => {
                  const { error } = await supabase.from('authorized_pickups').delete().eq('id', adult.id);
                  if (error) Alert.alert('Error', error.message);
                  else props.onSaved();
                }}
              >
                <Text style={[ppFont.caption, { color: '#DC2626', fontWeight: '500' }]}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
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
    <View style={styles.page}>
      <PageIntro
        title="Swim lessons"
        subtitle="Camp schedules these — tap confirm when you get a reminder."
        colors={colors}
      />

      {swimLessons.length === 0 ? (
        <EmptyBlock icon="water-outline" title="No swim lessons yet" description="When camp schedules a lesson, it will show up here." colors={colors} />
      ) : (
        <View style={styles.stack}>
          {swimLessons.map((lesson) => (
            <View key={lesson.id} style={[ppCard(colors), styles.swimCard]}>
              <Text style={[ppFont.bodyMedium, { color: colors.text }]}>{camperName(lesson.camper_id)}</Text>
              <Text style={[ppFont.caption, { color: colors.textMuted, marginTop: PP.xs }]}>
                {formatCampDateTime(lesson.scheduled_at)}
              </Text>
              <Text style={[ppFont.caption, { color: colors.text, marginTop: PP.sm }]}>
                {lesson.duration_minutes} min
                {lesson.instructor ? ` · ${lesson.instructor}` : ''}
                {lesson.location ? ` · ${lesson.location}` : ''}
                {' · '}${(lesson.cost_cents / 100).toFixed(2)}
              </Text>
              {lesson.parent_confirmed ? (
                <View style={styles.swimActions}>
                  <View style={[styles.confirmedBadge, { backgroundColor: colors.successBg }]}>
                    <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                    <Text style={[ppFont.caption, { color: colors.success, fontWeight: '500', marginLeft: 4 }]}>
                      Confirmed
                    </Text>
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
                    <Text style={[ppFont.caption, { color: colors.brand, fontWeight: '500' }]}>Undo</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[ppPrimaryBtn(colors), { alignSelf: 'flex-start', marginTop: PP.md }]}
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
                  <Text style={[ppFont.bodyMedium, { color: '#fff' }]}>Confirm attendance</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function EmptyBlock({
  icon = 'information-circle-outline',
  title,
  description,
  colors,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  colors: ParentPortalColors;
}) {
  return (
    <View style={[ppCard(colors), styles.empty]}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.brandSubtle }]}>
        <Ionicons name={icon} size={28} color={colors.brand} />
      </View>
      <Text style={[ppFont.bodyMedium, { color: colors.text, textAlign: 'center' }]}>{title}</Text>
      <Text style={[ppFont.caption, { color: colors.textMuted, textAlign: 'center', marginTop: PP.sm }]}>
        {description}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { gap: PP.xxl },
  pageIntro: { marginBottom: PP.xs },
  pageHeaderBlock: { gap: 0 },
  pageHeaderBtn: { marginTop: PP.lg, width: '100%', minHeight: 50, borderRadius: 14 },
  section: { gap: PP.md },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: PP.sm,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: PP.sm },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stack: { gap: PP.md },
  camperCard: {},
  camperTop: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: PP.lg,
    gap: PP.md,
  },
  camperBody: { flex: 1, minWidth: 0 },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: PP.lg,
    marginBottom: PP.md,
    padding: PP.md,
    borderRadius: 12,
  },
  camperFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: PP.lg,
    paddingVertical: PP.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submissionCard: { padding: PP.lg },
  submissionTop: { flexDirection: 'row', alignItems: 'flex-start' },
  badge: { borderRadius: 999, paddingHorizontal: PP.sm, paddingVertical: PP.xs },
  highlightBox: { padding: PP.lg, gap: PP.sm },
  innerRow: { borderRadius: 12, padding: PP.md },
  adultCard: { overflow: 'hidden' },
  removeBtn: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: PP.md,
    alignItems: 'center',
  },
  swimCard: { padding: PP.lg },
  swimActions: { flexDirection: 'row', alignItems: 'center', gap: PP.lg, marginTop: PP.md },
  confirmedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: PP.sm,
    paddingVertical: PP.xs,
    borderRadius: 999,
  },
  empty: {
    padding: PP.xxl,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: PP.md,
  },
});
