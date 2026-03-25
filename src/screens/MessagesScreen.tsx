import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, TextInput, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { StyledCard } from '../components/StyledCard';
import { useMessages, useSendMessage, useMarkMessageRead } from '../api/messages';
import { useCompany } from '../contexts/CompanyContext';
import { supabase } from '../lib/supabase';
import { MobileUserMenu } from '../components/MobileUserMenu';
import { useQuery } from '@tanstack/react-query';

export const MessagesScreen = ({ navigation }: any) => {
    const [activeView, setActiveView] = useState('inbox');
    const [showComposeModal, setShowComposeModal] = useState(false);
    const [deliveryMethod, setDeliveryMethod] = useState('in-app');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [searchUsers, setSearchUsers] = useState('');
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [showRecipientPreview, setShowRecipientPreview] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState<any>(null);

    const { companyId } = useCompany();
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id || null));
    }, []);

    const { data: messages = [], isLoading: messagesLoading } = useMessages(currentUserId);
    const sendMutation = useSendMessage();
    const markReadMutation = useMarkMessageRead();

    // Fetch users (profiles) for same company only, same as web
    const { data: users = [] } = useQuery({
        queryKey: ['profiles_for_messages', companyId],
        queryFn: async () => {
            if (!companyId) return [];
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, email')
                .eq('company_id', companyId)
                .order('full_name', { ascending: true });
            if (error) throw error;
            return (data || []).map((p: any) => ({ id: p.id, name: p.full_name || p.email || 'Unknown', email: p.email || '' }));
        },
        enabled: !!companyId,
    });
    const messageCount = messages.length;

    const handleInbox = () => {
        setActiveView('inbox');
        setShowComposeModal(false);
    };

    const handleCompose = () => {
        setActiveView('compose');
        setShowComposeModal(true);
    };

    const handleCloseCompose = () => {
        setShowComposeModal(false);
        // Reset form
        setSubject('');
        setMessage('');
        setSelectedUsers([]);
        setSearchUsers('');
        setDeliveryMethod('in-app');
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

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAwareScrollView
                contentContainerStyle={styles.scrollContent}
                enableOnAndroid={true}
                extraScrollHeight={20}
                keyboardShouldPersistTaps="handled"
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.openDrawer()}>
                        <Ionicons name="menu" size={28} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <View style={styles.headerRight}>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('Messages')}
                            style={styles.headerIconBtn}
                        >
                            <Ionicons name="notifications-outline" size={26} color={theme.colors.primary} />
                        </TouchableOpacity>
                        <MobileUserMenu navigation={navigation} />
                    </View>
                </View>

                {/* Title and Description Section */}
                <View style={styles.titleSection}>
                    <View style={styles.titleContainer}>
                        <View style={styles.titleRow}>
                            <Text style={styles.title}>Notifications & Messages</Text>
                            <Ionicons name="notifications-outline" size={28} color={theme.colors.text} />
                        </View>
                        <Text style={styles.subtitle}>Send notifications and view messages</Text>
                    </View>

                    {/* Action Buttons Row */}
                    <View style={styles.actionButtonsContainer}>
                        <TouchableOpacity
                            style={[styles.inboxBtn, activeView === 'inbox' && styles.inboxBtnActive]}
                            onPress={handleInbox}
                        >
                            <Ionicons
                                name="notifications-outline"
                                size={18}
                                color={activeView === 'inbox' ? 'white' : theme.colors.text}
                            />
                            <Text style={[styles.inboxBtnText, activeView === 'inbox' && styles.inboxBtnTextActive]}>
                                Inbox
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.composeBtn, activeView === 'compose' && styles.composeBtnActive]}
                            onPress={handleCompose}
                        >
                            <Ionicons
                                name="send-outline"
                                size={18}
                                color={activeView === 'compose' ? 'white' : theme.colors.text}
                            />
                            <Text style={[styles.composeBtnText, activeView === 'compose' && styles.composeBtnTextActive]}>
                                Compose
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Inbox View */}
                {activeView === 'inbox' && (
                    <View style={styles.inboxContainer}>
                        {/* Messages List Card */}
                        <StyledCard style={styles.messagesListCard}>
                            <Text style={styles.cardTitle}>Notifications & Messages</Text>
                            <Text style={styles.messageCount}>{messageCount} total messages</Text>
                            {messagesLoading ? (
                                <ActivityIndicator size="large" color={theme.colors.secondary} style={{ marginTop: 20 }} />
                            ) : messages.length === 0 ? (
                                <View style={styles.emptyState}>
                                    <Text style={styles.emptyText}>No messages yet</Text>
                                </View>
                            ) : (
                                <ScrollView style={{ maxHeight: 300 }} nestedScrollEnabled>
                                    {messages.map((msg: any) => (
                                        <TouchableOpacity
                                            key={msg.id}
                                            style={[styles.messageItem, !msg.read && styles.messageUnread]}
                                            onPress={() => {
                                                setSelectedMessage(msg);
                                                if (!msg.read && msg.recipient_id === currentUserId) {
                                                    markReadMutation.mutate(msg.id);
                                                }
                                            }}
                                        >
                                            <Text style={styles.messageSender}>{msg.sender?.full_name || 'Unknown'}</Text>
                                            <Text style={styles.messageSubject} numberOfLines={1}>{msg.subject}</Text>
                                            <Text style={styles.messageDate}>{new Date(msg.created_at).toLocaleDateString()}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            )}
                        </StyledCard>

                        {/* Selected Message Card */}
                        <StyledCard style={styles.selectMessageCard}>
                            {selectedMessage ? (
                                <View>
                                    <Text style={styles.selectMessageTitle}>{selectedMessage.subject}</Text>
                                    <Text style={styles.messageSender}>From: {selectedMessage.sender?.full_name || 'Unknown'}</Text>
                                    <Text style={[styles.selectMessageText, { marginTop: 12, textAlign: 'left' }]}>{selectedMessage.content}</Text>
                                </View>
                            ) : (
                                <View>
                                    <Text style={styles.selectMessageTitle}>Select a message</Text>
                                    <View style={styles.selectMessageEmpty}>
                                        <Text style={styles.selectMessageText}>Select a message to view its contents</Text>
                                    </View>
                                </View>
                            )}
                        </StyledCard>
                    </View>
                )}

                {/* Compose View - Show empty state when compose is active but modal not open */}
                {activeView === 'compose' && !showComposeModal && (
                    <StyledCard style={styles.contentCard}>
                        <Text style={styles.cardTitle}>Notifications & Messages</Text>
                        <Text style={styles.messageCount}>{messageCount} total messages</Text>
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No messages yet</Text>
                        </View>
                    </StyledCard>
                )}

            </KeyboardAwareScrollView>

            {/* Floating Action Button */}
            <TouchableOpacity style={styles.fab}>
                <Text style={styles.fabText}>D</Text>
            </TouchableOpacity>

            {/* Compose Notification Modal */}
            <Modal
                visible={showComposeModal}
                transparent={false}
                animationType="slide"
                onRequestClose={handleCloseCompose}
            >
                <SafeAreaView style={styles.modalContainer}>
                    <KeyboardAwareScrollView
                        contentContainerStyle={styles.modalScrollContent}
                        showsVerticalScrollIndicator={false}
                        enableOnAndroid={true}
                        extraScrollHeight={20}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Modal Header */}
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={handleCloseCompose}>
                                <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>Compose Notification</Text>
                            <View style={{ width: 24 }} />
                        </View>

                        {/* Multi-Channel Notifications Card */}
                        <View style={styles.multiChannelCard}>
                            <View style={styles.cardHeader}>
                                <Ionicons name="notifications-outline" size={20} color={theme.colors.secondary} />
                                <Text style={styles.sectionTitle}>Multi-Channel Notifications</Text>
                            </View>
                            <Text style={styles.cardDescription}>
                                Send notifications via In-app push alerts and/or email. In-app notifications are delivered instantly.
                            </Text>
                            <View style={styles.warningBox}>
                                <Ionicons name="warning" size={16} color={theme.colors.warning} />
                                <Text style={styles.warningText}>
                                    Email integration requires configuration (Microsoft 365 or Resend).
                                </Text>
                            </View>
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
                                    <Text style={styles.radioText}>In-App Notification (Push)</Text>
                                    <View style={[styles.tag, styles.tagInstant]}>
                                        <Text style={styles.tagText}>Instant</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.radioOption}
                                onPress={() => setDeliveryMethod('email')}
                            >
                                <View style={styles.radioContainer}>
                                    <View style={[styles.radio, deliveryMethod === 'email' && styles.radioSelected]}>
                                        {deliveryMethod === 'email' && <View style={styles.radioInner} />}
                                    </View>
                                    <Ionicons name="mail-outline" size={20} color={theme.colors.text} style={styles.radioIcon} />
                                    <Text style={styles.radioText}>Email Notification</Text>
                                    <View style={[styles.tag, styles.tagNotConfigured]}>
                                        <Text style={styles.tagTextNotConfigured}>Not Configured</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        </StyledCard>

                        {/* Compose Notification Card */}
                        <StyledCard style={styles.composeCard}>
                            <View style={styles.cardHeader}>
                                <View style={styles.blueDot} />
                                <Text style={styles.sectionTitle}>Compose Notification</Text>
                            </View>
                            <Text style={styles.cardDescription}>Create and send notifications to selected recipients.</Text>

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

                            <View style={styles.actionButtons}>
                                <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
                                    <Text style={styles.clearBtnText}>Clear</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.sendBtn} onPress={() => {
                                    if (!subject.trim() || !message.trim() || selectedUsers.length === 0 || !currentUserId) {
                                        Alert.alert('Error', 'Please fill in subject, message, and select recipients.');
                                        return;
                                    }
                                    selectedUsers.forEach(recipientId => {
                                        sendMutation.mutate({
                                            sender_id: currentUserId,
                                            recipient_id: recipientId,
                                            subject: subject.trim(),
                                            content: message.trim(),
                                        });
                                    });
                                    Alert.alert('Success', 'Message sent!');
                                    handleCloseCompose();
                                }}>
                                    <Ionicons name="send" size={18} color="white" />
                                    <Text style={styles.sendBtnText}>Send Notification</Text>
                                </TouchableOpacity>
                            </View>
                        </StyledCard>

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
                            <Text style={styles.cardDescription}>Select specific users</Text>

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
                                {filteredUsers.map((user) => (
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
                                ))}
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

                        {/* Email Integration Pending Banner */}
                        <View style={styles.emailBanner}>
                            <Ionicons name="mail-outline" size={20} color="white" />
                            <View style={styles.bannerContent}>
                                <Text style={styles.bannerTitle}>Email Integration Pending</Text>
                                <Text style={styles.bannerText}>
                                    Email sending functionality will be enabled once Microsoft 365 Integration is configured. For now, messages are logged but not sent.
                                </Text>
                            </View>
                        </View>
                    </KeyboardAwareScrollView>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
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
        fontSize: 32,
        fontWeight: '700',
        color: theme.colors.text,
        flex: 1,
    },
    subtitle: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.xs,
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
        padding: theme.spacing.xl,
        minHeight: 200,
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
        paddingBottom: 100,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
        paddingTop: theme.spacing.sm,
    },
    modalTitle: {
        ...theme.typography.h2,
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
    messageDate: {
        ...theme.typography.bodySmall,
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
});
