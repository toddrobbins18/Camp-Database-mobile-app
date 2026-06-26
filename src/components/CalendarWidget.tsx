import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    useWindowDimensions,
    PanResponder,
    type ViewStyle,
    type StyleProp,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { StyledCard } from './StyledCard';

/* ─── Public types ─── */

export interface CalendarWidgetEvent {
    id: string;
    title: string;
    date: Date;
    time?: string;
    location?: string;
    type?: string;
    tags?: string[];
    accent?: { bg: string; text: string; marker: string };
}

export type CalendarViewMode = 'Month' | 'Week' | 'Day' | 'Agenda';

export interface CalendarWidgetProps {
    events: CalendarWidgetEvent[];
    currentDate: Date;
    onCurrentDateChange: (date: Date) => void;
    selectedDate: Date;
    onSelectedDateChange: (date: Date) => void;
    onEventPress?: (event: CalendarWidgetEvent) => void;
    onDatePress?: (date: Date, dayEvents: CalendarWidgetEvent[]) => void;
    views?: CalendarViewMode[];
    initialView?: CalendarViewMode;
    showZoom?: boolean;
    showNavigation?: boolean;
    containerStyle?: StyleProp<ViewStyle>;
    /** Accent resolver — return custom accent for a day's first event */
    getEventAccent?: (event: CalendarWidgetEvent) => { bg: string; text: string; marker: string };
    /** Custom tag style resolver */
    getTagStyle?: (tag: string) => { backgroundColor: string; color: string; borderWidth?: number; borderColor?: string };
}

/* ─── Default accent ─── */

const DEFAULT_ACCENT = { bg: '#e5e7eb', text: theme.colors.text, marker: theme.colors.secondary };

function defaultGetEventAccent(event: CalendarWidgetEvent) {
    return event.accent ?? DEFAULT_ACCENT;
}

function defaultGetTagStyle(tag: string) {
    if (tag === 'Sports') return { backgroundColor: '#dbeafe', color: '#1e40af' };
    if (tag === 'Field Trip') return { backgroundColor: '#dcfce7', color: '#166534' };
    if (tag === 'Special Event') return { backgroundColor: '#f3e8ff', color: '#6b21a8' };
    return { backgroundColor: 'white', color: theme.colors.text, borderWidth: 1, borderColor: theme.colors.border };
}

/* ─── Helpers ─── */

function isSameDate(a: Date, b: Date) {
    return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
}

function formatMonthYear(date: Date) {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

function formatEventDate(date: Date) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
}

function formatTime12Hour(timeStr?: string): string {
    if (!timeStr || typeof timeStr !== 'string') return '';
    const t = timeStr.trim();
    if (t.toUpperCase().includes('AM') || t.toUpperCase().includes('PM')) {
      return t.toUpperCase();
    }
    const m = t.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
    if (!m) return t;
    let h = parseInt(m[1], 10);
    const min = m[2] ? parseInt(m[2], 10) : 0;
    const ampm = (m[3] || '').toLowerCase();
    if (ampm === 'pm' && h < 12) h += 12;
    if (ampm === 'am' && h === 12) h = 0;
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${String(min).padStart(2, '0')} ${period}`;
}

function getDaysInMonth(date: Date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: { date: number; isCurrentMonth: boolean; fullDate: Date }[] = [];
    const prevMonth = new Date(year, month - 1, 0);
    const prevMonthDays = prevMonth.getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
        days.push({ date: prevMonthDays - i, isCurrentMonth: false, fullDate: new Date(year, month - 1, prevMonthDays - i) });
    }
    for (let i = 1; i <= daysInMonth; i++) {
        days.push({ date: i, isCurrentMonth: true, fullDate: new Date(year, month, i) });
    }
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
        days.push({ date: i, isCurrentMonth: false, fullDate: new Date(year, month + 1, i) });
    }
    return days;
}

function getWeekDays(date: Date) {
    const weekStart = new Date(date);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        days.push(d);
    }
    return days;
}

function getEventIcon(type?: string): keyof typeof Ionicons.glyphMap {
    if (type === 'sports') return 'trophy-outline';
    if (type === 'field-trip') return 'people-outline';
    if (type === 'special-event') return 'star-outline';
    return 'calendar-outline';
}

/* ─── Constants ─── */

const ZOOM_BAR_WIDTH = 120;
const ZOOM_THUMB_SIZE = 16;
const WEEK_DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/* ─── Component ─── */

export const CalendarWidget: React.FC<CalendarWidgetProps> = ({
    events,
    currentDate,
    onCurrentDateChange,
    selectedDate,
    onSelectedDateChange,
    onEventPress,
    onDatePress,
    views = ['Month', 'Week', 'Day', 'Agenda'],
    initialView = 'Month',
    showZoom = false,
    showNavigation = true,
    containerStyle,
    getEventAccent = defaultGetEventAccent,
    getTagStyle: getTagStyleProp = defaultGetTagStyle,
}) => {
    const { height: viewportHeight } = useWindowDimensions();
    const [activeView, setActiveView] = useState<CalendarViewMode>(initialView);

    /* ── Zoom state ── */
    const [calendarZoomOffset, setCalendarZoomOffset] = useState(0);
    const [zoomBarWidth, setZoomBarWidth] = useState(ZOOM_BAR_WIDTH);
    const zoomBarWidthRef = useRef(ZOOM_BAR_WIDTH);
    const zoomTrackRef = useRef<View>(null);
    const zoomMoveRafRef = useRef<number | null>(null);
    const pendingZoomPageXRef = useRef<number | null>(null);

    const minCalendarHeight = 320;
    const maxCalendarHeight = 900;
    const autoCalendarHeight = useMemo(() => {
        const available = viewportHeight - 380;
        return Math.max(minCalendarHeight, Math.min(maxCalendarHeight, available));
    }, [viewportHeight]);

    const effectiveCalendarHeight = Math.max(
        minCalendarHeight,
        Math.min(maxCalendarHeight, autoCalendarHeight + calendarZoomOffset),
    );
    const monthGridHeight = Math.max(240, effectiveCalendarHeight - 48);
    const monthCellHeight = Math.max(34, Math.floor(monthGridHeight / 6) - 6);

    const handleZoomOut = () => setCalendarZoomOffset((p) => Math.max(p - 80, minCalendarHeight - autoCalendarHeight));
    const handleZoomIn = () => setCalendarZoomOffset((p) => Math.min(p + 80, maxCalendarHeight - autoCalendarHeight));
    const handleAutoAdjust = () => setCalendarZoomOffset(0);

    const zoomMathRef = useRef({
        minCalendarHeight,
        maxCalendarHeight,
        autoCalendarHeight,
    });
    zoomMathRef.current = {
        minCalendarHeight,
        maxCalendarHeight,
        autoCalendarHeight,
    };

    const setZoomFromRatio = (ratio: number) => {
        const { minCalendarHeight: minH, maxCalendarHeight: maxH, autoCalendarHeight: autoH } =
            zoomMathRef.current;
        const clamped = Math.max(0, Math.min(1, Number.isFinite(ratio) ? ratio : 0));
        const targetHeight = minH + clamped * (maxH - minH);
        const nextOffset = targetHeight - autoH;
        setCalendarZoomOffset(Number.isFinite(nextOffset) ? nextOffset : 0);
    };

    const zoomRatio = (effectiveCalendarHeight - minCalendarHeight) / (maxCalendarHeight - minCalendarHeight);

    const applyZoomFromPageXRef = useRef((_pageX: number) => {});
    applyZoomFromPageXRef.current = (pageX: number) => {
        zoomTrackRef.current?.measureInWindow((mx, _y, mw) => {
            const width = Math.max(mw > 0 ? mw : zoomBarWidthRef.current, 1);
            setZoomFromRatio((pageX - mx) / width);
        });
    };

    const scheduleZoomFromPageXRef = useRef((_pageX: number) => {});
    scheduleZoomFromPageXRef.current = (pageX: number) => {
        pendingZoomPageXRef.current = pageX;
        if (zoomMoveRafRef.current != null) return;
        zoomMoveRafRef.current = requestAnimationFrame(() => {
            zoomMoveRafRef.current = null;
            const px = pendingZoomPageXRef.current;
            pendingZoomPageXRef.current = null;
            if (px != null) applyZoomFromPageXRef.current(px);
        });
    };

    useEffect(
        () => () => {
            if (zoomMoveRafRef.current != null) {
                cancelAnimationFrame(zoomMoveRafRef.current);
            }
        },
        []
    );

    const zoomPanResponder = useMemo(
        () =>
            PanResponder.create({
                onStartShouldSetPanResponder: () => true,
                onStartShouldSetPanResponderCapture: () => true,
                onMoveShouldSetPanResponder: () => true,
                onMoveShouldSetPanResponderCapture: () => true,
                onPanResponderTerminationRequest: () => false,
                onShouldBlockNativeResponder: () => true,
                onPanResponderGrant: (evt) => {
                    applyZoomFromPageXRef.current(evt.nativeEvent.pageX);
                },
                onPanResponderMove: (evt) => {
                    scheduleZoomFromPageXRef.current(evt.nativeEvent.pageX);
                },
                onPanResponderRelease: (evt, gestureState) => {
                    if (
                        Math.abs(gestureState.dx) < 6 &&
                        Math.abs(gestureState.dy) < 6
                    ) {
                        applyZoomFromPageXRef.current(evt.nativeEvent.pageX);
                    }
                },
            }),
        []
    );

    /* ── Derived data ── */

    const calendarDays = useMemo(() => getDaysInMonth(currentDate), [currentDate]);

    const getEventsForDate = (date: Date) => events.filter((e) => isSameDate(e.date, date));

    const navigateMonth = (dir: 'prev' | 'next' | 'today') => {
        if (dir === 'today') {
            const today = new Date();
            onCurrentDateChange(today);
            onSelectedDateChange(today);
        } else {
            const d = new Date(currentDate);
            d.setMonth(d.getMonth() + (dir === 'prev' ? -1 : 1));
            onCurrentDateChange(d);
        }
    };

    /* ── Week helpers ── */
    const weekDaysList = useMemo(() => getWeekDays(currentDate), [currentDate]);
    const weekEvents = useMemo(() => {
        const map: Record<string, CalendarWidgetEvent[]> = {};
        weekDaysList.forEach((day) => {
            map[`${day.getDate()}-${day.getMonth()}-${day.getFullYear()}`] = getEventsForDate(day);
        });
        return map;
    }, [weekDaysList, events]);

    /* ── Agenda events sorted ── */
    const agendaEvents = useMemo(
        () => [...events].sort((a, b) => a.date.getTime() - b.date.getTime() || (a.time || '').localeCompare(b.time || '')),
        [events],
    );

    /* ─── Render ─── */

    return (
        <StyledCard style={[s.card, containerStyle]}>
            {/* Navigation */}
            {showNavigation && (
                <View style={s.navRow}>
                    <TouchableOpacity style={s.navBtn} onPress={() => navigateMonth('today')}>
                        <Text style={s.navBtnText}>Today</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.navBtn} onPress={() => navigateMonth('prev')}>
                        <Text style={s.navBtnText}>Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.navBtn} onPress={() => navigateMonth('next')}>
                        <Text style={s.navBtnText}>Next</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Zoom controls */}
            {showZoom && (
                <View style={s.zoomRow}>
                    <TouchableOpacity style={s.zoomBtn} onPress={handleZoomOut}>
                        <Ionicons name="remove" size={16} color={theme.colors.text} />
                    </TouchableOpacity>
                    <View style={s.zoomTrackHit} {...zoomPanResponder.panHandlers}>
                        <View
                            ref={zoomTrackRef}
                            style={[s.zoomTrack, { width: ZOOM_BAR_WIDTH }]}
                            onLayout={(e) => {
                                const w = e.nativeEvent.layout.width;
                                if (Number.isFinite(w) && w > 0) {
                                    zoomBarWidthRef.current = w;
                                    setZoomBarWidth(w);
                                }
                            }}
                        >
                            <View style={[s.zoomFill, { width: `${zoomRatio * 100}%` }]} />
                            <View style={[s.zoomThumb, { left: zoomRatio * (zoomBarWidth - ZOOM_THUMB_SIZE) }]} />
                        </View>
                    </View>
                    <TouchableOpacity style={s.zoomBtn} onPress={handleZoomIn}>
                        <Ionicons name="add" size={16} color={theme.colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity style={s.zoomBtn} onPress={handleAutoAdjust}>
                        <Ionicons name="expand-outline" size={16} color={theme.colors.text} />
                    </TouchableOpacity>
                </View>
            )}

            {/* Month / Year */}
            <Text style={s.monthYear}>{formatMonthYear(currentDate)}</Text>

            {/* View tabs */}
            {views.length > 1 && (
                <View style={s.viewTabs}>
                    {views.map((v) => (
                        <TouchableOpacity
                            key={v}
                            style={[s.viewTab, activeView === v && s.viewTabActive]}
                            onPress={() => setActiveView(v)}
                        >
                            <Text style={[s.viewTabText, activeView === v && s.viewTabTextActive]}>{v}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {/* ── Month view ── */}
            {activeView === 'Month' && (
                <View style={[s.calendarGrid, { height: effectiveCalendarHeight }]}>
                    <View style={s.weekHeader}>
                        {WEEK_DAY_NAMES.map((d) => (
                            <View key={d} style={s.weekDayHeader}>
                                <Text style={s.weekDayText}>{d}</Text>
                            </View>
                        ))}
                    </View>
                    <View style={[s.daysGrid, { height: monthGridHeight }]}>
                        {calendarDays.map((day, idx) => {
                            const isSelected = isSameDate(day.fullDate, selectedDate);
                            const isToday = isSameDate(day.fullDate, new Date());
                            const dayEvts = getEventsForDate(day.fullDate);
                            const hasEvents = dayEvts.length > 0;
                            const dayAccent = hasEvents ? getEventAccent(dayEvts[0]) : DEFAULT_ACCENT;

                            return (
                                <TouchableOpacity
                                    key={idx}
                                    style={[
                                        s.dayCell,
                                        { height: monthCellHeight },
                                        !day.isCurrentMonth && s.dayCellOther,
                                        day.isCurrentMonth && hasEvents && s.dayCellWithEvents,
                                        day.isCurrentMonth && hasEvents && { borderColor: dayAccent.marker },
                                        day.isCurrentMonth && isSelected && s.dayCellSelectedOutline,
                                    ]}
                                    onPress={() => {
                                        onSelectedDateChange(day.fullDate);
                                        if (dayEvts.length > 0 && onEventPress) onEventPress(dayEvts[0]);
                                        if (onDatePress) onDatePress(day.fullDate, dayEvts);
                                        if (!day.isCurrentMonth) onCurrentDateChange(day.fullDate);
                                    }}
                                >
                                    <Text style={[
                                        s.dayText,
                                        !day.isCurrentMonth && s.dayTextOther,
                                        isSelected && day.isCurrentMonth && s.dayTextEmphasis,
                                        isToday && day.isCurrentMonth && !isSelected && s.dayTextTodayMark,
                                    ]}>
                                        {day.date}
                                    </Text>
                                    {day.isCurrentMonth && hasEvents && (
                                        <View style={[s.dayEventDot, { backgroundColor: dayAccent.marker }]} />
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            )}

            {/* ── Week view ── */}
            {activeView === 'Week' && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={s.weekViewContainer}>
                        {weekDaysList.map((day, idx) => {
                            const dayKey = `${day.getDate()}-${day.getMonth()}-${day.getFullYear()}`;
                            const dayEvts = weekEvents[dayKey] || [];
                            const isSelected = isSameDate(day, selectedDate);
                            const isToday = isSameDate(day, new Date());

                            return (
                                <View key={idx} style={s.weekDayColumn}>
                                    <TouchableOpacity
                                        style={[s.weekDayHeaderCell, isSelected && s.weekDayHeaderSelected, isToday && !isSelected && s.weekDayHeaderToday]}
                                        onPress={() => onSelectedDateChange(day)}
                                    >
                                        <Text style={s.weekDayName}>{WEEK_DAY_NAMES[day.getDay()]}</Text>
                                        <Text style={[s.weekDayNumber, isSelected && s.weekDayNumberSelected]}>{day.getDate()}</Text>
                                    </TouchableOpacity>
                                    <ScrollView style={[s.weekEventsList, { maxHeight: Math.max(220, effectiveCalendarHeight - 80) }]}>
                                        {dayEvts.map((evt) => (
                                            <TouchableOpacity key={evt.id} style={s.weekEventItem} onPress={() => onEventPress?.(evt)}>
                                                <Text style={s.weekEventTime}>{evt.time ? formatTime12Hour(evt.time) : ''}</Text>
                                                <Text style={s.weekEventTitle}>{evt.title}</Text>
                                                {evt.location ? <Text style={s.weekEventLocation}>{evt.location}</Text> : null}
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            );
                        })}
                    </View>
                </ScrollView>
            )}

            {/* ── Day view ── */}
            {activeView === 'Day' && (() => {
                const dayEvts = getEventsForDate(selectedDate);
                return (
                    <View style={s.dayViewContainer}>
                        <View style={s.dayHeader}>
                            <Text style={s.dayHeaderDate}>{formatEventDate(selectedDate)}</Text>
                            <Text style={s.dayHeaderYear}>{selectedDate.getFullYear()}</Text>
                        </View>
                        <ScrollView style={[s.dayEventsList, { maxHeight: effectiveCalendarHeight }]}>
                            {dayEvts.length > 0 ? dayEvts.map((evt) => (
                                <TouchableOpacity key={evt.id} onPress={() => onEventPress?.(evt)} activeOpacity={0.8}>
                                    <StyledCard style={s.dayEventCard}>
                                        <View style={s.dayEventHeader}>
                                            <Text style={s.dayEventTime}>{evt.time ? formatTime12Hour(evt.time) : ''}</Text>
                                            <Ionicons name={getEventIcon(evt.type)} size={20} color={theme.colors.secondary} />
                                        </View>
                                        <Text style={s.dayEventTitle}>{evt.title}</Text>
                                        {evt.location ? (
                                            <View style={s.dayEventLocation}>
                                                <Ionicons name="location" size={14} color="#ef4444" />
                                                <Text style={s.dayEventLocationText}>{evt.location}</Text>
                                            </View>
                                        ) : null}
                                        {evt.tags && evt.tags.length > 0 && (
                                            <View style={s.dayEventTags}>
                                                {evt.tags.map((tag, i) => {
                                                    const ts = getTagStyleProp(tag);
                                                    return (
                                                        <View key={i} style={[s.dayEventTag, ts]}>
                                                            <Text style={[s.dayEventTagText, { color: ts.color }]}>{tag}</Text>
                                                        </View>
                                                    );
                                                })}
                                            </View>
                                        )}
                                    </StyledCard>
                                </TouchableOpacity>
                            )) : (
                                <View style={s.emptyState}>
                                    <Text style={s.emptyText}>No events scheduled for this day</Text>
                                </View>
                            )}
                        </ScrollView>
                    </View>
                );
            })()}

            {/* ── Agenda view ── */}
            {activeView === 'Agenda' && (
                <ScrollView style={[s.agendaContainer, { maxHeight: effectiveCalendarHeight }]}>
                    {agendaEvents.length > 0 ? agendaEvents.map((evt) => (
                        <TouchableOpacity key={evt.id} onPress={() => onEventPress?.(evt)} activeOpacity={0.8}>
                            <StyledCard style={s.agendaCard}>
                                <View style={s.agendaDate}>
                                    <Text style={s.agendaDay}>{evt.date.getDate()}</Text>
                                    <Text style={s.agendaMonth}>
                                        {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][evt.date.getMonth()]}
                                    </Text>
                                </View>
                                <View style={s.agendaContent}>
                                    <View style={s.agendaHeader}>
                                        <Text style={s.agendaTime}>{evt.time ? formatTime12Hour(evt.time) : ''}</Text>
                                        <Ionicons name={getEventIcon(evt.type)} size={18} color={theme.colors.secondary} />
                                    </View>
                                    <Text style={s.agendaTitle}>{evt.title}</Text>
                                    {evt.location ? (
                                        <View style={s.agendaLocation}>
                                            <Ionicons name="location" size={12} color="#ef4444" />
                                            <Text style={s.agendaLocationText}>{evt.location}</Text>
                                        </View>
                                    ) : null}
                                </View>
                            </StyledCard>
                        </TouchableOpacity>
                    )) : (
                        <View style={s.emptyState}>
                            <Text style={s.emptyText}>No events found</Text>
                        </View>
                    )}
                </ScrollView>
            )}
        </StyledCard>
    );
};

/* ─── Styles ─── */

const s = StyleSheet.create({
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
    },
    /* Nav */
    navRow: { flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.md },
    navBtn: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
    },
    navBtnText: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
    /* Zoom */
    zoomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.xs, marginBottom: theme.spacing.md },
    /** Wider vertical hit area so drags aren’t lost to the parent ScrollView */
    zoomTrackHit: { paddingVertical: 12, justifyContent: 'center', alignItems: 'center' },
    zoomBtn: {
        width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border,
        alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface,
    },
    zoomTrack: { height: 8, borderRadius: 999, backgroundColor: '#e5e7eb', justifyContent: 'center', position: 'relative', marginHorizontal: 2 },
    zoomFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#0ea5e9', borderRadius: 999 },
    zoomThumb: { position: 'absolute', width: 16, height: 16, top: -4, borderRadius: 8, backgroundColor: '#fff', borderWidth: 2, borderColor: theme.colors.secondary },
    /* Month/Year */
    monthYear: { ...theme.typography.h2, fontSize: 20, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.md, textAlign: 'center' },
    /* View tabs */
    viewTabs: { flexDirection: 'row', backgroundColor: '#f3f4f6', borderRadius: theme.borderRadius.md, padding: 4, marginBottom: theme.spacing.md },
    viewTab: { flex: 1, paddingVertical: theme.spacing.sm, alignItems: 'center', borderRadius: theme.borderRadius.sm },
    viewTabActive: { backgroundColor: theme.colors.surface },
    viewTabText: { fontSize: 14, fontWeight: '600', color: theme.colors.textSecondary },
    viewTabTextActive: { color: theme.colors.text },
    /* Month grid */
    calendarGrid: { marginTop: theme.spacing.sm },
    weekHeader: { flexDirection: 'row', marginBottom: theme.spacing.xs },
    weekDayHeader: { flex: 1, alignItems: 'center', paddingVertical: theme.spacing.sm },
    weekDayText: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary },
    daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    dayCell: { width: '14.28%', alignItems: 'center', justifyContent: 'center', paddingVertical: theme.spacing.xs, position: 'relative' },
    dayCellOther: { backgroundColor: '#f3f4f6' },
    dayCellWithEvents: {
        borderWidth: 1.5,
        borderRadius: theme.borderRadius.md,
    },
    /** Neutral outline only — no blue fill (matches clean web month grid). */
    dayCellSelectedOutline: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
    },
    dayText: { fontSize: 14, color: theme.colors.text, fontWeight: '500' },
    dayTextOther: { color: theme.colors.textSecondary },
    dayTextEmphasis: { fontWeight: '700' },
    dayTextTodayMark: { fontWeight: '700' },
    dayEventDot: {
        width: 5,
        height: 5,
        borderRadius: 999,
        position: 'absolute',
        bottom: 4,
    },
    /* Week view */
    weekViewContainer: { flexDirection: 'row', minHeight: 400 },
    weekDayColumn: { width: 120, borderRightWidth: 1, borderRightColor: theme.colors.border, paddingHorizontal: theme.spacing.sm },
    weekDayHeaderCell: { padding: theme.spacing.sm, alignItems: 'center', borderRadius: theme.borderRadius.md, marginBottom: theme.spacing.sm },
    weekDayHeaderSelected: { backgroundColor: theme.colors.secondary },
    weekDayHeaderToday: { backgroundColor: '#FFA500' },
    weekDayName: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: theme.spacing.xs },
    weekDayNumber: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
    weekDayNumberSelected: { color: 'white' },
    weekEventsList: { flex: 1 },
    weekEventItem: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.sm, padding: theme.spacing.sm, marginBottom: theme.spacing.xs, borderLeftWidth: 3, borderLeftColor: theme.colors.secondary },
    weekEventTime: { fontSize: 10, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 2 },
    weekEventTitle: { fontSize: 12, fontWeight: '600', color: theme.colors.text, marginBottom: 2 },
    weekEventLocation: { fontSize: 10, color: theme.colors.textSecondary },
    /* Day view */
    dayViewContainer: { marginTop: theme.spacing.md },
    dayHeader: { alignItems: 'center', marginBottom: theme.spacing.lg, paddingBottom: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
    dayHeaderDate: { ...theme.typography.h1, fontSize: 32, fontWeight: '700', color: theme.colors.text },
    dayHeaderYear: { ...theme.typography.body, fontSize: 16, color: theme.colors.textSecondary, marginTop: theme.spacing.xs },
    dayEventsList: { maxHeight: 500 },
    dayEventCard: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginBottom: theme.spacing.md },
    dayEventHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.sm },
    dayEventTime: { ...theme.typography.h3, fontSize: 18, fontWeight: '700', color: theme.colors.secondary },
    dayEventTitle: { ...theme.typography.h3, fontSize: 18, fontWeight: '700', color: theme.colors.text, marginBottom: theme.spacing.sm },
    dayEventLocation: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, marginBottom: theme.spacing.sm },
    dayEventLocationText: { ...theme.typography.body, fontSize: 14, color: theme.colors.text },
    dayEventTags: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs },
    dayEventTag: { paddingHorizontal: theme.spacing.sm, paddingVertical: 4, borderRadius: theme.borderRadius.sm },
    dayEventTagText: { fontSize: 12, fontWeight: '500' },
    /* Agenda view */
    agendaContainer: { marginTop: theme.spacing.md, maxHeight: 500 },
    agendaCard: { flexDirection: 'row', backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginBottom: theme.spacing.md },
    agendaDate: { width: 60, alignItems: 'center', justifyContent: 'center', marginRight: theme.spacing.md, paddingRight: theme.spacing.md, borderRightWidth: 1, borderRightColor: theme.colors.border },
    agendaDay: { ...theme.typography.h2, fontSize: 24, fontWeight: '700', color: theme.colors.text },
    agendaMonth: { ...theme.typography.bodySmall, fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary, textTransform: 'uppercase' },
    agendaContent: { flex: 1 },
    agendaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.xs },
    agendaTime: { ...theme.typography.body, fontSize: 14, fontWeight: '600', color: theme.colors.textSecondary },
    agendaTitle: { ...theme.typography.h3, fontSize: 16, fontWeight: '700', color: theme.colors.text, marginBottom: theme.spacing.xs },
    agendaLocation: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
    agendaLocationText: { ...theme.typography.bodySmall, fontSize: 12, color: theme.colors.textSecondary },
    /* Empty */
    emptyState: { alignItems: 'center', justifyContent: 'center', padding: theme.spacing.xl },
    emptyText: { ...theme.typography.body, fontSize: 16, color: theme.colors.textSecondary },
});

export default CalendarWidget;
