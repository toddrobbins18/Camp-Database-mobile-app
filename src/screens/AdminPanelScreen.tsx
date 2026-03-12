import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, Pressable, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { StyledCard } from '../components/StyledCard';
import { useAdminUsers, useUpdateUserRole, useDeleteUser, useEmailConfigs, useUpdateEmailConfig, useEditHistory } from '../api/admin';

export const AdminPanelScreen = ({ navigation }: any) => {


    const { data: adminUsers = [] } = useAdminUsers();
    const { data: fetchedEmailConfigs = [] } = useEmailConfigs();
    const { data: fetchedHistory = [] } = useEditHistory();

    const updateUserRoleMutation = useUpdateUserRole();
    const deleteUserMutation = useDeleteUser();
    const updateEmailConfigMutation = useUpdateEmailConfig();

    const users = adminUsers as any[];
    const emailConfigs = fetchedEmailConfigs as any[];
    const editHistoryEntries = fetchedHistory as any[];


    const [currentTab, setCurrentTab] = useState<'userManagement' | 'userTags' | 'emailAutomation' | 'dataImport' | 'editHistory'>('userManagement');
    const [showRolePicker, setShowRolePicker] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showAddTagModal, setShowAddTagModal] = useState(false);
    const [userForTags, setUserForTags] = useState<User | null>(null);

    // Add User Modal State
    const [showAddUserModal, setShowAddUserModal] = useState(false);
    const [activeTab, setActiveTab] = useState<'create' | 'invite'>('create');
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
            updateUserRoleMutation.mutate({ userId: selectedUser.id, role: newRole });
            setShowRolePicker(false);
            setSelectedUser(null);
        }
    };

    const handleDeleteUser = () => {
        if (userToDelete) {
            deleteUserMutation.mutate(userToDelete.id);
            setShowDeleteModal(false);
            setUserToDelete(null);
        }
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
                                <TouchableOpacity style={styles.actionIcon}>
                                    <Ionicons name="key-outline" size={18} color={theme.colors.text} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.actionIcon}
                                    onPress={() => {
                                        setUserToDelete(user);
                                        setShowDeleteModal(true);
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

    const renderEditHistory = () => (
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
                        placeholder="Search by table, user, or email..."
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

            {/* History Table */}
            <StyledCard style={styles.historyTableCard}>
                {/* Table Header */}
                <View style={styles.tableHeader}>
                    <View style={styles.tableHeaderCell}>
                        <Text style={styles.tableHeaderText}>Date & Time</Text>
                    </View>
                    <View style={styles.tableHeaderCell}>
                        <Text style={styles.tableHeaderText}>User</Text>
                    </View>
                    <View style={styles.tableHeaderCell}>
                        <Text style={styles.tableHeaderText}>Table</Text>
                    </View>
                    <View style={styles.tableHeaderCell}>
                        <Text style={styles.tableHeaderText}>Action</Text>
                    </View>
                    <View style={styles.tableHeaderCell}>
                        <Text style={styles.tableHeaderText}>Record ID</Text>
                    </View>
                </View>

                {/* Table Rows */}
                <View style={styles.tableRows}>
                    {editHistoryEntries.map((entry: any) => (
                        <View key={entry.id} style={styles.tableRow}>
                            <View style={styles.tableCell}>
                                <Ionicons name="chevron-down" size={14} color={theme.colors.textSecondary} />
                                <Text style={styles.tableCellText}>{entry.dateTime}</Text>
                            </View>
                            <View style={styles.tableCell}>
                                <Text style={styles.tableCellText}>{entry.user}</Text>
                            </View>
                            <View style={styles.tableCell}>
                                <View style={styles.tableTag}>
                                    <Text style={styles.tableTagText}>{entry.table}</Text>
                                </View>
                            </View>
                            <View style={styles.tableCell}>
                                <View style={styles.actionTag}>
                                    <Text style={styles.actionTagText}>{entry.action}</Text>
                                </View>
                            </View>
                            <View style={styles.tableCell}>
                                <Text style={styles.recordIdText}>{entry.recordId.substring(0, 8)}...</Text>
                            </View>
                        </View>
                    ))}
                </View>
            </StyledCard>
        </View>
    );

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
                    <TouchableOpacity
                        style={[styles.tab, currentTab === 'dataImport' && styles.activeTab]}
                        onPress={() => setCurrentTab('dataImport')}
                    >
                        <Ionicons name="cloud-upload-outline" size={16} color={currentTab === 'dataImport' ? theme.colors.text : theme.colors.textSecondary} />
                        <Text style={[styles.tabText, currentTab === 'dataImport' && styles.activeTabText]}>Data Import</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, currentTab === 'editHistory' && styles.activeTab]}
                        onPress={() => setCurrentTab('editHistory')}
                    >
                        <Ionicons name="document-text-outline" size={16} color={currentTab === 'editHistory' ? theme.colors.text : theme.colors.textSecondary} />
                        <Text style={[styles.tabText, currentTab === 'editHistory' && styles.activeTabText]}>Edit History</Text>
                    </TouchableOpacity>
                </ScrollView>

                {currentTab === 'userManagement' ? renderUserManagement() : currentTab === 'userTags' ? renderUserTags() : currentTab === 'emailAutomation' ? renderEmailAutomation() : currentTab === 'dataImport' ? renderDataImport() : renderEditHistory()}
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
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Password</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="•••••••"
                                    placeholderTextColor={theme.colors.textSecondary}
                                    secureTextEntry
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

                            <TouchableOpacity style={styles.createButton}>
                                <Text style={styles.createButtonText}>Create User</Text>
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
                visible={showDeleteModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowDeleteModal(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setShowDeleteModal(false)}>
                    <Pressable style={styles.deleteModalContent} onPress={(e) => e.stopPropagation()}>
                        <View style={{ width: '100%', borderBottomWidth: 1, borderBottomColor: theme.colors.border, marginBottom: 20, paddingBottom: 12 }}>
                            <Text style={styles.deleteModalTitle}>Delete User</Text>
                        </View>

                        <Text style={styles.deleteModalMessage}>
                            Are you sure you want to delete {userToDelete?.name}? This action cannot be undone.
                        </Text>

                        <View style={styles.deleteModalActions}>
                            <TouchableOpacity
                                style={styles.deleteButton}
                                onPress={handleDeleteUser}
                            >
                                <Text style={styles.deleteButtonText}>Delete</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => setShowDeleteModal(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
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
        padding: 4,
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

});
