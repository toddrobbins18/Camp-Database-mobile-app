import React, { useCallback, useEffect, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useCompany } from '../contexts/CompanyContext';
import { filterMessagesForCampInbox } from '../lib/messageInboxFilters';
import { fetchMessageProfileLabels } from '../lib/messageProfiles';
import { inboxUnreadCountQueryKey, useInboxUnreadCount } from '../hooks/useInboxUnreadCount';
import { threadIdFromMessageRow } from '../lib/inboxNotificationNavigation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../theme/theme';

/** Compact popover under header bell (web Nest ~320px). */
const PANEL_WIDTH = 320;
const LIST_MAX_HEIGHT = 240;

type InboxRow = {
    id: string;
    subject: string;
    content: string;
    sender_id: string | null;
    created_at: string;
    read: boolean;
    notification_type: string | null;
    group_id: string | null;
    company_id?: string | null;
    sender_display_name?: string | null;
    parent_message_id?: string | null;
    sender_name?: string;
};

function notificationIconName(type: string | null, subject: string): keyof typeof Ionicons.glyphMap {
    const s = subject.toLowerCase();
    if (s.includes('sports academy') || s.includes('athletics')) return 'trophy-outline';
    if (s.includes('staff assignment') || s.includes('assigned')) return 'people-outline';
    if (s.includes('incident')) return 'warning-outline';
    if (s.includes('appointment') || s.includes('tooth fairy')) return 'medkit-outline';
    if (s.includes('tutoring') || s.includes('therapy')) return 'book-outline';
    if (s.includes('group') || s.includes('message in')) return 'mail-outline';
    if (s.includes('event') || s.includes('calendar') || s.includes('schedule')) return 'calendar-outline';
    if (type === 'message') return 'chatbubble-outline';
    return 'notifications-outline';
}

type Props = {
    navigation: { navigate: (name: string, params?: object) => void };
    iconColor?: string;
    iconSize?: number;
};

export function MobileNotificationBell({ navigation, iconColor, iconSize = 26 }: Props) {
    const insets = useSafeAreaInsets();
    const queryClient = useQueryClient();
    const { companyId, companySlug } = useCompany();

    const [userId, setUserId] = useState<string | null>(null);
    const [open, setOpen] = useState(false);
    const [loadingRecent, setLoadingRecent] = useState(false);
    const [recentMessages, setRecentMessages] = useState<InboxRow[]>([]);

    const { data: unreadCount = 0 } = useInboxUnreadCount(userId);
    const ink = iconColor ?? theme.colors.text;

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    }, []);

    const fetchRecent = useCallback(async () => {
        if (!userId) return;
        setLoadingRecent(true);
        try {
            const { data, error } = await supabase
                .from('messages')
                .select(
                    'id, subject, content, sender_id, created_at, read, notification_type, group_id, company_id, sender_display_name, parent_message_id',
                )
                .eq('recipient_id', userId)
                .order('created_at', { ascending: false })
                .limit(40);

            if (error) throw error;

            const filtered = filterMessagesForCampInbox(data ?? [], {
                id: companyId ?? undefined,
                slug: companySlug ?? null,
            }).slice(0, 5);
            const senderIds = [...new Set(filtered.map((m) => m.sender_id).filter(Boolean))] as string[];
            let profileMap = new Map<string, string>();
            if (senderIds.length > 0) {
                profileMap = await fetchMessageProfileLabels(senderIds, companyId ?? undefined);
            }

            setRecentMessages(
                filtered.map((m) => ({
                    ...m,
                    subject: m.subject ?? '(No subject)',
                    content: m.content ?? '',
                    sender_name: m.sender_id
                        ? profileMap.get(m.sender_id) || m.sender_display_name?.trim() || 'Unknown sender'
                        : m.sender_display_name?.trim() || 'Camp notification',
                })),
            );
        } catch (e) {
            console.warn('[MobileNotificationBell] fetchRecent:', e);
        } finally {
            setLoadingRecent(false);
        }
    }, [userId, companyId, companySlug]);

    useEffect(() => {
        if (!userId) return;
        const channel = supabase
            .channel(`mobile-notification-bell-${userId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'messages',
                    filter: `recipient_id=eq.${userId}`,
                },
                () => {
                    void queryClient.refetchQueries({ queryKey: inboxUnreadCountQueryKey(userId) });
                    if (open) void fetchRecent();
                },
            )
            .subscribe();

        return () => {
            void supabase.removeChannel(channel);
        };
    }, [userId, open, fetchRecent, queryClient]);

    useEffect(() => {
        if (open) void fetchRecent();
    }, [open, fetchRecent]);

    const close = () => setOpen(false);

    const handleMarkAllRead = async () => {
        if (!userId) return;
        await supabase.from('messages').update({ read: true }).eq('recipient_id', userId).eq('read', false);
        void queryClient.refetchQueries({ queryKey: inboxUnreadCountQueryKey(userId) });
        setRecentMessages((prev) => prev.map((m) => ({ ...m, read: true })));
    };

    const openMessage = (msg?: InboxRow) => {
        close();
        if (msg?.group_id) {
            navigation.navigate('Messages', {
                activeView: 'groups',
                openGroupId: msg.group_id,
            });
            return;
        }
        if (msg) {
            const threadId = threadIdFromMessageRow(msg);
            navigation.navigate('Messages', {
                activeView: 'inbox',
                openThreadId: threadId ?? msg.id,
            });
            return;
        }
        navigation.navigate('Messages', { activeView: 'inbox' });
    };

    return (
        <>
            <TouchableOpacity
                onPress={() => setOpen(true)}
                style={styles.bellWrap}
                accessibilityLabel={
                    unreadCount > 0
                        ? `Notifications, ${unreadCount} unread`
                        : 'Notifications'
                }
                accessibilityRole="button"
            >
                <View style={styles.bellInner}>
                    <Ionicons name="notifications-outline" size={iconSize} color={ink} />
                </View>
                {unreadCount > 0 ? (
                    <View style={styles.badge} accessibilityLabel={`${unreadCount} unread`}>
                        <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                    </View>
                ) : null}
            </TouchableOpacity>

            <Modal transparent visible={open} animationType="fade" onRequestClose={close}>
                <Pressable
                    style={[
                        styles.overlay,
                        {
                            paddingTop: insets.top + 44,
                            paddingRight: Math.max(insets.right, 12),
                        },
                    ]}
                    onPress={close}
                >
                    <Pressable style={styles.panel} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.panelHeader}>
                            <Text style={styles.panelTitle}>Notifications</Text>
                            {unreadCount > 0 ? (
                                <TouchableOpacity onPress={() => void handleMarkAllRead()} hitSlop={8}>
                                    <Text style={styles.markAll}>Mark all read</Text>
                                </TouchableOpacity>
                            ) : null}
                        </View>

                        {loadingRecent && recentMessages.length === 0 ? (
                            <ActivityIndicator style={styles.loader} color={theme.colors.primary} />
                        ) : recentMessages.length === 0 ? (
                            <Text style={styles.empty}>No notifications yet</Text>
                        ) : (
                            <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
                                {recentMessages.map((msg) => {
                                    const icon = notificationIconName(msg.notification_type, msg.subject);
                                    return (
                                        <TouchableOpacity
                                            key={msg.id}
                                            style={[styles.row, !msg.read && styles.rowUnread]}
                                            onPress={() => openMessage(msg)}
                                            activeOpacity={0.7}
                                        >
                                            <View style={styles.rowIconWrap}>
                                                <Ionicons name={icon} size={18} color={theme.colors.textMuted} />
                                                {!msg.read ? <View style={styles.unreadDot} /> : null}
                                            </View>
                                            <View style={styles.rowBody}>
                                                <Text style={styles.rowSubject} numberOfLines={1}>
                                                    {msg.subject}
                                                </Text>
                                                <Text style={styles.rowMeta} numberOfLines={1}>
                                                    {msg.sender_name}
                                                    {' · '}
                                                    {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        )}

                        <TouchableOpacity style={styles.footerBtn} onPress={() => openMessage()}>
                            <Text style={styles.footerBtnText}>View all messages</Text>
                        </TouchableOpacity>
                    </Pressable>
                </Pressable>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    bellWrap: {
        position: 'relative',
        alignSelf: 'center',
    },
    bellInner: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badge: {
        position: 'absolute',
        top: 2,
        right: 2,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#ef4444',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    badgeText: {
        color: '#ffffff',
        fontSize: 10,
        fontWeight: '700',
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.25)',
        alignItems: 'flex-end',
    },
    panel: {
        width: PANEL_WIDTH,
        maxWidth: '92%',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 10,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.colors.border,
    },
    panelHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: theme.colors.border,
    },
    panelTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
    },
    markAll: {
        fontSize: 12,
        fontWeight: '500',
        color: theme.colors.primary,
    },
    loader: {
        paddingVertical: theme.spacing.lg,
    },
    empty: {
        paddingVertical: theme.spacing.lg,
        paddingHorizontal: 12,
        textAlign: 'center',
        fontSize: 13,
        color: theme.colors.textMuted,
    },
    list: {
        maxHeight: LIST_MAX_HEIGHT,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: theme.colors.border,
    },
    rowUnread: {
        backgroundColor: 'rgba(37, 99, 235, 0.06)',
    },
    rowIconWrap: {
        marginTop: 2,
        marginRight: theme.spacing.sm,
        position: 'relative',
    },
    unreadDot: {
        position: 'absolute',
        top: -2,
        right: -2,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: theme.colors.primary,
    },
    rowBody: {
        flex: 1,
        minWidth: 0,
    },
    rowSubject: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.text,
    },
    rowMeta: {
        fontSize: 11,
        color: theme.colors.textMuted,
        marginTop: 2,
    },
    footerBtn: {
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: theme.colors.border,
        paddingVertical: 8,
        alignItems: 'center',
    },
    footerBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.primary,
    },
});
