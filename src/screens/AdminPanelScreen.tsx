import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { StyledCard } from '../components/StyledCard';

interface User {
    id: string;
    name: string;
    email: string;
    role: 'Super Admin' | 'Admin' | 'Viewer' | 'Staff';
    tags?: string[];
}

export const AdminPanelScreen = ({ navigation }: any) => {
    const [activeTab, setActiveTab] = useState('User Management');
    const [users, setUsers] = useState<User[]>([
        { id: '1', name: 'Todd Robbins', email: 'todd@camptic.com', role: 'Super Admin' },
        { id: '2', name: 'Haley Thomas', email: 'haley@camptic.com', role: 'Admin' },
        { id: '3', name: 'todd', email: 'todd.robbins18@gmail.com', role: 'Admin' },
        { id: '4', name: 'Athletics', email: 'athletics@tylerhillcamp.com', role: 'Admin' },
        { id: '5', name: 'Nick Williams', email: 'nick@tylerhillcamp.com', role: 'Admin' },
        { id: '6', name: 'Mike Davidowitz', email: 'mike@camptic.com', role: 'Admin' },
        { id: '7', name: 'ansaralyh@gmail.com', email: 'ansaralyh@gmail.com', role: 'Viewer' },
        { id: '8', name: 'Courtney Sloan Parker', email: 'courtney@tylerhillcamp.com', role: 'Staff' },
        { id: '9', name: 'raeesajidal10', email: 'raeesajidal10@gmail.com', role: 'Admin' },
    ]);
    const [showAddUserModal, setShowAddUserModal] = useState(false);
    const [showRolePicker, setShowRolePicker] = useState<string | null>(null);
    const [newUserName, setNewUserName] = useState('');
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserRole, setNewUserRole] = useState<'Super Admin' | 'Admin' | 'Viewer' | 'Staff'>('Admin');
    const [showNewUserRolePicker, setShowNewUserRolePicker] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [showRolePopup, setShowRolePopup] = useState(false);
    const [selectedRoleForPopup, setSelectedRoleForPopup] = useState<'Super Admin' | 'Admin' | 'Viewer' | 'Staff' | null>(null);
    const [selectedUserForRole, setSelectedUserForRole] = useState<string | null>(null);
    
    // User Tags state
    const [userTagsSearch, setUserTagsSearch] = useState('');
    const [selectedTagFilter, setSelectedTagFilter] = useState('All Tags');
    const [showTagFilter, setShowTagFilter] = useState(false);
    const [showTagPicker, setShowTagPicker] = useState<string | null>(null);
    const [availableTags, setAvailableTags] = useState<string[]>([
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
    ]);
    const [newTagName, setNewTagName] = useState('');
    const allFilterTags = ['All Tags', ...availableTags];

    // Email Automation state
    interface EmailConfig {
        id: string;
        title: string;
        description: string;
        enabled: boolean;
        recipientTags: string[];
        sendTimings: string[];
        lastUpdated: string;
    }

    const [emailConfigs, setEmailConfigs] = useState<EmailConfig[]>([
        {
            id: '1',
            title: 'Health Center Admissions',
            description: 'Division leaders see only their divisions.',
            enabled: true,
            recipientTags: [],
            sendTimings: ['When Created'],
            lastUpdated: '11/2/2025, 5:22:20 PM'
        },
        {
            id: '2',
            title: 'Health Center Checkouts',
            description: 'Division leaders see only their divisions.',
            enabled: true,
            recipientTags: ['nurse', 'director', 'admin staff'],
            sendTimings: ['When Created'],
            lastUpdated: '11/2/2025, 5:22:20 PM'
        },
        {
            id: '3',
            title: 'Missed Medication Alerts',
            description: 'When scheduled medications are not administered - division leaders see only their divisions.',
            enabled: true,
            recipientTags: ['division leader'],
            sendTimings: ['When Created'],
            lastUpdated: '11/22/2025, 6:30:16 PM'
        },
        {
            id: '4',
            title: 'Trip Updates',
            description: 'Division leaders see only their divisions.',
            enabled: true,
            recipientTags: ['division leader', 'director', 'admin staff'],
            sendTimings: ['When Created'],
            lastUpdated: '11/2/2025, 5:22:20 PM'
        },
        {
            id: '5',
            title: 'Transportation Events',
            description: 'When transportation events are scheduled or updated.',
            enabled: false,
            recipientTags: [],
            sendTimings: ['When Created'],
            lastUpdated: '11/22/2025, 6:53:08 PM'
        },
        {
            id: '6',
            title: 'Sports Events (Home)',
            description: 'Division leaders see only their divisions, specialists see only their sports.',
            enabled: true,
            recipientTags: [],
            sendTimings: ['When Created'],
            lastUpdated: '11/22/2025, 6:53:08 PM'
        },
        {
            id: '7',
            title: 'Sports Events (Away)',
            description: 'Division leaders see only their divisions, specialists see only their sports.',
            enabled: true,
            recipientTags: ['transportation', 'food service'],
            sendTimings: ['When Created'],
            lastUpdated: '12/3/2025, 10:34:30 PM'
        },
        {
            id: '8',
            title: 'Sports Academy',
            description: 'Division leaders see only their divisions, specialists see only their sports.',
            enabled: false,
            recipientTags: [],
            sendTimings: ['When Created'],
            lastUpdated: '11/22/2025, 6:53:08 PM'
        },
        {
            id: '9',
            title: 'User Approval Requests',
            description: 'When new users request access to the system',
            enabled: true,
            recipientTags: ['director', 'admin staff'],
            sendTimings: ['When Created'],
            lastUpdated: '11/2/2025, 5:22:20 PM'
        },
    ]);

    const sendTimingOptions = [
        { id: 'When Created', label: 'When Created', description: 'Send immediately when record is created.' },
        { id: 'When Updated', label: 'When Updated', description: 'Send immediately when record is updated.' },
        { id: 'Day Before', label: 'Day Before', description: 'Send 24 hours before the event.' },
        { id: 'Morning Of (8 AM)', label: 'Morning Of (8 AM)', description: 'Send at 8:00 AM on the event day.' },
        { id: '2 Hours Before', label: '2 Hours Before', description: 'Send 2 hours before event time.' },
        { id: '4 Hours Before', label: '4 Hours Before', description: 'Send 4 hours before event time.' },
        { id: '1 Week Before', label: '1 Week Before', description: 'Send 7 days before the event.' },
    ];

    const toggleEmailConfig = (configId: string) => {
        setEmailConfigs(emailConfigs.map(config => 
            config.id === configId ? { ...config, enabled: !config.enabled } : config
        ));
    };

    const toggleRecipientTag = (configId: string, tag: string) => {
        setEmailConfigs(emailConfigs.map(config => {
            if (config.id === configId) {
                const tagLower = tag.toLowerCase();
                const tags = config.recipientTags.includes(tagLower)
                    ? config.recipientTags.filter(t => t !== tagLower)
                    : [...config.recipientTags, tagLower];
                return { ...config, recipientTags: tags };
            }
            return config;
        }));
    };

    const toggleSendTiming = (configId: string, timing: string) => {
        setEmailConfigs(emailConfigs.map(config => {
            if (config.id === configId) {
                const timings = config.sendTimings.includes(timing)
                    ? config.sendTimings.filter(t => t !== timing)
                    : [...config.sendTimings, timing];
                return { ...config, sendTimings: timings };
            }
            return config;
        }));
    };

    // Data Import state
    const [selectedSeason, setSelectedSeason] = useState('2025');
    const [showSeasonPicker, setShowSeasonPicker] = useState(false);
    const [campersFileName, setCampersFileName] = useState<string | null>(null);
    const [awardsFileName, setAwardsFileName] = useState<string | null>(null);
    const [syncStatus, setSyncStatus] = useState({
        lastSynced: 'Jan 23, 2026 8:04 AM',
        isConfigured: true,
    });

    const seasons = ['2025', '2026', '2027', '2028', '2029'];

    const handleFileSelect = (type: 'campers' | 'awards') => {
        // In a real app, this would open a file picker
        // For now, we'll just simulate file selection
        if (type === 'campers') {
            setCampersFileName('campers.json');
        } else {
            setAwardsFileName('awards.json');
        }
    };

    const handleStartImport = () => {
        // Handle import logic here
        console.log('Starting import...');
    };

    const handleFullSync = () => {
        // Handle full sync logic here
        console.log('Starting full sync...');
    };

    const handleStaffOnlySync = () => {
        // Handle staff only sync logic here
        console.log('Starting staff only sync...');
    };

    // Edit History state
    interface HistoryEntry {
        id: string;
        dateTime: string;
        user: string;
        table: string;
        action: string;
        recordId: string;
        expanded?: boolean;
    }

    const [historySearch, setHistorySearch] = useState('');
    const [selectedTableFilter, setSelectedTableFilter] = useState('All Tables');
    const [showTableFilter, setShowTableFilter] = useState(false);
    const [expandedHistoryIds, setExpandedHistoryIds] = useState<Set<string>>(new Set());
    
    const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([
        { id: '1', dateTime: 'Jan 23, 2026 17:05:34', user: 'System', table: 'children', action: 'UPDATE', recordId: 'c0f6e25a8b9c1d2e3f4a5b6c7d8e9f0a' },
        { id: '2', dateTime: 'Jan 25, 2026 17:05:34', user: 'System', table: 'children', action: 'UPDATE', recordId: 'c7f018d3e4f5a6b7c8d9e0f1a2b3c4d' },
        { id: '3', dateTime: 'Jan 24, 2026 17:05:34', user: 'System', table: 'children', action: 'UPDATE', recordId: 'b00c8f1a2b3c4d5e6f7a8b9c0d1e2f' },
        { id: '4', dateTime: 'Jan 22, 2026 17:05:34', user: 'System', table: 'children', action: 'UPDATE', recordId: '538d97a9b0c1d2e3f4a5b6c7d8e9f' },
        { id: '5', dateTime: 'Jan 23, 2026 17:25:34', user: 'System', table: 'children', action: 'UPDATE', recordId: '9d0d9d64e5f6a7b8c9d0e1f2a3b4c' },
        { id: '6', dateTime: 'Jan 25, 2026 17:05:24', user: 'System', table: 'children', action: 'UPDATE', recordId: 'f2a34b09c1d2e3f4a5b6c7d8e9f0a' },
        { id: '7', dateTime: 'Jan 23, 2026 17:05:34', user: 'System', table: 'children', action: 'UPDATE', recordId: 'b1d1d4a5e6f7a8b9c0d1e2f3a4b' },
        { id: '8', dateTime: 'Jan 24, 2026 17:05:34', user: 'System', table: 'children', action: 'UPDATE', recordId: 'd4d1a1e1f2a3b4c5d6e7f8a9b0c' },
        { id: '9', dateTime: 'Jan 22, 2026 17:05:34', user: 'System', table: 'children', action: 'UPDATE', recordId: 'a1d4ead7b8c9d0e1f2a3b4c5d6e' },
        { id: '10', dateTime: 'Jan 23, 2026 17:05:34', user: 'System', table: 'children', action: 'UPDATE', recordId: '37998756a1b2c3d4e5f6a7b8c9d' },
        { id: '11', dateTime: 'Jan 25, 2026 17:05:34', user: 'System', table: 'children', action: 'UPDATE', recordId: '54819x1a2b3c4d5e6f7a8b9c' },
        { id: '12', dateTime: 'Jan 24, 2026 17:05:34', user: 'System', table: 'children', action: 'UPDATE', recordId: '8181x1a2b3c4d5e6f7a8b9c' },
        { id: '13', dateTime: 'Jan 23, 2026 17:05:34', user: 'System', table: 'children', action: 'UPDATE', recordId: 'b1dc0de1f2a3b4c5d6e7f8a9b0c' },
        { id: '14', dateTime: 'Jan 25, 2026 17:05:34', user: 'System', table: 'children', action: 'UPDATE', recordId: '9c71d4d5e6f7a8b9c0d1e2f3a4b' },
        { id: '15', dateTime: 'Jan 24, 2026 17:05:34', user: 'System', table: 'children', action: 'UPDATE', recordId: '3f043ed6e7f8a9b0c1d2e3f4a5b6c' },
    ]);

    const tableFilterOptions = ['All Tables', 'children', 'staff', 'events', 'health', 'transportation', 'sports'];

    const toggleHistoryExpanded = (id: string) => {
        const newExpanded = new Set(expandedHistoryIds);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedHistoryIds(newExpanded);
    };

    // Download File Modal state
    const [showDownloadModal, setShowDownloadModal] = useState(false);
    const [downloadFileName, setDownloadFileName] = useState('audit-log-2026-01-23');
    const [selectedLocation, setSelectedLocation] = useState('Downloads');
    const [showLocationPicker, setShowLocationPicker] = useState(false);

    const handleExportCSV = () => {
        // Generate default filename with current date
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        setDownloadFileName(`audit-log-${year}-${month}-${day}`);
        setShowDownloadModal(true);
    };

    const handleDownload = () => {
        // Handle download logic here
        console.log('Downloading file:', downloadFileName, 'to:', selectedLocation);
        setShowDownloadModal(false);
    };

    const locations = ['Downloads', 'Private folder', 'Documents', 'Desktop'];

    const truncateId = (id: string, length: number = 12) => {
        return id.length > length ? `${id.substring(0, length)}...` : id;
    };

    const roles: Array<'Super Admin' | 'Admin' | 'Viewer' | 'Staff'> = ['Super Admin', 'Admin', 'Viewer', 'Staff'];

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'Super Admin':
            case 'Admin':
                return '#ef4444'; // Red
            case 'Viewer':
                return '#14b8a6'; // Teal
            case 'Staff':
                return '#2563eb'; // Blue
            default:
                return '#6b7280'; // Gray
        }
    };

    const handleAddUser = () => {
        if (newUserName.trim() && newUserEmail.trim()) {
            const newUser: User = {
                id: Date.now().toString(),
                name: newUserName.trim(),
                email: newUserEmail.trim(),
                role: newUserRole,
            };
            setUsers([...users, newUser]);
            setNewUserName('');
            setNewUserEmail('');
            setNewUserRole('Admin');
            setShowNewUserRolePicker(false);
            setShowAddUserModal(false);
        }
    };

    const handleUpdateRole = (userId: string, newRole: 'Super Admin' | 'Admin' | 'Viewer' | 'Staff') => {
        setUsers(users.map(user => 
            user.id === userId ? { ...user, role: newRole } : user
        ));
        setShowRolePicker(null);
        setShowRolePopup(false);
        setSelectedRoleForPopup(null);
        setSelectedUserForRole(null);
    };

    const handleRoleOptionClick = (role: 'Super Admin' | 'Admin' | 'Viewer' | 'Staff', userId: string) => {
        // Close dropdown first
        setShowRolePicker(null);
        // Small delay to ensure dropdown closes before modal opens
        setTimeout(() => {
            setSelectedRoleForPopup(role);
            setSelectedUserForRole(userId);
            setShowRolePopup(true);
        }, 100);
    };

    const handleDeleteClick = (user: User) => {
        setUserToDelete(user);
        setShowDeleteModal(true);
    };

    const handleConfirmDelete = () => {
        if (userToDelete) {
            setUsers(users.filter(user => user.id !== userToDelete.id));
            setShowDeleteModal(false);
            setUserToDelete(null);
        }
    };

    const handleCancelDelete = () => {
        setShowDeleteModal(false);
        setUserToDelete(null);
    };

    const tabs = [
        { id: 'User Management', label: 'User Management', icon: 'people-outline' },
        { id: 'User Tags', label: 'User Tags', icon: 'pricetag-outline' },
        { id: 'Email Automation', label: 'Email Automation', icon: 'mail-outline' },
        { id: 'Data Import', label: 'Data Import', icon: 'download-outline' },
        { id: 'Edit History', label: 'Edit History', icon: 'time-outline' },
    ];

    return (
        <SafeAreaView style={styles.container}>
            {/* Header Bar */}
            <View style={styles.topHeader}>
                <TouchableOpacity onPress={() => navigation.openDrawer()}>
                    <Ionicons name="menu" size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={styles.topHeaderTitle}>Admin Panel</Text>
                <TouchableOpacity>
                    <Ionicons name="notifications-outline" size={24} color={theme.colors.text} />
                </TouchableOpacity>
            </View>

            <ScrollView 
                contentContainerStyle={styles.scrollContent} 
                showsVerticalScrollIndicator={false}
                onScrollBeginDrag={() => {
                    setShowRolePicker(null);
                    setShowTagFilter(false);
                    setShowTagPicker(null);
                    setShowSeasonPicker(false);
                    setShowTableFilter(false);
                }}
            >
                {/* Title and Description Section */}
                <View style={styles.titleSection}>
                    <Text style={styles.title}>Admin Panel</Text>
                    <Text style={styles.subtitle}>Manage users, roles, and system settings</Text>
                </View>

                {/* Navigation Tabs */}
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false} 
                    contentContainerStyle={styles.tabsContainer}
                >
                    {tabs.map((tab) => (
                        <TouchableOpacity
                            key={tab.id}
                            style={[
                                styles.tab,
                                activeTab === tab.id && styles.tabActive
                            ]}
                            onPress={() => setActiveTab(tab.id)}
                        >
                            <Ionicons 
                                name={tab.icon as any} 
                                size={18} 
                                color={activeTab === tab.id ? theme.colors.text : theme.colors.textSecondary} 
                                style={styles.tabIcon}
                            />
                            <Text style={[
                                styles.tabText,
                                activeTab === tab.id && styles.tabTextActive
                            ]}>
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* User Roles Section */}
                {activeTab === 'User Management' && (
                    <StyledCard style={styles.userRolesCard}>
                        <View style={styles.userRolesHeader}>
                            <View style={styles.userRolesTitleContainer}>
                                <Text style={styles.userRolesTitle}>User Roles</Text>
                                <Text style={styles.userRolesSubtitle}>Manage user permissions and access levels</Text>
                            </View>
                            <TouchableOpacity 
                                style={styles.addUserButton}
                                onPress={() => setShowAddUserModal(true)}
                            >
                                <Ionicons name="person-add-outline" size={18} color="white" />
                                <Text style={styles.addUserButtonText}>Add User</Text>
                            </TouchableOpacity>
                        </View>

                        {/* User List */}
                        <View style={styles.userList}>
                            {users.map((user) => (
                                <View 
                                    key={user.id} 
                                    style={[
                                        styles.userCard,
                                        showRolePicker === user.id && styles.userCardWithOpenDropdown
                                    ]}
                                >
                                    <View style={styles.userInfoRow}>
                                        <View style={styles.userInfo}>
                                            <Text style={styles.userName}>{user.name}</Text>
                                            <Text style={styles.userEmail}> • {user.email}</Text>
                                        </View>
                                        <View style={styles.roleContainer}>
                                            <View 
                                                style={[
                                                    styles.roleBadge, 
                                                    { backgroundColor: getRoleBadgeColor(user.role) }
                                                ]}
                                            >
                                                <Text style={styles.roleBadgeText}>{user.role}</Text>
                                            </View>
                                            <TouchableOpacity
                                                style={styles.roleDropdown}
                                                onPress={(e) => {
                                                    e.stopPropagation();
                                                    setShowRolePicker(showRolePicker === user.id ? null : user.id);
                                                }}
                                            >
                                                <Text style={styles.roleDropdownText}>{user.role}</Text>
                                                <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
                                            </TouchableOpacity>
                                            {showRolePicker === user.id && (
                                                <View style={styles.rolePickerDropdown}>
                                                    {roles.map((role) => (
                                                        <TouchableOpacity
                                                            key={role}
                                                            style={styles.rolePickerOption}
                                                            onPress={(e) => {
                                                                e.stopPropagation();
                                                                handleRoleOptionClick(role, user.id);
                                                            }}
                                                        >
                                                            <Text style={styles.rolePickerOptionText}>{role}</Text>
                                                            {user.role === role && (
                                                                <Ionicons name="checkmark" size={18} color={theme.colors.secondary} />
                                                            )}
                                                        </TouchableOpacity>
                                                    ))}
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                    <View style={styles.actionIcons}>
                                        <TouchableOpacity style={styles.actionIcon}>
                                            <Ionicons name="key-outline" size={20} color={theme.colors.textSecondary} />
                                        </TouchableOpacity>
                                        <TouchableOpacity 
                                            style={styles.actionIcon}
                                            onPress={() => handleDeleteClick(user)}
                                        >
                                            <Ionicons name="trash-outline" size={20} color={theme.colors.danger} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </StyledCard>
                )}

                {/* User Tags Section */}
                {activeTab === 'User Tags' && (
                    <StyledCard style={styles.userTagsCard}>
                        <View style={styles.userTagsHeader}>
                            <View style={styles.userTagsTitleContainer}>
                                <Ionicons name="pricetag-outline" size={20} color={theme.colors.text} style={styles.userTagsIcon} />
                                <Text style={styles.userTagsTitle}>User Tag Management</Text>
                            </View>
                            <Text style={styles.userTagsSubtitle}>Assign tags to users for targeted messaging and organization</Text>
                        </View>

                        {/* Search and Filter Bar */}
                        <View style={[styles.userTagsSearchBar, showTagFilter && styles.userTagsSearchBarWithDropdown]}>
                            <View style={styles.searchInputContainer}>
                                <Ionicons name="search-outline" size={18} color={theme.colors.textSecondary} style={styles.searchIcon} />
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Search by name or..."
                                    placeholderTextColor={theme.colors.textSecondary}
                                    value={userTagsSearch}
                                    onChangeText={setUserTagsSearch}
                                />
                            </View>
                            <View style={styles.tagFilterContainer}>
                                <TouchableOpacity
                                    style={styles.tagFilterButton}
                                    onPress={() => setShowTagFilter(!showTagFilter)}
                                >
                                    <Text style={styles.tagFilterText}>{selectedTagFilter}</Text>
                                    <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
                                </TouchableOpacity>
                                {showTagFilter && (
                                    <View style={styles.tagFilterDropdown}>
                                        <ScrollView 
                                            style={styles.tagFilterScrollView}
                                            nestedScrollEnabled={true}
                                            showsVerticalScrollIndicator={true}
                                        >
                                            {allFilterTags.map((tag) => (
                                                <TouchableOpacity
                                                    key={tag}
                                                    style={[
                                                        styles.tagFilterOption,
                                                        selectedTagFilter === tag && styles.tagFilterOptionSelected
                                                    ]}
                                                    onPress={() => {
                                                        setSelectedTagFilter(tag);
                                                        setShowTagFilter(false);
                                                    }}
                                                >
                                                    <Text style={[
                                                        styles.tagFilterOptionText,
                                                        selectedTagFilter === tag && styles.tagFilterOptionTextSelected
                                                    ]}>
                                                        {tag}
                                                    </Text>
                                                    {selectedTagFilter === tag && (
                                                        <Ionicons name="checkmark" size={18} color={theme.colors.accent} />
                                                    )}
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>
                                )}
                            </View>
                        </View>

                        {/* User List with Tags */}
                        <View style={styles.userTagsList}>
                            {users
                                .filter(user => {
                                    const searchLower = userTagsSearch.toLowerCase();
                                    return user.name.toLowerCase().includes(searchLower) || 
                                           user.email.toLowerCase().includes(searchLower);
                                })
                                .map((user) => (
                                <View 
                                    key={user.id} 
                                    style={[
                                        styles.userTagCard,
                                        showTagPicker === user.id && styles.userTagCardWithOpenDropdown
                                    ]}
                                >
                                    <View style={styles.userTagInfo}>
                                        <Text style={styles.userTagName}>{user.name}</Text>
                                        <Text style={styles.userTagEmail}>{user.email}</Text>
                                        <View style={styles.userTagsContainer}>
                                            {user.tags && user.tags.length > 0 ? (
                                                user.tags.map((tag, index) => (
                                                    <TouchableOpacity
                                                        key={index}
                                                        style={styles.tagBadge}
                                                        onPress={() => {
                                                            const updatedTags = user.tags?.filter(t => t !== tag) || [];
                                                            setUsers(users.map(u => 
                                                                u.id === user.id ? { ...u, tags: updatedTags } : u
                                                            ));
                                                        }}
                                                    >
                                                        <Text style={styles.tagBadgeText}>{tag}</Text>
                                                        <Ionicons name="close" size={14} color={theme.colors.textSecondary} />
                                                    </TouchableOpacity>
                                                ))
                                            ) : (
                                                <Text style={styles.noTagsText}>No tags</Text>
                                            )}
                                        </View>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.addTagButton}
                                        onPress={() => setShowTagPicker(showTagPicker === user.id ? null : user.id)}
                                    >
                                        <Text style={styles.addTagButtonText}>Add tag...</Text>
                                        <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
                                    </TouchableOpacity>
                                    {showTagPicker === user.id && (
                                        <View style={styles.tagPickerDropdown}>
                                            <ScrollView 
                                                style={styles.tagPickerScrollView}
                                                nestedScrollEnabled={true}
                                                showsVerticalScrollIndicator={true}
                                            >
                                                {availableTags.map((tag) => (
                                                    <TouchableOpacity
                                                        key={tag}
                                                        style={styles.tagPickerOption}
                                                        onPress={() => {
                                                            const currentTags = user.tags || [];
                                                            if (!currentTags.includes(tag)) {
                                                                setUsers(users.map(u => 
                                                                    u.id === user.id ? { ...u, tags: [...currentTags, tag] } : u
                                                                ));
                                                            }
                                                            setShowTagPicker(null);
                                                        }}
                                                    >
                                                        <Text style={styles.tagPickerOptionText}>{tag}</Text>
                                                        {user.tags?.includes(tag) && (
                                                            <Ionicons name="checkmark" size={18} color={theme.colors.secondary} />
                                                        )}
                                                    </TouchableOpacity>
                                                ))}
                                            </ScrollView>
                                            <View style={styles.addNewTagContainer}>
                                                <TextInput
                                                    style={styles.newTagInput}
                                                    placeholder="Create new tag..."
                                                    placeholderTextColor={theme.colors.textSecondary}
                                                    value={newTagName}
                                                    onChangeText={setNewTagName}
                                                    onSubmitEditing={() => {
                                                        if (newTagName.trim() && !availableTags.includes(newTagName.trim())) {
                                                            setAvailableTags([...availableTags, newTagName.trim()]);
                                                            const currentTags = user.tags || [];
                                                            setUsers(users.map(u => 
                                                                u.id === user.id ? { ...u, tags: [...currentTags, newTagName.trim()] } : u
                                                            ));
                                                            setNewTagName('');
                                                            setShowTagPicker(null);
                                                        }
                                                    }}
                                                />
                                            </View>
                                        </View>
                                    )}
                                </View>
                            ))}
                        </View>

                        {/* About Tags Section */}
                        <View style={styles.aboutTagsSection}>
                            <Ionicons name="information-circle-outline" size={20} color={theme.colors.secondary} />
                            <View style={styles.aboutTagsContent}>
                                <Text style={styles.aboutTagsTitle}>About Tags</Text>
                                <Text style={styles.aboutTagsText}>
                                    Tags allow you to organize users for targeted messaging. Users can have multiple tags. Click on a tag badge to remove it, or use the dropdown to add new tags.
                                </Text>
                            </View>
                        </View>
                    </StyledCard>
                )}

                {/* Email Automation Section */}
                {activeTab === 'Email Automation' && (
                    <View style={styles.emailAutomationContainer}>
                        <View style={styles.emailAutomationHeader}>
                            <Text style={styles.emailAutomationTitle}>Automated Email Configuration</Text>
                            <Text style={styles.emailAutomationSubtitle}>
                                Configure which user tags receive automated email notifications for different events.
                            </Text>
                        </View>

                        <View style={styles.emailConfigsList}>
                            {emailConfigs.map((config) => (
                                <StyledCard key={config.id} style={styles.emailConfigCard}>
                                    <View style={styles.emailConfigHeader}>
                                        <View style={styles.emailConfigTitleRow}>
                                            <Ionicons name="mail-outline" size={20} color={theme.colors.text} style={styles.emailConfigIcon} />
                                            <Text style={styles.emailConfigTitle}>{config.title}</Text>
                                        </View>
                                        <View style={styles.toggleContainer}>
                                            <Text style={styles.toggleLabel}>Enabled</Text>
                                            <TouchableOpacity
                                                style={[
                                                    styles.toggleSwitch,
                                                    config.enabled && styles.toggleSwitchActive
                                                ]}
                                                onPress={() => toggleEmailConfig(config.id)}
                                            >
                                                <View style={[
                                                    styles.toggleThumb,
                                                    config.enabled && styles.toggleThumbActive
                                                ]} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    <Text style={styles.emailConfigDescription}>{config.description}</Text>

                                    {/* Recipient Tags */}
                                    <View style={styles.recipientTagsSection}>
                                        <Text style={styles.sectionLabel}>Recipient Tags</Text>
                                        <View style={styles.tagsGrid}>
                                            {availableTags.map((tag) => {
                                                const tagLower = tag.toLowerCase();
                                                const isSelected = config.recipientTags.includes(tagLower);
                                                return (
                                                    <TouchableOpacity
                                                        key={tag}
                                                        style={[
                                                            styles.recipientTag,
                                                            isSelected && styles.recipientTagSelected
                                                        ]}
                                                        onPress={() => toggleRecipientTag(config.id, tag)}
                                                    >
                                                        <Text style={[
                                                            styles.recipientTagText,
                                                            isSelected && styles.recipientTagTextSelected
                                                        ]}>
                                                            {tagLower}
                                                        </Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                        {config.recipientTags.length > 0 && (
                                            <View style={styles.selectedTagsDisplay}>
                                                {config.recipientTags.map((tag, index) => {
                                                    const colors = ['#fef3c7', '#fce7f3', '#f3e8ff'];
                                                    return (
                                                        <View
                                                            key={index}
                                                            style={[styles.selectedTagBadge, { backgroundColor: colors[index % colors.length] }]}
                                                        >
                                                            <Text style={styles.selectedTagBadgeText}>{tag}</Text>
                                                        </View>
                                                    );
                                                })}
                                            </View>
                                        )}
                                    </View>

                                    {/* Send Timing */}
                                    <View style={styles.sendTimingSection}>
                                        <View style={styles.sendTimingHeader}>
                                            <Ionicons name="time-outline" size={18} color={theme.colors.text} />
                                            <Text style={styles.sectionLabel}>Send Timing (select multiple)</Text>
                                        </View>
                                        <View style={styles.timingOptions}>
                                            {sendTimingOptions.map((timing) => {
                                                const isSelected = config.sendTimings.includes(timing.id);
                                                return (
                                                    <TouchableOpacity
                                                        key={timing.id}
                                                        style={styles.timingOption}
                                                        onPress={() => toggleSendTiming(config.id, timing.id)}
                                                    >
                                                        <View style={styles.radioButton}>
                                                            {isSelected && <View style={styles.radioButtonSelected} />}
                                                        </View>
                                                        <View style={styles.timingOptionContent}>
                                                            <Text style={styles.timingOptionLabel}>{timing.label}</Text>
                                                            <Text style={styles.timingOptionDescription}>{timing.description}</Text>
                                                        </View>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                        {config.sendTimings.length > 0 && (
                                            <View style={styles.selectedTimingsDisplay}>
                                                <Text style={styles.selectedTimingsLabel}>Selected timings:</Text>
                                                {config.sendTimings.map((timing, index) => (
                                                    <View key={index} style={styles.selectedTimingBadge}>
                                                        <Text style={styles.selectedTimingBadgeText}>{timing}</Text>
                                                    </View>
                                                ))}
                                            </View>
                                        )}
                                    </View>

                                    <Text style={styles.lastUpdatedText}>Last updated: {config.lastUpdated}</Text>
                                </StyledCard>
                            ))}
                        </View>
                    </View>
                )}

                {/* Data Import Section */}
                {activeTab === 'Data Import' && (
                    <View style={styles.dataImportContainer}>
                        {/* CampMinder Sync Section */}
                        <View style={styles.syncSection}>
                            <View style={styles.sectionHeader}>
                                <Ionicons name="refresh" size={20} color={theme.colors.text} style={styles.sectionIcon} />
                                <Text style={styles.sectionTitle}>CampMinder Sync</Text>
                            </View>
                            <Text style={styles.sectionDescription}>
                                Sync campers, staff, divisions, and sessions from CampMinder API for the 2026 season. Auto sync runs every hour for all configured camps.
                            </Text>
                            
                            <StyledCard style={styles.campSyncCard}>
                                <View style={styles.campSyncHeader}>
                                    <View style={styles.campSyncInfo}>
                                        <Text style={styles.campName}>Tyler Hill Camp</Text>
                                        <Text style={styles.lastSyncedText}>Last synced: {syncStatus.lastSynced}</Text>
                                    </View>
                                    <View style={styles.campSyncActions}>
                                        {syncStatus.isConfigured && (
                                            <View style={styles.configuredBadge}>
                                                <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                                                <Text style={styles.configuredBadgeText}>Configured</Text>
                                            </View>
                                        )}
                                        <TouchableOpacity
                                            style={styles.staffOnlyButton}
                                            onPress={handleStaffOnlySync}
                                        >
                                            <Text style={styles.staffOnlyButtonText}>Staff Only</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.fullSyncButton}
                                            onPress={handleFullSync}
                                        >
                                            <Ionicons name="refresh" size={16} color="white" />
                                            <Text style={styles.fullSyncButtonText}>Full Sync</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </StyledCard>
                        </View>

                        {/* Manual JSON Import Section */}
                        <View style={styles.importSection}>
                            <View style={styles.sectionHeader}>
                                <Ionicons name="cloud-upload-outline" size={20} color={theme.colors.text} style={styles.sectionIcon} />
                                <Text style={styles.sectionTitle}>Manual JSON Import</Text>
                            </View>
                            <Text style={styles.sectionDescription}>
                                Import campers and awards data from JSON files. Awards will retain their original years while being linked to the selected season records.
                            </Text>

                            <StyledCard style={styles.importCard}>
                                {/* Import Season Dropdown */}
                                <View style={styles.importField}>
                                    <Text style={styles.fieldLabel}>Import Season</Text>
                                    <View style={styles.seasonPickerContainer}>
                                        <TouchableOpacity
                                            style={styles.seasonPickerButton}
                                            onPress={() => setShowSeasonPicker(!showSeasonPicker)}
                                        >
                                            <Text style={styles.seasonPickerText}>{selectedSeason}</Text>
                                            <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
                                        </TouchableOpacity>
                                        {showSeasonPicker && (
                                            <View style={styles.seasonPickerDropdown}>
                                                <ScrollView
                                                    nestedScrollEnabled={true}
                                                    showsVerticalScrollIndicator={true}
                                                >
                                                    {seasons.map((season) => (
                                                        <TouchableOpacity
                                                            key={season}
                                                            style={[
                                                                styles.seasonPickerOption,
                                                                selectedSeason === season && styles.seasonPickerOptionSelected
                                                            ]}
                                                            onPress={() => {
                                                                setSelectedSeason(season);
                                                                setShowSeasonPicker(false);
                                                            }}
                                                        >
                                                            <Text style={[
                                                                styles.seasonPickerOptionText,
                                                                selectedSeason === season && styles.seasonPickerOptionTextSelected
                                                            ]}>
                                                                {season}
                                                            </Text>
                                                            {selectedSeason === season && (
                                                                <Ionicons name="checkmark" size={18} color={theme.colors.accent} />
                                                            )}
                                                        </TouchableOpacity>
                                                    ))}
                                                </ScrollView>
                                            </View>
                                        )}
                                    </View>
                                </View>

                                {/* Campers File */}
                                <View style={styles.importField}>
                                    <Text style={styles.fieldLabel}>Campers File (campers.json)</Text>
                                    <TouchableOpacity
                                        style={styles.campersFileButton}
                                        onPress={() => handleFileSelect('campers')}
                                    >
                                        <Ionicons name="cloud-upload-outline" size={18} color="white" />
                                        <Text style={styles.campersFileButtonText}>Select File</Text>
                                    </TouchableOpacity>
                                    {campersFileName && (
                                        <Text style={styles.selectedFileName}>{campersFileName}</Text>
                                    )}
                                </View>

                                {/* Awards File */}
                                <View style={styles.importField}>
                                    <Text style={styles.fieldLabel}>Awards File (awards.json)</Text>
                                    <TouchableOpacity
                                        style={styles.awardsFileButton}
                                        onPress={() => handleFileSelect('awards')}
                                    >
                                        <Ionicons name="cloud-upload-outline" size={18} color={theme.colors.text} />
                                        <Text style={styles.awardsFileButtonText}>Select File</Text>
                                    </TouchableOpacity>
                                    {awardsFileName && (
                                        <Text style={styles.selectedFileName}>{awardsFileName}</Text>
                                    )}
                                </View>

                                {/* Start Import Button */}
                                <TouchableOpacity
                                    style={styles.startImportButton}
                                    onPress={handleStartImport}
                                >
                                    <Text style={styles.startImportButtonText}>Start Import</Text>
                                </TouchableOpacity>
                            </StyledCard>
                        </View>

                        {/* Important Notes Section */}
                        <StyledCard style={styles.importantNotesCard}>
                            <View style={styles.importantNotesHeader}>
                                <Ionicons name="information-circle-outline" size={20} color={theme.colors.textSecondary} style={styles.importantNotesIcon} />
                                <Text style={styles.importantNotesTitle}>Important Notes:</Text>
                            </View>
                            <View style={styles.notesList}>
                                <View style={styles.noteItem}>
                                    <Text style={styles.noteBullet}>•</Text>
                                    <Text style={styles.noteText}>CampMinder sync runs automatically every hour for all configured camps</Text>
                                </View>
                                <View style={styles.noteItem}>
                                    <Text style={styles.noteBullet}>•</Text>
                                    <Text style={styles.noteText}>The import process uses person_id to link historical data across seasons</Text>
                                </View>
                                <View style={styles.noteItem}>
                                    <Text style={styles.noteBullet}>•</Text>
                                    <Text style={styles.noteText}>When a camper returns in future seasons with the same person_id, all their historical awards will be visible</Text>
                                </View>
                                <View style={styles.noteItem}>
                                    <Text style={styles.noteBullet}>•</Text>
                                    <Text style={styles.noteText}>Duplicate person_ids within the same season will be skipped</Text>
                                </View>
                                <View style={styles.noteItem}>
                                    <Text style={styles.noteBullet}>•</Text>
                                    <Text style={styles.noteText}>Award dates reflect the original year earned</Text>
                                </View>
                            </View>
                        </StyledCard>
                    </View>
                )}

                {/* Edit History Section */}
                {activeTab === 'Edit History' && (
                    <View style={styles.editHistoryContainer}>
                        <StyledCard style={styles.editHistoryCard}>
                            <View style={styles.editHistoryHeader}>
                                <View style={styles.editHistoryTitleContainer}>
                                    <Ionicons name="document-text-outline" size={20} color={theme.colors.text} style={styles.editHistoryIcon} />
                                    <View>
                                        <Text style={styles.editHistoryTitle}>Edit History</Text>
                                        <Text style={styles.editHistorySubtitle}>View all changes made to the system.</Text>
                                    </View>
                                </View>
                                <TouchableOpacity
                                    style={styles.exportButton}
                                    onPress={handleExportCSV}
                                >
                                    <Ionicons name="download-outline" size={18} color="white" />
                                    <Text style={styles.exportButtonText}>Export CSV</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Search and Filter Bar */}
                            <View style={styles.historySearchBar}>
                                <View style={styles.historySearchInputContainer}>
                                    <Ionicons name="search-outline" size={18} color={theme.colors.textSecondary} style={styles.historySearchIcon} />
                                    <TextInput
                                        style={styles.historySearchInput}
                                        placeholder="Search by table, user, or email..."
                                        placeholderTextColor={theme.colors.textSecondary}
                                        value={historySearch}
                                        onChangeText={setHistorySearch}
                                    />
                                </View>
                                <View style={styles.tableFilterContainer}>
                                    <TouchableOpacity
                                        style={styles.tableFilterButton}
                                        onPress={() => setShowTableFilter(!showTableFilter)}
                                    >
                                        <Text style={styles.tableFilterText}>{selectedTableFilter}</Text>
                                        <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
                                    </TouchableOpacity>
                                    {showTableFilter && (
                                        <View style={styles.tableFilterDropdown}>
                                            <ScrollView
                                                style={styles.tableFilterScrollView}
                                                nestedScrollEnabled={true}
                                                showsVerticalScrollIndicator={true}
                                            >
                                                {tableFilterOptions.map((table) => (
                                                    <TouchableOpacity
                                                        key={table}
                                                        style={[
                                                            styles.tableFilterOption,
                                                            selectedTableFilter === table && styles.tableFilterOptionSelected
                                                        ]}
                                                        onPress={() => {
                                                            setSelectedTableFilter(table);
                                                            setShowTableFilter(false);
                                                        }}
                                                    >
                                                        <Text style={[
                                                            styles.tableFilterOptionText,
                                                            selectedTableFilter === table && styles.tableFilterOptionTextSelected
                                                        ]}>
                                                            {table}
                                                        </Text>
                                                        {selectedTableFilter === table && (
                                                            <Ionicons name="checkmark" size={18} color={theme.colors.accent} />
                                                        )}
                                                    </TouchableOpacity>
                                                ))}
                                            </ScrollView>
                                        </View>
                                    )}
                                </View>
                            </View>

                            {/* History List */}
                            <View style={styles.historyList}>
                                {historyEntries
                                    .filter(entry => {
                                        const searchLower = historySearch.toLowerCase();
                                        const matchesSearch = !historySearch || 
                                            entry.user.toLowerCase().includes(searchLower) ||
                                            entry.table.toLowerCase().includes(searchLower) ||
                                            entry.recordId.toLowerCase().includes(searchLower);
                                        
                                        const matchesTable = selectedTableFilter === 'All Tables' || entry.table === selectedTableFilter.toLowerCase();
                                        
                                        return matchesSearch && matchesTable;
                                    })
                                    .map((entry) => {
                                        const isExpanded = expandedHistoryIds.has(entry.id);
                                        return (
                                            <View key={entry.id} style={styles.historyEntry}>
                                                <ScrollView
                                                    horizontal={true}
                                                    showsHorizontalScrollIndicator={false}
                                                    contentContainerStyle={styles.historyEntryRow}
                                                >
                                                    <TouchableOpacity
                                                        style={styles.historyExpandButton}
                                                        onPress={() => toggleHistoryExpanded(entry.id)}
                                                    >
                                                        <Ionicons 
                                                            name={isExpanded ? "chevron-up" : "chevron-down"} 
                                                            size={16} 
                                                            color={theme.colors.textSecondary} 
                                                        />
                                                    </TouchableOpacity>
                                                    <View style={styles.historyDateTimeContainer}>
                                                        <Text style={styles.historyDate}>
                                                            {entry.dateTime.split(' ')[0]} {entry.dateTime.split(' ')[1]}
                                                        </Text>
                                                        <Text style={styles.historyTime}>
                                                            {entry.dateTime.split(' ')[2]}
                                                        </Text>
                                                    </View>
                                                    <Text style={styles.historyUser}>{entry.user}</Text>
                                                    <View style={styles.historyTableBadge}>
                                                        <Text style={styles.historyTableBadgeText}>
                                                            {entry.table.charAt(0).toUpperCase() + entry.table.slice(1)}
                                                        </Text>
                                                    </View>
                                                    <View style={styles.historyActionBadge}>
                                                        <Text style={styles.historyActionBadgeText}>{entry.action}</Text>
                                                    </View>
                                                    <Text style={styles.historyRecordId} numberOfLines={1} ellipsizeMode="tail">
                                                        {truncateId(entry.recordId, 12)}
                                                    </Text>
                                                </ScrollView>
                                                {isExpanded && (
                                                    <View style={styles.historyExpandedContent}>
                                                        <Text style={styles.historyExpandedText}>Full Record ID: {entry.recordId}</Text>
                                                        <Text style={styles.historyExpandedText}>Action: {entry.action}</Text>
                                                        <Text style={styles.historyExpandedText}>Table: {entry.table}</Text>
                                                        <Text style={styles.historyExpandedText}>User: {entry.user}</Text>
                                                    </View>
                                                )}
                                            </View>
                                        );
                                    })}
                            </View>
                        </StyledCard>
                    </View>
                )}

                {/* Placeholder for other tabs */}
                {activeTab !== 'User Management' && activeTab !== 'User Tags' && activeTab !== 'Email Automation' && activeTab !== 'Data Import' && activeTab !== 'Edit History' && (
                    <StyledCard style={styles.placeholderCard}>
                        <Text style={styles.placeholderText}>{activeTab} content coming soon</Text>
                    </StyledCard>
                )}
            </ScrollView>

            {/* Role Picker Overlay */}
            {showRolePicker && (
                <Pressable 
                    style={styles.overlay}
                    onPress={() => setShowRolePicker(null)}
                />
            )}

            {/* Tag Filter Overlay */}
            {showTagFilter && (
                <Pressable 
                    style={styles.overlay}
                    onPress={() => setShowTagFilter(false)}
                />
            )}

            {/* Tag Picker Overlay */}
            {showTagPicker && (
                <Pressable 
                    style={styles.overlay}
                    onPress={() => {
                        setShowTagPicker(null);
                        setNewTagName('');
                    }}
                />
            )}

            {/* Season Picker Overlay */}
            {showSeasonPicker && (
                <Pressable
                    style={styles.overlay}
                    onPress={() => setShowSeasonPicker(false)}
                />
            )}

            {/* Table Filter Overlay */}
            {showTableFilter && (
                <Pressable
                    style={styles.overlay}
                    onPress={() => setShowTableFilter(false)}
                />
            )}

            {/* Add User Modal */}
            <Modal
                visible={showAddUserModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowAddUserModal(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setShowAddUserModal(false)}>
                    <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add User</Text>
                            <TouchableOpacity onPress={() => setShowAddUserModal(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalBody}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Name</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter user name"
                                    placeholderTextColor={theme.colors.textSecondary}
                                    value={newUserName}
                                    onChangeText={setNewUserName}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Email</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter user email"
                                    placeholderTextColor={theme.colors.textSecondary}
                                    value={newUserEmail}
                                    onChangeText={setNewUserEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Role</Text>
                                <TouchableOpacity
                                    style={styles.roleSelectButton}
                                    onPress={() => setShowNewUserRolePicker(!showNewUserRolePicker)}
                                >
                                    <Text style={styles.roleSelectText}>{newUserRole}</Text>
                                    <Ionicons name="chevron-down" size={18} color={theme.colors.textSecondary} />
                                </TouchableOpacity>
                                {showNewUserRolePicker && (
                                    <View style={styles.roleOptions}>
                                        {roles.map((role) => (
                                            <TouchableOpacity
                                                key={role}
                                                style={[
                                                    styles.roleOption,
                                                    newUserRole === role && styles.roleOptionSelected
                                                ]}
                                                onPress={() => {
                                                    setNewUserRole(role);
                                                    setShowNewUserRolePicker(false);
                                                }}
                                            >
                                                <Text style={[
                                                    styles.roleOptionText,
                                                    newUserRole === role && styles.roleOptionTextSelected
                                                ]}>
                                                    {role}
                                                </Text>
                                                {newUserRole === role && (
                                                    <Ionicons name="checkmark" size={18} color={theme.colors.secondary} />
                                                )}
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </View>
                        </View>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => setShowAddUserModal(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.createButton}
                                onPress={handleAddUser}
                            >
                                <Text style={styles.createButtonText}>Create User</Text>
                            </TouchableOpacity>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Delete User Confirmation Modal */}
            <Modal
                visible={showDeleteModal}
                transparent={true}
                animationType="fade"
                onRequestClose={handleCancelDelete}
            >
                <Pressable style={styles.modalOverlay} onPress={handleCancelDelete}>
                    <Pressable style={styles.deleteModalContent} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.deleteModalHeader}>
                            <Text style={styles.deleteModalTitle}>Delete User</Text>
                        </View>

                        <View style={styles.deleteModalBody}>
                            <Text style={styles.deleteModalMessage}>
                                Are you sure you want to delete {userToDelete?.name}? This action cannot be undone.
                            </Text>
                        </View>

                        <View style={styles.deleteModalFooter}>
                            <TouchableOpacity
                                style={styles.deleteButton}
                                onPress={handleConfirmDelete}
                            >
                                <Text style={styles.deleteButtonText}>Delete</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.cancelDeleteButton}
                                onPress={handleCancelDelete}
                            >
                                <Text style={styles.cancelDeleteButtonText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Role Change Popup Modal */}
            <Modal
                visible={showRolePopup}
                transparent={true}
                animationType="fade"
                statusBarTranslucent={true}
                onRequestClose={() => {
                    setShowRolePopup(false);
                    setSelectedRoleForPopup(null);
                    setSelectedUserForRole(null);
                }}
            >
                <Pressable 
                    style={styles.rolePopupOverlay} 
                    onPress={() => {
                        setShowRolePopup(false);
                        setSelectedRoleForPopup(null);
                        setSelectedUserForRole(null);
                    }}
                >
                    <Pressable style={styles.rolePopupContent} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.rolePopupHeader}>
                            <Text style={styles.rolePopupTitle}>Change User Role</Text>
                            <TouchableOpacity 
                                onPress={() => {
                                    setShowRolePopup(false);
                                    setSelectedRoleForPopup(null);
                                    setSelectedUserForRole(null);
                                }}
                            >
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.rolePopupBody}>
                            {selectedRoleForPopup && (
                                <>
                                    <View style={styles.rolePopupBadgeContainer}>
                                        <View 
                                            style={[
                                                styles.rolePopupBadge,
                                                { backgroundColor: getRoleBadgeColor(selectedRoleForPopup) }
                                            ]}
                                        >
                                            <Text style={styles.rolePopupBadgeText}>{selectedRoleForPopup}</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.rolePopupMessage}>
                                        Are you sure you want to change this user's role to {selectedRoleForPopup}?
                                    </Text>
                                </>
                            )}
                        </View>

                        <View style={styles.rolePopupFooter}>
                            <TouchableOpacity
                                style={styles.rolePopupCancelButton}
                                onPress={() => {
                                    setShowRolePopup(false);
                                    setSelectedRoleForPopup(null);
                                    setSelectedUserForRole(null);
                                }}
                            >
                                <Text style={styles.rolePopupCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            {selectedRoleForPopup && selectedUserForRole && (
                                <TouchableOpacity
                                    style={styles.rolePopupConfirmButton}
                                    onPress={() => handleUpdateRole(selectedUserForRole, selectedRoleForPopup)}
                                >
                                    <Text style={styles.rolePopupConfirmText}>Confirm</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Download File Modal */}
            <Modal
                visible={showDownloadModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowDownloadModal(false)}
                statusBarTranslucent={true}
            >
                <Pressable
                    style={styles.downloadModalOverlay}
                    onPress={() => setShowDownloadModal(false)}
                >
                    <Pressable
                        style={styles.downloadModalContent}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <View style={styles.downloadModalHeader}>
                            <Text style={styles.downloadModalTitle}>Download file</Text>
                            <TouchableOpacity
                                onPress={() => setShowDownloadModal(false)}
                                style={styles.downloadModalCloseButton}
                            >
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.downloadModalBody}>
                            {/* Name Input */}
                            <View style={styles.downloadInputGroup}>
                                <Text style={styles.downloadInputLabel}>Name</Text>
                                <TextInput
                                    style={styles.downloadInput}
                                    value={downloadFileName}
                                    onChangeText={setDownloadFileName}
                                    placeholder="Enter file name"
                                    placeholderTextColor={theme.colors.textSecondary}
                                />
                            </View>

                            {/* Recent Section */}
                            <View style={styles.downloadSection}>
                                <Text style={styles.downloadSectionTitle}>Recent</Text>
                                <TouchableOpacity
                                    style={styles.downloadLocationItem}
                                    onPress={() => {
                                        setSelectedLocation('Private folder');
                                        setShowDownloadModal(false);
                                        handleDownload();
                                    }}
                                >
                                    <Ionicons name="folder" size={20} color={theme.colors.textSecondary} />
                                    <Text style={styles.downloadLocationText}>Private folder</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Location Section */}
                            <View style={styles.downloadSection}>
                                <Text style={styles.downloadSectionTitle}>Location</Text>
                                <TouchableOpacity
                                    style={styles.downloadLocationItem}
                                    onPress={() => setShowLocationPicker(!showLocationPicker)}
                                >
                                    <Ionicons name="folder" size={20} color={theme.colors.textSecondary} />
                                    <Text style={styles.downloadLocationText}>{selectedLocation}</Text>
                                    <Ionicons
                                        name={showLocationPicker ? "chevron-up" : "chevron-down"}
                                        size={18}
                                        color={theme.colors.textSecondary}
                                    />
                                </TouchableOpacity>
                                {showLocationPicker && (
                                    <View style={styles.downloadLocationPicker}>
                                        {locations.map((location) => (
                                            <TouchableOpacity
                                                key={location}
                                                style={[
                                                    styles.downloadLocationOption,
                                                    selectedLocation === location && styles.downloadLocationOptionSelected
                                                ]}
                                                onPress={() => {
                                                    setSelectedLocation(location);
                                                    setShowLocationPicker(false);
                                                }}
                                            >
                                                <Ionicons name="folder" size={18} color={theme.colors.textSecondary} />
                                                <Text style={[
                                                    styles.downloadLocationOptionText,
                                                    selectedLocation === location && styles.downloadLocationOptionTextSelected
                                                ]}>
                                                    {location}
                                                </Text>
                                                {selectedLocation === location && (
                                                    <Ionicons name="checkmark" size={18} color={theme.colors.secondary} />
                                                )}
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                                <TouchableOpacity
                                    style={styles.downloadLocationItem}
                                    onPress={() => {
                                        setSelectedLocation('Private folder');
                                        setShowLocationPicker(false);
                                    }}
                                >
                                    <Ionicons name="folder" size={20} color={theme.colors.textSecondary} />
                                    <Text style={styles.downloadLocationText}>Private folder</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Download Button */}
                        <TouchableOpacity
                            style={styles.downloadButton}
                            onPress={handleDownload}
                        >
                            <Text style={styles.downloadButtonText}>Download</Text>
                        </TouchableOpacity>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Floating Action Button */}
            <TouchableOpacity style={styles.fab}>
                <Ionicons name="chatbubble-outline" size={24} color="white" />
            </TouchableOpacity>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    topHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    topHeaderTitle: {
        ...theme.typography.h3,
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
    },
    scrollContent: {
        padding: theme.spacing.md,
        paddingBottom: 100,
    },
    titleSection: {
        marginBottom: theme.spacing.lg,
        marginTop: theme.spacing.md,
    },
    title: {
        ...theme.typography.h1,
        fontSize: 28,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    subtitle: {
        ...theme.typography.bodySmall,
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    tabsContainer: {
        flexDirection: 'row',
        paddingVertical: theme.spacing.sm,
        marginBottom: theme.spacing.md,
    },
    tab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        marginRight: theme.spacing.md,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabActive: {
        borderBottomColor: theme.colors.text,
    },
    tabIcon: {
        marginRight: theme.spacing.xs,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '500',
        color: theme.colors.textSecondary,
    },
    tabTextActive: {
        color: theme.colors.text,
        fontWeight: '700',
    },
    userRolesCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        marginTop: theme.spacing.sm,
    },
    userRolesHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: theme.spacing.lg,
    },
    userRolesTitleContainer: {
        flex: 1,
    },
    userRolesTitle: {
        ...theme.typography.h2,
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    userRolesSubtitle: {
        ...theme.typography.bodySmall,
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    addUserButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.secondary,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
        gap: theme.spacing.xs,
    },
    addUserButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
    userList: {
        gap: theme.spacing.sm,
    },
    userCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.sm,
        zIndex: 1,
    },
    userCardWithOpenDropdown: {
        zIndex: 100,
        elevation: 100,
    },
    userInfoRow: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: theme.spacing.md,
        flexWrap: 'wrap',
        gap: theme.spacing.sm,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        flexShrink: 1,
    },
    userName: {
        ...theme.typography.h3,
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.text,
        marginRight: theme.spacing.xs,
    },
    userEmail: {
        ...theme.typography.bodySmall,
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    roleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        position: 'relative',
        flexShrink: 0,
    },
    actionIcons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        flexShrink: 0,
    },
    roleBadge: {
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 4,
        borderRadius: theme.borderRadius.sm,
    },
    roleBadgeText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
    },
    roleDropdown: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        minWidth: 120,
        gap: theme.spacing.xs,
    },
    roleDropdownText: {
        fontSize: 14,
        color: theme.colors.text,
        flex: 1,
    },
    rolePickerDropdown: {
        position: 'absolute',
        top: 40,
        right: 0,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        minWidth: 150,
        zIndex: 1000,
        ...theme.shadows.card,
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 1000,
        maxHeight: 200,
    },
    rolePickerOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    rolePickerOptionText: {
        fontSize: 14,
        color: theme.colors.text,
    },
    actionIcon: {
        padding: theme.spacing.xs,
    },
    placeholderCard: {
        padding: theme.spacing.xl,
        alignItems: 'center',
    },
    placeholderText: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
    },
    // User Tags Styles
    userTagsCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        marginTop: theme.spacing.sm,
        zIndex: 1,
    },
    userTagsHeader: {
        marginBottom: theme.spacing.lg,
    },
    userTagsTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.xs,
    },
    userTagsIcon: {
        marginRight: theme.spacing.xs,
    },
    userTagsTitle: {
        ...theme.typography.h2,
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.text,
    },
    userTagsSubtitle: {
        ...theme.typography.bodySmall,
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.xs,
    },
    userTagsSearchBar: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.md,
        position: 'relative',
        zIndex: 1,
    },
    userTagsSearchBarWithDropdown: {
        zIndex: 2000,
    },
    searchInputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.sm,
        height: 44,
    },
    searchIcon: {
        marginRight: theme.spacing.xs,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: theme.colors.text,
    },
    tagFilterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        gap: theme.spacing.xs,
        minWidth: 120,
    },
    tagFilterText: {
        fontSize: 14,
        color: theme.colors.text,
    },
    tagFilterContainer: {
        position: 'relative',
        zIndex: 1000,
    },
    tagFilterDropdown: {
        position: 'absolute',
        top: 48,
        right: 0,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        minWidth: 200,
        maxWidth: 250,
        zIndex: 2000,
        ...theme.shadows.card,
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 2000,
        maxHeight: 300,
        overflow: 'hidden',
    },
    tagFilterOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    tagFilterOptionSelected: {
        backgroundColor: '#fff7ed',
    },
    tagFilterOptionText: {
        fontSize: 14,
        color: theme.colors.text,
    },
    tagFilterOptionTextSelected: {
        color: theme.colors.accent,
        fontWeight: '600',
    },
    tagFilterScrollView: {
        maxHeight: 240,
    },
    userTagsList: {
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.lg,
        zIndex: 1,
    },
    userTagCard: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.sm,
        position: 'relative',
        zIndex: 1,
    },
    userTagCardWithOpenDropdown: {
        zIndex: 100,
        elevation: 100,
    },
    userTagInfo: {
        marginBottom: theme.spacing.sm,
    },
    userTagName: {
        ...theme.typography.h3,
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    userTagEmail: {
        ...theme.typography.bodySmall,
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.sm,
    },
    userTagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.xs,
        marginBottom: theme.spacing.sm,
    },
    tagBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#eff6ff',
        borderWidth: 1,
        borderColor: theme.colors.secondary,
        borderRadius: theme.borderRadius.sm,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 4,
        gap: theme.spacing.xs,
    },
    tagBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.secondary,
    },
    noTagsText: {
        ...theme.typography.bodySmall,
        fontSize: 14,
        color: theme.colors.textSecondary,
        fontStyle: 'italic',
    },
    addTagButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        gap: theme.spacing.xs,
        alignSelf: 'flex-start',
    },
    addTagButtonText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    tagPickerDropdown: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        marginTop: theme.spacing.xs,
        zIndex: 1000,
        ...theme.shadows.card,
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 1000,
        maxHeight: 300,
        overflow: 'hidden',
    },
    tagPickerScrollView: {
        maxHeight: 240,
    },
    tagPickerOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    tagPickerOptionText: {
        fontSize: 14,
        color: theme.colors.text,
    },
    addNewTagContainer: {
        padding: theme.spacing.sm,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    newTagInput: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        fontSize: 14,
        color: theme.colors.text,
    },
    aboutTagsSection: {
        flexDirection: 'row',
        backgroundColor: '#eff6ff',
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginTop: theme.spacing.md,
    },
    aboutTagsContent: {
        flex: 1,
        marginLeft: theme.spacing.sm,
    },
    aboutTagsTitle: {
        ...theme.typography.h3,
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    aboutTagsText: {
        ...theme.typography.bodySmall,
        fontSize: 14,
        color: theme.colors.textSecondary,
        lineHeight: 20,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.xl,
        width: '90%',
        maxWidth: 500,
        ...theme.shadows.card,
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    modalTitle: {
        ...theme.typography.h2,
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.text,
    },
    modalBody: {
        padding: theme.spacing.lg,
    },
    inputGroup: {
        marginBottom: theme.spacing.md,
    },
    inputLabel: {
        ...theme.typography.body,
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    input: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        fontSize: 14,
        color: theme.colors.text,
    },
    roleSelectButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
    },
    roleSelectText: {
        fontSize: 14,
        color: theme.colors.text,
    },
    roleOptions: {
        marginTop: theme.spacing.sm,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        overflow: 'hidden',
    },
    roleOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    roleOptionSelected: {
        backgroundColor: '#eff6ff',
    },
    roleOptionText: {
        fontSize: 14,
        color: theme.colors.text,
    },
    roleOptionTextSelected: {
        color: theme.colors.secondary,
        fontWeight: '600',
    },
    modalFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: theme.spacing.md,
        padding: theme.spacing.lg,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    cancelButton: {
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
    },
    cancelButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    createButton: {
        backgroundColor: theme.colors.secondary,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
    },
    createButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: 'white',
    },
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'transparent',
        zIndex: 999,
    },
    // Delete Modal Styles
    deleteModalContent: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.xl,
        width: '85%',
        maxWidth: 400,
        ...theme.shadows.card,
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 10,
    },
    deleteModalHeader: {
        padding: theme.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    deleteModalTitle: {
        ...theme.typography.h2,
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.text,
    },
    deleteModalBody: {
        padding: theme.spacing.lg,
    },
    deleteModalMessage: {
        ...theme.typography.body,
        fontSize: 16,
        color: theme.colors.text,
        lineHeight: 24,
    },
    deleteModalFooter: {
        padding: theme.spacing.lg,
        paddingTop: theme.spacing.md,
        gap: theme.spacing.sm,
    },
    deleteButton: {
        backgroundColor: theme.colors.secondary,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
    },
    deleteButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
    },
    cancelDeleteButton: {
        backgroundColor: theme.colors.surface,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    cancelDeleteButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
    },
    // Role Popup Modal Styles
    rolePopupOverlay: {
        flex: 1,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    rolePopupContent: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.xl,
        width: '85%',
        maxWidth: 400,
        ...theme.shadows.card,
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 10000,
        zIndex: 10000,
    },
    rolePopupHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    rolePopupTitle: {
        ...theme.typography.h2,
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.text,
    },
    rolePopupBody: {
        padding: theme.spacing.lg,
        alignItems: 'center',
    },
    rolePopupBadgeContainer: {
        marginBottom: theme.spacing.md,
    },
    rolePopupBadge: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
    },
    rolePopupBadgeText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '700',
    },
    rolePopupMessage: {
        ...theme.typography.body,
        fontSize: 16,
        color: theme.colors.text,
        textAlign: 'center',
        lineHeight: 24,
    },
    rolePopupFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: theme.spacing.md,
        padding: theme.spacing.lg,
        paddingTop: theme.spacing.md,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    rolePopupCancelButton: {
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
    },
    rolePopupCancelText: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    rolePopupConfirmButton: {
        backgroundColor: theme.colors.secondary,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
    },
    rolePopupConfirmText: {
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
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
        zIndex: 100,
    },
    // Email Automation Styles
    emailAutomationContainer: {
        marginTop: theme.spacing.sm,
    },
    emailAutomationHeader: {
        marginBottom: theme.spacing.lg,
    },
    emailAutomationTitle: {
        ...theme.typography.h2,
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    emailAutomationSubtitle: {
        ...theme.typography.bodySmall,
        fontSize: 14,
        color: theme.colors.textSecondary,
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
        flex: 1,
    },
    emailConfigIcon: {
        marginRight: theme.spacing.xs,
    },
    emailConfigTitle: {
        ...theme.typography.h3,
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
    },
    toggleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
    },
    toggleLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
    },
    toggleSwitch: {
        width: 48,
        height: 28,
        borderRadius: 14,
        backgroundColor: theme.colors.border,
        justifyContent: 'center',
        paddingHorizontal: 2,
    },
    toggleSwitchActive: {
        backgroundColor: theme.colors.secondary,
    },
    toggleThumb: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: theme.colors.surface,
    },
    toggleThumbActive: {
        alignSelf: 'flex-end',
    },
    emailConfigDescription: {
        ...theme.typography.bodySmall,
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.md,
    },
    recipientTagsSection: {
        marginBottom: theme.spacing.md,
    },
    sectionLabel: {
        ...theme.typography.h3,
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: theme.spacing.sm,
    },
    sendTimingHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        marginBottom: theme.spacing.sm,
    },
    tagsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.xs,
        marginBottom: theme.spacing.sm,
    },
    recipientTag: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    recipientTagSelected: {
        backgroundColor: theme.colors.secondary,
        borderColor: theme.colors.secondary,
    },
    recipientTagText: {
        fontSize: 14,
        color: theme.colors.text,
        textTransform: 'capitalize',
    },
    recipientTagTextSelected: {
        color: 'white',
        fontWeight: '600',
    },
    selectedTagsDisplay: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.xs,
        marginTop: theme.spacing.sm,
    },
    selectedTagBadge: {
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 4,
        borderRadius: theme.borderRadius.sm,
    },
    selectedTagBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.text,
        textTransform: 'capitalize',
    },
    sendTimingSection: {
        marginBottom: theme.spacing.md,
    },
    timingOptions: {
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.sm,
    },
    timingOption: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: theme.spacing.sm,
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
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: theme.colors.secondary,
    },
    timingOptionContent: {
        flex: 1,
    },
    timingOptionLabel: {
        ...theme.typography.body,
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 2,
    },
    timingOptionDescription: {
        ...theme.typography.bodySmall,
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    selectedTimingsDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: theme.spacing.xs,
        marginTop: theme.spacing.sm,
    },
    selectedTimingsLabel: {
        ...theme.typography.bodySmall,
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    selectedTimingBadge: {
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 4,
        borderRadius: theme.borderRadius.sm,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    selectedTimingBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.text,
    },
    lastUpdatedText: {
        ...theme.typography.bodySmall,
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.md,
        fontStyle: 'italic',
    },
    // Data Import Styles
    dataImportContainer: {
        marginTop: theme.spacing.sm,
    },
    syncSection: {
        marginBottom: theme.spacing.lg,
    },
    importSection: {
        marginBottom: theme.spacing.lg,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    sectionIcon: {
        marginRight: theme.spacing.xs,
    },
    sectionTitle: {
        ...theme.typography.h2,
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.text,
    },
    sectionDescription: {
        ...theme.typography.bodySmall,
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.md,
        lineHeight: 20,
    },
    campSyncCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
    },
    campSyncHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'nowrap',
    },
    campSyncInfo: {
        flex: 1,
        marginRight: theme.spacing.md,
    },
    campName: {
        ...theme.typography.h3,
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    lastSyncedText: {
        ...theme.typography.bodySmall,
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    campSyncActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        flexShrink: 0,
        flexWrap: 'nowrap',
    },
    configuredBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#d1fae5',
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 4,
        borderRadius: theme.borderRadius.sm,
        gap: theme.spacing.xs,
        flexShrink: 0,
    },
    configuredBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#10b981',
    },
    staffOnlyButton: {
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        flexShrink: 0,
    },
    staffOnlyButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.text,
    },
    fullSyncButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.secondary,
        gap: theme.spacing.xs,
        flexShrink: 0,
    },
    fullSyncButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: 'white',
    },
    importCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
    },
    importField: {
        marginBottom: theme.spacing.lg,
    },
    fieldLabel: {
        ...theme.typography.body,
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: theme.spacing.sm,
    },
    seasonPickerContainer: {
        position: 'relative',
        zIndex: 100,
    },
    seasonPickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        minWidth: 120,
    },
    seasonPickerText: {
        fontSize: 14,
        color: theme.colors.text,
    },
    seasonPickerDropdown: {
        position: 'absolute',
        top: 48,
        left: 0,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        minWidth: 200,
        maxWidth: 250,
        zIndex: 1000,
        ...theme.shadows.card,
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 1000,
        maxHeight: 300,
        overflow: 'hidden',
    },
    seasonPickerOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    seasonPickerOptionSelected: {
        backgroundColor: '#fff7ed',
    },
    seasonPickerOptionText: {
        fontSize: 14,
        color: theme.colors.text,
    },
    seasonPickerOptionTextSelected: {
        color: theme.colors.accent,
        fontWeight: '600',
    },
    campersFileButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f97316',
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        gap: theme.spacing.xs,
    },
    campersFileButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: 'white',
    },
    awardsFileButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        gap: theme.spacing.xs,
    },
    awardsFileButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
    },
    selectedFileName: {
        ...theme.typography.bodySmall,
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.xs,
        fontStyle: 'italic',
    },
    startImportButton: {
        alignSelf: 'flex-end',
        backgroundColor: theme.colors.secondary,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        marginTop: theme.spacing.md,
    },
    startImportButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: 'white',
    },
    importantNotesCard: {
        backgroundColor: theme.colors.weatherBg,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        marginTop: theme.spacing.md,
    },
    importantNotesHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    importantNotesIcon: {
        marginRight: theme.spacing.xs,
    },
    importantNotesTitle: {
        ...theme.typography.h3,
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.text,
    },
    notesList: {
        gap: theme.spacing.sm,
    },
    noteItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: theme.spacing.xs,
    },
    noteBullet: {
        fontSize: 16,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    noteText: {
        ...theme.typography.bodySmall,
        fontSize: 14,
        color: theme.colors.textSecondary,
        flex: 1,
        lineHeight: 20,
    },
    // Edit History Styles
    editHistoryContainer: {
        marginTop: theme.spacing.sm,
        width: '100%',
    },
    editHistoryCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        width: '100%',
    },
    editHistoryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: theme.spacing.lg,
    },
    editHistoryTitleContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        flex: 1,
    },
    editHistoryIcon: {
        marginRight: theme.spacing.sm,
        marginTop: 2,
    },
    editHistoryTitle: {
        ...theme.typography.h2,
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    editHistorySubtitle: {
        ...theme.typography.bodySmall,
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    exportButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f97316',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
        gap: theme.spacing.xs,
    },
    exportButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: 'white',
    },
    historySearchBar: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.md,
        zIndex: 100,
    },
    historySearchInputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.sm,
        height: 44,
    },
    historySearchIcon: {
        marginRight: theme.spacing.xs,
    },
    historySearchInput: {
        flex: 1,
        fontSize: 14,
        color: theme.colors.text,
    },
    tableFilterContainer: {
        position: 'relative',
        zIndex: 100,
    },
    tableFilterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        gap: theme.spacing.xs,
        minWidth: 120,
    },
    tableFilterText: {
        fontSize: 14,
        color: theme.colors.text,
    },
    tableFilterDropdown: {
        position: 'absolute',
        top: 48,
        right: 0,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        minWidth: 200,
        maxWidth: 250,
        zIndex: 1000,
        ...theme.shadows.card,
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 1000,
        maxHeight: 300,
        overflow: 'hidden',
    },
    tableFilterScrollView: {
        maxHeight: 240,
    },
    tableFilterOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    tableFilterOptionSelected: {
        backgroundColor: '#fff7ed',
    },
    tableFilterOptionText: {
        fontSize: 14,
        color: theme.colors.text,
    },
    tableFilterOptionTextSelected: {
        color: theme.colors.accent,
        fontWeight: '600',
    },
    historyList: {
        gap: theme.spacing.xs,
        width: '100%',
    },
    historyEntry: {
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        paddingVertical: theme.spacing.sm,
        width: '100%',
    },
    historyEntryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingRight: theme.spacing.md,
        minWidth: '100%',
    },
    historyExpandButton: {
        padding: theme.spacing.xs,
        justifyContent: 'center',
        alignItems: 'center',
        width: 32,
        marginRight: theme.spacing.xs,
    },
    historyDateTimeContainer: {
        width: 90,
        alignItems: 'flex-start',
        marginRight: theme.spacing.sm,
    },
    historyDate: {
        ...theme.typography.bodySmall,
        fontSize: 13,
        color: theme.colors.text,
        fontWeight: '600',
        lineHeight: 18,
    },
    historyTime: {
        ...theme.typography.bodySmall,
        fontSize: 11,
        color: theme.colors.textSecondary,
        lineHeight: 16,
    },
    historyUser: {
        ...theme.typography.body,
        fontSize: 13,
        color: theme.colors.text,
        width: 60,
        marginRight: theme.spacing.sm,
    },
    historyTableBadge: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.sm,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 4,
        marginRight: theme.spacing.sm,
    },
    historyTableBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        textTransform: 'capitalize',
    },
    historyActionBadge: {
        backgroundColor: theme.colors.secondary,
        borderRadius: theme.borderRadius.sm,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 4,
        marginRight: theme.spacing.sm,
    },
    historyActionBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: 'white',
    },
    historyRecordId: {
        ...theme.typography.bodySmall,
        fontSize: 11,
        color: theme.colors.textSecondary,
        fontFamily: 'monospace',
        width: 120,
        textAlign: 'left',
    },
    historyExpandedContent: {
        marginTop: theme.spacing.sm,
        paddingLeft: theme.spacing.xl,
        paddingVertical: theme.spacing.sm,
        backgroundColor: theme.colors.weatherBg,
        borderRadius: theme.borderRadius.md,
    },
    historyExpandedText: {
        ...theme.typography.bodySmall,
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xs,
    },
    // Download File Modal Styles
    downloadModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    downloadModalContent: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        paddingBottom: theme.spacing.xl,
        maxHeight: '90%',
    },
    downloadModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    downloadModalTitle: {
        ...theme.typography.h2,
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.text,
    },
    downloadModalCloseButton: {
        padding: theme.spacing.xs,
    },
    downloadModalBody: {
        padding: theme.spacing.lg,
        maxHeight: 500,
    },
    downloadInputGroup: {
        marginBottom: theme.spacing.lg,
    },
    downloadInputLabel: {
        ...theme.typography.body,
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: theme.spacing.sm,
    },
    downloadInput: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        fontSize: 14,
        color: theme.colors.text,
    },
    downloadSection: {
        marginBottom: theme.spacing.lg,
    },
    downloadSectionTitle: {
        ...theme.typography.body,
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: theme.spacing.sm,
    },
    downloadLocationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.sm,
        gap: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
    },
    downloadLocationText: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.text,
        flex: 1,
    },
    downloadLocationPicker: {
        backgroundColor: theme.colors.weatherBg,
        borderRadius: theme.borderRadius.md,
        marginTop: theme.spacing.xs,
        marginBottom: theme.spacing.sm,
        overflow: 'hidden',
    },
    downloadLocationOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        gap: theme.spacing.sm,
    },
    downloadLocationOptionSelected: {
        backgroundColor: '#fff7ed',
    },
    downloadLocationOptionText: {
        ...theme.typography.body,
        fontSize: 14,
        color: theme.colors.text,
        flex: 1,
    },
    downloadLocationOptionTextSelected: {
        color: theme.colors.accent,
        fontWeight: '600',
    },
    downloadButton: {
        backgroundColor: theme.colors.secondary,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
        marginHorizontal: theme.spacing.lg,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    downloadButtonText: {
        ...theme.typography.body,
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
    },
});
