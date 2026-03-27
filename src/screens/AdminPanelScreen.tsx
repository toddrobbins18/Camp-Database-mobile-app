import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, Pressable, TextInput, Alert, ActivityIndicator, Switch, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { StyledCard } from '../components/StyledCard';
import {
    useAdminUsers,
    useUpdateUserRole,
    deleteAdminPanelUser,
    useSendPasswordReset,
    useCreateUser,
    useEmailConfigs,
    useUpdateEmailConfig,
    useEditHistory,
} from '../api/admin';
import { useCompany } from '../contexts/CompanyContext';
import { supabase, supabaseAnonKey, supabaseUrl } from '../lib/supabase';
import { getSignedUrl } from '../api/storage';

export const AdminPanelScreen = ({ navigation }: any) => {


    const { companyId, season, isSuperAdmin } = useCompany();
    const { data: adminUsers = [] } = useAdminUsers(companyId);
    const { data: fetchedEmailConfigs = [] } = useEmailConfigs();
    const { data: fetchedHistory = [] } = useEditHistory();

    const queryClient = useQueryClient();
    const updateUserRoleMutation = useUpdateUserRole();
    const sendPasswordResetMutation = useSendPasswordReset();
    const createUserMutation = useCreateUser();
    const updateEmailConfigMutation = useUpdateEmailConfig();

    const users = adminUsers as any[];
    const emailConfigs = fetchedEmailConfigs as any[];
    const editHistoryEntries = fetchedHistory as any[];


    const [currentTab, setCurrentTab] = useState<'userManagement' | 'userTags' | 'emailAutomation' | 'emailConfig' | 'companies' | 'dataManagement' | 'dataImport' | 'dataExport' | 'editHistory'>('userManagement');
    const [showRolePicker, setShowRolePicker] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showAddTagModal, setShowAddTagModal] = useState(false);
    const [userForTags, setUserForTags] = useState<User | null>(null);

    // Add User Modal State
    const [showAddUserModal, setShowAddUserModal] = useState(false);
    const [activeTab, setActiveTab] = useState<'create' | 'invite'>('create');
    const [newUserFullName, setNewUserFullName] = useState('');
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [newUserRole, setNewUserRole] = useState('Staff');
    const [showNewUserRolePicker, setShowNewUserRolePicker] = useState(false);

    // Tags Management State
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFilterTag, setSelectedFilterTag] = useState('All Tags');
    const [showFilterTagPicker, setShowFilterTagPicker] = useState(false);

    const sendTimingOptions = [
        { value: 'When Created', label: 'When Created', description: 'Send immediately when record is created.' },
        { value: 'When Updated', label: 'When Updated', description: 'Send immediately when record is updated.' },
        { value: 'Day Before', label: 'Day Before', description: 'Send 24 hours before the event.' },
        { value: 'Morning Of (8 AM)', label: 'Morning Of (8 AM)', description: 'Send at 8:00 AM on the event day.' },
        { value: '2 Hours Before', label: '2 Hours Before', description: 'Send 2 hours before event time.' },
        { value: '4 Hours Before', label: '4 Hours Before', description: 'Send 4 hours before event time.' },
        { value: '1 Week Before', label: '1 Week Before', description: 'Send 7 days before the event.' },
    ];

    const emailTags = ['nurse', 'transportation', 'food service', 'specialist', 'division leader', 'director', 'general staff', 'admin staff', 'head of girls side', 'head of boys side'];

    const handleToggleEmailConfig = (id: string) => {
        const config = emailConfigs.find(c => c.id === id);
        if (config) {
            updateEmailConfigMutation.mutate({ ...config, enabled: !config.enabled });
        }
    };

    const handleTimingToggle = (configId: string, timing: string) => {
        const config = emailConfigs.find(c => c.id === configId);
        if (config) {
            const selectedTimings = config.selectedTimings.includes(timing)
                ? config.selectedTimings.filter((t: string) => t !== timing)
                : [...config.selectedTimings, timing];
            updateEmailConfigMutation.mutate({ ...config, selectedTimings });
        }
    };

    // Data Import State
    const [importSeason, setImportSeason] = useState('2025');
    const [showSeasonPicker, setShowSeasonPicker] = useState(false);
    const [campersFile, setCampersFile] = useState<string | null>(null);
    const [awardsFile, setAwardsFile] = useState<string | null>(null);
    const [showFilePicker, setShowFilePicker] = useState(false);
    const [activeFileType, setActiveFileType] = useState<'campers' | 'awards' | null>(null);
    const [activeFileButton, setActiveFileButton] = useState<'campers' | 'awards'>('campers');

    // Edit History State
    const [editHistorySearch, setEditHistorySearch] = useState('');
    const [selectedTableFilter, setSelectedTableFilter] = useState('All Tables');
    const [showTableFilterPicker, setShowTableFilterPicker] = useState(false);
    const [showDownloadModal, setShowDownloadModal] = useState(false);
    const [downloadFileName, setDownloadFileName] = useState('aucit-log-2026-01-25');
    const [selectedLocation, setSelectedLocation] = useState('Private folder');


    const tableFilters = ['All Tables', 'children', 'users', 'staff', 'divisions', 'sessions', 'awards'];

    const seasons = ['2025', '2026', '2027', '2028', '2029'];

    const handleFileSelectClick = (fileType: 'campers' | 'awards') => {
        setActiveFileType(fileType);
        setActiveFileButton(fileType);
        setShowFilePicker(true);
    };

    const handleFileSourceSelect = (source: string) => {
        if (activeFileType === 'campers') {
            setCampersFile(source);
        } else if (activeFileType === 'awards') {
            setAwardsFile(source);
        }
        setShowFilePicker(false);
        setActiveFileType(null);
    };

    const roles = [
        'Viewer',
        'Staff',
        'Division Leader',
        'Specialist',
        'Health Center',
        'Admin',
        'Super Admin'
    ];

    const runCreateUser = (fullName: string, email: string, password: string) => {
        const roleMap: Record<string, string> = {
            'Viewer': 'viewer',
            'Staff': 'staff',
            'Division Leader': 'division_leader',
            'Specialist': 'specialist',
            'Health Center': 'health_center',
            'Admin': 'admin',
            'Super Admin': 'super_admin',
        };
        const apiRole = roleMap[newUserRole] || 'staff';
        createUserMutation.mutate(
            { fullName, email, password, role: apiRole, companyId },
            {
                onSuccess: () => {
                    setNewUserFullName('');
                    setNewUserEmail('');
                    setNewUserPassword('');
                    setNewUserRole('Staff');
                    setShowAddUserModal(false);
                    Alert.alert('User created', `${email} can sign in now.`);
                },
                onError: (err: unknown) => {
                    const msg = err instanceof Error ? err.message : (err != null && typeof err === 'object' && 'error' in err ? (err as { error?: string }).error : null) ?? 'Could not create user.';
                    Alert.alert('Create failed', msg || 'Could not create user.');
                },
            }
        );
    };

    const availableTags = [
        'All Tags',
        'Nurse',
        'Transportation',
        'Food Service',
        'Specialist',
        'Division Leader',
        'Director',
        'General Staff',
        'Admin Staff',
        'Head of Girls Side',
        'Head of Boys Side'
    ];

    const handleRoleClick = (user: User) => {
        setSelectedUser(user);
        setShowRolePicker(true);
    };

    const handleRoleSelect = (newRole: string) => {
        if (selectedUser) {
            if (!companyId) {
                Alert.alert('Role update', 'Select a company before changing roles.');
                return;
            }
            updateUserRoleMutation.mutate({ userId: selectedUser.id, role: newRole, companyId });
            setShowRolePicker(false);
            setSelectedUser(null);
        }
    };

    const handleDeleteUser = async () => {
        if (!userToDelete?.id) return;
        console.log('[DELETE] admin panel user (profiles)', userToDelete.id, userToDelete.name);
        setIsDeleting(true);
        try {
            await deleteAdminPanelUser(userToDelete.id);
            await queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
            setIsDeleteConfirmVisible(false);
            setUserToDelete(null);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Could not delete user.';
            Alert.alert('Delete Failed', message);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSendPasswordReset = (email: string, name: string) => {
        sendPasswordResetMutation.mutate(email, {
            onSuccess: () => {
                Alert.alert('Reset link sent', `Password reset instructions were sent to ${email}.`);
            },
            onError: (err: Error) => {
                Alert.alert('Send failed', err.message || 'Could not send password reset email.');
            },
        });
    };

    const handleFilterTagSelect = (tag: string) => {
        setSelectedFilterTag(tag);
        setShowFilterTagPicker(false);
    };

    const handleAddTagClick = (user: User) => {
        setUserForTags(user);
        setShowAddTagModal(true);
    };

    const handleAddTagSelect = (tag: string) => {
        if (userForTags) {
            // Usually this requires a separate API call to add tags for a user.
            // Placeholder for real logic.
            setShowAddTagModal(false);
            setUserForTags(null);
        }
    };

    const renderUserManagement = () => (
        <StyledCard style={styles.usersContainer}>
            <View style={styles.cardHeader}>
                <View style={styles.cardTitleContainer}>
                    <Text style={styles.cardTitle}>User Roles</Text>
                    <Text style={styles.cardSubtitle}>Manage user permissions and access levels</Text>
                </View>
                <TouchableOpacity
                    style={styles.addUserBtn}
                    onPress={() => setShowAddUserModal(true)}
                >
                    <Ionicons name="person-add-outline" size={18} color="white" />
                    <Text style={styles.addUserBtnText}>Add User</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.usersList}>
                {users.map((user: any) => (
                    <View key={user.id} style={styles.userRow}>
                        <View style={styles.userHeaderRow}>
                            <Text style={styles.userName}>{user.name}</Text>
                            <View style={styles.userActions}>
                                <TouchableOpacity
                                    style={styles.actionIcon}
                                    onPress={() => handleSendPasswordReset(user.email, user.name)}
                                    disabled={sendPasswordResetMutation.isPending}
                                >
                                    <Ionicons name="key-outline" size={18} color={theme.colors.text} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.actionIcon}
                                    onPress={() => {
                                        setUserToDelete(user);
                                        setIsDeleteConfirmVisible(true);
                                    }}
                                >
                                    <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <Text style={styles.userEmail}>{user.email}</Text>

                        <View style={styles.roleContainer}>
                            {/* Role Badge */}
                            <View style={[styles.roleBadge, { backgroundColor: user.roleColor }]}>
                                <Ionicons name={user.role.includes('Admin') ? 'shield-checkmark' : user.role === 'Staff' ? 'people' : 'eye'} size={12} color="white" />
                                <Text style={styles.roleBadgeText}>{user.role}</Text>
                            </View>

                            {/* Role Dropdown Trigger */}
                            <TouchableOpacity
                                style={styles.roleDropdown}
                                onPress={() => handleRoleClick(user)}
                            >
                                <Text style={styles.roleDropdownText}>{user.role}</Text>
                                <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}
            </View>
        </StyledCard>
    );

    const renderUserTags = () => (
        <View style={styles.usersContainer}>
            <View style={styles.tagsHeader}>
                <Ionicons name="pricetag-outline" size={24} color={theme.colors.text} />
                <Text style={styles.cardTitle}>User Tag Management</Text>
            </View>
            <Text style={styles.cardSubtitle}>Assign tags to users for targeted messaging and organization</Text>

            <View style={styles.searchFilterContainer}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={18} color={theme.colors.textSecondary} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by name or email"
                        placeholderTextColor={theme.colors.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
                <TouchableOpacity
                    style={styles.filterDropdown}
                    onPress={() => setShowFilterTagPicker(true)}
                >
                    <Text style={styles.filterDropdownText}>{selectedFilterTag}</Text>
                    <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
                </TouchableOpacity>
            </View>

            <View style={styles.usersList}>
                {users.map((user: any) => (
                    <View key={user.id} style={styles.userCard}>
                        <View style={styles.userInfo}>
                            <Text style={styles.userName}>{user.name}</Text>
                            <Text style={styles.userEmail}>{user.email}</Text>
                            <Text style={styles.noTagsText}>{user.tags?.length ? user.tags.join(', ') : 'No tags'}</Text>
                        </View>

                        <TouchableOpacity
                            style={styles.addTagDropdown}
                            onPress={() => handleAddTagClick(user)}
                        >
                            <Text style={styles.addTagText}>Add tag...</Text>
                            <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                ))}
            </View>

            <View style={styles.aboutTagsBox}>
                <View style={styles.aboutTagsHeader}>
                    <Ionicons name="pricetag" size={16} color={theme.colors.primary} />
                    <Text style={styles.aboutTagsTitle}>About Tags</Text>
                </View>
                <Text style={styles.aboutTagsText}>
                    Tags allow you to organize users for targeted messaging. Users can have multiple tags. Click on a tag badge to remove it, or use the dropdown to add new tags.
                </Text>
                <View style={styles.chatIconBubble}>
                    <Ionicons name="chatbubble-ellipses" size={20} color="white" />
                </View>
            </View>
        </View>
    );

    const renderEmailAutomation = () => (
        <View style={styles.emailAutomationContainer}>
            <View style={styles.emailAutomationHeader}>
                <Text style={styles.cardTitle}>Automated Email Configuration</Text>
                <Text style={styles.cardSubtitle}>Configure which user tags receive automated email notifications for different events</Text>
            </View>

            <View style={styles.emailConfigsList}>
                {emailConfigs.map((config: any) => (
                    <StyledCard key={config.id} style={styles.emailConfigCard}>
                        {/* Header */}
                        <View style={styles.emailConfigHeader}>
                            <View style={styles.emailConfigTitleRow}>
                                <Ionicons name="mail-outline" size={20} color={theme.colors.text} />
                                <Text style={styles.emailConfigTitle}>{config.title}</Text>
                            </View>
                            <View style={styles.toggleContainer}>
                                <Text style={styles.enabledLabel}>Enabled</Text>
                                <TouchableOpacity
                                    style={[styles.toggleSwitch, config.enabled && styles.toggleSwitchActive]}
                                    onPress={() => handleToggleEmailConfig(config.id)}
                                >
                                    <View style={[styles.toggleThumb, config.enabled && styles.toggleThumbActive]} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <Text style={styles.emailConfigDescription}>{config.description}</Text>

                        {/* Recipient Tags */}
                        <View style={styles.emailSection}>
                            <Text style={styles.emailSectionTitle}>Recipient Tags</Text>
                            <View style={styles.tagsGrid}>
                                {emailTags.map((tag) => {
                                    const isSelected = config.selectedTags.includes(tag);
                                    return (
                                        <TouchableOpacity
                                            key={tag}
                                            style={[styles.emailTag, isSelected && styles.emailTagSelected]}
                                            onPress={() => handleTagToggle(config.id, tag)}
                                        >
                                            <Text style={[styles.emailTagText, isSelected && styles.emailTagTextSelected]}>{tag}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                        {/* Send Timing */}
                        <View style={styles.emailSection}>
                            <View style={styles.emailSectionTitleRow}>
                                <Ionicons name="time-outline" size={16} color={theme.colors.text} />
                                <Text style={styles.emailSectionTitle}>Send Timing (select multiple)</Text>
                            </View>
                            {sendTimingOptions.map((option) => {
                                const isSelected = config.selectedTimings.includes(option.value);
                                return (
                                    <TouchableOpacity
                                        key={option.value}
                                        style={styles.timingOption}
                                        onPress={() => handleTimingToggle(config.id, option.value)}
                                    >
                                        <View style={[styles.radioButton, isSelected && styles.radioButtonSelected]}>
                                            {isSelected && <Ionicons name="checkmark" size={12} color="white" />}
                                        </View>
                                        <View style={styles.timingOptionContent}>
                                            <Text style={styles.timingOptionLabel}>{option.label}</Text>
                                            <Text style={styles.timingOptionDescription}>{option.description}</Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Selected Timings Display */}
                        {config.selectedTimings.length > 0 && (
                            <View style={styles.selectedTimingsSection}>
                                <Text style={styles.selectedTimingsLabel}>Selected timings:</Text>
                                <View style={styles.selectedTimingsTags}>
                                    {config.selectedTimings.map((timing) => (
                                        <View key={timing} style={styles.selectedTimingTag}>
                                            <Text style={styles.selectedTimingTagText}>{timing}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* Last Updated */}
                        <Text style={styles.lastUpdatedText}>Last updated: {config.lastUpdated}</Text>
                    </StyledCard>
                ))}
            </View>
        </View>
    );

    const renderDataImport = () => (
        <View style={styles.dataImportContainer}>
            {/* CampMinder Sync Section */}
            <StyledCard style={styles.dataImportCard}>
                <View style={styles.dataImportHeader}>
                    <Ionicons name="refresh-outline" size={20} color={theme.colors.text} />
                    <Text style={styles.cardTitle}>CampMinder Sync</Text>
                </View>
                <Text style={styles.dataImportDescription}>
                    Sync campers, staff, divisions, and sessions from CampMinder API for the 2025 season. Auto-sync runs every hour for all configured camps.
                </Text>

                {/* Camp Card */}
                <View style={styles.campCard}>
                    <Text style={styles.campName}>Tyler Hill Camp</Text>
                    <Text style={styles.lastSyncedText}>Last synced: Jan 24, 2026 11:28 PM</Text>
                    <View style={styles.statusBadges}>
                        <View style={styles.configuredBadge}>
                            <Text style={styles.configuredBadgeText}>Configured</Text>
                        </View>
                        <View style={styles.staffOnlyBadge}>
                            <Text style={styles.staffOnlyBadgeText}>Staff Only</Text>
                        </View>
                    </View>
                    <TouchableOpacity style={styles.fullSyncButton}>
                        <Ionicons name="refresh" size={16} color="white" />
                        <Text style={styles.fullSyncButtonText}>Full Sync</Text>
                    </TouchableOpacity>
                </View>
            </StyledCard>

            {/* Manual JSON Import Section */}
            <StyledCard style={styles.dataImportCard}>
                <View style={styles.dataImportHeader}>
                    <Ionicons name="cloud-upload-outline" size={20} color={theme.colors.text} />
                    <Text style={styles.cardTitle}>Manual JSON Import</Text>
                </View>
                <Text style={styles.dataImportDescription}>
                    Import campers and awards data from JSON files. Awards will retain their original years while being linked to the selected season records.
                </Text>

                {/* Import Season */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Import Season</Text>
                    <TouchableOpacity
                        style={styles.selectInput}
                        onPress={() => setShowSeasonPicker(true)}
                    >
                        <Text style={styles.selectInputText}>{importSeason}</Text>
                        <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                {/* Campers File */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Campers File (campers.json)</Text>
                    <TouchableOpacity
                        style={[styles.campersFileButton, activeFileButton === 'campers' && styles.campersFileButtonActive, activeFileButton === 'awards' && styles.campersFileButtonInactive]}
                        onPress={() => handleFileSelectClick('campers')}
                    >
                        <Ionicons name="cloud-upload-outline" size={18} color={activeFileButton === 'campers' ? "white" : theme.colors.text} />
                        <Text style={[styles.campersFileButtonText, activeFileButton === 'awards' && styles.campersFileButtonTextInactive]}>
                            {campersFile || 'Select File'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Awards File */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Awards File (awards.json)</Text>
                    <TouchableOpacity
                        style={[styles.awardsFileButton, activeFileButton === 'awards' && styles.awardsFileButtonActive, activeFileButton === 'campers' && styles.awardsFileButtonInactive]}
                        onPress={() => handleFileSelectClick('awards')}
                    >
                        <Ionicons name="cloud-upload-outline" size={18} color={activeFileButton === 'awards' ? "white" : theme.colors.text} />
                        <Text style={[styles.awardsFileButtonText, activeFileButton === 'awards' && styles.awardsFileButtonTextActive]}>
                            {awardsFile || 'Select File'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Start Import Button */}
                <View style={styles.startImportContainer}>
                    <TouchableOpacity style={styles.startImportButton}>
                        <Text style={styles.startImportButtonText}>Start Import</Text>
                    </TouchableOpacity>
                </View>
            </StyledCard>

            {/* Important Notes Section */}
            <StyledCard style={styles.dataImportCard}>
                <View style={styles.importantNotesHeader}>
                    <Ionicons name="information-circle-outline" size={18} color={theme.colors.primary} />
                    <Text style={styles.importantNotesTitle}>Important Notes:</Text>
                </View>
                <View style={styles.notesList}>
                    <Text style={styles.noteItem}>• CampMinder sync runs automatically every hour for all configured camps</Text>
                    <Text style={styles.noteItem}>• The import process uses person_id to link historical data across seasons</Text>
                    <Text style={styles.noteItem}>• When a camper returns in future seasons with the same person_id, all their historical awards will be visible</Text>
                    <Text style={styles.noteItem}>• Duplicate person_ids within the same season will be skipped</Text>
                    <Text style={styles.noteItem}>• Award dates reflect the original year earned</Text>
                </View>
            </StyledCard>
        </View>
    );

    const renderEditHistory = () => {
        const search = editHistorySearch.trim().toLowerCase();
        const visibleEntries = editHistoryEntries.filter((entry: any) => {
            const tableOk = selectedTableFilter === 'All Tables' || entry.table === selectedTableFilter;
            if (!tableOk) return false;
            if (!search) return true;

            const dateTime = String(entry.dateTime ?? '').toLowerCase();
            const user = String(entry.user ?? '').toLowerCase();
            const table = String(entry.table ?? '').toLowerCase();
            const action = String(entry.action ?? '').toLowerCase();
            const recordId = String(entry.recordId ?? '').toLowerCase();
            return [dateTime, user, table, action, recordId].some((v) => v.includes(search));
        });

        return (
            <View style={styles.editHistoryContainer}>
                <View style={styles.editHistoryHeader}>
                    <View style={styles.editHistoryTitleRow}>
                        <Ionicons name="document-text-outline" size={20} color={theme.colors.text} />
                        <View style={styles.editHistoryTitleContainer}>
                            <Text style={styles.cardTitle}>Edit History</Text>
                            <Text style={styles.cardSubtitle}>View all changes made to the system</Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={styles.exportCsvButton}
                        onPress={() => setShowDownloadModal(true)}
                    >
                        <Ionicons name="download-outline" size={16} color="white" />
                        <Text style={styles.exportCsvButtonText}>Export CSV</Text>
                    </TouchableOpacity>
                </View>

                {/* Search and Filter */}
                <View style={styles.searchFilterRow}>
                    <View style={styles.searchBar}>
                        <Ionicons name="search" size={18} color={theme.colors.textSecondary} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search by table, user, or record..."
                            placeholderTextColor={theme.colors.textSecondary}
                            value={editHistorySearch}
                            onChangeText={setEditHistorySearch}
                        />
                    </View>
                    <TouchableOpacity
                        style={styles.filterDropdown}
                        onPress={() => setShowTableFilterPicker(true)}
                    >
                        <Text style={styles.filterDropdownText}>{selectedTableFilter}</Text>
                        <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                {/* Clean History List */}
                <StyledCard style={styles.historyListCard}>
                    {visibleEntries.length === 0 ? (
                        <View style={styles.historyEmpty}>
                            <Text style={styles.historyEmptyText}>No matching edit history.</Text>
                        </View>
                    ) : (
                        <View style={styles.historyList}>
                            {visibleEntries.map((entry: any) => {
                                const recordId = String(entry.recordId ?? '');
                                const recordShort = recordId.length > 12 ? `${recordId.substring(0, 8)}...` : recordId;
                                return (
                                    <View key={entry.id} style={styles.historyItemCard}>
                                        <Text style={styles.historyItemDateText}>{entry.dateTime}</Text>

                                        <View style={styles.historyChipsRow}>
                                            <View style={styles.historyChip}>
                                                <Text style={styles.historyChipText}>{entry.table}</Text>
                                            </View>
                                            <View style={[styles.historyChip, styles.historyActionChip]}>
                                                <Text style={[styles.historyChipText, styles.historyActionChipText]}>{entry.action}</Text>
                                            </View>
                                        </View>

                                        <View style={styles.historyMetaRow}>
                                            <Text style={styles.historyMetaLabel}>User</Text>
                                            <Text style={styles.historyMetaValue} numberOfLines={1}>{entry.user}</Text>
                                        </View>

                                        <View style={styles.historyMetaRow}>
                                            <Text style={styles.historyMetaLabel}>Record</Text>
                                            <Text style={[styles.historyMetaValue, styles.historyRecordIdText]} numberOfLines={1}>{recordShort || '-'}</Text>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </StyledCard>
            </View>
        );
    };

    const getFreshAccessToken = async (): Promise<string | null> => {
        try {
            const refreshed = await supabase.auth.refreshSession();
            const token = refreshed.data.session?.access_token;
            if (token) return token;
        } catch (_) { }

        try {
            const sessionRes = await supabase.auth.getSession();
            return sessionRes.data.session?.access_token ?? null;
        } catch (_) {
            return null;
        }
    };

    const callEdgeFunction = async <T,>(functionName: string, body: Record<string, any>): Promise<T> => {
        const accessToken = await getFreshAccessToken();
        if (!accessToken) {
            throw new Error('Session expired. Please sign out and sign in again.');
        }

        const url = `${supabaseUrl}/functions/v1/${functionName}`;
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
                apikey: supabaseAnonKey,
            },
            body: JSON.stringify(body),
        });

        const text = await res.text().catch(() => '');
        let parsed: any = null;
        try {
            parsed = text ? JSON.parse(text) : null;
        } catch (_) {
            parsed = null;
        }

        if (!res.ok) {
            const msg = parsed?.error || parsed?.message || text || `Request failed (${res.status}).`;
            throw new Error(msg);
        }
        return (parsed ?? {}) as T;
    };

    const EmailConfigScreen = () => {
        const [loading, setLoading] = useState(true);
        const [saving, setSaving] = useState(false);
        const [testing, setTesting] = useState(false);
        const [config, setConfig] = useState<any>(null);
        const [form, setForm] = useState({
            m365_tenant_id: '',
            m365_client_id: '',
            m365_client_secret: '',
            m365_sender_email: '',
            m365_sender_name: '',
        });

        const fetchConfig = async () => {
            if (!companyId) return;
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('company_email_config')
                    .select('*')
                    .eq('company_id', companyId)
                    .maybeSingle();

                if (error && error.code !== 'PGRST116') throw error;

                setConfig(data ?? null);
                setForm({
                    m365_tenant_id: data?.m365_tenant_id || '',
                    m365_client_id: data?.m365_client_id || '',
                    m365_client_secret: '',
                    m365_sender_email: data?.m365_sender_email || '',
                    m365_sender_name: data?.m365_sender_name || '',
                });
            } catch (e: any) {
                Alert.alert('Load failed', e?.message || 'Could not load email configuration.');
            } finally {
                setLoading(false);
            }
        };

        useEffect(() => {
            if (!isSuperAdmin) return;
            fetchConfig();
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [companyId, isSuperAdmin]);

        const handleSave = async () => {
            if (!companyId) return;
            if (!form.m365_tenant_id || !form.m365_client_id || !form.m365_sender_email) {
                Alert.alert('Validation error', 'Tenant ID, Client ID, and Sender Email are required.');
                return;
            }

            setSaving(true);
            try {
                const { data: authData } = await supabase.auth.getUser();

                let encryptedSecret: string | null = null;
                if (form.m365_client_secret.trim()) {
                    const encRes = await supabase.rpc('encrypt_secret', { secret: form.m365_client_secret.trim() });
                    encryptedSecret = String(encRes.data ?? '');
                    if (!encryptedSecret) throw new Error('Client secret encryption failed.');
                }

                const payload: any = {
                    company_id: companyId,
                    m365_tenant_id: form.m365_tenant_id.trim(),
                    m365_client_id: form.m365_client_id.trim(),
                    m365_sender_email: form.m365_sender_email.trim(),
                    m365_sender_name: form.m365_sender_name.trim() || null,
                    is_configured: true,
                    configured_by: authData?.user?.id ?? null,
                    configured_at: new Date().toISOString(),
                };

                if (encryptedSecret) payload.m365_client_secret_encrypted = encryptedSecret;

                const { error } = await supabase
                    .from('company_email_config')
                    .upsert(payload, { onConflict: 'company_id' });

                if (error) throw error;
                Alert.alert('Saved', 'Email configuration saved successfully.');
                setForm((prev) => ({ ...prev, m365_client_secret: '' }));
                await fetchConfig();
            } catch (e: any) {
                Alert.alert('Save failed', e?.message || 'Could not save email configuration.');
            } finally {
                setSaving(false);
            }
        };

        const handleTest = async () => {
            if (!companyId) return;
            setTesting(true);
            try {
                const res = await callEdgeFunction<any>('test-m365-connection', { company_id: companyId });
                if (res?.success) {
                    Alert.alert('Connection OK', res?.message || 'Microsoft 365 connection is working.');
                } else {
                    Alert.alert('Connection failed', res?.message || 'Failed to connect to Microsoft 365.');
                }
                await fetchConfig();
            } catch (e: any) {
                Alert.alert('Test failed', e?.message || 'Failed to test Microsoft 365 connection.');
            } finally {
                setTesting(false);
            }
        };

        if (!isSuperAdmin) {
            return (
                <StyledCard style={styles.superAdminOnlyCard}>
                    <Text style={styles.superAdminOnlyTitle}>Super admin only</Text>
                    <Text style={styles.superAdminOnlySubtitle}>Email Config is available for super admins.</Text>
                </StyledCard>
            );
        }

        if (loading) {
            return (
                <View style={styles.screenLoadingWrap}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            );
        }

        return (
            <View style={styles.screenContainer}>
                <StyledCard style={styles.sectionCard}>
                    <View style={styles.sectionHeaderRow}>
                        <Ionicons name="mail-outline" size={20} color={theme.colors.primary} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.sectionTitle}>Microsoft 365 Email Configuration</Text>
                            <Text style={styles.sectionSubtitle}>Configure email sending for this company</Text>
                        </View>
                        {config?.is_configured && (
                            <View style={styles.statusBadgeSuccess}>
                                <Text style={styles.statusBadgeTextSuccess}>Configured</Text>
                            </View>
                        )}
                    </View>

                    {config?.last_tested_at && (
                        <View style={styles.lastTestBox}>
                            <Text style={styles.lastTestLabel}>Last tested</Text>
                            <Text style={styles.lastTestValue}>{new Date(config.last_tested_at).toLocaleString()}</Text>
                            <View
                                style={[
                                    styles.statusBadgePill,
                                    config?.last_test_status === 'success' ? styles.statusBadgePillSuccess : styles.statusBadgePillError,
                                ]}
                            >
                                <Text style={styles.statusBadgePillText}>{config?.last_test_status || 'unknown'}</Text>
                            </View>
                        </View>
                    )}

                    <View style={styles.formGrid}>
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Tenant ID *</Text>
                            <TextInput
                                style={styles.input}
                                value={form.m365_tenant_id}
                                onChangeText={(v) => setForm((p) => ({ ...p, m365_tenant_id: v }))}
                                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                                autoCapitalize="none"
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Client ID *</Text>
                            <TextInput
                                style={styles.input}
                                value={form.m365_client_id}
                                onChangeText={(v) => setForm((p) => ({ ...p, m365_client_id: v }))}
                                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                                autoCapitalize="none"
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>
                                Client Secret {config?.m365_client_secret_encrypted ? '(leave blank to keep existing)' : '*'}
                            </Text>
                            <TextInput
                                style={styles.input}
                                value={form.m365_client_secret}
                                onChangeText={(v) => setForm((p) => ({ ...p, m365_client_secret: v }))}
                                placeholder={config?.m365_client_secret_encrypted ? '••••••••••••••••' : 'Enter client secret'}
                                secureTextEntry
                                autoCapitalize="none"
                            />
                            <Text style={styles.helpText}>Client secret is encrypted and never displayed after saving.</Text>
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Sender Email *</Text>
                            <TextInput
                                style={styles.input}
                                value={form.m365_sender_email}
                                onChangeText={(v) => setForm((p) => ({ ...p, m365_sender_email: v }))}
                                placeholder="notifications@yourcompany.com"
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Sender Display Name</Text>
                            <TextInput
                                style={styles.input}
                                value={form.m365_sender_name}
                                onChangeText={(v) => setForm((p) => ({ ...p, m365_sender_name: v }))}
                                placeholder="Tyler Hill Camp"
                            />
                        </View>
                    </View>

                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            style={[styles.secondaryButton, (saving || testing) && { opacity: 0.6 }]}
                            disabled={saving || testing}
                            onPress={handleTest}
                        >
                            {testing ? <ActivityIndicator color="white" /> : <Ionicons name="flask-outline" size={18} color="white" />}
                            <Text style={styles.secondaryButtonText}>Test Connection</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.primaryButton, (saving || testing) && { opacity: 0.6 }]}
                            disabled={saving || testing}
                            onPress={handleSave}
                        >
                            {saving ? <ActivityIndicator color="white" /> : <Ionicons name="save-outline" size={18} color="white" />}
                            <Text style={styles.primaryButtonText}>Save Configuration</Text>
                        </TouchableOpacity>
                    </View>
                </StyledCard>

                <StyledCard style={styles.sectionCard}>
                    <Text style={styles.setupTitle}>Setup Instructions</Text>
                    <View style={styles.setupList}>
                        <Text style={styles.setupItem}>1. Go to Azure Portal → App registrations</Text>
                        <Text style={styles.setupItem}>2. Create a new registration or select an existing app</Text>
                        <Text style={styles.setupItem}>3. Note the Application (client) ID and Directory (tenant) ID</Text>
                        <Text style={styles.setupItem}>4. Create a client secret under Certificates & secrets</Text>
                        <Text style={styles.setupItem}>5. Add API permissions: Microsoft Graph → Mail.Send</Text>
                        <Text style={styles.setupItem}>6. Grant admin consent for the permission</Text>
                        <Text style={styles.setupItem}>7. Enter the credentials above and test the connection</Text>
                    </View>
                </StyledCard>
            </View>
        );
    };

    // NOTE: Mobile version intentionally focuses on the same workflows as web (save/test/sync).
    const CompaniesScreen = () => {
        const [loading, setLoading] = useState(true);
        const [companies, setCompanies] = useState<any[]>([]);
        const [modalOpen, setModalOpen] = useState(false);
        const [editingCompany, setEditingCompany] = useState<any | null>(null);

        const [form, setForm] = useState({
            name: '',
            slug: '',
            theme_color: '#0066cc',
            is_active: true,
            campminder_sync_enabled: false,
            campminder_api_key: '',
            campminder_subscription_key: '',
        });

        const slugify = (s: string) =>
            String(s || '')
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '');

        const fetchCompanies = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('companies')
                    .select('id, name, slug, logo_url, theme_color, is_active, campminder_sync_enabled, campminder_last_sync_at')
                    .order('name');
                if (error) throw error;

                const list = (data || []) as any[];
                const next = await Promise.all(
                    list.map(async (c) => {
                        const [profilesRes, childrenRes, staffRes] = await Promise.all([
                            supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('company_id', c.id),
                            supabase.from('children').select('id', { count: 'exact', head: true }).eq('company_id', c.id),
                            supabase.from('staff').select('id', { count: 'exact', head: true }).eq('company_id', c.id),
                        ]);
                        return {
                            ...c,
                            usersCount: profilesRes.count || 0,
                            childrenCount: childrenRes.count || 0,
                            staffCount: staffRes.count || 0,
                        };
                    })
                );
                setCompanies(next);
            } catch (e: any) {
                Alert.alert('Load failed', e?.message || 'Could not load companies.');
            } finally {
                setLoading(false);
            }
        };

        useEffect(() => {
            if (!isSuperAdmin) return;
            fetchCompanies();
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [isSuperAdmin]);

        const openCreate = () => {
            setEditingCompany(null);
            setForm({
                name: '',
                slug: '',
                theme_color: '#0066cc',
                is_active: true,
                campminder_sync_enabled: false,
                campminder_api_key: '',
                campminder_subscription_key: '',
            });
            setModalOpen(true);
        };

        const openEdit = (c: any) => {
            setEditingCompany(c);
            setForm({
                name: c.name || '',
                slug: c.slug || '',
                theme_color: c.theme_color || '#0066cc',
                is_active: !!c.is_active,
                campminder_sync_enabled: !!c.campminder_sync_enabled,
                campminder_api_key: '',
                campminder_subscription_key: '',
            });
            setModalOpen(true);
        };

        const handleTestCampMinder = async (companyIdToTest: string) => {
            try {
                const res = await callEdgeFunction<any>('test-campminder-connection', { company_id: companyIdToTest });
                if (res?.success) Alert.alert('CampMinder OK', res?.message || 'Connection successful.');
                else Alert.alert('CampMinder failed', res?.error || res?.message || 'Connection failed.');
                await fetchCompanies();
            } catch (e: any) {
                Alert.alert('Test failed', e?.message || 'Could not test CampMinder connection.');
            }
        };

        const handleSyncNow = async (companyIdToSync: string) => {
            try {
                const res = await callEdgeFunction<any>('sync-campminder', { company_id: companyIdToSync });
                Alert.alert('Sync requested', res?.message || 'CampMinder sync triggered.');
                await fetchCompanies();
            } catch (e: any) {
                Alert.alert('Sync failed', e?.message || 'Could not trigger CampMinder sync.');
            }
        };

        const handleSaveCompany = async () => {
            try {
                const name = form.name.trim();
                if (!name) {
                    Alert.alert('Validation error', 'Company name is required.');
                    return;
                }
                const slug = form.slug.trim() ? form.slug.trim() : slugify(name);
                if (!slug) {
                    Alert.alert('Validation error', 'Company slug is required.');
                    return;
                }

                const payload: any = {
                    name,
                    slug,
                    theme_color: form.theme_color || '#0066cc',
                    is_active: !!form.is_active,
                    campminder_sync_enabled: !!form.campminder_sync_enabled,
                };

                if (form.campminder_api_key.trim()) {
                    const encApi = await supabase.rpc('encrypt_secret', { secret: form.campminder_api_key.trim() });
                    payload.campminder_api_key_encrypted = String(encApi.data ?? '');
                }
                if (form.campminder_subscription_key.trim()) {
                    const encSub = await supabase.rpc('encrypt_secret', { secret: form.campminder_subscription_key.trim() });
                    payload.campminder_subscription_key_encrypted = String(encSub.data ?? '');
                }

                if (editingCompany?.id) {
                    const { error } = await supabase.from('companies').update(payload).eq('id', editingCompany.id);
                    if (error) throw error;
                } else {
                    const { error } = await supabase.from('companies').insert(payload);
                    if (error) throw error;
                }

                Alert.alert('Saved', 'Company saved successfully.');
                setModalOpen(false);
                await fetchCompanies();
            } catch (e: any) {
                Alert.alert('Save failed', e?.message || 'Could not save company.');
            }
        };

        if (!isSuperAdmin) {
            return (
                <StyledCard style={styles.superAdminOnlyCard}>
                    <Text style={styles.superAdminOnlyTitle}>Super admin only</Text>
                    <Text style={styles.superAdminOnlySubtitle}>Companies are available for super admins.</Text>
                </StyledCard>
            );
        }

        if (loading) {
            return (
                <View style={styles.screenLoadingWrap}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            );
        }

        return (
            <View style={styles.screenContainer}>
                <View style={styles.companiesHeaderRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.sectionTitle}>Company Management</Text>
                        <Text style={styles.sectionSubtitle}>Manage companies and CampMinder sync</Text>
                    </View>
                    <TouchableOpacity style={styles.primaryButton} onPress={openCreate}>
                        <Ionicons name="add-circle-outline" size={18} color="white" />
                        <Text style={styles.primaryButtonText}>Create New Company</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.companiesList}>
                    {companies.map((c) => (
                        <StyledCard key={c.id} style={styles.companyCard}>
                            <View style={styles.companyCardHeader}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.companyName}>{c.name}</Text>
                                    <Text style={styles.companySlug}>{c.slug}</Text>
                                </View>
                                <View style={styles.companyActions}>
                                    <TouchableOpacity onPress={() => openEdit(c)} style={styles.iconButton}>
                                        <Ionicons name="create-outline" size={18} color={theme.colors.textSecondary} />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.companyCountsRow}>
                                <Text style={styles.companyCountText}>Users: {c.usersCount}</Text>
                                <Text style={styles.companyCountText}>Children: {c.childrenCount}</Text>
                                <Text style={styles.companyCountText}>Staff: {c.staffCount}</Text>
                            </View>

                            <View style={styles.companySyncRow}>
                                <View style={[styles.syncDot, { backgroundColor: c.campminder_sync_enabled ? '#16a34a' : '#94a3b8' }]} />
                                <Text style={styles.companySyncText}>
                                    CampMinder {c.campminder_sync_enabled ? 'Connected' : 'Disabled'}
                                </Text>
                                {c.campminder_last_sync_at ? (
                                    <Text style={styles.companySyncTextSecondary}>
                                        (Last sync: {new Date(c.campminder_last_sync_at).toLocaleDateString()})
                                    </Text>
                                ) : (
                                    <Text style={styles.companySyncTextSecondary}>(Not synced yet)</Text>
                                )}
                            </View>
                        </StyledCard>
                    ))}
                </View>

                <Modal transparent visible={modalOpen} animationType="slide" onRequestClose={() => setModalOpen(false)}>
                    <Pressable style={styles.centerModalOverlay} onPress={() => setModalOpen(false)}>
                        <Pressable style={styles.centerModal} onPress={(e) => e.stopPropagation()}>
                            <View style={styles.modalHeaderRow}>
                                <Text style={styles.modalTitle}>{editingCompany ? 'Edit Company' : 'Create New Company'}</Text>
                                <TouchableOpacity onPress={() => setModalOpen(false)} style={styles.iconButton}>
                                    <Ionicons name="close-outline" size={18} color={theme.colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false}>
                                <View style={styles.modalBody}>
                                    <Text style={styles.label}>Company Name *</Text>
                                    <TextInput style={styles.input} value={form.name} onChangeText={(v) => setForm((p) => ({ ...p, name: v }))} />

                                    <Text style={styles.label}>Slug</Text>
                                    <TextInput style={styles.input} value={form.slug} onChangeText={(v) => setForm((p) => ({ ...p, slug: v }))} autoCapitalize="none" />

                                    <Text style={styles.label}>Theme Color</Text>
                                    <TextInput style={styles.input} value={form.theme_color} onChangeText={(v) => setForm((p) => ({ ...p, theme_color: v }))} autoCapitalize="none" />

                                    <View style={styles.switchRow}>
                                        <Text style={styles.switchLabel}>Active</Text>
                                        <Switch value={form.is_active} onValueChange={(v) => setForm((p) => ({ ...p, is_active: v }))} />
                                    </View>

                                    <View style={styles.switchRow}>
                                        <Text style={styles.switchLabel}>CampMinder Sync Enabled</Text>
                                        <Switch value={form.campminder_sync_enabled} onValueChange={(v) => setForm((p) => ({ ...p, campminder_sync_enabled: v }))} />
                                    </View>

                                    <Text style={styles.label}>CampMinder API Key</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={form.campminder_api_key}
                                        onChangeText={(v) => setForm((p) => ({ ...p, campminder_api_key: v }))}
                                        secureTextEntry
                                        autoCapitalize="none"
                                    />

                                    <Text style={styles.label}>CampMinder Subscription Key</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={form.campminder_subscription_key}
                                        onChangeText={(v) => setForm((p) => ({ ...p, campminder_subscription_key: v }))}
                                        secureTextEntry
                                        autoCapitalize="none"
                                    />

                                    <View style={styles.actionRow}>
                                        <TouchableOpacity style={styles.secondaryButton} onPress={() => handleSaveCompany()}>
                                            <Ionicons name="save-outline" size={18} color="white" />
                                            <Text style={styles.secondaryButtonText}>{editingCompany ? 'Save Changes' : 'Create Company'}</Text>
                                        </TouchableOpacity>
                                        {editingCompany?.id ? (
                                            <TouchableOpacity style={styles.secondaryButton} onPress={() => handleTestCampMinder(editingCompany.id)}>
                                                <Ionicons name="flask-outline" size={18} color="white" />
                                                <Text style={styles.secondaryButtonText}>Test CampMinder</Text>
                                            </TouchableOpacity>
                                        ) : null}
                                    </View>

                                    {editingCompany?.id ? (
                                        <TouchableOpacity style={styles.primaryButton} onPress={() => handleSyncNow(editingCompany.id)}>
                                            <Ionicons name="sync-outline" size={18} color="white" />
                                            <Text style={styles.primaryButtonText}>Sync Now</Text>
                                        </TouchableOpacity>
                                    ) : null}
                                </View>
                            </ScrollView>
                        </Pressable>
                    </Pressable>
                </Modal>
            </View>
        );
    };

    const DataManagementScreen = () => {
        const ALL_TEST_DATA_KEY = '__ALL_TEST_DATA__';
        const bulkDeleteTables = [
            'children',
            'staff',
            'awards',
            'daily_notes',
            'trips',
            'events',
            'incident_reports',
            'medication_logs',
            'sports_academy',
            'tutoring_therapy',
            'activities_field_trips',
            'special_events_activities',
            'rainy_day_schedule',
            'sports_calendar',
            'menu_items',
            'special_meals',
            'health_center_admissions',
            'trip_attendees',
            'sports_event_roster',
        ];

        const [loading, setLoading] = useState(true);
        const [isDeleting, setIsDeleting] = useState(false);
        const [itemToDelete, setItemToDelete] = useState<string | null>(null);
        const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false);
        const [stats, setStats] = useState({
            children: 0,
            staff: 0,
            awards: 0,
            dailyNotes: 0,
            trips: 0,
            events: 0,
        });

        const countTable = async (table: string) => {
            const { count } = await supabase
                .from(table)
                .select('id', { count: 'exact', head: true })
                .eq('company_id', companyId);
            return count ?? 0;
        };

        const fetchStats = async () => {
            if (!companyId) return;
            setLoading(true);
            try {
                const [children, staff, awards, dailyNotes, trips, events] = await Promise.all([
                    countTable('children'),
                    countTable('staff'),
                    countTable('awards'),
                    countTable('daily_notes'),
                    countTable('trips'),
                    countTable('events'),
                ]);
                setStats({ children, staff, awards, dailyNotes, trips, events });
            } catch (e: any) {
                Alert.alert('Load failed', e?.message || 'Could not load data stats.');
            } finally {
                setLoading(false);
            }
        };

        const deleteFromTable = async (table: string) => {
            if (!companyId) return;
            const preserveId = '00000000-0000-0000-0000-000000000000';
            try {
                await supabase.from(table).delete().eq('company_id', companyId).neq('id', preserveId);
            } catch (e) {
                // Fallback for tables that don't have the `id` column or for older schemas.
                await supabase.from(table).delete().eq('company_id', companyId);
            }
        };

        const confirmDataManagementDelete = async () => {
            if (!itemToDelete || !companyId) return;
            const isAll = itemToDelete === ALL_TEST_DATA_KEY;
            console.log('[DELETE] data management', isAll ? 'bulk test tables' : itemToDelete, 'company_id', companyId);
            setIsDeleting(true);
            try {
                if (isAll) {
                    for (const table of bulkDeleteTables) {
                        await deleteFromTable(table);
                    }
                    Alert.alert('Deleted', 'All test data deleted successfully.');
                } else {
                    await deleteFromTable(itemToDelete);
                }
                await fetchStats();
                setIsDeleteConfirmVisible(false);
                setItemToDelete(null);
            } catch (e: any) {
                Alert.alert('Delete failed', e?.message || (isAll ? 'Failed to delete all test data.' : `Failed to delete ${itemToDelete}.`));
            } finally {
                setIsDeleting(false);
            }
        };

        useEffect(() => {
            if (!isSuperAdmin) return;
            fetchStats();
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [companyId, isSuperAdmin]);

        if (!isSuperAdmin) {
            return (
                <StyledCard style={styles.superAdminOnlyCard}>
                    <Text style={styles.superAdminOnlyTitle}>Super admin only</Text>
                    <Text style={styles.superAdminOnlySubtitle}>Data Management is available for super admins.</Text>
                </StyledCard>
            );
        }

        if (loading) {
            return (
                <View style={styles.screenLoadingWrap}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            );
        }

        const cards = [
            { title: 'Children', count: stats.children, table: 'children' },
            { title: 'Staff', count: stats.staff, table: 'staff' },
            { title: 'Awards', count: stats.awards, table: 'awards' },
            { title: 'Daily Notes', count: stats.dailyNotes, table: 'daily_notes' },
            { title: 'Trips', count: stats.trips, table: 'trips' },
            { title: 'Events', count: stats.events, table: 'events' },
        ];

        const dataDeleteTitle =
            itemToDelete === ALL_TEST_DATA_KEY ? 'Delete all test data?' : itemToDelete ? `Delete ${itemToDelete}?` : '';
        const dataDeleteMessage =
            itemToDelete === ALL_TEST_DATA_KEY
                ? 'This will permanently delete all test data for the current company.'
                : itemToDelete
                  ? `This will permanently delete all ${itemToDelete} records for the current company.`
                  : '';

        return (
            <>
                <View style={styles.screenContainer}>
                    <StyledCard style={styles.dangerCard}>
                        <View style={styles.dangerHeaderRow}>
                            <Ionicons name="alert-triangle-outline" size={20} color="#dc2626" />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.dangerTitle}>Danger Zone</Text>
                                <Text style={styles.dangerSubtitle}>
                                    Permanently delete data from the database. This action cannot be undone.
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={[styles.dangerButton, isDeleting && { opacity: 0.7 }]}
                            disabled={isDeleting}
                            onPress={() => {
                                setItemToDelete(ALL_TEST_DATA_KEY);
                                setIsDeleteConfirmVisible(true);
                            }}
                        >
                            <Ionicons name="trash-outline" size={18} color="white" />
                            <Text style={styles.dangerButtonText}>Delete All Test Data</Text>
                        </TouchableOpacity>
                    </StyledCard>

                    <View style={styles.exportGrid}>
                        {cards.map((card) => (
                            <StyledCard key={card.title} style={styles.dataCard}>
                                <Text style={styles.dataCardTitle}>{card.title}</Text>
                                <Text style={styles.dataCardCount}>{card.count}</Text>
                                <Text style={styles.dataCardSubtitle}>Total records</Text>
                                <TouchableOpacity
                                    style={[styles.outlineDangerButton, isDeleting && { opacity: 0.7 }]}
                                    disabled={isDeleting}
                                    onPress={() => {
                                        setItemToDelete(card.table);
                                        setIsDeleteConfirmVisible(true);
                                    }}
                                >
                                    <Ionicons name="trash-outline" size={16} color={theme.colors.primary} />
                                    <Text style={styles.outlineDangerButtonText}>Delete All</Text>
                                </TouchableOpacity>
                            </StyledCard>
                        ))}
                    </View>
                </View>

                <Modal
                    visible={isDeleteConfirmVisible}
                    transparent
                    animationType="fade"
                    onRequestClose={() => {
                        if (!isDeleting) {
                            setIsDeleteConfirmVisible(false);
                            setItemToDelete(null);
                        }
                    }}
                >
                    <Pressable
                        style={styles.modalOverlay}
                        onPress={() => {
                            if (!isDeleting) {
                                setIsDeleteConfirmVisible(false);
                                setItemToDelete(null);
                            }
                        }}
                    >
                        <Pressable style={styles.deleteModalContent} onPress={(e) => e.stopPropagation()}>
                            <View
                                style={{
                                    width: '100%',
                                    borderBottomWidth: 1,
                                    borderBottomColor: theme.colors.border,
                                    marginBottom: 20,
                                    paddingBottom: 12,
                                }}
                            >
                                <Text style={styles.deleteModalTitle}>{dataDeleteTitle}</Text>
                            </View>
                            <Text style={styles.deleteModalMessage}>{dataDeleteMessage}</Text>
                            <View style={styles.deleteModalActions}>
                                {isDeleting ? (
                                    <ActivityIndicator size="small" color={theme.colors.primary} style={{ alignSelf: 'center', paddingVertical: 8 }} />
                                ) : (
                                    <>
                                        <TouchableOpacity
                                            style={styles.deleteButton}
                                            onPress={confirmDataManagementDelete}
                                        >
                                            <Text style={styles.deleteButtonText}>
                                                {itemToDelete === ALL_TEST_DATA_KEY ? 'Delete Everything' : 'Delete'}
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.cancelButton}
                                            onPress={() => {
                                                setIsDeleteConfirmVisible(false);
                                                setItemToDelete(null);
                                            }}
                                        >
                                            <Text style={styles.cancelButtonText}>Cancel</Text>
                                        </TouchableOpacity>
                                    </>
                                )}
                            </View>
                        </Pressable>
                    </Pressable>
                </Modal>
            </>
        );
    };

    const DataExportScreen = () => {
        const [loading, setLoading] = useState(true);
        const [exportType, setExportType] = useState<'children' | 'staff'>('children');
        const [records, setRecords] = useState<any[]>([]);
        const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
        const [exporting, setExporting] = useState(false);
        const [companyName, setCompanyName] = useState<string>('Unknown');

        const toggleSelection = (id: string) => {
            setSelectedIds((prev) => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
            });
        };

        const fetchCompanyName = async () => {
            if (!companyId) return;
            const { data } = await supabase.from('companies').select('name').eq('id', companyId).maybeSingle();
            setCompanyName(data?.name || 'Unknown');
        };

        const fetchRecords = async () => {
            if (!companyId || !season) return;
            setLoading(true);
            try {
                if (exportType === 'children') {
                    const { data, error } = await supabase
                        .from('children')
                        .select(`
                            id,
                            name,
                            person_id,
                            rfid,
                            photo_url,
                            divisions:division_id(name),
                            bunks:bunk_id(bunk_name, bunk_number)
                        `)
                        .eq('company_id', companyId)
                        .eq('season', season)
                        .order('name');
                    if (error) throw error;

                    const mapped = (data || []).map((c: any) => ({
                        id: c.id,
                        name: c.name,
                        person_id: c.person_id,
                        rfid: c.rfid ?? null,
                        photo_url: c.photo_url ?? null,
                        division: c.divisions?.name ?? null,
                        bunk: c.bunks ? (c.bunks.bunk_name || `Bunk ${c.bunks.bunk_number}`) : null,
                    }));
                    setRecords(mapped);
                } else {
                    const { data, error } = await supabase
                        .from('staff')
                        .select(`
                            id,
                            name,
                            person_id,
                            rfid,
                            photo_url,
                            divisions:division_id(name)
                        `)
                        .eq('company_id', companyId)
                        .eq('season', season)
                        .order('name');
                    if (error) throw error;

                    const mapped = (data || []).map((s: any) => ({
                        id: s.id,
                        name: s.name,
                        person_id: s.person_id,
                        rfid: s.rfid ?? null,
                        photo_url: s.photo_url ?? null,
                        division: s.divisions?.name ?? null,
                    }));
                    setRecords(mapped);
                }
                setSelectedIds(new Set());
            } catch (e: any) {
                Alert.alert('Load failed', e?.message || 'Could not load export records.');
            } finally {
                setLoading(false);
            }
        };

        useEffect(() => {
            if (!isSuperAdmin) return;
            fetchCompanyName();
            fetchRecords();
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [companyId, season, exportType, isSuperAdmin]);

        const recordsWithPhotos = records.filter((r) => !!r.photo_url);
        const recordsWithRfid = records.filter((r) => !!r.rfid);

        const generateSignedPhotoUrl = async (photoPath: string | null): Promise<string | null> => {
            if (!photoPath) return null;
            try {
                const signed = await getSignedUrl('profilePhotos', photoPath, 3600);
                return signed || null;
            } catch (_) {
                return null;
            }
        };

        const handleExport = async (mode: 'selected' | 'all') => {
            if (!companyId || !season) return;
            const toExport = mode === 'all' ? records : records.filter((r) => selectedIds.has(r.id));
            if (toExport.length === 0) {
                Alert.alert('Nothing to export', mode === 'selected' ? 'Select at least one record.' : 'No records available.');
                return;
            }

            setExporting(true);
            try {
                const exportData = await Promise.all(
                    toExport.map(async (r) => ({
                        name: r.name,
                        person_id: r.person_id,
                        rfid: r.rfid || null,
                        photo_path: r.photo_url || null,
                        photo_url: await generateSignedPhotoUrl(r.photo_url),
                        division: r.division || null,
                        ...(exportType === 'children' ? { bunk: r.bunk || null } : {}),
                    }))
                );

                const payload = {
                    export_type: exportType,
                    export_date: new Date().toISOString(),
                    company: companyName,
                    season,
                    record_count: exportData.length,
                    records: exportData,
                };

                if (Platform.OS === 'web' && typeof window !== 'undefined') {
                    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${exportType}-export-${season}-${Date.now()}.json`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    Alert.alert('Export ready', `Exported ${exportData.length} records (download started).`);
                } else {
                    // Mobile: show a preview size + push to logs so the user can export if needed.
                    const preview = JSON.stringify(payload, null, 2);
                    console.log('Data export payload preview:', preview.slice(0, 2000));
                    Alert.alert('Export complete', `Created JSON for ${exportData.length} records. (Mobile download is not enabled in this build.)`);
                }
            } catch (e: any) {
                Alert.alert('Export failed', e?.message || 'Could not export data.');
            } finally {
                setExporting(false);
            }
        };

        if (!isSuperAdmin) {
            return (
                <StyledCard style={styles.superAdminOnlyCard}>
                    <Text style={styles.superAdminOnlyTitle}>Super admin only</Text>
                    <Text style={styles.superAdminOnlySubtitle}>Data Export is available for super admins.</Text>
                </StyledCard>
            );
        }

        if (loading) {
            return (
                <View style={styles.screenLoadingWrap}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            );
        }

        return (
            <View style={styles.screenContainer}>
                <StyledCard style={styles.sectionCard}>
                    <View style={styles.sectionHeaderRow}>
                        <Ionicons name="download-outline" size={20} color={theme.colors.primary} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.sectionTitle}>Data Export</Text>
                            <Text style={styles.sectionSubtitle}>Export photos, person IDs, and RFID data as JSON</Text>
                        </View>
                    </View>

                    <View style={styles.exportTypeRow}>
                        <TouchableOpacity
                            style={[styles.exportTypeButton, exportType === 'children' && styles.exportTypeButtonActive]}
                            onPress={() => setExportType('children')}
                        >
                            <Text style={styles.exportTypeButtonText}>Campers</Text>
                            <Text style={styles.exportTypeButtonCount}>
                                ({exportType === 'children' ? records.length : '-'})
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.exportTypeButton, exportType === 'staff' && styles.exportTypeButtonActive]}
                            onPress={() => setExportType('staff')}
                        >
                            <Text style={styles.exportTypeButtonText}>Staff</Text>
                            <Text style={styles.exportTypeButtonCount}>
                                ({exportType === 'staff' ? records.length : '-'})
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.badgesRow}>
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{recordsWithPhotos.length} with photos</Text>
                        </View>
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{recordsWithRfid.length} with RFID</Text>
                        </View>
                        <View style={styles.badgeOutline}>
                            <Text style={styles.badgeText}>{selectedIds.size} selected</Text>
                        </View>
                    </View>

                    <View style={styles.exportActionRow}>
                        <TouchableOpacity
                            style={[styles.outlineButton, exporting && { opacity: 0.7 }]}
                            disabled={exporting}
                            onPress={() => handleExport('selected')}
                        >
                            <Ionicons name="checkmark-outline" size={18} color={theme.colors.primary} />
                            <Text style={styles.outlineButtonText}>Export Selected</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.primaryButton, exporting && { opacity: 0.7 }]}
                            disabled={exporting}
                            onPress={() => handleExport('all')}
                        >
                            <Ionicons name="download-outline" size={18} color="white" />
                            <Text style={styles.primaryButtonText}>Export All</Text>
                        </TouchableOpacity>
                    </View>
                </StyledCard>

                <View style={{ marginTop: theme.spacing.md }}>
                    <View style={styles.exportList}>
                        {records.map((r) => {
                            const selected = selectedIds.has(r.id);
                            return (
                                <TouchableOpacity
                                    key={r.id}
                                    style={[styles.exportRowCard, selected && styles.exportRowCardSelected]}
                                    onPress={() => toggleSelection(r.id)}
                                >
                                    <View style={styles.exportRowLeft}>
                                        <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={selected ? theme.colors.primary : theme.colors.textSecondary} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.exportRowTitle} numberOfLines={1}>{r.name}</Text>
                                            <Text style={styles.exportRowSub}>
                                                ID: {r.person_id} {r.division ? `| ${r.division}` : ''}
                                                {exportType === 'children' && r.bunk ? ` | ${r.bunk}` : ''}
                                            </Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.openDrawer()}>
                    <Ionicons name="menu" size={28} color={theme.colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity>
                    <Ionicons name="person-circle-outline" size={28} color={theme.colors.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Title Section */}
                <View style={styles.titleSection}>
                    <View style={styles.titleContainer}>
                        <Text style={styles.title}>Admin Panel</Text>
                        <Text style={styles.subtitle}>Manage users, roles, and system settings</Text>
                    </View>
                </View>

                {/* Tabs Section */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer}>
                    <TouchableOpacity
                        style={[styles.tab, currentTab === 'userManagement' && styles.activeTab]}
                        onPress={() => setCurrentTab('userManagement')}
                    >
                        <Text style={[styles.tabText, currentTab === 'userManagement' && styles.activeTabText]}>User Management</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, currentTab === 'userTags' && styles.activeTab]}
                        onPress={() => setCurrentTab('userTags')}
                    >
                        <Ionicons name="pricetag-outline" size={16} color={currentTab === 'userTags' ? theme.colors.text : theme.colors.textSecondary} />
                        <Text style={[styles.tabText, currentTab === 'userTags' && styles.activeTabText]}>User Tags</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, currentTab === 'emailAutomation' && styles.activeTab]}
                        onPress={() => setCurrentTab('emailAutomation')}
                    >
                        <Text style={[styles.tabText, currentTab === 'emailAutomation' && styles.activeTabText]}>Email Automation</Text>
                    </TouchableOpacity>
                    {isSuperAdmin && (
                        <>
                            <TouchableOpacity
                                style={[styles.tab, currentTab === 'emailConfig' && styles.activeTab]}
                                onPress={() => setCurrentTab('emailConfig')}
                            >
                                <Ionicons name="mail-outline" size={16} color={currentTab === 'emailConfig' ? theme.colors.text : theme.colors.textSecondary} />
                                <Text style={[styles.tabText, currentTab === 'emailConfig' && styles.activeTabText]}>Email Config</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.tab, currentTab === 'companies' && styles.activeTab]}
                                onPress={() => setCurrentTab('companies')}
                            >
                                <Ionicons name="business-outline" size={16} color={currentTab === 'companies' ? theme.colors.text : theme.colors.textSecondary} />
                                <Text style={[styles.tabText, currentTab === 'companies' && styles.activeTabText]}>Companies</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.tab, currentTab === 'dataManagement' && styles.activeTab]}
                                onPress={() => setCurrentTab('dataManagement')}
                            >
                                <Ionicons name="database-outline" size={16} color={currentTab === 'dataManagement' ? theme.colors.text : theme.colors.textSecondary} />
                                <Text style={[styles.tabText, currentTab === 'dataManagement' && styles.activeTabText]}>Data Management</Text>
                            </TouchableOpacity>
                        </>
                    )}
                    <TouchableOpacity
                        style={[styles.tab, currentTab === 'dataImport' && styles.activeTab]}
                        onPress={() => setCurrentTab('dataImport')}
                    >
                        <Ionicons name="cloud-upload-outline" size={16} color={currentTab === 'dataImport' ? theme.colors.text : theme.colors.textSecondary} />
                        <Text style={[styles.tabText, currentTab === 'dataImport' && styles.activeTabText]}>Data Import</Text>
                    </TouchableOpacity>
                    {isSuperAdmin && (
                        <TouchableOpacity
                            style={[styles.tab, currentTab === 'dataExport' && styles.activeTab]}
                            onPress={() => setCurrentTab('dataExport')}
                        >
                            <Ionicons name="download-outline" size={16} color={currentTab === 'dataExport' ? theme.colors.text : theme.colors.textSecondary} />
                            <Text style={[styles.tabText, currentTab === 'dataExport' && styles.activeTabText]}>Data Export</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        style={[styles.tab, currentTab === 'editHistory' && styles.activeTab]}
                        onPress={() => setCurrentTab('editHistory')}
                    >
                        <Ionicons name="document-text-outline" size={16} color={currentTab === 'editHistory' ? theme.colors.text : theme.colors.textSecondary} />
                        <Text style={[styles.tabText, currentTab === 'editHistory' && styles.activeTabText]}>Edit History</Text>
                    </TouchableOpacity>
                </ScrollView>

                {currentTab === 'userManagement'
                    ? renderUserManagement()
                    : currentTab === 'userTags'
                        ? renderUserTags()
                        : currentTab === 'emailAutomation'
                            ? renderEmailAutomation()
                            : currentTab === 'emailConfig'
                                ? <EmailConfigScreen />
                                : currentTab === 'companies'
                                    ? <CompaniesScreen />
                                    : currentTab === 'dataManagement'
                                        ? <DataManagementScreen />
                                        : currentTab === 'dataImport'
                                            ? renderDataImport()
                                            : currentTab === 'dataExport'
                                                ? <DataExportScreen />
                                                : renderEditHistory()}
            </ScrollView>

            {/* Role Picker Bottom Sheet */}
            <Modal
                visible={showRolePicker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowRolePicker(false)}
            >
                <Pressable style={styles.bottomSheetOverlay} onPress={() => setShowRolePicker(false)}>
                    <Pressable style={styles.bottomSheet} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.bottomSheetHeader}>
                            <Text style={styles.bottomSheetTitle}>Select Role</Text>
                        </View>
                        <ScrollView style={styles.bottomSheetScroll}>
                            {roles.map((role) => (
                                <TouchableOpacity
                                    key={role}
                                    style={[
                                        styles.bottomSheetOption,
                                        selectedUser?.role === role && styles.bottomSheetOptionSelected
                                    ]}
                                    onPress={() => handleRoleSelect(role)}
                                >
                                    <Ionicons
                                        name={role.includes('Admin') ? 'shield-checkmark-outline' : 'person-outline'}
                                        size={24}
                                        color={selectedUser?.role === role ? theme.colors.secondary : theme.colors.textSecondary}
                                    />
                                    <Text style={[
                                        styles.bottomSheetOptionText,
                                        selectedUser?.role === role && styles.bottomSheetOptionTextSelected
                                    ]}>
                                        {role}
                                    </Text>
                                    {selectedUser?.role === role && (
                                        <Ionicons name="checkmark" size={20} color={theme.colors.secondary} style={{ marginLeft: 'auto' }} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Filter Tag Picker Bottom Sheet */}
            <Modal
                visible={showFilterTagPicker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowFilterTagPicker(false)}
            >
                <Pressable style={styles.bottomSheetOverlay} onPress={() => setShowFilterTagPicker(false)}>
                    <Pressable style={styles.bottomSheet} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.bottomSheetHeader}>
                            <Text style={styles.bottomSheetTitle}>Filter by Tag</Text>
                        </View>
                        <ScrollView style={styles.bottomSheetScroll}>
                            {availableTags.map((tag) => (
                                <TouchableOpacity
                                    key={tag}
                                    style={[
                                        styles.bottomSheetOption,
                                        selectedFilterTag === tag && styles.bottomSheetOptionSelected
                                    ]}
                                    onPress={() => handleFilterTagSelect(tag)}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                        <Ionicons name="pricetag-outline" size={20} color={theme.colors.textSecondary} />
                                        <Text style={[
                                            styles.bottomSheetOptionText,
                                            selectedFilterTag === tag && styles.bottomSheetOptionTextSelected
                                        ]}>
                                            {tag}
                                        </Text>
                                    </View>
                                    {selectedFilterTag === tag && (
                                        <Ionicons name="checkmark" size={20} color={theme.colors.secondary} style={{ marginLeft: 'auto' }} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Add Tag Bottom Sheet */}
            <Modal
                visible={showAddTagModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowAddTagModal(false)}
            >
                <Pressable style={styles.bottomSheetOverlay} onPress={() => setShowAddTagModal(false)}>
                    <Pressable style={styles.bottomSheet} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.bottomSheetHeader}>
                            <Text style={styles.bottomSheetTitle}>Add Tag to User</Text>
                        </View>
                        <ScrollView style={styles.bottomSheetScroll}>
                            {availableTags.filter(tag => tag !== 'All Tags').map((tag) => (
                                <TouchableOpacity
                                    key={tag}
                                    style={styles.bottomSheetOption}
                                    onPress={() => handleAddTagSelect(tag)}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                        <Ionicons name="pricetag-outline" size={20} color={theme.colors.textSecondary} />
                                        <Text style={styles.bottomSheetOptionText}>{tag}</Text>
                                    </View>
                                    {userForTags?.tags?.includes(tag) && (
                                        <Ionicons name="checkmark" size={20} color={theme.colors.secondary} style={{ marginLeft: 'auto' }} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Season Picker Bottom Sheet */}
            <Modal
                visible={showSeasonPicker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowSeasonPicker(false)}
            >
                <Pressable style={styles.bottomSheetOverlay} onPress={() => setShowSeasonPicker(false)}>
                    <Pressable style={styles.bottomSheet} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.bottomSheetHeader}>
                            <Text style={styles.bottomSheetTitle}>Select Season</Text>
                        </View>
                        <ScrollView style={styles.bottomSheetScroll}>
                            {seasons.map((season) => (
                                <TouchableOpacity
                                    key={season}
                                    style={[
                                        styles.bottomSheetOption,
                                        importSeason === season && styles.bottomSheetOptionSelected
                                    ]}
                                    onPress={() => {
                                        setImportSeason(season);
                                        setShowSeasonPicker(false);
                                    }}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                        <Ionicons name="calendar-outline" size={20} color={theme.colors.textSecondary} />
                                        <Text style={[
                                            styles.bottomSheetOptionText,
                                            importSeason === season && styles.bottomSheetOptionTextSelected
                                        ]}>
                                            {season}
                                        </Text>
                                    </View>
                                    {importSeason === season && (
                                        <Ionicons name="checkmark" size={20} color={theme.colors.secondary} style={{ marginLeft: 'auto' }} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* File Picker Bottom Sheet */}
            <Modal
                visible={showFilePicker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => {
                    setShowFilePicker(false);
                    setActiveFileType(null);
                }}
            >
                <Pressable
                    style={styles.bottomSheetOverlay}
                    onPress={() => {
                        setShowFilePicker(false);
                        setActiveFileType(null);
                    }}
                >
                    <Pressable style={styles.bottomSheet} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.bottomSheetHeader}>
                            <Text style={styles.bottomSheetTitle}>Select file</Text>
                        </View>
                        <ScrollView style={styles.bottomSheetScroll}>
                            <TouchableOpacity
                                style={styles.bottomSheetOption}
                                onPress={() => handleFileSourceSelect('Aloha downloads')}
                            >
                                <Ionicons name="briefcase-outline" size={24} color={theme.colors.secondary} />
                                <Text style={styles.bottomSheetOptionText}>Aloha downloads</Text>
                                <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} style={{ marginLeft: 'auto' }} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.bottomSheetOption}
                                onPress={() => handleFileSourceSelect('Other files')}
                            >
                                <Ionicons name="document-text-outline" size={24} color={theme.colors.secondary} />
                                <Text style={styles.bottomSheetOptionText}>Other files</Text>
                                <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} style={{ marginLeft: 'auto' }} />
                            </TouchableOpacity>
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Table Filter Picker Bottom Sheet */}
            <Modal
                visible={showTableFilterPicker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowTableFilterPicker(false)}
            >
                <Pressable style={styles.bottomSheetOverlay} onPress={() => setShowTableFilterPicker(false)}>
                    <Pressable style={styles.bottomSheet} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.bottomSheetHeader}>
                            <Text style={styles.bottomSheetTitle}>Filter by Table</Text>
                        </View>
                        <ScrollView style={styles.bottomSheetScroll}>
                            {tableFilters.map((table) => (
                                <TouchableOpacity
                                    key={table}
                                    style={[
                                        styles.bottomSheetOption,
                                        selectedTableFilter === table && styles.bottomSheetOptionSelected
                                    ]}
                                    onPress={() => {
                                        setSelectedTableFilter(table);
                                        setShowTableFilterPicker(false);
                                    }}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                        <Ionicons name="grid-outline" size={20} color={theme.colors.textSecondary} />
                                        <Text style={[
                                            styles.bottomSheetOptionText,
                                            selectedTableFilter === table && styles.bottomSheetOptionTextSelected
                                        ]}>
                                            {table}
                                        </Text>
                                    </View>
                                    {selectedTableFilter === table && (
                                        <Ionicons name="checkmark" size={20} color={theme.colors.secondary} style={{ marginLeft: 'auto' }} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Download File Bottom Sheet */}
            <Modal
                visible={showDownloadModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowDownloadModal(false)}
            >
                <Pressable
                    style={styles.bottomSheetOverlay}
                    onPress={() => setShowDownloadModal(false)}
                >
                    <Pressable style={styles.bottomSheet} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.bottomSheetHeader}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={styles.bottomSheetTitle}>Download file</Text>
                                <TouchableOpacity onPress={() => setShowDownloadModal(false)}>
                                    <Ionicons name="close" size={24} color={theme.colors.text} />
                                </TouchableOpacity>
                            </View>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Name Field */}
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Name</Text>
                                <TextInput
                                    style={styles.input}
                                    value={downloadFileName}
                                    onChangeText={setDownloadFileName}
                                    placeholderTextColor={theme.colors.textSecondary}
                                />
                            </View>

                            {/* Recent Section */}
                            <View style={styles.downloadSection}>
                                <Text style={styles.downloadSectionTitle}>Recent</Text>
                                <TouchableOpacity
                                    style={[styles.locationOption, styles.locationOptionSelected]}
                                    onPress={() => setSelectedLocation('Private folder')}
                                >
                                    <Ionicons name="folder" size={20} color={theme.colors.secondary} />
                                    <Text style={styles.locationOptionText}>Private folder</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Location Section */}
                            <View style={styles.downloadSection}>
                                <Text style={styles.downloadSectionTitle}>Location</Text>
                                <TouchableOpacity
                                    style={styles.locationOption}
                                    onPress={() => setSelectedLocation('Downloads')}
                                >
                                    <Ionicons name="folder" size={20} color={theme.colors.secondary} />
                                    <Text style={styles.locationOptionText}>Downloads</Text>
                                    <Ionicons name="chevron-up" size={16} color={theme.colors.textSecondary} style={{ marginLeft: 'auto' }} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.locationOption, selectedLocation === 'Private folder' && styles.locationOptionSelected]}
                                    onPress={() => setSelectedLocation('Private folder')}
                                >
                                    <Ionicons name="folder" size={20} color={theme.colors.secondary} />
                                    <Text style={styles.locationOptionText}>Private folder</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.locationOption}
                                    onPress={() => setSelectedLocation('Device downloads')}
                                >
                                    <Ionicons name="folder" size={20} color={theme.colors.secondary} />
                                    <Text style={styles.locationOptionText}>Device downloads</Text>
                                    <Ionicons name="star" size={16} color="#ec4899" style={{ marginLeft: 'auto' }} />
                                </TouchableOpacity>
                            </View>

                            {/* Download Button */}
                            <TouchableOpacity
                                style={styles.downloadButton}
                                onPress={() => {
                                    // TODO: Handle download
                                    setShowDownloadModal(false);
                                }}
                            >
                                <Text style={styles.downloadButtonText}>Download</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            <Modal
                visible={showAddUserModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowAddUserModal(false)}
            >
                <Pressable style={styles.centerModalOverlay} onPress={() => setShowAddUserModal(false)}>
                    <Pressable style={styles.centerModal} onPress={(e) => e.stopPropagation()}>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={styles.bottomSheetHeader}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text style={styles.bottomSheetTitle}>Add New User</Text>
                                    <TouchableOpacity onPress={() => setShowAddUserModal(false)}>
                                        <Ionicons name="close" size={24} color={theme.colors.text} />
                                    </TouchableOpacity>
                                </View>
                                <Text style={[styles.modalSubtitle, { textAlign: 'left', marginBottom: 10 }]}>Create a user directly or send an invitation email</Text>
                            </View>

                            {/* Modal Tabs */}
                            <View style={styles.modalTabs}>
                                <TouchableOpacity
                                    style={[styles.modalTab, activeTab === 'create' && styles.modalTabActive]}
                                    onPress={() => setActiveTab('create')}
                                >
                                    <Text style={[styles.modalTabText, activeTab === 'create' && styles.modalTabTextActive]}>Create User</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalTab, activeTab === 'invite' && styles.modalTabActive]}
                                    onPress={() => setActiveTab('invite')}
                                >
                                    <Text style={[styles.modalTabText, activeTab === 'invite' && styles.modalTabTextActive]}>Send Invitation</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Form Fields */}
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Full Name</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="John Doe"
                                    placeholderTextColor={theme.colors.textSecondary}
                                    value={newUserFullName}
                                    onChangeText={setNewUserFullName}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Email</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="user@example.com"
                                    placeholderTextColor={theme.colors.textSecondary}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    value={newUserEmail}
                                    onChangeText={setNewUserEmail}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Password</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="•••••••"
                                    placeholderTextColor={theme.colors.textSecondary}
                                    secureTextEntry
                                    value={newUserPassword}
                                    onChangeText={setNewUserPassword}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Role</Text>
                                <TouchableOpacity
                                    style={styles.selectInput}
                                    onPress={() => setShowNewUserRolePicker(!showNewUserRolePicker)}
                                >
                                    <Text style={styles.selectInputText}>{newUserRole}</Text>
                                    <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            {/* Role Picker moved to external modal */}

                            <TouchableOpacity
                                style={[styles.createButton, createUserMutation.isPending && { opacity: 0.7 }]}
                                onPress={() => {
                                    const fullName = newUserFullName.trim();
                                    const email = newUserEmail.trim();
                                    const password = newUserPassword;
                                    if (!fullName || !email || !password) {
                                        Alert.alert('Missing fields', 'Please enter Full Name, Email, and Password.');
                                        return;
                                    }
                                    if (password.length < 6) {
                                        Alert.alert('Invalid password', 'Password must be at least 6 characters.');
                                        return;
                                    }
                                    if (!companyId) {
                                        Alert.alert(
                                            'No camp selected',
                                            'Select a camp from the menu so the new user is assigned to it. If your account has a default company, you can try anyway.',
                                            [
                                                { text: 'Cancel', style: 'cancel' },
                                                { text: 'Try anyway', onPress: () => runCreateUser(fullName, email, password) },
                                            ]
                                        );
                                        return;
                                    }
                                    runCreateUser(fullName, email, password);
                                }}
                                disabled={createUserMutation.isPending}
                            >
                                <Text style={styles.createButtonText}>{createUserMutation.isPending ? 'Creating...' : 'Create User'}</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* New User Role Picker Bottom Sheet */}
            <Modal
                visible={showNewUserRolePicker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowNewUserRolePicker(false)}
            >
                <Pressable style={styles.bottomSheetOverlay} onPress={() => setShowNewUserRolePicker(false)}>
                    <Pressable style={styles.bottomSheet} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.bottomSheetHeader}>
                            <Text style={styles.bottomSheetTitle}>Select Role</Text>
                        </View>
                        <ScrollView style={styles.bottomSheetScroll}>
                            {roles.map((role) => (
                                <TouchableOpacity
                                    key={role}
                                    style={[
                                        styles.bottomSheetOption,
                                        newUserRole === role && styles.bottomSheetOptionSelected
                                    ]}
                                    onPress={() => {
                                        setNewUserRole(role);
                                        setShowNewUserRolePicker(false);
                                    }}
                                >
                                    <Ionicons
                                        name={role.includes('Admin') ? 'shield-checkmark-outline' : 'person-outline'}
                                        size={24}
                                        color={newUserRole === role ? theme.colors.secondary : theme.colors.textSecondary}
                                    />
                                    <Text style={[
                                        styles.bottomSheetOptionText,
                                        newUserRole === role && styles.bottomSheetOptionTextSelected
                                    ]}>{role}</Text>
                                    {newUserRole === role && (
                                        <Ionicons name="checkmark" size={20} color={theme.colors.secondary} style={{ marginLeft: 'auto' }} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>
            {/* Delete User Modal */}
            <Modal
                visible={isDeleteConfirmVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => {
                    if (!isDeleting) setIsDeleteConfirmVisible(false);
                }}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => {
                        if (!isDeleting) setIsDeleteConfirmVisible(false);
                    }}
                >
                    <Pressable style={styles.deleteModalContent} onPress={(e) => e.stopPropagation()}>
                        <View style={{ width: '100%', borderBottomWidth: 1, borderBottomColor: theme.colors.border, marginBottom: 20, paddingBottom: 12 }}>
                            <Text style={styles.deleteModalTitle}>Delete User</Text>
                        </View>

                        <Text style={styles.deleteModalMessage}>
                            Are you sure you want to delete {userToDelete?.name}? This action cannot be undone.
                        </Text>

                        <View style={styles.deleteModalActions}>
                            {isDeleting ? (
                                <ActivityIndicator size="small" color={theme.colors.primary} style={{ alignSelf: 'center', paddingVertical: 8 }} />
                            ) : (
                                <>
                                    <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteUser}>
                                        <Text style={styles.deleteButtonText}>Delete</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.cancelButton}
                                        onPress={() => setIsDeleteConfirmVisible(false)}
                                    >
                                        <Text style={styles.cancelButtonText}>Cancel</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
    },
    scrollContent: {
        padding: theme.spacing.md,
        paddingBottom: 100,
    },
    titleSection: {
        marginBottom: theme.spacing.md,
    },
    titleContainer: {
        marginBottom: theme.spacing.sm,
    },
    title: {
        ...theme.typography.h1,
        fontSize: 32,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    subtitle: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    tabsContainer: {
        flexDirection: 'row',
        marginBottom: theme.spacing.lg,
        paddingBottom: theme.spacing.xs, // For scrollbar
    },
    tab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
        marginRight: theme.spacing.sm,
        gap: 6,
    },
    activeTab: {
        backgroundColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '500',
        color: theme.colors.textSecondary,
    },
    activeTabText: {
        color: theme.colors.text,
        fontWeight: '600',
    },
    usersContainer: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
        gap: 12,
    },
    cardTitleContainer: {
        flex: 1,
        marginRight: 8,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: 4,
    },
    cardSubtitle: {
        fontSize: 13,
        color: theme.colors.textSecondary,
    },
    addUserBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2563eb', // Blue
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        gap: 8,
        minWidth: 110,
        justifyContent: 'center',
    },
    addUserBtnText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
    usersList: {
        gap: theme.spacing.sm,
    },
    userRow: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        gap: 12,
    },
    userHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    userActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    userCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        gap: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 2,
    },
    userEmail: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: 2,
    },
    roleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
    },
    roleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 6,
    },
    roleBadgeText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
    },
    roleDropdown: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        minWidth: 140,
        backgroundColor: '#f8fafc',
    },
    roleDropdownText: {
        fontSize: 13,
        color: theme.colors.text,
    },
    actionIcon: {
        padding: 10,
    },
    // Tags Tab Styles
    tagsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    searchFilterContainer: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 16,
        marginBottom: 24,
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 8,
        paddingHorizontal: 12,
        height: 44,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 14,
        color: theme.colors.text,
    },
    filterDropdown: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 8,
        paddingHorizontal: 12,
        height: 44,
        minWidth: 120,
    },
    filterDropdownText: {
        fontSize: 14,
        color: theme.colors.text,
    },
    noTagsText: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        fontStyle: 'italic',
    },
    addTagDropdown: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        minWidth: 120,
    },
    addTagText: {
        fontSize: 13,
        color: theme.colors.text,
    },
    aboutTagsBox: {
        backgroundColor: '#f0f9ff',
        borderRadius: 12,
        padding: 16,
        marginTop: 24,
        position: 'relative',
    },
    aboutTagsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    aboutTagsTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.primary,
    },
    aboutTagsText: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        lineHeight: 20,
    },
    chatIconBubble: {
        position: 'absolute',
        bottom: 16,
        right: 16,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#2563eb',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 4,
    },
    // Modal Styles
    modalOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)', // Darker overlay for better focus
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.md,
        zIndex: 1000,
    },
    pickerContent: {
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 4,
        width: 200,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    pickerOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 4,
    },
    pickerOptionSelected: {
        backgroundColor: '#f97316', // Orange as shown in screenshot
    },
    pickerOptionText: {
        fontSize: 14,
        color: theme.colors.text,
    },
    pickerOptionTextSelected: {
        color: 'white',
        fontWeight: '600',
    },
    // Add User Modal Styles
    addUserModalContent: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
    },
    closeModalBtn: {
        position: 'absolute',
        top: 16,
        right: 16,
        padding: 4,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.text,
        textAlign: 'center',
        marginBottom: 4,
    },
    modalSubtitle: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginBottom: 20,
    },
    modalTabs: {
        flexDirection: 'row',
        backgroundColor: '#f1f5f9',
        borderRadius: 8,
        padding: 4,
        marginBottom: 20,
    },
    modalTab: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 6,
    },
    modalTabActive: {
        backgroundColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    modalTabText: {
        fontSize: 14,
        fontWeight: '500',
        color: theme.colors.textSecondary,
    },
    modalTabTextActive: {
        color: theme.colors.text,
        fontWeight: '600',
    },
    formGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: theme.colors.text,
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        color: theme.colors.text,
        backgroundColor: 'white',
    },
    selectInput: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: 'white',
    },
    selectInputText: {
        fontSize: 14,
        color: theme.colors.text,
    },
    createButton: {
        backgroundColor: '#2563eb',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 16,
    },
    createButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
    inlineRolePicker: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 8,
        marginTop: 8,
        marginBottom: 16,
        overflow: 'hidden',
    },
    inlineRoleOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    inlineRoleOptionSelected: {
        backgroundColor: '#f0f9ff',
    },
    inlineRoleOptionText: {
        fontSize: 14,
        color: theme.colors.text,
    },
    inlineRoleOptionTextSelected: {
        color: '#2563eb',
        fontWeight: '500',
    },
    // Bottom Sheet Styles
    bottomSheetOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
        zIndex: 1000,
    },
    bottomSheet: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        paddingTop: theme.spacing.lg,
        paddingBottom: theme.spacing.xl,
        paddingHorizontal: theme.spacing.md,
        height: '30%',
        width: '100%',
    },

    bottomSheetHeader: {
        marginBottom: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        paddingBottom: theme.spacing.sm,
    },
    bottomSheetTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
    },
    bottomSheetScroll: {
        // No specific styles needed for now
    },
    bottomSheetOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing.md,
        gap: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    bottomSheetOptionText: {
        fontSize: 16,
        color: theme.colors.text,
    },
    bottomSheetOptionTextSelected: {
        color: theme.colors.secondary,
        fontWeight: '600',
    },
    bottomSheetOptionSelected: {
        backgroundColor: theme.colors.secondary + '10',
    },

    // Delete Modal Styles
    deleteModalContent: {
        backgroundColor: 'white',
        borderRadius: theme.borderRadius.lg,
        padding: 24,
        width: '90%',
        maxWidth: 340,
        // alignItems: 'center', // Removed to allow full width header
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    deleteModalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: 16,
        // textAlign: 'center', // Removed to default to left
    },
    deleteModalMessage: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
    },
    deleteModalActions: {
        width: '100%',
        gap: 12,
    },
    deleteButton: {
        backgroundColor: '#2563eb', // Blue
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        width: '100%',
    },
    deleteButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
    cancelButton: {
        backgroundColor: 'white',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        width: '100%',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    cancelButtonText: {
        color: theme.colors.text,
        fontSize: 14,
        fontWeight: '500',
    },
    // Email Automation Styles
    emailAutomationContainer: {
        backgroundColor: 'transparent',
    },
    emailAutomationHeader: {
        marginBottom: theme.spacing.lg,
    },
    emailConfigsList: {
        gap: theme.spacing.md,
    },
    emailConfigCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
    },
    emailConfigHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: theme.spacing.sm,
    },
    emailConfigTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    emailConfigTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
    },
    toggleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    enabledLabel: {
        fontSize: 13,
        color: theme.colors.textSecondary,
    },
    toggleSwitch: {
        width: 44,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#e2e8f0',
        justifyContent: 'center',
        paddingHorizontal: 2,
    },
    toggleSwitchActive: {
        backgroundColor: '#2563eb',
    },
    toggleThumb: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: 'white',
        alignSelf: 'flex-start',
    },
    toggleThumbActive: {
        alignSelf: 'flex-end',
    },
    emailConfigDescription: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.md,
        lineHeight: 18,
    },
    emailSection: {
        marginBottom: theme.spacing.md,
    },
    emailSectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: theme.spacing.sm,
    },
    emailSectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: theme.spacing.sm,
    },
    tagsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    emailTag: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: 'white',
    },
    emailTagSelected: {
        backgroundColor: '#2563eb',
        borderColor: '#2563eb',
    },
    emailTagText: {
        fontSize: 12,
        color: theme.colors.text,
    },
    emailTagTextSelected: {
        color: 'white',
        fontWeight: '500',
    },
    timingOption: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: theme.spacing.sm,
        gap: 12,
    },
    radioButton: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: theme.colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 2,
    },
    radioButtonSelected: {
        backgroundColor: '#2563eb',
        borderColor: '#2563eb',
    },
    timingOptionContent: {
        flex: 1,
    },
    timingOptionLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: theme.colors.text,
        marginBottom: 2,
    },
    timingOptionDescription: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        lineHeight: 16,
    },
    selectedTimingsSection: {
        marginTop: theme.spacing.sm,
        marginBottom: theme.spacing.sm,
    },
    selectedTimingsLabel: {
        fontSize: 13,
        fontWeight: '500',
        color: theme.colors.text,
        marginBottom: 6,
    },
    selectedTimingsTags: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    selectedTimingTag: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
        backgroundColor: '#f1f5f9',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    selectedTimingTagText: {
        fontSize: 12,
        color: theme.colors.text,
    },
    lastUpdatedText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.sm,
    },
    // Data Import Styles
    dataImportContainer: {
        backgroundColor: 'transparent',
    },
    dataImportCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
    },
    dataImportHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: theme.spacing.sm,
    },
    dataImportDescription: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.md,
        lineHeight: 18,
    },
    campCard: {
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    campName: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 4,
    },
    lastSyncedText: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.sm,
    },
    statusBadges: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: theme.spacing.md,
    },
    configuredBadge: {
        backgroundColor: '#d1fae5',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    configuredBadgeText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#059669',
    },
    staffOnlyBadge: {
        backgroundColor: '#f1f5f9',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    staffOnlyBadgeText: {
        fontSize: 12,
        fontWeight: '500',
        color: theme.colors.textSecondary,
    },
    fullSyncButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2563eb',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        gap: 8,
        alignSelf: 'flex-start',
    },
    fullSyncButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
    campersFileButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fa8c16',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        gap: 8,
        justifyContent: 'center',
    },
    campersFileButtonActive: {
        backgroundColor: '#fa8c16',
    },
    campersFileButtonInactive: {
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    campersFileButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
    campersFileButtonTextInactive: {
        color: theme.colors.text,
    },
    awardsFileButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        gap: 8,
        justifyContent: 'center',
    },
    awardsFileButtonActive: {
        backgroundColor: '#fa8c16',
        borderColor: '#fa8c16',
    },
    awardsFileButtonInactive: {
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    awardsFileButtonText: {
        color: theme.colors.text,
        fontSize: 14,
        fontWeight: '600',
    },
    awardsFileButtonTextActive: {
        color: 'white',
    },
    // File Picker Bottom Sheet Styles
    filePickerBottomSheet: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        paddingTop: theme.spacing.lg,
        paddingBottom: theme.spacing.xl,
        paddingHorizontal: theme.spacing.md,
        maxHeight: '30%',
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
    filePickerHeader: {
        marginBottom: theme.spacing.lg,
    },
    filePickerTitle: {
        ...theme.typography.h3,
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
    },
    filePickerContent: {
        gap: theme.spacing.md,
    },
    filePickerOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing.md,
        gap: theme.spacing.md,
    },
    filePickerOptionText: {
        ...theme.typography.body,
        fontSize: 16,
        color: theme.colors.text,
    },
    startImportContainer: {
        alignItems: 'flex-end',
        marginTop: theme.spacing.md,
    },
    startImportButton: {
        backgroundColor: '#a855f7',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
    },
    startImportButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
    importantNotesHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: theme.spacing.sm,
    },
    importantNotesTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
    },
    notesList: {
        gap: 8,
    },
    noteItem: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        lineHeight: 20,
    },
    // Edit History Styles
    editHistoryContainer: {
        backgroundColor: 'transparent',
    },
    editHistoryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: theme.spacing.md,
        gap: 12,
    },
    editHistoryTitleRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        flex: 1,
    },
    editHistoryTitleContainer: {
        flex: 1,
    },
    exportCsvButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fa8c16',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        gap: 6,
    },
    exportCsvButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
    searchFilterRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: theme.spacing.md,
    },
    historyTableCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: 0,
        overflow: 'hidden',
    },
    historyListCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        overflow: 'hidden',
    },
    historyEmpty: {
        paddingVertical: theme.spacing.lg,
        alignItems: 'center',
    },
    historyEmptyText: {
        color: theme.colors.textSecondary,
        fontSize: 14,
    },
    historyList: {
        gap: 10,
    },
    historyItemCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#eef2f7',
        padding: theme.spacing.md,
        gap: 8,
    },
    historyItemDateText: {
        fontSize: 13,
        fontWeight: '700',
        color: theme.colors.text,
    },
    historyChipsRow: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
    },
    historyChip: {
        backgroundColor: '#f1f5f9',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
    },
    historyChipText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.text,
    },
    historyActionChip: {
        backgroundColor: '#dbeafe',
    },
    historyActionChipText: {
        color: '#2563eb',
    },
    historyMetaRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 8,
    },
    historyMetaLabel: {
        width: 52,
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    historyMetaValue: {
        flex: 1,
        fontSize: 13,
        fontWeight: '500',
        color: theme.colors.text,
    },
    historyRecordIdText: {
        fontFamily: 'monospace',
        color: theme.colors.textSecondary,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#f8fafc',
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    tableHeaderCell: {
        flex: 1,
    },
    tableHeaderText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
    },
    tableRows: {
        gap: 0,
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        alignItems: 'center',
    },
    tableCell: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    tableCellText: {
        fontSize: 13,
        color: theme.colors.text,
    },
    tableTag: {
        backgroundColor: '#f1f5f9',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    tableTagText: {
        fontSize: 12,
        fontWeight: '500',
        color: theme.colors.text,
    },
    actionTag: {
        backgroundColor: '#dbeafe',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    actionTagText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#2563eb',
    },
    recordIdText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        fontFamily: 'monospace',
    },
    // Download Modal Styles
    downloadModalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        padding: theme.spacing.lg,
        paddingBottom: theme.spacing.xl,
        width: '100%',
        maxHeight: '70%',
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
    downloadModalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: theme.spacing.lg,
    },
    downloadSection: {
        marginTop: theme.spacing.lg,
    },
    downloadSectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: theme.spacing.sm,
    },
    locationOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.sm,
        borderRadius: 8,
        gap: 12,
        marginBottom: 4,
    },
    locationOptionSelected: {
        backgroundColor: '#e0f2fe',
    },
    locationOptionText: {
        flex: 1,
        fontSize: 14,
        color: theme.colors.text,
    },
    downloadButton: {
        backgroundColor: '#2563eb',
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: theme.spacing.xl,
    },
    downloadButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    centerModalOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    centerModal: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.xl,
        width: '90%',
        height: '80%',
        paddingBottom: theme.spacing.xl,
        paddingHorizontal: theme.spacing.md,
    },

    // ----------------------------
    // Super-admin Screens Styles
    // ----------------------------
    superAdminOnlyCard: {
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius.lg,
        backgroundColor: theme.colors.surface,
    },
    superAdminOnlyTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: theme.colors.text,
        marginBottom: 6,
    },
    superAdminOnlySubtitle: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        lineHeight: 20,
    },

    screenLoadingWrap: {
        paddingVertical: theme.spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
    },
    screenContainer: {
        gap: theme.spacing.lg,
    },

    sectionCard: {
        padding: theme.spacing.md,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        gap: 10,
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: theme.colors.text,
    },
    sectionSubtitle: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        marginTop: 3,
        lineHeight: 18,
    },

    statusBadgeSuccess: {
        backgroundColor: '#dcfce7',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
    },
    statusBadgeTextSuccess: {
        color: '#166534',
        fontSize: 12,
        fontWeight: '800',
    },

    lastTestBox: {
        backgroundColor: '#f0f9ff',
        borderRadius: 12,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.lg,
    },
    lastTestLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.textSecondary,
        marginBottom: 6,
    },
    lastTestValue: {
        fontSize: 13,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: 10,
    },
    statusBadgePill: {
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
    },
    statusBadgePillSuccess: {
        backgroundColor: '#d1fae5',
    },
    statusBadgePillError: {
        backgroundColor: '#fee2e2',
    },
    statusBadgePillText: {
        fontSize: 12,
        fontWeight: '800',
        color: theme.colors.text,
    },

    formGrid: {
        gap: theme.spacing.md,
    },
    formGroup: {
        gap: 6,
    },
    label: {
        fontSize: 13,
        fontWeight: '700',
        color: theme.colors.textSecondary,
    },
    input: {
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        color: theme.colors.text,
    },
    helpText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        lineHeight: 18,
    },

    actionRow: {
        flexDirection: 'row',
        gap: theme.spacing.md,
        marginTop: theme.spacing.lg,
    },

    primaryButton: {
        backgroundColor: '#2563eb',
        borderRadius: 10,
        paddingVertical: 12,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    primaryButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '800',
    },
    secondaryButton: {
        backgroundColor: '#4f46e5',
        borderRadius: 10,
        paddingVertical: 12,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        flex: 1,
    },
    secondaryButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '800',
    },

    setupTitle: {
        fontSize: 14,
        fontWeight: '900',
        color: theme.colors.text,
        marginBottom: 8,
    },
    setupList: {
        gap: 6,
    },
    setupItem: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        lineHeight: 20,
    },

    companiesHeaderRow: {
        flexDirection: 'row',
        gap: theme.spacing.md,
        alignItems: 'center',
    },
    companiesList: {
        gap: theme.spacing.md,
    },
    companyCard: {
        padding: theme.spacing.md,
    },
    companyCardHeader: {
        flexDirection: 'row',
        gap: theme.spacing.md,
        alignItems: 'flex-start',
        marginBottom: theme.spacing.md,
    },
    companyActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    iconButton: {
        padding: 8,
        backgroundColor: '#f8fafc',
        borderRadius: 10,
    },
    companyName: {
        fontSize: 15,
        fontWeight: '900',
        color: theme.colors.text,
    },
    companySlug: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    companyCountsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: theme.spacing.md,
    },
    companyCountText: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        fontWeight: '600',
    },
    companySyncRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    syncDot: {
        width: 12,
        height: 12,
        borderRadius: 99,
    },
    companySyncText: {
        fontSize: 13,
        color: theme.colors.text,
        fontWeight: '700',
    },
    companySyncTextSecondary: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        flex: 1,
    },

    modalHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        marginBottom: theme.spacing.md,
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: '900',
        color: theme.colors.text,
    },
    modalBody: {
        padding: theme.spacing.md,
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        marginTop: theme.spacing.md,
        marginBottom: 2,
    },
    switchLabel: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        fontWeight: '700',
    },

    dangerCard: {
        borderRadius: theme.borderRadius.lg,
        backgroundColor: '#fff7ed',
        padding: theme.spacing.md,
        borderWidth: 1,
        borderColor: '#fdba74',
    },
    dangerHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: theme.spacing.md,
    },
    dangerTitle: {
        fontSize: 16,
        fontWeight: '900',
        color: '#dc2626',
    },
    dangerSubtitle: {
        marginTop: 4,
        color: '#7f1d1d',
        fontSize: 13,
        lineHeight: 20,
    },
    dangerButton: {
        backgroundColor: '#dc2626',
        borderRadius: 10,
        paddingVertical: 12,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    dangerButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '900',
    },

    exportGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.md,
        marginTop: theme.spacing.md,
    },
    dataCard: {
        width: '48%',
        padding: theme.spacing.md,
        borderRadius: 12,
    },
    dataCardTitle: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        fontWeight: '800',
    },
    dataCardCount: {
        fontSize: 26,
        fontWeight: '900',
        color: theme.colors.text,
        marginTop: 6,
    },
    dataCardSubtitle: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 4,
        marginBottom: theme.spacing.md,
    },
    outlineDangerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: '#dbeafe',
        backgroundColor: '#eff6ff',
        borderRadius: 10,
        paddingVertical: 10,
    },
    outlineDangerButtonText: {
        fontSize: 13,
        fontWeight: '800',
        color: theme.colors.primary,
    },

    exportTypeRow: {
        flexDirection: 'row',
        gap: theme.spacing.md,
        marginBottom: theme.spacing.md,
    },
    exportTypeButton: {
        flex: 1,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: theme.colors.border,
        padding: 12,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        backgroundColor: 'white',
    },
    exportTypeButtonActive: {
        borderColor: '#2563eb',
        backgroundColor: '#eff6ff',
    },
    exportTypeButtonText: {
        fontSize: 14,
        fontWeight: '900',
        color: theme.colors.text,
    },
    exportTypeButtonCount: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        fontWeight: '700',
    },

    badgesRow: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
        marginBottom: theme.spacing.md,
    },
    badge: {
        backgroundColor: '#f1f5f9',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
    },
    badgeOutline: {
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: 'white',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '800',
        color: theme.colors.textSecondary,
    },

    exportActionRow: {
        flexDirection: 'row',
        gap: theme.spacing.md,
        marginBottom: theme.spacing.md,
    },
    outlineButton: {
        flex: 1,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#2563eb',
        backgroundColor: 'white',
        paddingVertical: 12,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    outlineButtonText: {
        color: theme.colors.primary,
        fontSize: 14,
        fontWeight: '900',
    },

    exportList: {
        gap: theme.spacing.md,
        paddingBottom: theme.spacing.xl,
    },
    exportRowCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
        padding: theme.spacing.md,
    },
    exportRowCardSelected: {
        borderColor: '#2563eb',
        backgroundColor: '#eff6ff',
    },
    exportRowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    exportRowTitle: {
        fontSize: 14,
        fontWeight: '900',
        color: theme.colors.text,
    },
    exportRowSub: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
        lineHeight: 18,
    },

});
