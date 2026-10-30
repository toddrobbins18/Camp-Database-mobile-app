import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Pressable,
    TextInput,
    ScrollView,
    ActivityIndicator,
    Alert,
    Platform,
    StatusBar,
    KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { StyledCard } from '../components/StyledCard';
import {
    useMessages,
    useSentMessages,
    useMessageGroups,
    useCreateMessageGroup,
    useSendMessage,
    useMarkMessageRead,
    fetchMessageThread,
    useMessageThread,
    messageThreadQueryKey,
} from '../api/messages';
import { useCompany } from '../contexts/CompanyContext';
import { supabase } from '../lib/supabase';
import { MobileUserMenu } from '../components/MobileUserMenu';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { inboxSenderDisplayName, sentRecipientDisplayName } from '../lib/messageProfiles';
import { messageContentPreview } from '../lib/messageContentUtils';
import { MessageGroupChatPanel } from '../components/messages/MessageGroupChatPanel';
import { ReadReceipt } from '../components/messages/ReadReceipt';
import { DirectMessageThreadView } from '../components/messages/DirectMessageThreadView';
import {
    isMessageReadFlag,
    markThreadRepliesReadForRecipient,
    mergeMessageRead,
} from '../lib/messageReadReceipts';
import {
    listStaffParentPortalInbox,
    type StaffParentPortalThreadRow,
} from '../lib/parentPortalMessaging';
import { isNestSandboxCompany } from '../constants/camps';
import { NestSandboxStaffTestAccountsCard } from '../components/messages/NestSandboxStaffTestAccountsCard';
import * as DocumentPicker from 'expo-document-picker';
import {
    messageMediaEnabledForCamp,
    classifyMessageMediaMime,
    sendDirectMessageMedia,
    messagePreviewLabel,
    defaultMediaMessageSubject,
    type PickedMessageMedia,
} from '../lib/messageMedia';

/** Inbox list second line: latest reply (web parity) or root message body. */
function formatListDate(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const now = new Date();
    const sameDay =
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear();
    if (sameDay) {
        return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    }
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function nameInitial(label: string): string {
    const t = label.trim();
    if (!t) return '?';
    return t.charAt(0).toUpperCase();
}

const EMPTY_THREAD_REPLIES: Awaited<ReturnType<typeof fetchMessageThread>> = [];

function inboxThreadListSnippet(msg: {
    latest_reply_content?: string | null;
    latest_reply_sender_name?: string | null;
    content?: string | null;
}): string {
    const raw = msg.latest_reply_content;
    if (raw != null && String(raw).trim() !== '') {
        const who = msg.latest_reply_sender_name?.trim();
        const body = messageContentPreview(String(raw), 80);
        return who ? `${who}: ${body}` : body;
    }
    return messageContentPreview(String(msg.content ?? ''), 100);
}

export const MessagesScreen = ({ navigation, route }: any) => {
    const insets = useSafeAreaInsets();
    const queryClient = useQueryClient();
    /** Modal sometimes reports 0 top inset; use OS fallbacks so content clears the notch / Dynamic Island. */
    const modalTopInset =
        insets.top > 0
            ? insets.top
            : Platform.OS === 'ios'
              ? 47
              : StatusBar.currentHeight ?? 0;
    const [activeView, setActiveView] = useState('inbox');
    const [showComposeModal, setShowComposeModal] = useState(false);
    const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
    const [deliveryMethod, setDeliveryMethod] = useState('in-app');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [searchUsers, setSearchUsers] = useState('');
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [showRecipientPreview, setShowRecipientPreview] = useState(false);
    const [openThreadId, setOpenThreadId] = useState<string | null>(null);
    const [threadRootFallback, setThreadRootFallback] = useState<any>(null);
    const [threadReadPatches, setThreadReadPatches] = useState<
        Record<string, { read: boolean; read_at: string | null }>
    >({});
    const [groupName, setGroupName] = useState('');
    const [groupDescription, setGroupDescription] = useState('');
    const [groupSearchUsers, setGroupSearchUsers] = useState('');
    const [selectedGroupMembers, setSelectedGroupMembers] = useState<string[]>([]);
    const [emailConfig, setEmailConfig] = useState<{ is_configured?: boolean | null; is_active?: boolean | null; email_ready?: boolean | null } | null>(null);
    const [pendingMedia, setPendingMedia] = useState<PickedMessageMedia | null>(null);
    const [threadPendingMedia, setThreadPendingMedia] = useState<PickedMessageMedia | null>(null);
    const [threadSending, setThreadSending] = useState(false);
    const [openGroupId, setOpenGroupId] = useState<string | null>(null);
    const [openGroupTitle, setOpenGroupTitle] = useState('');
    const [familyThreads, setFamilyThreads] = useState<StaffParentPortalThreadRow[]>([]);
    const [familyThreadsLoading, setFamilyThreadsLoading] = useState(false);

    const { companyId, companySlug, profile } = useCompany();
    const messageMediaEnabled = messageMediaEnabledForCamp(companySlug);
    /**
     * Web passes `currentCompany?.id` into `fetchMessageProfileLabels` so `resolve_message_profile_labels` runs.
     * Use profile.company_id when context has not finished hydrating so inbox rows get real sender names, not "Unknown sender".
     */
    const messageLabelsCompanyId = companyId ?? profile?.company_id ?? undefined;
    const emailReady =
        emailConfig?.email_ready != null
            ? !!emailConfig.email_ready
            : !!emailConfig?.is_configured && emailConfig?.is_active !== false;
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id || null));
    }, []);

    useEffect(() => {
        if (!companyId) return;
        (async () => {
            const { data: rpcRows, error: rpcError } = await supabase.rpc(
                'get_company_email_delivery_status',
                { _company_id: companyId },
            );
            if (!rpcError && rpcRows && rpcRows.length > 0) {
                setEmailConfig(rpcRows[0]);
                return;
            }
            const { data } = await supabase
                .from('company_email_config')
                .select('is_configured, is_active')
                .eq('company_id', companyId)
                .maybeSingle();
            setEmailConfig(data);
        })();
    }, [companyId]);

    const {
        data: messages = [],
        isLoading: messagesLoading,
        dataUpdatedAt: inboxDataUpdatedAt,
    } = useMessages(currentUserId, messageLabelsCompanyId, companySlug);
    const { data: sentMessages = [], isLoading: sentMessagesLoading } = useSentMessages(currentUserId, messageLabelsCompanyId);
    const { data: threadRepliesData } = useMessageThread(
        openThreadId,
        messageLabelsCompanyId,
        currentUserId,
    );
    const threadReplies = threadRepliesData ?? EMPTY_THREAD_REPLIES;
    const { data: messageGroups = [], isLoading: groupsLoading } = useMessageGroups(currentUserId);
    const sendMutation = useSendMessage();
    const createGroupMutation = useCreateMessageGroup();
    const markReadMutation = useMarkMessageRead();

    useEffect(() => {
        const params = route?.params as
            | { openThreadId?: string; openGroupId?: string; activeView?: string; groupName?: string }
            | undefined;
        if (!params) return;
        if (params.openThreadId) {
            setActiveView(params.activeView === 'sent' ? 'sent' : 'inbox');
            setOpenThreadId(params.openThreadId);
            if (currentUserId) {
                markReadMutation.mutate(params.openThreadId);
            }
            navigation.setParams?.({
                openThreadId: undefined,
                activeView: undefined,
            });
        }
        if (params.openGroupId) {
            setActiveView('groups');
            setOpenGroupId(params.openGroupId);
            if (params.groupName) setOpenGroupTitle(params.groupName);
            navigation.setParams?.({ openGroupId: undefined, groupName: undefined });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mutate is stable enough; omit markReadMutation object identity
    }, [route?.params?.openThreadId, route?.params?.openGroupId, currentUserId, navigation]);

    // Recipient list: prefer RPC (bypasses tight profiles RLS). If migration not applied on DB, fallback to SELECT (coworker RLS may surface peers).
    const { data: users = [] } = useQuery({
        queryKey: ['profiles_for_messages', companyId],
        queryFn: async () => {
            if (!companyId) return [];
            const {
                data: { session },
            } = await supabase.auth.getSession();
            if (!session?.user) return [];

            const mapProfileRows = (rows: { id: string; full_name: string | null; email: string | null }[]) =>
                rows.map((p) => ({
                    id: p.id,
                    name: p.full_name?.trim() || p.email?.split('@')[0] || 'Unknown',
                    email: p.email || '',
                }));

            const { data, error } = await supabase.rpc('list_message_recipient_profiles', {
                target_company_id: companyId,
            });
            if (!error && data) {
                return mapProfileRows(data as { id: string; full_name: string | null; email: string | null }[]);
            }

            const notAuthenticated =
                error?.code === 'P0001' &&
                typeof error?.message === 'string' &&
                error.message.includes('not authenticated');
            if (notAuthenticated) {
                return [];
            }

            const missingRpc =
                error?.code === 'PGRST202' ||
                (typeof error?.message === 'string' && error.message.includes('could not find the function'));
            if (missingRpc) {
                console.warn(
                    '[MessagesScreen] Run migration 20260508153000_rpc_list_message_recipient_profiles.sql on Supabase; using profiles fallback.',
                );
                const { data: rows, error: qErr } = await supabase
                    .from('profiles')
                    .select('id, full_name, email')
                    .eq('company_id', companyId)
                    .order('full_name', { ascending: true, nullsFirst: false });
                if (qErr) {
                    console.error('[MessagesScreen] profiles fallback:', qErr);
                    throw qErr;
                }
                return mapProfileRows((rows || []) as { id: string; full_name: string | null; email: string | null }[]);
            }

            console.error('[MessagesScreen] list_message_recipient_profiles:', error);
            throw error;
        },
        enabled: !!companyId && !!currentUserId,
    });
    const messageCount = messages.length;
    const sentCount = sentMessages.length;
    const unreadCount = messages.filter((m: any) => !m.read && m.recipient_id === currentUserId).length;

    const handleInbox = () => {
        setActiveView('inbox');
        setShowComposeModal(false);
        setOpenThreadId(null);
        setOpenGroupId(null);
    };
    const handleSent = () => {
        setActiveView('sent');
        setShowComposeModal(false);
        setOpenThreadId(null);
        setOpenGroupId(null);
        queryClient.invalidateQueries({ queryKey: ['messages_sent'] });
    };
    const handleGroups = () => {
        setActiveView('groups');
        setShowComposeModal(false);
        setOpenThreadId(null);
        setOpenGroupId(null);
    };
    const handleFamilies = () => {
        setActiveView('families');
        setShowComposeModal(false);
        setOpenThreadId(null);
        setOpenGroupId(null);
        if (companyId) {
            setFamilyThreadsLoading(true);
            void listStaffParentPortalInbox(supabase, companyId).then(({ rows, error }) => {
                if (error) Alert.alert('Families', error);
                setFamilyThreads(rows);
                setFamilyThreadsLoading(false);
            });
        }
    };

    const openGroup = (group: { id: string; name: string }) => {
        setOpenGroupId(group.id);
        setOpenGroupTitle(group.name);
    };

    const handleCompose = () => {
        setActiveView('compose');
        setShowComposeModal(true);
        setOpenThreadId(null);
        setOpenGroupId(null);
    };

    const handleCloseCompose = () => {
        setShowComposeModal(false);
        // Reset form
        setSubject('');
        setMessage('');
        setSelectedUsers([]);
        setSearchUsers('');
        setDeliveryMethod('in-app');
        setPendingMedia(null);
    };

    const pickDocumentMedia = async (
        onPick: (media: PickedMessageMedia) => void,
    ) => {
        const result = await DocumentPicker.getDocumentAsync({
            type: ['image/*', 'video/*', 'audio/*', 'application/pdf', '*/*'],
            copyToCacheDirectory: true,
        });
        if (result.canceled || !result.assets?.[0]) return;
        const asset = result.assets[0];
        const fileName = asset.name ?? `media-${Date.now()}`;
        const mimeType = asset.mimeType ?? 'application/octet-stream';
        const kind = classifyMessageMediaMime(mimeType, fileName);
        if (!kind) {
            Alert.alert(
                'Unsupported file',
                'Choose a photo, video, audio clip, or common document (PDF, Word, etc.).',
            );
            return;
        }
        onPick({
            uri: asset.uri,
            mimeType,
            fileName,
            kind,
        });
    };

    const pickMessageMedia = () => {
        void import('../lib/messageMediaCapture').then(({ openMessageMediaCaptureMenu }) => {
            openMessageMediaCaptureMenu(setPendingMedia);
        });
    };

    const handleClear = () => {
        setSubject('');
        setMessage('');
        setSelectedUsers([]);
    };

    const toggleUserSelection = (userId: string) => {
        setSelectedUsers(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(searchUsers.toLowerCase()) ||
        user.email.toLowerCase().includes(searchUsers.toLowerCase())
    );
    const filteredGroupUsers = users.filter(user =>
        user.name.toLowerCase().includes(groupSearchUsers.toLowerCase()) ||
        user.email.toLowerCase().includes(groupSearchUsers.toLowerCase())
    );

    const activeList = activeView === 'sent' ? sentMessages : messages;
    const activeLoading = activeView === 'sent' ? sentMessagesLoading : messagesLoading;

    const detailMessage = useMemo(() => {
        if (!openThreadId) return null;
        const base =
            (activeList as any[]).find((m: any) => m.id === openThreadId) ??
            (threadRootFallback?.id === openThreadId ? threadRootFallback : null);
        if (!base) return null;
        return mergeMessageRead(base, threadReadPatches[base.id]);
    }, [activeList, openThreadId, threadRootFallback, threadReadPatches]);

    const threadRepliesForView = useMemo(
        () => threadReplies.map((r) => mergeMessageRead(r, threadReadPatches[r.id])),
        [threadReplies, threadReadPatches],
    );

    useFocusEffect(
        useCallback(() => {
            if (!currentUserId) return;
            void queryClient.refetchQueries({
                predicate: (q) =>
                    Array.isArray(q.queryKey) &&
                    (q.queryKey[0] === 'messages' || q.queryKey[0] === 'messages_sent') &&
                    q.queryKey[1] === currentUserId,
            });
            if (openThreadId) {
                void queryClient.refetchQueries({
                    queryKey: messageThreadQueryKey(openThreadId, messageLabelsCompanyId),
                });
            }
        }, [currentUserId, queryClient, openThreadId, messageLabelsCompanyId]),
    );

    useEffect(() => {
        if (!openThreadId) {
            setThreadRootFallback(null);
            return;
        }
        if ((activeList as any[]).some((m) => m.id === openThreadId)) {
            setThreadRootFallback(null);
            return;
        }
        let cancelled = false;
        supabase
            .from('messages')
            .select('*')
            .eq('id', openThreadId)
            .maybeSingle()
            .then(({ data }) => {
                if (!cancelled && data) setThreadRootFallback(data);
            });
        return () => {
            cancelled = true;
        };
    }, [openThreadId, activeList]);

    useEffect(() => {
        if (!openThreadId) {
            setThreadPendingMedia(null);
            setThreadReadPatches({});
        }
    }, [openThreadId]);

    useEffect(() => {
        if (!openThreadId || !currentUserId) return;

        const refetchOpenThread = () => {
            void queryClient.refetchQueries({
                queryKey: messageThreadQueryKey(openThreadId, messageLabelsCompanyId),
            });
            void queryClient.refetchQueries({
                predicate: (q) =>
                    Array.isArray(q.queryKey) &&
                    (q.queryKey[0] === 'messages_sent' || q.queryKey[0] === 'messages') &&
                    q.queryKey[1] === currentUserId,
            });
        };

        const syncReadPatch = (
            id: string,
            read: boolean | null | undefined,
            read_at: string | null | undefined,
        ) => {
            setThreadReadPatches((prev) => {
                const mergedRead = prev[id]?.read === true || isMessageReadFlag(read);
                const mergedAt = mergedRead
                    ? read_at ?? prev[id]?.read_at ?? null
                    : null;
                if (
                    prev[id]?.read === mergedRead &&
                    (prev[id]?.read_at ?? null) === mergedAt
                ) {
                    return prev;
                }
                return {
                    ...prev,
                    [id]: { read: mergedRead, read_at: mergedAt },
                };
            });
        };

        const applyReadRow = (row: {
            id?: string;
            sender_id?: string | null;
            parent_message_id?: string | null;
            read?: boolean | null;
            read_at?: string | null;
        }) => {
            if (!row?.id) return;
            const inThread = row.id === openThreadId || row.parent_message_id === openThreadId;
            if (!inThread) return;
            syncReadPatch(row.id, row.read, row.read_at);
            if (currentUserId && row.sender_id === currentUserId) {
                void queryClient.refetchQueries({
                    predicate: (q) =>
                        Array.isArray(q.queryKey) &&
                        q.queryKey[0] === 'messages_sent' &&
                        q.queryKey[1] === currentUserId,
                });
            }
        };

        const channel = supabase
            .channel(`thread-live-${openThreadId}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages' },
                (payload) => {
                    const row = payload.new as { parent_message_id?: string | null };
                    if (row?.parent_message_id === openThreadId) {
                        refetchOpenThread();
                    }
                },
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'messages' },
                (payload) => {
                    const row = payload.new as {
                        id?: string;
                        sender_id?: string | null;
                        parent_message_id?: string | null;
                        read?: boolean | null;
                        read_at?: string | null;
                    };
                    applyReadRow(row);
                    if (row?.parent_message_id === openThreadId || row?.id === openThreadId) {
                        refetchOpenThread();
                    }
                },
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [openThreadId, messageLabelsCompanyId, currentUserId, queryClient]);

    useEffect(() => {
        if (!openThreadId || !currentUserId) return;
        if (activeView !== 'inbox' && activeView !== 'families') return;
        if (activeView === 'inbox') {
            const root = (activeList as any[]).find((m) => m.id === openThreadId);
            if (root?.recipient_id !== currentUserId) return;
        }
        void markThreadRepliesReadForRecipient(supabase, openThreadId, currentUserId);
    }, [openThreadId, currentUserId, activeView, activeList, threadReplies.length]);

    const sendThreadReply = useCallback(async (replyText: string) => {
        if (!detailMessage || !currentUserId || !companyId || threadSending) return;
        const trimmed = replyText.trim();
        if (!trimmed && !threadPendingMedia) {
            Alert.alert('Empty reply', 'Write a message or attach a file.');
            return;
        }
        const recipientId =
            currentUserId === detailMessage.sender_id
                ? detailMessage.recipient_id
                : detailMessage.sender_id;
        if (!recipientId) {
            Alert.alert('Cannot reply', 'This message has no recipient to reply to.');
            return;
        }
        const reSubject = `Re: ${String(detailMessage.subject ?? '').replace(/^Re: /, '')}`;
        setThreadSending(true);
        try {
            if (threadPendingMedia) {
                const { error: mediaErr } = await sendDirectMessageMedia(supabase, {
                    companyId,
                    senderId: currentUserId,
                    recipientId,
                    subject: reSubject,
                    parentMessageId: detailMessage.id,
                    threadScopeId: detailMessage.id,
                    caption: trimmed,
                    media: threadPendingMedia,
                    senderDisplayName: profile?.full_name ?? null,
                    childId: (detailMessage as any).child_id ?? null,
                    familyId: (detailMessage as any).family_id ?? null,
                    threadKind: (detailMessage as any).thread_kind ?? null,
                });
                if (mediaErr) throw new Error(mediaErr);
            } else {
                const { error } = await supabase.from('messages').insert({
                    sender_id: currentUserId,
                    recipient_id: recipientId,
                    subject: reSubject,
                    content: trimmed,
                    parent_message_id: detailMessage.id,
                    notification_type: 'message',
                    read: false,
                    sender_display_name: profile?.full_name?.trim() || null,
                    company_id: companyId,
                    ...((detailMessage as any).child_id
                        ? { child_id: (detailMessage as any).child_id }
                        : {}),
                    ...((detailMessage as any).family_id
                        ? { family_id: (detailMessage as any).family_id }
                        : {}),
                    ...((detailMessage as any).thread_kind
                        ? { thread_kind: (detailMessage as any).thread_kind }
                        : {}),
                });
                if (error) throw error;
            }
            setThreadPendingMedia(null);
            const rows = await fetchMessageThread(detailMessage.id, messageLabelsCompanyId);
            queryClient.setQueryData(
                messageThreadQueryKey(detailMessage.id, messageLabelsCompanyId),
                rows,
            );
            void queryClient.invalidateQueries({ queryKey: ['messages'] });
            void queryClient.invalidateQueries({ queryKey: ['messages_sent'] });
        } catch (err: any) {
            Alert.alert('Error', err?.message || 'Failed to send reply.');
            throw err;
        } finally {
            setThreadSending(false);
        }
    }, [
        detailMessage,
        currentUserId,
        companyId,
        threadSending,
        threadPendingMedia,
        profile?.full_name,
        messageLabelsCompanyId,
        queryClient,
    ]);

    const handleThreadSenderLabel = useCallback(
        (row: Parameters<typeof inboxSenderDisplayName>[0]) => inboxSenderDisplayName(row),
        [],
    );
    const handleThreadBack = useCallback(() => setOpenThreadId(null), []);

    useEffect(() => {
        if (!openThreadId || activeView === 'families') return;
        const list = activeView === 'sent' ? sentMessages : messages;
        if (!list.some((m: any) => m.id === openThreadId)) {
            setOpenThreadId(null);
        }
    }, [messages, sentMessages, activeView, openThreadId]);

    const showingThread =
        (activeView === 'inbox' || activeView === 'sent' || activeView === 'families') &&
        !!openThreadId &&
        !!detailMessage;
    const showingGroup = activeView === 'groups' && !!openGroupId;
    const showMessagesChrome = !showingThread && !showingGroup;

    const activeFamilyRow = familyThreads.find((f) => f.thread_root_id === openThreadId);
    const threadPartyLabel =
        activeView === 'families' && activeFamilyRow
            ? `${activeFamilyRow.parent_display_name ?? 'Parent'} · ${activeFamilyRow.child_name ?? 'Camper'}`
            : detailMessage && activeView === 'sent'
              ? sentRecipientDisplayName(detailMessage)
              : detailMessage
                ? inboxSenderDisplayName(detailMessage)
                : '';
    const canReplyToThread =
        !!detailMessage &&
        !!currentUserId &&
        (activeView === 'inbox' || activeView === 'sent' || activeView === 'families');

    const renderSegmentTabs = () => (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.segmentBar}
            keyboardShouldPersistTaps="always"
        >
            <TouchableOpacity
                style={[styles.segmentTab, activeView === 'inbox' && styles.segmentTabActive]}
                onPress={handleInbox}
            >
                <Ionicons
                    name="mail-outline"
                    size={16}
                    color={activeView === 'inbox' ? '#fff' : theme.colors.textSecondary}
                />
                <Text style={[styles.segmentTabText, activeView === 'inbox' && styles.segmentTabTextActive]}>
                    Inbox{unreadCount > 0 ? ` · ${unreadCount}` : ''}
                </Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.segmentTab, activeView === 'sent' && styles.segmentTabActive]}
                onPress={handleSent}
            >
                <Ionicons
                    name="paper-plane-outline"
                    size={16}
                    color={activeView === 'sent' ? '#fff' : theme.colors.textSecondary}
                />
                <Text style={[styles.segmentTabText, activeView === 'sent' && styles.segmentTabTextActive]}>
                    Sent
                </Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.segmentTab, activeView === 'groups' && styles.segmentTabActive]}
                onPress={handleGroups}
            >
                <Ionicons
                    name="people-outline"
                    size={16}
                    color={activeView === 'groups' ? '#fff' : theme.colors.textSecondary}
                />
                <Text style={[styles.segmentTabText, activeView === 'groups' && styles.segmentTabTextActive]}>
                    Groups
                </Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.segmentTab, activeView === 'families' && styles.segmentTabActive]}
                onPress={handleFamilies}
            >
                <Ionicons
                    name="home-outline"
                    size={16}
                    color={activeView === 'families' ? '#fff' : theme.colors.textSecondary}
                />
                <Text style={[styles.segmentTabText, activeView === 'families' && styles.segmentTabTextActive]}>
                    Families
                </Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.segmentTab, styles.segmentTabCompose, activeView === 'compose' && styles.segmentTabActive]}
                onPress={handleCompose}
            >
                <Ionicons
                    name="create-outline"
                    size={16}
                    color={activeView === 'compose' ? '#fff' : theme.colors.secondary}
                />
                <Text
                    style={[
                        styles.segmentTabText,
                        styles.segmentTabComposeText,
                        activeView === 'compose' && styles.segmentTabTextActive,
                    ]}
                >
                    Compose
                </Text>
            </TouchableOpacity>
        </ScrollView>
    );

    return (
        <SafeAreaView
            style={[styles.container, showingThread && styles.containerThread]}
            edges={showingThread ? ['left', 'right'] : undefined}
        >
            {showingThread && detailMessage ? (
                <View style={styles.flex1}>
                <DirectMessageThreadView
                    threadId={detailMessage.id}
                    threadSubject={String(detailMessage.subject ?? '')}
                    detailMessage={detailMessage}
                    threadReplies={threadRepliesForView}
                    currentUserId={currentUserId}
                    threadPartyLabel={threadPartyLabel}
                    canReply={canReplyToThread}
                    messageMediaEnabled={messageMediaEnabled}
                    threadPendingMedia={threadPendingMedia}
                    setThreadPendingMedia={setThreadPendingMedia}
                    threadSending={threadSending}
                    onSend={sendThreadReply}
                    onBack={handleThreadBack}
                    senderLabel={handleThreadSenderLabel}
                />
                </View>
            ) : (
            <KeyboardAvoidingView
                style={styles.flex1}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
            >
            <KeyboardAwareScrollView
                contentContainerStyle={styles.scrollContent}
                enableOnAndroid={true}
                extraScrollHeight={24}
                keyboardShouldPersistTaps="always"
            >
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.openDrawer()} hitSlop={12}>
                        <Ionicons name="menu" size={26} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <View style={styles.headerRight}>
                        <MobileUserMenu navigation={navigation} />
                    </View>
                </View>

                {showMessagesChrome ? (
                    <View style={styles.titleSection}>
                        <Text style={styles.title}>Messages</Text>
                        <Text style={styles.subtitle}>Inbox, groups, and camp notifications</Text>
                        {isNestSandboxCompany(companySlug) ? (
                            <NestSandboxStaffTestAccountsCard />
                        ) : null}
                        {renderSegmentTabs()}
                    </View>
                ) : showingThread ? (
                    <View style={styles.threadTopBar}>
                        <TouchableOpacity
                            style={styles.threadBackBtn}
                            onPress={() => setOpenThreadId(null)}
                            hitSlop={12}
                        >
                            <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
                            <Text style={styles.threadBackLabel}>
                                {activeView === 'sent'
                                    ? 'Sent'
                                    : activeView === 'families'
                                      ? 'Families'
                                      : 'Inbox'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.threadTopBar}>
                        <TouchableOpacity
                            style={styles.threadBackBtn}
                            onPress={() => setOpenGroupId(null)}
                            hitSlop={12}
                        >
                            <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
                            <Text style={styles.threadBackLabel}>Groups</Text>
                        </TouchableOpacity>
                        <Text style={styles.groupChatTitle} numberOfLines={1}>
                            {openGroupTitle}
                        </Text>
                    </View>
                )}

                {activeView === 'families' && !showingThread && (
                    <StyledCard style={styles.messagesListCard}>
                        <View style={styles.listCardHeader}>
                            <Text style={styles.listCardTitle}>Parent families</Text>
                            <Text style={styles.messageCountCompact}>{familyThreads.length} threads</Text>
                        </View>
                        {familyThreadsLoading ? (
                            <ActivityIndicator size="large" color={theme.colors.secondary} style={{ marginTop: 24 }} />
                        ) : familyThreads.length === 0 ? (
                            <View style={styles.emptyStateCompact}>
                                <Ionicons name="people-outline" size={40} color={theme.colors.icon} />
                                <Text style={styles.emptyText}>No parent portal conversations yet.</Text>
                            </View>
                        ) : (
                            <View style={styles.inboxList}>
                                {familyThreads.map((row) => (
                                    <TouchableOpacity
                                        key={row.thread_root_id}
                                        activeOpacity={0.7}
                                        style={styles.inboxRow}
                                        onPress={() => {
                                            setOpenThreadId(row.thread_root_id);
                                            if (currentUserId) {
                                                void markThreadRepliesReadForRecipient(
                                                    supabase,
                                                    row.thread_root_id,
                                                    currentUserId,
                                                );
                                            }
                                        }}
                                    >
                                        <View style={styles.avatarCircle}>
                                            <Text style={styles.avatarText}>
                                                {nameInitial(row.parent_display_name ?? 'P')}
                                            </Text>
                                        </View>
                                        <View style={styles.inboxRowBody}>
                                            <View style={styles.inboxRowTop}>
                                                <Text style={styles.inboxRowParty} numberOfLines={1}>
                                                    {row.parent_display_name ?? 'Parent'}
                                                </Text>
                                                {(row.unread_for_staff ?? 0) > 0 ? (
                                                    <Text style={styles.inboxRowDate}>{row.unread_for_staff} new</Text>
                                                ) : null}
                                            </View>
                                            <Text style={styles.inboxRowSubject} numberOfLines={1}>
                                                Camper: {row.child_name ?? '—'}
                                            </Text>
                                            {row.latest_preview ? (
                                                <Text style={styles.inboxRowSnippet} numberOfLines={2}>
                                                    {messageContentPreview(row.latest_preview, 80)}
                                                </Text>
                                            ) : null}
                                        </View>
                                        <Ionicons name="chevron-forward" size={18} color={theme.colors.icon} />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </StyledCard>
                )}

                {(activeView === 'inbox' || activeView === 'sent') && !showingThread && (
                    <StyledCard style={styles.messagesListCard}>
                        <View style={styles.listCardHeader}>
                            <Text style={styles.listCardTitle}>
                                {activeView === 'sent' ? 'Sent' : 'Inbox'}
                            </Text>
                            <Text style={styles.messageCountCompact}>
                                {activeView === 'sent' ? sentCount : messageCount}{' '}
                                {activeView === 'sent' ? 'sent' : 'messages'}
                            </Text>
                        </View>
                        {activeLoading ? (
                            <ActivityIndicator size="large" color={theme.colors.secondary} style={{ marginTop: 24 }} />
                        ) : activeList.length === 0 ? (
                            <View style={styles.emptyStateCompact}>
                                <Ionicons name="mail-open-outline" size={40} color={theme.colors.icon} />
                                <Text style={styles.emptyText}>
                                    {activeView === 'sent' ? 'No sent messages yet' : 'Your inbox is empty'}
                                </Text>
                                {activeView === 'inbox' ? (
                                    <TouchableOpacity style={styles.emptyCta} onPress={handleCompose}>
                                        <Text style={styles.emptyCtaText}>Compose a message</Text>
                                    </TouchableOpacity>
                                ) : null}
                            </View>
                        ) : (
                            <View style={styles.inboxList}>
                                {activeList.map((msg: any) => {
                                    const party =
                                        activeView === 'sent'
                                            ? sentRecipientDisplayName(msg)
                                            : inboxSenderDisplayName(msg);
                                    const snippet =
                                        activeView === 'inbox' ? inboxThreadListSnippet(msg) : String(msg.content ?? '');
                                    const unread = activeView === 'inbox' && !msg.read;
                                    return (
                                        <TouchableOpacity
                                            key={msg.id}
                                            activeOpacity={0.7}
                                            style={[styles.inboxRow, unread && styles.inboxRowUnread]}
                                            onPress={() => {
                                                setOpenThreadId(msg.id);
                                                if (currentUserId && msg.recipient_id === currentUserId) {
                                                    void markThreadRepliesReadForRecipient(
                                                        supabase,
                                                        msg.id,
                                                        currentUserId,
                                                    );
                                                    if (unread) {
                                                        markReadMutation.mutate(msg.id);
                                                    }
                                                }
                                            }}
                                        >
                                            <View style={[styles.avatarCircle, unread && styles.avatarCircleUnread]}>
                                                <Text style={[styles.avatarText, unread && styles.avatarTextUnread]}>
                                                    {nameInitial(party)}
                                                </Text>
                                            </View>
                                            <View style={styles.inboxRowBody}>
                                                <View style={styles.inboxRowTop}>
                                                    <Text style={[styles.inboxRowParty, unread && styles.inboxRowPartyUnread]} numberOfLines={1}>
                                                        {party}
                                                    </Text>
                                                    <Text style={styles.inboxRowDate}>{formatListDate(msg.created_at)}</Text>
                                                </View>
                                                <Text style={[styles.inboxRowSubject, unread && styles.inboxRowSubjectUnread]} numberOfLines={1}>
                                                    {msg.subject}
                                                </Text>
                                                {snippet ? (
                                                    <Text style={styles.inboxRowSnippet} numberOfLines={2}>
                                                        {snippet}
                                                    </Text>
                                                ) : null}
                                                {activeView === 'sent' && msg.sender_id === currentUserId ? (
                                                    <ReadReceipt message={msg} />
                                                ) : null}
                                            </View>
                                            <Ionicons name="chevron-forward" size={18} color={theme.colors.icon} />
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        )}
                    </StyledCard>
                )}

                {activeView === 'groups' && !showingGroup && (
                    <StyledCard style={styles.groupsCard}>
                        <View style={styles.listCardHeader}>
                            <Text style={styles.listCardTitle}>Groups</Text>
                            <Text style={styles.messageCountCompact}>
                                {messageGroups.length} {messageGroups.length === 1 ? 'group' : 'groups'}
                            </Text>
                        </View>
                        <Text style={styles.groupsSubtitle}>
                            Team chats for staff — same groups as The Nest web app.
                        </Text>
                        <TouchableOpacity
                            style={styles.groupsPrimaryBtn}
                            onPress={() => setShowCreateGroupModal(true)}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="people-outline" size={20} color="#fff" />
                            <Text style={styles.groupsPrimaryBtnText}>Create group</Text>
                        </TouchableOpacity>
                        {groupsLoading ? (
                            <ActivityIndicator size="large" color={theme.colors.secondary} style={{ marginTop: 24 }} />
                        ) : messageGroups.length === 0 ? (
                            <View style={styles.groupsEmpty}>
                                <View style={styles.groupsEmptyIconWrap}>
                                    <Ionicons name="chatbubbles-outline" size={36} color={theme.colors.secondary} />
                                </View>
                                <Text style={styles.groupsEmptyTitle}>No groups yet</Text>
                                <Text style={styles.groupsEmptyBody}>
                                    Create a group to chat with other staff. You can add members from your camp roster.
                                </Text>
                            </View>
                        ) : (
                            <View style={[styles.inboxList, { marginTop: theme.spacing.md }]}>
                                {messageGroups.map((group: any) => (
                                    <TouchableOpacity
                                        key={group.id}
                                        style={styles.inboxRow}
                                        activeOpacity={0.7}
                                        onPress={() => openGroup({ id: group.id, name: group.name })}
                                    >
                                        <View style={[styles.avatarCircle, styles.groupAvatar]}>
                                            <Ionicons name="people" size={22} color={theme.colors.primary} />
                                        </View>
                                        <View style={styles.inboxRowBody}>
                                            <Text style={styles.inboxRowSubject} numberOfLines={1}>
                                                {group.name}
                                            </Text>
                                            {group.description ? (
                                                <Text style={styles.inboxRowSnippet} numberOfLines={2}>
                                                    {group.description}
                                                </Text>
                                            ) : (
                                                <Text style={styles.inboxRowSnippet}>Tap to open group chat</Text>
                                            )}
                                        </View>
                                        <Ionicons name="chevron-forward" size={18} color={theme.colors.icon} />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </StyledCard>
                )}

                {showingGroup && openGroupId ? (
                    <StyledCard style={styles.threadCard}>
                        <MessageGroupChatPanel
                            groupId={openGroupId}
                            groupName={openGroupTitle}
                            companyId={companyId}
                            companySlug={companySlug}
                            currentUserId={currentUserId}
                            senderDisplayName={profile?.full_name}
                        />
                    </StyledCard>
                ) : null}

                {activeView === 'groups' && !showingGroup ? (
                    <TouchableOpacity
                        style={styles.composeFab}
                        onPress={() => setShowCreateGroupModal(true)}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="people-outline" size={26} color="#fff" />
                    </TouchableOpacity>
                ) : null}

            </KeyboardAwareScrollView>

            {(activeView === 'inbox' || activeView === 'sent') && !showingThread ? (
                <TouchableOpacity style={styles.composeFab} onPress={handleCompose} activeOpacity={0.85}>
                    <Ionicons name="create-outline" size={26} color="#fff" />
                </TouchableOpacity>
            ) : null}
            </KeyboardAvoidingView>
            )}

            {/* Compose Notification Modal */}
            <Modal
                visible={showComposeModal}
                transparent={false}
                animationType="slide"
                presentationStyle="fullScreen"
                onRequestClose={handleCloseCompose}
            >
                <View
                    style={[
                        styles.modalContainer,
                        {
                            paddingTop: modalTopInset,
                            paddingBottom: insets.bottom,
                            paddingLeft: insets.left,
                            paddingRight: insets.right,
                        },
                    ]}
                >
                    <KeyboardAwareScrollView
                        contentContainerStyle={[
                            styles.modalScrollContent,
                            { paddingBottom: 100 + Math.max(insets.bottom, 8) },
                        ]}
                        showsVerticalScrollIndicator={false}
                        enableOnAndroid={true}
                        extraScrollHeight={24}
                        keyboardShouldPersistTaps="handled"
                        keyboardOpeningTime={0}
                    >
                        {/* Modal Header — title beside back avoids Dynamic Island overlap */}
                        <View style={styles.modalHeader}>
                            <Pressable
                                onPress={handleCloseCompose}
                                hitSlop={{ top: 12, bottom: 12, left: 8, right: 12 }}
                                style={({ pressed }) => [
                                    styles.modalBackBtn,
                                    pressed && styles.modalBackBtnPressed,
                                ]}
                                accessibilityRole="button"
                                accessibilityLabel="Close compose notification"
                            >
                                <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
                            </Pressable>
                            <Text style={styles.modalTitle} numberOfLines={1}>
                                Compose Notification
                            </Text>
                        </View>

                        {/* Multi-Channel Notifications Card */}
                        <View style={styles.multiChannelCard}>
                            <View style={styles.cardHeader}>
                                <Ionicons name="notifications-outline" size={20} color={theme.colors.secondary} />
                                <Text style={styles.sectionTitle}>Multi-Channel Notifications</Text>
                            </View>
                            <Text style={styles.cardDescription}>
                                Send notifications via in-app alerts and/or email. In-app messages appear in the recipient&apos;s inbox immediately; the mobile app also shows a device alert when open.
                            </Text>
                            {!emailReady && (
                                <View style={styles.warningBox}>
                                    <Ionicons name="warning" size={16} color={theme.colors.warning} />
                                    <Text style={styles.warningText}>
                                        Email requires Microsoft 365 setup in Admin Panel → Email Configuration.
                                    </Text>
                                </View>
                            )}
                            {emailReady && (
                                <View style={[styles.warningBox, { backgroundColor: '#ecfdf5', borderColor: '#bbf7d0' }]}>
                                    <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
                                    <Text style={[styles.warningText, { color: '#166534' }]}>
                                        Email is configured and ready.
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Delivery Method Card */}
                        <StyledCard style={styles.deliveryCard}>
                            <View style={styles.cardHeader}>
                                <Ionicons name="notifications-outline" size={20} color={theme.colors.text} />
                                <Text style={styles.sectionTitle}>Delivery Method</Text>
                            </View>
                            <Text style={styles.cardDescription}>Choose how to deliver this notification.</Text>

                            <TouchableOpacity
                                style={styles.radioOption}
                                onPress={() => setDeliveryMethod('in-app')}
                            >
                                <View style={styles.radioContainer}>
                                    <View style={[styles.radio, deliveryMethod === 'in-app' && styles.radioSelected]}>
                                        {deliveryMethod === 'in-app' && <View style={styles.radioInner} />}
                                    </View>
                                    <Ionicons name="notifications-outline" size={20} color={theme.colors.text} style={styles.radioIcon} />
                                    <Text style={styles.radioText}>In-App Notification</Text>
                                    <View style={[styles.tag, styles.tagInstant]}>
                                        <Text style={styles.tagText}>Instant</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.radioOption}
                                onPress={() => emailReady && setDeliveryMethod('email')}
                                disabled={!emailReady}
                            >
                                <View style={styles.radioContainer}>
                                    <View style={[styles.radio, deliveryMethod === 'email' && styles.radioSelected]}>
                                        {deliveryMethod === 'email' && <View style={styles.radioInner} />}
                                    </View>
                                    <Ionicons name="mail-outline" size={20} color={theme.colors.text} style={styles.radioIcon} />
                                    <Text style={styles.radioText}>Email Notification</Text>
                                    <View style={[styles.tag, emailReady ? styles.tagInstant : styles.tagNotConfigured]}>
                                        <Text style={emailReady ? styles.tagText : styles.tagTextNotConfigured}>
                                            {emailReady ? 'Ready' : 'Not Configured'}
                                        </Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        </StyledCard>

                        {/* Recipients first — subject/message/send were above this and users tapped Send with no one selected */}
                        {/* Tag Groups Card */}
                        <StyledCard style={styles.tagGroupsCard}>
                            <View style={styles.cardHeader}>
                                <Ionicons name="people-outline" size={20} color={theme.colors.text} />
                                <Text style={styles.sectionTitle}>Tag Groups</Text>
                            </View>
                            <Text style={styles.cardDescription}>Select groups by tag</Text>
                            <Text style={styles.noTagsText}>No tags found</Text>
                        </StyledCard>

                        {/* Individual Users Card */}
                        <StyledCard style={styles.usersCard}>
                            <View style={styles.cardHeader}>
                                <Ionicons name="people-outline" size={20} color={theme.colors.text} />
                                <Text style={styles.sectionTitle}>Individual Users</Text>
                            </View>
                            <Text style={styles.cardDescription}>Tap people to include as recipients (required)</Text>

                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search users..."
                                placeholderTextColor={theme.colors.textSecondary}
                                value={searchUsers}
                                onChangeText={setSearchUsers}
                            />

                            <ScrollView
                                style={styles.usersList}
                                nestedScrollEnabled={true}
                                showsVerticalScrollIndicator={true}
                            >
                                {filteredUsers.length === 0 ? (
                                    <Text style={styles.noTagsText}>
                                        {users.length === 0
                                            ? 'No staff found for this camp. Check your company access.'
                                            : 'No users match your search.'}
                                    </Text>
                                ) : (
                                    filteredUsers.map((user) => (
                                    <TouchableOpacity
                                        key={user.id}
                                        style={styles.userItem}
                                        onPress={() => toggleUserSelection(user.id)}
                                    >
                                        <View style={[styles.radio, selectedUsers.includes(user.id) && styles.radioSelected]}>
                                            {selectedUsers.includes(user.id) && <View style={styles.radioInner} />}
                                        </View>
                                        <View style={styles.userInfo}>
                                            <Text style={styles.userName}>{user.name}</Text>
                                            <Text style={styles.userEmail}>{user.email}</Text>
                                        </View>
                                    </TouchableOpacity>
                                    ))
                                )}
                            </ScrollView>
                        </StyledCard>

                        {/* Recipient Preview Card */}
                        <StyledCard style={styles.recipientCard}>
                            <TouchableOpacity
                                style={styles.recipientHeader}
                                onPress={() => setShowRecipientPreview(!showRecipientPreview)}
                            >
                                <Text style={styles.sectionTitle}>Recipient Preview</Text>
                                <Ionicons
                                    name={showRecipientPreview ? "chevron-up" : "chevron-down"}
                                    size={20}
                                    color={theme.colors.textSecondary}
                                />
                            </TouchableOpacity>
                            <Text style={styles.recipientCount}>{selectedUsers.length} recipients selected</Text>

                            {showRecipientPreview && selectedUsers.length > 0 && (
                                <View style={styles.previewList}>
                                    {selectedUsers.map(userId => {
                                        const user = users.find(u => u.id === userId);
                                        if (!user) return null;
                                        return (
                                            <View key={userId} style={styles.previewItem}>
                                                <Text style={styles.previewName}>{user.name}</Text>
                                                <TouchableOpacity onPress={() => toggleUserSelection(userId)}>
                                                    <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
                                                </TouchableOpacity>
                                            </View>
                                        );
                                    })}
                                </View>
                            )}
                        </StyledCard>

                        {/* Compose Notification Card */}
                        <StyledCard style={styles.composeCard}>
                            <View style={styles.cardHeader}>
                                <View style={styles.blueDot} />
                                <Text style={styles.sectionTitle}>Compose Notification</Text>
                            </View>
                            <Text style={styles.cardDescription}>
                                Subject and body — recipients are selected in Individual Users above.
                            </Text>

                            <View style={styles.formField}>
                                <Text style={styles.fieldLabel}>Subject</Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Message subject..."
                                    placeholderTextColor={theme.colors.textSecondary}
                                    value={subject}
                                    onChangeText={setSubject}
                                />
                            </View>

                            <View style={styles.formField}>
                                <Text style={styles.fieldLabel}>Message</Text>
                                <TextInput
                                    style={styles.textArea}
                                    placeholder="Write your message here..."
                                    placeholderTextColor={theme.colors.textSecondary}
                                    multiline
                                    numberOfLines={6}
                                    textAlignVertical="top"
                                    value={message}
                                    onChangeText={setMessage}
                                />
                            </View>

                            {messageMediaEnabled ? (
                                <View style={{ marginBottom: 12 }}>
                                    <TouchableOpacity style={styles.clearBtn} onPress={pickMessageMedia}>
                                        <Ionicons name="attach" size={16} color={theme.colors.text} />
                                        <Text style={styles.clearBtnText}>
                                            {pendingMedia
                                                ? `Attached: ${pendingMedia.fileName}`
                                                : 'Attach photo, video, audio, or file'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            ) : null}

                            <View style={styles.actionButtons}>
                                <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
                                    <Text style={styles.clearBtnText}>Clear</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.sendBtn} onPress={async () => {
                                    if (!currentUserId) {
                                        Alert.alert('Error', 'You must be signed in to send notifications.');
                                        return;
                                    }
                                    if (selectedUsers.length === 0) {
                                        Alert.alert(
                                            'Select recipients',
                                            'Scroll up to Individual Users and tap one or more people before sending.'
                                        );
                                        return;
                                    }
                                    if (!subject.trim()) {
                                        Alert.alert('Missing subject', 'Please enter a subject.');
                                        return;
                                    }
                                    if (!message.trim() && !pendingMedia) {
                                        Alert.alert('Missing message', 'Please enter a message or attach media.');
                                        return;
                                    }
                                    if (
                                        pendingMedia &&
                                        messageMediaEnabled &&
                                        selectedUsers.length === 1 &&
                                        deliveryMethod === 'in-app' &&
                                        companyId
                                    ) {
                                        try {
                                            const recipientId = selectedUsers[0];
                                            const threadScopeId = recipientId;
                                            const { error: mediaErr } = await sendDirectMessageMedia(supabase, {
                                                companyId,
                                                senderId: currentUserId,
                                                recipientId,
                                                subject:
                                                    subject.trim() ||
                                                    defaultMediaMessageSubject(pendingMedia.kind),
                                                threadScopeId,
                                                caption: message.trim(),
                                                media: pendingMedia,
                                                senderDisplayName: profile?.full_name ?? null,
                                            });
                                            if (mediaErr) throw new Error(mediaErr);
                                            Alert.alert('Success', messagePreviewLabel(pendingMedia.kind, message.trim()));
                                            handleCloseCompose();
                                            queryClient.invalidateQueries({ queryKey: ['messages'] });
                                            return;
                                        } catch (err: any) {
                                            Alert.alert('Error', err?.message || 'Failed to send media message.');
                                            return;
                                        }
                                    }
                                    try {
                                        const { data, error } = await supabase.functions.invoke('send-bulk-email', {
                                            body: {
                                                subject: subject.trim(),
                                                message: message.trim(),
                                                recipientTags: [],
                                                recipientIds: selectedUsers,
                                                deliveryMethods: {
                                                    inApp: deliveryMethod === 'in-app',
                                                    email: deliveryMethod === 'email',
                                                },
                                            },
                                        });
                                        if (error) throw error;
                                        const methods: string[] = data?.delivery_methods ?? [];
                                        if (deliveryMethod === 'email' && methods.includes('email_not_configured')) {
                                            Alert.alert(
                                                'Email not sent',
                                                'Email is not configured for this camp. Configure Microsoft 365 in Admin Panel, or send as in-app only.',
                                            );
                                            return;
                                        }
                                        if (deliveryMethod === 'email' && methods.includes('email_failed')) {
                                            Alert.alert('Email failed', data?.note || 'Email delivery failed. Check Admin → Email Configuration.');
                                            return;
                                        }
                                        Alert.alert('Success', data?.note || 'Notification sent!');
                                        handleCloseCompose();
                                    } catch (err: any) {
                                        Alert.alert('Error', err?.message || 'Failed to send notification.');
                                    }
                                }}>
                                    <Ionicons name="send" size={18} color="white" />
                                    <Text style={styles.sendBtnText}>Send Notification</Text>
                                </TouchableOpacity>
                            </View>
                        </StyledCard>
                    </KeyboardAwareScrollView>
                </View>
            </Modal>

            {/* Create Group Modal */}
            <Modal
                visible={showCreateGroupModal}
                transparent={false}
                animationType="slide"
                presentationStyle="fullScreen"
                onRequestClose={() => setShowCreateGroupModal(false)}
            >
                <View
                    style={[
                        styles.modalContainer,
                        {
                            paddingTop: modalTopInset,
                            paddingBottom: insets.bottom,
                            paddingLeft: insets.left,
                            paddingRight: insets.right,
                        },
                    ]}
                >
                    <KeyboardAwareScrollView
                        contentContainerStyle={[
                            styles.modalScrollContent,
                            { paddingBottom: 40 + Math.max(insets.bottom, 8) },
                        ]}
                        keyboardShouldPersistTaps="handled"
                        enableOnAndroid
                    >
                        <View style={styles.modalHeader}>
                            <Pressable
                                onPress={() => setShowCreateGroupModal(false)}
                                hitSlop={12}
                                style={({ pressed }) => [styles.modalBackBtn, pressed && styles.modalBackBtnPressed]}
                            >
                                <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
                            </Pressable>
                            <Text style={styles.modalTitle} numberOfLines={1}>
                                New group
                            </Text>
                        </View>
                        <Text style={styles.groupsModalHint}>
                            Add staff members to a shared conversation. Group chat works on mobile and web.
                        </Text>
                        <TextInput
                            style={styles.textInput}
                            placeholder="Group name"
                            value={groupName}
                            onChangeText={setGroupName}
                        />
                        <TextInput
                            style={[styles.textArea, { minHeight: 80, marginTop: theme.spacing.sm }]}
                            placeholder="Description (optional)"
                            value={groupDescription}
                            onChangeText={setGroupDescription}
                            multiline
                        />
                        <Text style={[styles.fieldLabel, { marginTop: theme.spacing.md }]}>
                            Members ({selectedGroupMembers.length} selected)
                        </Text>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search users..."
                            value={groupSearchUsers}
                            onChangeText={setGroupSearchUsers}
                        />
                        <ScrollView style={styles.usersList}>
                            {filteredGroupUsers.map((user) => (
                                <TouchableOpacity key={user.id} style={styles.userItem} onPress={() => {
                                    setSelectedGroupMembers((prev) =>
                                        prev.includes(user.id) ? prev.filter((id) => id !== user.id) : [...prev, user.id]
                                    );
                                }}>
                                    <View style={[styles.radio, selectedGroupMembers.includes(user.id) && styles.radioSelected]}>
                                        {selectedGroupMembers.includes(user.id) && <View style={styles.radioInner} />}
                                    </View>
                                    <View style={styles.userInfo}>
                                        <Text style={styles.userName}>{user.name}</Text>
                                        <Text style={styles.userEmail}>{user.email}</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <View style={styles.actionButtons}>
                            <TouchableOpacity style={styles.clearBtn} onPress={() => setShowCreateGroupModal(false)}>
                                <Text style={styles.clearBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.sendBtn}
                                onPress={() => {
                                    if (!groupName.trim() || !companyId || !currentUserId || selectedGroupMembers.length === 0) {
                                        Alert.alert('Error', 'Enter group name and select at least one member.');
                                        return;
                                    }
                                    createGroupMutation.mutate(
                                        {
                                            name: groupName,
                                            description: groupDescription,
                                            company_id: companyId,
                                            created_by: currentUserId,
                                            member_ids: selectedGroupMembers,
                                        },
                                        {
                                            onSuccess: (group: any) => {
                                                setGroupName('');
                                                setGroupDescription('');
                                                setGroupSearchUsers('');
                                                setSelectedGroupMembers([]);
                                                setShowCreateGroupModal(false);
                                                setActiveView('groups');
                                                if (group?.id && group?.name) {
                                                    openGroup({ id: group.id, name: group.name });
                                                }
                                            },
                                            onError: (err: any) => {
                                                Alert.alert('Error', err?.message || 'Failed to create group');
                                            },
                                        }
                                    );
                                }}
                            >
                                <Text style={styles.sendBtnText}>Create group</Text>
                            </TouchableOpacity>
                        </View>
                    </KeyboardAwareScrollView>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    containerThread: {
        paddingTop: 0,
        backgroundColor: theme.colors.background,
    },
    flex1: {
        flex: 1,
    },
    scrollContent: {
        padding: theme.spacing.md,
        paddingBottom: 100,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
    },
    headerIconBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    titleSection: {
        marginBottom: theme.spacing.lg,
    },
    titleContainer: {
        width: '100%',
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.xs,
        flexWrap: 'wrap',
    },
    bellIcon: {
        marginRight: theme.spacing.sm,
    },
    title: {
        ...theme.typography.h1,
        fontSize: 26,
        fontWeight: '700',
        color: theme.colors.text,
    },
    subtitle: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.xs,
    },
    segmentBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        marginTop: theme.spacing.md,
        paddingRight: theme.spacing.md,
    },
    segmentTab: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 999,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    segmentTabActive: {
        backgroundColor: theme.colors.secondary,
        borderColor: theme.colors.secondary,
    },
    segmentTabCompose: {
        borderColor: '#bfdbfe',
        backgroundColor: '#eff6ff',
    },
    segmentTabText: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    segmentTabComposeText: {
        color: theme.colors.secondary,
    },
    segmentTabTextActive: {
        color: '#fff',
    },
    threadTopBar: {
        marginBottom: theme.spacing.sm,
    },
    threadBackBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        alignSelf: 'flex-start',
        paddingVertical: 4,
    },
    threadBackLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.primary,
    },
    groupChatTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
        marginTop: 4,
        marginLeft: 4,
    },
    groupsCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
    },
    groupsSubtitle: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        lineHeight: 20,
        marginBottom: theme.spacing.md,
    },
    groupsPrimaryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: theme.colors.secondary,
        paddingVertical: 14,
        borderRadius: theme.borderRadius.lg,
        marginBottom: theme.spacing.sm,
    },
    groupsPrimaryBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    groupsEmpty: {
        alignItems: 'center',
        paddingVertical: theme.spacing.xl,
        paddingHorizontal: theme.spacing.md,
        gap: theme.spacing.sm,
    },
    groupsEmptyIconWrap: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#eff6ff',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: theme.spacing.xs,
    },
    groupsEmptyTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: theme.colors.text,
    },
    groupsEmptyBody: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
    groupAvatar: {
        backgroundColor: '#e0e7ff',
    },
    groupsModalHint: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        lineHeight: 20,
        marginBottom: theme.spacing.lg,
    },
    listCardHeader: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.md,
    },
    listCardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
    },
    messageCountCompact: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        fontWeight: '500',
    },
    inboxList: {
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    inboxRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    inboxRowUnread: {
        backgroundColor: '#f8fafc',
    },
    avatarCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#e0e7ff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarCircleUnread: {
        backgroundColor: theme.colors.secondary,
    },
    avatarText: {
        fontSize: 17,
        fontWeight: '700',
        color: theme.colors.primary,
    },
    avatarTextUnread: {
        color: '#fff',
    },
    inboxRowBody: {
        flex: 1,
        minWidth: 0,
    },
    inboxRowTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    inboxRowParty: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.text,
    },
    inboxRowPartyUnread: {
        color: theme.colors.primary,
    },
    inboxRowDate: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    inboxRowSubject: {
        fontSize: 14,
        color: theme.colors.text,
        marginTop: 2,
    },
    inboxRowSubjectUnread: {
        fontWeight: '600',
    },
    inboxRowSnippet: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        marginTop: 4,
        lineHeight: 18,
    },
    emptyStateCompact: {
        alignItems: 'center',
        paddingVertical: theme.spacing.xl,
        gap: theme.spacing.sm,
    },
    emptyCta: {
        marginTop: theme.spacing.sm,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.secondary,
    },
    emptyCtaText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
    threadScreen: {
        gap: theme.spacing.md,
    },
    threadCard: {
        padding: theme.spacing.lg,
    },
    threadSubject: {
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.text,
        lineHeight: 26,
        marginBottom: theme.spacing.md,
    },
    threadMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.lg,
    },
    threadMetaText: {
        flex: 1,
    },
    threadMetaLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    threadMetaName: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
        marginTop: 2,
    },
    threadMetaDate: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    threadOriginalBubble: {
        backgroundColor: '#f3f4f6',
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
    },
    threadRepliesBlock: {
        marginTop: theme.spacing.lg,
        gap: theme.spacing.sm,
    },
    threadRepliesHeading: {
        fontSize: 13,
        fontWeight: '700',
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    chatBubble: {
        maxWidth: '88%',
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.xs,
    },
    chatBubbleMe: {
        alignSelf: 'flex-end',
        backgroundColor: '#dbeafe',
        borderWidth: 1,
        borderColor: '#bfdbfe',
    },
    chatBubbleThem: {
        alignSelf: 'flex-start',
        backgroundColor: '#f3f4f6',
    },
    chatBubbleName: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        marginBottom: 4,
    },
    chatBubbleTime: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        marginTop: 6,
        alignSelf: 'flex-end',
    },
    chatBubbleTimeMe: {
        color: theme.colors.textSecondary,
    },
    composerCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.sm,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.card,
    },
    composerAttachmentChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#eff6ff',
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: 10,
        paddingVertical: 8,
        marginBottom: 8,
    },
    composerAttachmentName: {
        flex: 1,
        fontSize: 13,
        color: theme.colors.text,
    },
    composerRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 8,
    },
    composerIconBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 20,
    },
    composerInput: {
        flex: 1,
        minHeight: 40,
        maxHeight: 120,
        fontSize: 16,
        color: theme.colors.text,
        paddingHorizontal: 12,
        paddingVertical: Platform.OS === 'ios' ? 10 : 8,
        backgroundColor: '#f9fafb',
        borderRadius: theme.borderRadius.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    composerSendBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: theme.colors.secondary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    composerSendBtnDisabled: {
        opacity: 0.45,
    },
    composeFab: {
        position: 'absolute',
        bottom: theme.spacing.lg,
        right: theme.spacing.lg,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: theme.colors.secondary,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        marginTop: theme.spacing.md,
    },
    inboxBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        gap: theme.spacing.xs,
    },
    inboxBtnActive: {
        backgroundColor: theme.colors.secondary,
        borderColor: theme.colors.secondary,
    },
    inboxBtnText: {
        color: theme.colors.text,
        fontWeight: '600',
        fontSize: 14,
    },
    inboxBtnTextActive: {
        color: 'white',
    },
    composeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        gap: theme.spacing.xs,
    },
    composeBtnActive: {
        backgroundColor: theme.colors.secondary,
        borderColor: theme.colors.secondary,
    },
    composeBtnText: {
        color: theme.colors.text,
        fontWeight: '600',
        fontSize: 14,
    },
    composeBtnTextActive: {
        color: 'white',
    },
    inboxContainer: {
        gap: theme.spacing.md,
    },
    messagesListCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        minHeight: 120,
    },
    selectMessageCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.xl,
        minHeight: 400,
    },
    selectMessageTitle: {
        ...theme.typography.h2,
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: theme.spacing.md,
    },
    selectMessageEmpty: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: theme.spacing.xl,
    },
    selectMessageText: {
        ...theme.typography.body,
        fontSize: 16,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
    contentCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.xl,
        minHeight: 400,
    },
    cardTitle: {
        ...theme.typography.h2,
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: theme.spacing.sm,
    },
    messageCount: {
        ...theme.typography.bodySmall,
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xl,
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: theme.spacing.xl,
    },
    emptyText: {
        ...theme.typography.body,
        fontSize: 16,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
    fab: {
        position: 'absolute',
        bottom: theme.spacing.xl,
        right: theme.spacing.xl,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: theme.colors.secondary,
        alignItems: 'center',
        justifyContent: 'center',
        ...theme.shadows.card,
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    centerModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing.md,
    },
    fabText: {
        fontSize: 24,
        fontWeight: '700',
        color: 'white',
    },
    // Compose Modal Styles
    modalContainer: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    modalScrollContent: {
        padding: theme.spacing.md,
        flexGrow: 1,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
        gap: theme.spacing.sm,
        minHeight: 44,
    },
    modalBackBtn: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 22,
    },
    modalBackBtnPressed: {
        opacity: 0.65,
    },
    modalTitle: {
        ...theme.typography.h2,
        flex: 1,
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.text,
    },
    multiChannelCard: {
        backgroundColor: '#dbeafe',
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
    },
    deliveryCard: {
        marginBottom: theme.spacing.md,
    },
    composeCard: {
        marginBottom: theme.spacing.md,
    },
    tagGroupsCard: {
        marginBottom: theme.spacing.md,
    },
    usersCard: {
        marginBottom: theme.spacing.md,
    },
    recipientCard: {
        marginBottom: theme.spacing.md,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
        gap: theme.spacing.sm,
    },
    sectionTitle: {
        ...theme.typography.h3,
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.text,
    },
    cardDescription: {
        ...theme.typography.bodySmall,
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.sm,
    },
    warningBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fef3c7',
        padding: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
        gap: theme.spacing.xs,
        marginTop: theme.spacing.sm,
    },
    warningText: {
        ...theme.typography.bodySmall,
        fontSize: 12,
        color: theme.colors.text,
        flex: 1,
    },
    radioOption: {
        marginTop: theme.spacing.md,
    },
    radioContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
    },
    radio: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: theme.colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioSelected: {
        borderColor: theme.colors.secondary,
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: theme.colors.secondary,
    },
    radioIcon: {
        marginRight: theme.spacing.xs,
    },
    radioText: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.text,
        flex: 1,
    },
    tag: {
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 4,
        borderRadius: theme.borderRadius.sm,
    },
    tagInstant: {
        backgroundColor: theme.colors.secondary,
    },
    tagNotConfigured: {
        backgroundColor: theme.colors.accent,
    },
    tagText: {
        fontSize: 12,
        fontWeight: '600',
        color: 'white',
    },
    tagTextNotConfigured: {
        fontSize: 12,
        fontWeight: '600',
        color: 'white',
    },
    blueDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: theme.colors.secondary,
        marginRight: theme.spacing.xs,
    },
    formField: {
        marginTop: theme.spacing.md,
    },
    fieldLabel: {
        ...theme.typography.body,
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    textInput: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.sm,
        fontSize: 14,
        color: theme.colors.text,
        height: 44,
        outlineWidth: 0,
        outlineColor: 'transparent',
    },
    textArea: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.sm,
        fontSize: 14,
        color: theme.colors.text,
        minHeight: 120,
        outlineWidth: 0,
        outlineColor: 'transparent',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
        marginTop: theme.spacing.lg,
    },
    clearBtn: {
        flex: 1,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
    },
    clearBtnText: {
        ...theme.typography.body,
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.secondary,
    },
    sendBtn: {
        flex: 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.secondary,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        gap: theme.spacing.xs,
    },
    sendBtnText: {
        ...theme.typography.body,
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
    },
    noTagsText: {
        ...theme.typography.bodySmall,
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.sm,
    },
    searchInput: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.sm,
        fontSize: 14,
        color: theme.colors.text,
        height: 44,
        marginTop: theme.spacing.sm,
        outlineWidth: 0,
        outlineColor: 'transparent',
    },
    usersList: {
        marginTop: theme.spacing.md,
        maxHeight: 180, // Shows approximately 3 items, rest will scroll
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        gap: theme.spacing.sm,
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        ...theme.typography.body,
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 2,
    },
    userEmail: {
        ...theme.typography.bodySmall,
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    recipientHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    recipientCount: {
        ...theme.typography.bodySmall,
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    emailBanner: {
        flexDirection: 'row',
        backgroundColor: theme.colors.secondary,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        gap: theme.spacing.sm,
        marginTop: theme.spacing.md,
    },
    bannerContent: {
        flex: 1,
    },
    bannerTitle: {
        ...theme.typography.body,
        fontSize: 14,
        fontWeight: '700',
        color: 'white',
        marginBottom: theme.spacing.xs,
    },
    bannerText: {
        ...theme.typography.bodySmall,
        fontSize: 12,
        color: 'white',
        lineHeight: 18,
    },
    previewList: {
        marginTop: theme.spacing.md,
        gap: theme.spacing.sm,
    },
    previewItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.sm,
        backgroundColor: '#f3f4f6',
        borderRadius: theme.borderRadius.md,
    },
    previewName: {
        ...theme.typography.bodySmall,
        fontSize: 14,
        color: theme.colors.text,
    },
    messageItem: {
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    messageUnread: {
        backgroundColor: '#eef2ff',
    },
    messageItemSelected: {
        backgroundColor: '#e0e7ff',
        borderRadius: theme.borderRadius.md,
    },
    sectionTitleInline: {
        ...theme.typography.h2,
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.text,
    },
    replyBubble: {
        marginBottom: theme.spacing.sm,
        padding: theme.spacing.md,
        backgroundColor: '#f4f6f8',
        borderRadius: theme.borderRadius.md,
        borderLeftWidth: 3,
        borderLeftColor: theme.colors.primary,
    },
    replyMeta: {
        ...theme.typography.bodySmall,
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginBottom: 6,
    },
    replyBody: {
        ...theme.typography.body,
        fontSize: 15,
        color: theme.colors.text,
    },
    messageSender: {
        ...theme.typography.body,
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
    },
    messageSubject: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.text,
        marginTop: 2,
    },
    messageSnippet: {
        ...theme.typography.bodySmall,
        fontSize: 13,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    messageDate: {
        ...theme.typography.bodySmall,
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
});
