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
                onScrollBeginDrag={() => setShowRolePicker(null)}
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

                {/* Placeholder for other tabs */}
                {activeTab !== 'User Management' && activeTab !== 'User Tags' && (
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
    actionIcons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
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
});
