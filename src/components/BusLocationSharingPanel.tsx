import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import {
    BUS_LOCATION_MODE_OPTIONS,
    type BusLocationSharingMode,
    loadBusLocationSessionEnabled,
    loadBusLocationSharingMode,
    saveBusLocationSessionEnabled,
    saveBusLocationSharingMode,
} from '../lib/busLocationSharing';
import type { TransportRunRoute } from '../lib/transportRunBoard';

type Props = {
    companyId: string | null;
    runDate: string;
    timeOfDay: 'am' | 'pm';
    routes: TransportRunRoute[];
    assignedBus: string | null;
    tracking: boolean;
    permissionDenied: boolean;
    selectedRouteId: number | null;
    onRouteChange: (routeId: number) => void;
};

export function BusLocationSharingPanel({
    companyId,
    runDate,
    timeOfDay,
    routes,
    assignedBus,
    tracking,
    permissionDenied,
    selectedRouteId,
    onRouteChange,
}: Props) {
    const [mode, setMode] = useState<BusLocationSharingMode>('off');
    const [sessionOn, setSessionOn] = useState(false);
    const [expanded, setExpanded] = useState(false);

    const loadPrefs = useCallback(async () => {
        const [m, s] = await Promise.all([
            loadBusLocationSharingMode(),
            companyId ? loadBusLocationSessionEnabled(companyId, runDate, timeOfDay) : Promise.resolve(false),
        ]);
        setMode(m);
        setSessionOn(s);
    }, [companyId, runDate, timeOfDay]);

    useEffect(() => {
        void loadPrefs();
    }, [loadPrefs]);

    useEffect(() => {
        if (selectedRouteId != null || routes.length === 0) return;
        onRouteChange(routes[0].id);
    }, [routes, selectedRouteId, onRouteChange]);

    const selectedRoute = useMemo(
        () => routes.find((r) => r.id === selectedRouteId) ?? routes[0] ?? null,
        [routes, selectedRouteId],
    );

    const setModeAndSave = async (next: BusLocationSharingMode) => {
        setMode(next);
        await saveBusLocationSharingMode(next);
    };

    const toggleSession = async (value: boolean) => {
        if (!companyId) return;
        if (value && mode === 'off') {
            Alert.alert(
                'Choose when to share',
                'Turn on location sharing below, then enable sharing for this bus run.',
            );
            setExpanded(true);
            return;
        }
        if (value && !selectedRoute) {
            Alert.alert('Select a route', 'Choose which bus route you are on.');
            return;
        }
        setSessionOn(value);
        await saveBusLocationSessionEnabled(companyId, runDate, timeOfDay, value);
    };

    const statusText = useMemo(() => {
        if (mode === 'off') return 'Location sharing is off';
        if (permissionDenied) return 'Allow location in Settings to share';
        if (sessionOn && tracking) return `Sharing live location · ${selectedRoute?.bus ?? 'Bus'}`;
        if (sessionOn) return 'Waiting to share (open app or bus screen)';
        return 'Not sharing this run';
    }, [mode, permissionDenied, sessionOn, tracking, selectedRoute?.bus]);

    return (
        <View style={styles.wrap}>
            <TouchableOpacity style={styles.header} onPress={() => setExpanded((v) => !v)}>
                <View style={styles.headerLeft}>
                    <Ionicons
                        name={tracking ? 'navigate' : 'navigate-outline'}
                        size={18}
                        color={tracking ? theme.colors.secondary : theme.colors.textSecondary}
                    />
                    <View style={styles.headerText}>
                        <Text style={styles.title}>Bus location sharing</Text>
                        <Text style={styles.subtitle}>{statusText}</Text>
                    </View>
                </View>
                <View style={styles.headerRight}>
                    <Switch
                        value={sessionOn}
                        onValueChange={(v) => void toggleSession(v)}
                        trackColor={{ false: '#d1d5db', true: theme.colors.secondary + '88' }}
                        thumbColor={sessionOn ? theme.colors.secondary : '#f4f4f5'}
                    />
                    <Ionicons
                        name={expanded ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color={theme.colors.textSecondary}
                    />
                </View>
            </TouchableOpacity>

            {expanded && (
                <View style={styles.body}>
                    <Text style={styles.sectionLabel}>Share location when</Text>
                    {BUS_LOCATION_MODE_OPTIONS.map((opt) => (
                        <TouchableOpacity
                            key={opt.value}
                            style={[styles.modeRow, mode === opt.value && styles.modeRowActive]}
                            onPress={() => void setModeAndSave(opt.value)}
                        >
                            <View style={styles.modeText}>
                                <Text style={styles.modeLabel}>{opt.label}</Text>
                                <Text style={styles.modeDesc}>{opt.description}</Text>
                            </View>
                            {mode === opt.value ? (
                                <Ionicons name="checkmark-circle" size={20} color={theme.colors.secondary} />
                            ) : (
                                <Ionicons name="ellipse-outline" size={20} color={theme.colors.textSecondary} />
                            )}
                        </TouchableOpacity>
                    ))}

                    {routes.length > 1 && (
                        <>
                            <Text style={[styles.sectionLabel, { marginTop: 12 }]}>Your route</Text>
                            <View style={styles.routeRow}>
                                {routes.map((r) => (
                                    <TouchableOpacity
                                        key={r.id}
                                        style={[
                                            styles.routeChip,
                                            selectedRouteId === r.id && styles.routeChipActive,
                                        ]}
                                        onPress={() => onRouteChange(r.id)}
                                    >
                                        <Text
                                            style={[
                                                styles.routeChipText,
                                                selectedRouteId === r.id && styles.routeChipTextActive,
                                            ]}
                                        >
                                            {r.bus}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </>
                    )}

                    {assignedBus && routes.length === 1 && (
                        <Text style={styles.assignedHint}>Assigned bus: {assignedBus}</Text>
                    )}

                    <Text style={styles.footerNote}>
                        Location is only shared while The Nest is open — never in the background. Front office and
                        transport staff can see live bus positions on the route map.
                    </Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        marginHorizontal: theme.spacing.md,
        marginBottom: theme.spacing.sm,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.lg,
        backgroundColor: theme.colors.surface,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 10,
        gap: 8,
    },
    headerLeft: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    headerText: {
        flex: 1,
    },
    title: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.text,
    },
    subtitle: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    body: {
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: theme.colors.border,
        padding: 12,
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    modeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderRadius: theme.borderRadius.md,
        marginBottom: 4,
    },
    modeRowActive: {
        backgroundColor: theme.colors.secondary + '12',
    },
    modeText: {
        flex: 1,
        paddingRight: 8,
    },
    modeLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
    },
    modeDesc: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    routeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    routeChip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.background,
    },
    routeChipActive: {
        borderColor: theme.colors.secondary,
        backgroundColor: theme.colors.secondary + '18',
    },
    routeChipText: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.text,
    },
    routeChipTextActive: {
        color: theme.colors.secondary,
    },
    assignedHint: {
        marginTop: 8,
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    footerNote: {
        marginTop: 12,
        fontSize: 11,
        lineHeight: 16,
        color: theme.colors.textSecondary,
    },
});
