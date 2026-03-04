import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Dimensions, TextInput, Modal, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { StyledCard } from '../components/StyledCard';
import { useStaff } from '../api/staff';
import { useCompany } from '../contexts/CompanyContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 375;

// Division options (excluding "All Divisions")
const DIVISIONS = [
    'Freshmen A Girls',
    'Freshmen B Girls',
    'Cadet Girls',
    'Sophomore Girls',
    'Junior Girls',
    'Senior Girls',
    'Super Girls',
    'Teen Girls',
    'CIT Girls',
    'Freshmen A Boys',
    'Freshmen B Boys',
    'Cadet Boys',
    'Sophomore Boys',
    'Junior Boys',
    'Senior Boys',
    'Super Boys',
    'Teen Boys',
    'CIT Boys',
];


type TabType = 'overview' | 'birthday' | 'allergies' | 'achievements' | 'activities' | 'sports-academy' | 'incidents' | 'appointments';
type BirthdaySubTabType = 'info' | 'party';



export const CamperDetailScreen = ({ route, navigation }: any) => {
    const { camper } = route.params || {};
    const { companyId, season } = useCompany();
    const { data: staffLeaders = [] } = useStaff(companyId, season);
    const leaders = staffLeaders.map((s: any) => ({ name: s.name, role: s.role || s.staff_type || 'Staff' }));

    // Fetch achievements/awards from Supabase for this camper
    const { data: achievements = [], isLoading: achievementsLoading } = useQuery({
        queryKey: ['camper_awards', camper?.id, companyId],
        queryFn: async () => {
            if (!camper?.id || !companyId) return [];
            const { data, error } = await supabase
                .from('awards')
                .select('*')
                .eq('company_id', companyId)
                .eq('child_id', camper.id)
                .order('date', { ascending: false });
            if (error) throw error;
            return (data || []).map((a: any) => ({
                title: a.award_type ? `${a.award_type} Award${a.starfish_value ? ' - ' + a.starfish_value : ''}` : 'Award',
                type: a.starfish_value || a.award_type || '',
                tag: a.award_type?.toLowerCase() || '',
                date: a.date ? new Date(a.date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : '',
            }));
        },
        enabled: !!camper?.id && !!companyId,
    });
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [activeBirthdaySubTab, setActiveBirthdaySubTab] = useState<BirthdaySubTabType>('info');
    const [showEditProfileModal, setShowEditProfileModal] = useState(false);
    const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showGenderDropdown, setShowGenderDropdown] = useState(false);
    const [genderButtonLayout, setGenderButtonLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
    const genderButtonRef = useRef<any>(null);
    const [showDivisionDropdown, setShowDivisionDropdown] = useState(false);
    const [divisionButtonLayout, setDivisionButtonLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
    const divisionButtonRef = useRef<any>(null);
    const [showBunkDropdown, setShowBunkDropdown] = useState(false);
    const [bunkButtonLayout, setBunkButtonLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
    const bunkButtonRef = useRef<any>(null);
    const [showLeaderDropdown, setShowLeaderDropdown] = useState(false);
    const [leaderButtonLayout, setLeaderButtonLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
    const leaderButtonRef = useRef<any>(null);
    const [showBirthdayPartyModal, setShowBirthdayPartyModal] = useState(false);
    const [birthdayPartyFormData, setBirthdayPartyFormData] = useState({
        birthdayPartyType: '',
        birthdayPartyComments: '',
        birthdayCakeMeal: '',
        birthdayCakeType: '',
        birthdayFrostingColors: [] as string[],
        birthdayToppings: [] as string[],
        birthdayCakeAllergies: [] as string[],
        birthdayCakeMessage: '',
    });
    const [editProfileFormData, setEditProfileFormData] = useState({
        name: '',
        person_id: '',
        age: '',
        dateOfBirth: '',
        gender: '',
        division: '',
        bunk: '',
        grade: '',
        group: '',
        season: '2026',
        assignedLeader: '',
        guardianEmail: '',
        guardianPhone: '',
        emergencyContact: '',
        rfid: '',
        allergies: '',
        medicalNotes: '',
    });

    // Initialize form data when modal opens
    useEffect(() => {
        if (showEditProfileModal && camper) {
            setEditProfileFormData({
                name: camper.name || '',
                person_id: (camper as any).person_id || (camper as any).personId || '',
                age: (camper as any).age?.toString() || '',
                dateOfBirth: (camper as any).dateOfBirth || (camper as any).date_of_birth || '',
                gender: (camper as any).gender || '',
                division: camper.division || '',
                bunk: (camper as any).bunk || '',
                grade: camper.grade || '',
                group: (camper as any).group || '',
                season: (camper as any).season || '2026',
                assignedLeader: (camper as any).assignedLeader || '',
                guardianEmail: (camper as any).guardianEmail || (camper as any).guardian_email || '',
                guardianPhone: (camper as any).guardianPhone || (camper as any).guardian_phone || '',
                emergencyContact: (camper as any).emergencyContact || (camper as any).emergency_contact || '',
                rfid: (camper as any).rfid || '',
                allergies: (camper as any).allergies || '',
                medicalNotes: (camper as any).medicalNotes || (camper as any).medical_notes || '',
            });
        }
    }, [showEditProfileModal, camper]);

    const tabs: { key: TabType; label: string }[] = [
        { key: 'overview', label: 'Overview' },
        { key: 'birthday', label: 'Birthday' },
        { key: 'allergies', label: 'Allergies' },
        { key: 'achievements', label: 'Achievements' },
        { key: 'activities', label: 'Activities' },
        { key: 'sports-academy', label: 'Sports Academy' },
        { key: 'incidents', label: 'Incident Reports' },
        { key: 'appointments', label: 'Appointments' },
    ];

    if (!camper) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="chevron-back" size={24} color="#374151" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Camper Not Found</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="chevron-back" size={24} color="#374151" />
                </TouchableOpacity>
                <View style={styles.headerContent}>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerTitle}>{camper.name}</Text>
                        <Text style={styles.headerSubtitle}>{camper.grade}.</Text>
                    </View>
                    <View style={styles.headerActions}>
                        <TouchableOpacity
                            style={styles.editButton}
                            onPress={() => setShowEditProfileModal(true)}
                        >
                            <Ionicons name="pencil" size={16} color={theme.colors.surface} />
                            <Text style={styles.editButtonText}>Edit Profile</Text>
                        </TouchableOpacity>
                        <View style={styles.activeBadge}>
                            <Text style={styles.activeBadgeText}>active</Text>
                        </View>
                    </View>
                </View>
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                {/* Tabs */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.tabsContainer}
                    contentContainerStyle={styles.tabsContent}
                >
                    {tabs.map((tab) => (
                        <TouchableOpacity
                            key={tab.key}
                            style={[
                                styles.tab,
                                activeTab === tab.key && styles.tabActive
                            ]}
                            onPress={() => setActiveTab(tab.key)}
                        >
                            <Text style={[
                                styles.tabText,
                                activeTab === tab.key && styles.tabTextActive
                            ]}>
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Tab Content */}
                {activeTab === 'overview' && (
                    <View style={styles.tabContent}>
                        <View style={styles.cardsRow}>
                            {/* Personal Information Card */}
                            <StyledCard style={styles.infoCard}>
                                <View style={styles.cardHeader}>
                                    <Text style={styles.cardTitle}>Personal Information</Text>
                                    <Text style={styles.cardDescription}>Basic details and contact information</Text>
                                </View>
                                <View style={styles.cardContent}>
                                    <View style={styles.infoGrid}>
                                        <View style={styles.infoGridItem}>
                                            <Text style={styles.infoLabel}>Grade</Text>
                                            <View style={styles.infoValueBox}>
                                                <Text style={styles.infoValueText}>{camper.grade || '-'}</Text>
                                            </View>
                                        </View>
                                        <View style={styles.infoGridItem}>
                                            <Text style={styles.infoLabel}>Gender</Text>
                                            <View style={styles.infoValueBox}>
                                                <Text style={styles.infoValueText}>
                                                    {camper.gender ? camper.gender.charAt(0).toUpperCase() + camper.gender.slice(1) : '-'}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            </StyledCard>

                            {/* Contact Information Card */}
                            <StyledCard style={styles.infoCard}>
                                <View style={styles.cardHeader}>
                                    <Text style={styles.cardTitle}>Contact Information</Text>
                                    <Text style={styles.cardDescription}>Emergency contacts and guardian information</Text>
                                </View>
                                <View style={styles.cardContent}>
                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoLabel}>Guardian Email</Text>
                                        <View style={styles.infoValueBox}>
                                            <Text style={styles.infoValueText}>
                                                {(camper as any).guardianEmail || (camper as any).guardian_email || '-'}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoLabel}>Guardian Phone</Text>
                                        <View style={styles.infoValueBox}>
                                            <Text style={styles.infoValueText}>
                                                {(camper as any).guardianPhone || (camper as any).guardian_phone || '-'}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </StyledCard>
                        </View>
                    </View>
                )}

                {activeTab === 'birthday' && (
                    <View style={styles.tabContent}>
                        {/* Birthday Sub-tabs */}
                        <View style={styles.subTabsContainer}>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={styles.subTabsScroll}
                                contentContainerStyle={styles.subTabsContent}
                            >
                                <TouchableOpacity
                                    style={[
                                        styles.subTab,
                                        activeBirthdaySubTab === 'info' && styles.subTabActive
                                    ]}
                                    onPress={() => setActiveBirthdaySubTab('info')}
                                >
                                    <Text style={[
                                        styles.subTabText,
                                        activeBirthdaySubTab === 'info' && styles.subTabTextActive
                                    ]}>
                                        Birthday Info
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.subTab,
                                        activeBirthdaySubTab === 'party' && styles.subTabActive
                                    ]}
                                    onPress={() => setActiveBirthdaySubTab('party')}
                                >
                                    <Text style={[
                                        styles.subTabText,
                                        activeBirthdaySubTab === 'party' && styles.subTabTextActive
                                    ]}>
                                        Party Preferences
                                    </Text>
                                </TouchableOpacity>
                            </ScrollView>
                        </View>

                        {/* Birthday Info Sub-tab */}
                        {activeBirthdaySubTab === 'info' && (
                            <StyledCard style={styles.infoCard}>
                                <View style={styles.cardHeader}>
                                    <Text style={styles.cardTitle}>Birthday Information</Text>
                                    <Text style={styles.cardDescription}>Date of birth and age details</Text>
                                </View>
                                <View style={styles.cardContent}>
                                    {(camper as any).dateOfBirth || (camper as any).date_of_birth ? (
                                        <View style={styles.birthdayInfoContainer}>
                                            <View style={styles.birthdayDateBox}>
                                                <View style={styles.birthdayDateContent}>
                                                    <Ionicons name="calendar" size={32} color="#2563eb" />
                                                    <View style={styles.birthdayDateText}>
                                                        <Text style={styles.birthdayDateLabel}>Date of Birth</Text>
                                                        <Text style={styles.birthdayDateValue}>
                                                            {new Date((camper as any).dateOfBirth || (camper as any).date_of_birth).toLocaleDateString('en-US', {
                                                                weekday: 'long',
                                                                year: 'numeric',
                                                                month: 'long',
                                                                day: 'numeric'
                                                            })}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </View>
                                            {(camper as any).age && (
                                                <View style={styles.ageBox}>
                                                    <Text style={styles.ageLabel}>Current Age</Text>
                                                    <Text style={styles.ageValue}>{(camper as any).age} years old</Text>
                                                </View>
                                            )}
                                        </View>
                                    ) : (
                                        <View style={styles.emptyBirthdayState}>
                                            <Ionicons name="calendar-outline" size={48} color="#9ca3af" />
                                            <Text style={styles.emptyBirthdayText}>No birthday information available</Text>
                                            <Text style={styles.emptyBirthdaySubtext}>Click "Edit Profile" to add date of birth</Text>
                                        </View>
                                    )}
                                </View>
                            </StyledCard>
                        )}

                        {/* Party Preferences Sub-tab */}
                        {activeBirthdaySubTab === 'party' && (
                            <StyledCard style={styles.infoCard}>
                                <View style={styles.cardHeader}>
                                    <View style={styles.cardHeaderRow}>
                                        <View style={styles.cardHeaderLeft}>
                                            <Text style={styles.cardTitle}>Birthday Party Preferences</Text>
                                            <Text style={styles.cardDescription}>Celebration and cake customization details</Text>
                                        </View>
                                        <TouchableOpacity
                                            style={styles.editButtonSmall}
                                            onPress={() => {
                                                // Initialize form data from camper
                                                setBirthdayPartyFormData({
                                                    birthdayPartyType: (camper as any).birthdayPartyType || (camper as any).birthday_party_type || '',
                                                    birthdayPartyComments: (camper as any).birthdayPartyComments || (camper as any).birthday_party_comments || '',
                                                    birthdayCakeMeal: (camper as any).birthdayCakeMeal || (camper as any).birthday_cake_meal || '',
                                                    birthdayCakeType: (camper as any).birthdayCakeType || (camper as any).birthday_cake_type || '',
                                                    birthdayFrostingColors: (camper as any).birthdayFrostingColors || (camper as any).birthday_frosting_colors || [],
                                                    birthdayToppings: (camper as any).birthdayToppings || (camper as any).birthday_toppings || [],
                                                    birthdayCakeAllergies: (camper as any).birthdayCakeAllergies || (camper as any).birthday_cake_allergies || [],
                                                    birthdayCakeMessage: (camper as any).birthdayCakeMessage || (camper as any).birthday_cake_message || '',
                                                });
                                                setShowBirthdayPartyModal(true);
                                            }}
                                        >
                                            <Ionicons name="pencil" size={14} color={theme.colors.surface} />
                                            <Text style={styles.editButtonSmallText}>Edit</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                                <View style={styles.cardContent}>
                                    <View style={styles.emptyPartyState}>
                                        <Text style={styles.emptyPartyText}>No party preferences set</Text>
                                        <Text style={styles.emptyPartySubtext}>Click 'Edit' to add birthday party details</Text>
                                    </View>
                                </View>
                            </StyledCard>
                        )}
                    </View>
                )}

                {activeTab === 'allergies' && (
                    <View style={styles.tabContent}>
                        <StyledCard style={styles.infoCard}>
                            <View style={styles.cardHeader}>
                                <Text style={styles.cardTitle}>Allergy Information</Text>
                                <Text style={styles.cardDescription}>Manage allergy information for this child</Text>
                            </View>
                            <View style={styles.cardContent}>
                                <View style={styles.allergyInputContainer}>
                                    <TextInput
                                        style={styles.allergyTextArea}
                                        placeholder="Enter allergy information (e.g., peanuts, dairy, shellfish...)"
                                        placeholderTextColor="#9ca3af"
                                        multiline
                                        numberOfLines={8}
                                        textAlignVertical="top"
                                        defaultValue={(camper as any).allergies || ''}
                                    />
                                </View>
                                <TouchableOpacity style={styles.saveButton}>
                                    <Text style={styles.saveButtonText}>Save Allergies</Text>
                                </TouchableOpacity>
                            </View>
                        </StyledCard>
                    </View>
                )}

                {activeTab === 'achievements' && (
                    <View style={styles.tabContent}>
                        {/* Achievements Count */}
                        <View style={styles.achievementsHeader}>
                            <Text style={styles.achievementsCountText}>
                                {achievementsLoading ? 'Loading...' : `${achievements.length} total achievements`}
                            </Text>
                        </View>

                        {/* Achievements List */}
                        {achievementsLoading ? (
                            <View style={{ padding: 20, alignItems: 'center' }}>
                                <ActivityIndicator size="small" color={theme.colors.secondary} />
                            </View>
                        ) : achievements.length === 0 ? (
                            <StyledCard style={styles.emptyCard}>
                                <Text style={styles.emptyText}>No awards recorded yet</Text>
                            </StyledCard>
                        ) : (
                            <View style={styles.achievementsList}>
                                {achievements.map((achievement, index) => (
                                    <StyledCard key={index} style={styles.achievementCard}>
                                        <View style={styles.achievementContent}>
                                            <View style={styles.achievementIconContainer}>
                                                <Ionicons name="trophy" size={24} color="#2563eb" />
                                            </View>
                                            <View style={styles.achievementDetails}>
                                                <Text style={styles.achievementTitle}>{achievement.title}</Text>
                                                {achievement.type && (
                                                    <Text style={styles.achievementType}>{achievement.type}</Text>
                                                )}
                                                <View style={styles.achievementFooter}>
                                                    {achievement.tag && (
                                                        <View style={styles.achievementTag}>
                                                            <Text style={styles.achievementTagText}>{achievement.tag}</Text>
                                                        </View>
                                                    )}
                                                    <View style={styles.achievementDateContainer}>
                                                        <Ionicons name="calendar-outline" size={12} color="#6b7280" />
                                                        <Text style={styles.achievementDate}>{achievement.date}</Text>
                                                    </View>
                                                </View>
                                            </View>
                                        </View>
                                    </StyledCard>
                                ))}
                            </View>
                        )}
                    </View>
                )}

                {activeTab === 'activities' && (
                    <View style={styles.tabContent}>
                        {/* Sports Events Section */}
                        <View style={styles.activitiesSection}>
                            <View style={styles.activitiesSectionHeader}>
                                <Ionicons name="trophy" size={20} color="#374151" />
                                <Text style={styles.activitiesSectionTitle}>Sports Events</Text>
                            </View>
                            <StyledCard style={styles.emptyCard}>
                                <Text style={styles.emptyText}>Not assigned to any sports events</Text>
                            </StyledCard>
                        </View>

                        {/* Field Trips Section */}
                        <View style={styles.activitiesSection}>
                            <View style={styles.activitiesSectionHeader}>
                                <Ionicons name="person" size={20} color="#374151" />
                                <Text style={styles.activitiesSectionTitle}>Field Trips</Text>
                            </View>
                            <StyledCard style={styles.emptyCard}>
                                <Text style={styles.emptyText}>Not assigned to any field trips</Text>
                            </StyledCard>
                        </View>
                    </View>
                )}

                {activeTab === 'sports-academy' && (
                    <View style={styles.tabContent}>
                        {/* Sports Academy Enrollments Count */}
                        <View style={styles.achievementsHeader}>
                            <Text style={styles.achievementsCountText}>
                                0 total enrollments
                            </Text>
                        </View>

                        {/* Empty State */}
                        <StyledCard style={styles.emptyCard}>
                            <Text style={styles.emptyText}>No sports academy enrollments recorded</Text>
                        </StyledCard>
                    </View>
                )}

                {activeTab === 'incidents' && (
                    <View style={styles.tabContent}>
                        {/* Incident Reports Count */}
                        <View style={styles.achievementsHeader}>
                            <Text style={styles.achievementsCountText}>
                                0 total incident reports
                            </Text>
                        </View>

                        {/* Empty State */}
                        <StyledCard style={styles.emptyCard}>
                            <Text style={styles.emptyText}>No incident reports recorded</Text>
                        </StyledCard>
                    </View>
                )}

                {activeTab === 'appointments' && (
                    <View style={styles.tabContent}>
                        <StyledCard style={styles.emptyCard}>
                            <Text style={styles.emptyText}>Appointments coming soon</Text>
                        </StyledCard>
                    </View>
                )}
            </ScrollView>

            {/* Edit Profile Modal */}
            <Modal
                visible={showEditProfileModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowEditProfileModal(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setShowEditProfileModal(false)}
                >
                    <Pressable
                        style={styles.addChildModal}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <ScrollView
                            style={styles.addChildModalScroll}
                            showsVerticalScrollIndicator={true}
                            nestedScrollEnabled={true}
                        >
                            {/* Modal Header */}
                            <View style={styles.addChildModalHeader}>
                                <Text style={styles.addChildModalTitle}>Edit Child</Text>
                                <TouchableOpacity onPress={() => setShowEditProfileModal(false)}>
                                    <Ionicons name="close" size={24} color={theme.colors.text} />
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.requiredFieldsNote}>
                                Fields marked with <Text style={styles.requiredStar}>*</Text> are required
                            </Text>

                            {/* Form Fields */}
                            <View style={styles.addChildForm}>
                                {/* Row 1: Name and Age */}
                                <View style={styles.formRow}>
                                    <View style={styles.formFieldHalf}>
                                        <Text style={styles.formLabel}>
                                            Name <Text style={styles.requiredStar}>*</Text>
                                        </Text>
                                        <TextInput
                                            style={styles.formInput}
                                            placeholder="First and Last Name"
                                            placeholderTextColor={theme.colors.textSecondary}
                                            value={editProfileFormData.name}
                                            onChangeText={(text) => setEditProfileFormData({ ...editProfileFormData, name: text })}
                                        />
                                    </View>
                                    <View style={styles.formFieldHalf}>
                                        <Text style={styles.formLabel}>Age</Text>
                                        <TextInput
                                            style={styles.formInput}
                                            placeholder="Age"
                                            placeholderTextColor={theme.colors.textSecondary}
                                            value={editProfileFormData.age}
                                            onChangeText={(text) => setEditProfileFormData({ ...editProfileFormData, age: text })}
                                            keyboardType="numeric"
                                        />
                                    </View>
                                </View>

                                {/* Row 2: Date of Birth and Person ID */}
                                <View style={styles.formRow}>
                                    <View style={styles.formFieldHalf}>
                                        <Text style={styles.formLabel}>Date of Birth</Text>
                                        <TouchableOpacity
                                            style={styles.dateInputContainer}
                                            onPress={() => {
                                                if (editProfileFormData.dateOfBirth) {
                                                    const dateParts = editProfileFormData.dateOfBirth.split('/');
                                                    if (dateParts.length === 3) {
                                                        const month = parseInt(dateParts[0]) - 1;
                                                        const day = parseInt(dateParts[1]);
                                                        const year = parseInt(dateParts[2]);
                                                        setSelectedDate(new Date(year, month, day));
                                                    }
                                                }
                                                setIsDatePickerVisible(true);
                                            }}
                                        >
                                            <TextInput
                                                style={styles.dateInput}
                                                value={editProfileFormData.dateOfBirth}
                                                placeholder="MM/DD/YYYY"
                                                placeholderTextColor={theme.colors.textSecondary}
                                                editable={false}
                                            />
                                            <Ionicons name="calendar-outline" size={20} color={theme.colors.textSecondary} />
                                        </TouchableOpacity>
                                    </View>
                                    <View style={styles.formFieldHalf}>
                                        <Text style={styles.formLabel}>
                                            Person ID <Text style={styles.requiredStar}>*</Text>
                                        </Text>
                                        <TextInput
                                            style={styles.formInput}
                                            placeholder="e.g., TLW001"
                                            placeholderTextColor={theme.colors.textSecondary}
                                            value={editProfileFormData.person_id}
                                            onChangeText={(text) => setEditProfileFormData({ ...editProfileFormData, person_id: text })}
                                        />
                                        <Text style={styles.formDescription}>Unique identifier for this camper</Text>
                                    </View>
                                </View>

                                {/* Row 3: Gender and Division */}
                                <View style={styles.formRow}>
                                    <View style={styles.formFieldHalf}>
                                        <Text style={styles.formLabel}>Gender</Text>
                                        <TouchableOpacity
                                            ref={genderButtonRef}
                                            style={styles.formSelect}
                                            onLayout={(event) => {
                                                if (genderButtonRef.current) {
                                                    (genderButtonRef.current as any).measureInWindow((fx: number, fy: number, fwidth: number, fheight: number) => {
                                                        setGenderButtonLayout({ x: fx, y: fy, width: fwidth, height: fheight });
                                                    });
                                                }
                                            }}
                                            onPress={() => {
                                                if (genderButtonRef.current) {
                                                    (genderButtonRef.current as any).measureInWindow((fx: number, fy: number, fwidth: number, fheight: number) => {
                                                        setGenderButtonLayout({ x: fx, y: fy, width: fwidth, height: fheight });
                                                        setShowGenderDropdown(true);
                                                    });
                                                }
                                            }}
                                        >
                                            <Text style={[styles.formSelectText, !editProfileFormData.gender && styles.formSelectPlaceholder]}>
                                                {editProfileFormData.gender || 'Select gender'}
                                            </Text>
                                            <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
                                        </TouchableOpacity>
                                    </View>
                                    <View style={styles.formFieldHalf}>
                                        <Text style={styles.formLabel}>Division</Text>
                                        <TouchableOpacity
                                            ref={divisionButtonRef}
                                            style={styles.formSelect}
                                            onLayout={(event) => {
                                                if (divisionButtonRef.current) {
                                                    (divisionButtonRef.current as any).measureInWindow((fx: number, fy: number, fwidth: number, fheight: number) => {
                                                        setDivisionButtonLayout({ x: fx, y: fy, width: fwidth, height: fheight });
                                                    });
                                                }
                                            }}
                                            onPress={() => {
                                                if (divisionButtonRef.current) {
                                                    (divisionButtonRef.current as any).measureInWindow((fx: number, fy: number, fwidth: number, fheight: number) => {
                                                        setDivisionButtonLayout({ x: fx, y: fy, width: fwidth, height: fheight });
                                                        setShowDivisionDropdown(true);
                                                    });
                                                }
                                            }}
                                        >
                                            <Text style={[styles.formSelectText, !editProfileFormData.division && styles.formSelectPlaceholder]}>
                                                {editProfileFormData.division || 'Select division'}
                                            </Text>
                                            <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* Row 4: Bunk and Grade */}
                                <View style={styles.formRow}>
                                    <View style={styles.formFieldHalf}>
                                        <Text style={styles.formLabel}>Bunk</Text>
                                        <TouchableOpacity
                                            ref={bunkButtonRef}
                                            style={styles.formSelect}
                                            onLayout={(event) => {
                                                if (bunkButtonRef.current) {
                                                    (bunkButtonRef.current as any).measureInWindow((fx: number, fy: number, fwidth: number, fheight: number) => {
                                                        setBunkButtonLayout({ x: fx, y: fy, width: fwidth, height: fheight });
                                                    });
                                                }
                                            }}
                                            onPress={() => {
                                                if (bunkButtonRef.current) {
                                                    (bunkButtonRef.current as any).measureInWindow((fx: number, fy: number, fwidth: number, fheight: number) => {
                                                        setBunkButtonLayout({ x: fx, y: fy, width: fwidth, height: fheight });
                                                        setShowBunkDropdown(true);
                                                    });
                                                }
                                            }}
                                        >
                                            <Text style={[styles.formSelectText, !editProfileFormData.bunk && styles.formSelectPlaceholder]}>
                                                {editProfileFormData.bunk || 'Select bunk'}
                                            </Text>
                                            <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
                                        </TouchableOpacity>
                                    </View>
                                    <View style={styles.formFieldHalf}>
                                        <Text style={styles.formLabel}>Grade</Text>
                                        <TextInput
                                            style={styles.formInput}
                                            placeholder="Grade"
                                            placeholderTextColor={theme.colors.textSecondary}
                                            value={editProfileFormData.grade}
                                            onChangeText={(text) => setEditProfileFormData({ ...editProfileFormData, grade: text })}
                                        />
                                    </View>
                                </View>

                                {/* Row 5: Group and Season */}
                                <View style={styles.formRow}>
                                    <View style={styles.formFieldHalf}>
                                        <Text style={styles.formLabel}>Group</Text>
                                        <TextInput
                                            style={styles.formInput}
                                            placeholder="Group"
                                            placeholderTextColor={theme.colors.textSecondary}
                                            value={editProfileFormData.group}
                                            onChangeText={(text) => setEditProfileFormData({ ...editProfileFormData, group: text })}
                                        />
                                    </View>
                                    <View style={styles.formFieldHalf}>
                                        <Text style={styles.formLabel}>Season (Year)</Text>
                                        <TextInput
                                            style={styles.formInput}
                                            placeholder="e.g., 2026"
                                            placeholderTextColor={theme.colors.textSecondary}
                                            value={editProfileFormData.season}
                                            onChangeText={(text) => setEditProfileFormData({ ...editProfileFormData, season: text })}
                                            maxLength={4}
                                            keyboardType="numeric"
                                        />
                                    </View>
                                </View>

                                {/* Row 6: Assigned Leader (Full Width) */}
                                <View style={styles.formRow}>
                                    <View style={styles.formFieldFull}>
                                        <Text style={styles.formLabel}>Assigned Leader</Text>
                                        <TouchableOpacity
                                            ref={leaderButtonRef}
                                            style={styles.formSelect}
                                            onLayout={(event) => {
                                                if (leaderButtonRef.current) {
                                                    (leaderButtonRef.current as any).measureInWindow((fx: number, fy: number, fwidth: number, fheight: number) => {
                                                        setLeaderButtonLayout({ x: fx, y: fy, width: fwidth, height: fheight });
                                                    });
                                                }
                                            }}
                                            onPress={() => {
                                                if (leaderButtonRef.current) {
                                                    (leaderButtonRef.current as any).measureInWindow((fx: number, fy: number, fwidth: number, fheight: number) => {
                                                        setLeaderButtonLayout({ x: fx, y: fy, width: fwidth, height: fheight });
                                                        setShowLeaderDropdown(true);
                                                    });
                                                }
                                            }}
                                        >
                                            <Text style={[styles.formSelectText, !editProfileFormData.assignedLeader && styles.formSelectPlaceholder]}>
                                                {editProfileFormData.assignedLeader || 'Select a leader'}
                                            </Text>
                                            <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* Row 7: Guardian Email and Phone */}
                                <View style={styles.formRow}>
                                    <View style={styles.formFieldHalf}>
                                        <Text style={styles.formLabel}>Guardian Email</Text>
                                        <TextInput
                                            style={styles.formInput}
                                            placeholder="Guardian Email"
                                            placeholderTextColor={theme.colors.textSecondary}
                                            value={editProfileFormData.guardianEmail}
                                            onChangeText={(text) => setEditProfileFormData({ ...editProfileFormData, guardianEmail: text })}
                                            keyboardType="email-address"
                                        />
                                    </View>
                                    <View style={styles.formFieldHalf}>
                                        <Text style={styles.formLabel}>Guardian Phone</Text>
                                        <TextInput
                                            style={styles.formInput}
                                            placeholder="Guardian Phone"
                                            placeholderTextColor={theme.colors.textSecondary}
                                            value={editProfileFormData.guardianPhone}
                                            onChangeText={(text) => setEditProfileFormData({ ...editProfileFormData, guardianPhone: text })}
                                            keyboardType="phone-pad"
                                        />
                                    </View>
                                </View>

                                {/* Row 8: Emergency Contact (Full Width) */}
                                <View style={styles.formRow}>
                                    <View style={styles.formFieldFull}>
                                        <Text style={styles.formLabel}>Emergency Contact</Text>
                                        <TextInput
                                            style={styles.formInput}
                                            placeholder="Emergency Contact"
                                            placeholderTextColor={theme.colors.textSecondary}
                                            value={editProfileFormData.emergencyContact}
                                            onChangeText={(text) => setEditProfileFormData({ ...editProfileFormData, emergencyContact: text })}
                                        />
                                    </View>
                                </View>

                                {/* RFID Wristband Section */}
                                <View style={styles.formRow}>
                                    <View style={styles.formFieldFull}>
                                        <View style={styles.rfidSectionHeader}>
                                            <Ionicons name="radio" size={20} color={theme.colors.text} />
                                            <Text style={styles.rfidSectionTitle}>RFID Wristband</Text>
                                        </View>
                                        <TextInput
                                            style={styles.formInput}
                                            placeholder="Scan wristband or enter RFID..."
                                            placeholderTextColor={theme.colors.textSecondary}
                                            value={editProfileFormData.rfid}
                                            onChangeText={(text) => setEditProfileFormData({ ...editProfileFormData, rfid: text })}
                                        />
                                        <Text style={styles.formDescription}>
                                            Scan the camper's ISO 14443 Type A wristband for quick check-in across the portal
                                        </Text>
                                    </View>
                                </View>

                                {/* Row 9: Allergies (Full Width Textarea) */}
                                <View style={styles.formRow}>
                                    <View style={styles.formFieldFull}>
                                        <Text style={styles.formLabel}>Allergies</Text>
                                        <TextInput
                                            style={styles.formTextArea}
                                            placeholder="Allergies"
                                            placeholderTextColor={theme.colors.textSecondary}
                                            value={editProfileFormData.allergies}
                                            onChangeText={(text) => setEditProfileFormData({ ...editProfileFormData, allergies: text })}
                                            multiline
                                            numberOfLines={4}
                                            textAlignVertical="top"
                                        />
                                    </View>
                                </View>

                                {/* Row 10: Medical Notes (Full Width Textarea) */}
                                <View style={styles.formRow}>
                                    <View style={styles.formFieldFull}>
                                        <Text style={styles.formLabel}>Medical Notes</Text>
                                        <TextInput
                                            style={styles.formTextArea}
                                            placeholder="Medical Notes"
                                            placeholderTextColor={theme.colors.textSecondary}
                                            value={editProfileFormData.medicalNotes}
                                            onChangeText={(text) => setEditProfileFormData({ ...editProfileFormData, medicalNotes: text })}
                                            multiline
                                            numberOfLines={4}
                                            textAlignVertical="top"
                                        />
                                    </View>
                                </View>

                                {/* Form Buttons */}
                                <View style={styles.formButtons}>
                                    <TouchableOpacity
                                        style={styles.cancelButton}
                                        onPress={() => setShowEditProfileModal(false)}
                                    >
                                        <Text style={styles.cancelButtonText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.submitButton}
                                        onPress={() => {
                                            // TODO: Implement Edit Profile submission logic
                                            console.log('Edit Profile Form Data:', editProfileFormData);
                                            setShowEditProfileModal(false);
                                        }}
                                    >
                                        <Text style={styles.submitButtonText}>Save Changes</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Date Picker Modal */}
            <Modal
                visible={isDatePickerVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setIsDatePickerVisible(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setIsDatePickerVisible(false)}>
                    <Pressable style={styles.bottomSheet} onPress={(e) => e.stopPropagation()}>
                        {/* Header */}
                        <View style={styles.datePickerHeader}>
                            <Text style={styles.datePickerTitle}>Select Date</Text>
                            <TouchableOpacity onPress={() => setIsDatePickerVisible(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>

                        {/* Month Navigation */}
                        <View style={styles.datePickerMonthNav}>
                            <TouchableOpacity onPress={() => setSelectedDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}>
                                <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                            <Text style={styles.datePickerMonthText}>
                                {selectedDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                            </Text>
                            <TouchableOpacity onPress={() => setSelectedDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}>
                                <Ionicons name="chevron-forward" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>

                        {/* Weekday Headers */}
                        <View style={styles.datePickerWeekdays}>
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                <Text key={day} style={styles.datePickerWeekdayText}>{day}</Text>
                            ))}
                        </View>

                        {/* Day Grid */}
                        <ScrollView style={styles.datePickerDaysContainer} showsVerticalScrollIndicator={true}>
                            <View style={styles.datePickerDaysGrid}>
                                {Array.from({ length: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).getDay() }).map((_, i) => (
                                    <View key={`empty-${i}`} style={styles.datePickerDayEmpty} />
                                ))}
                                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                                    const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
                                    const isSelected = selectedDate.getDate() === day;
                                    const isValid = day <= daysInMonth;
                                    return (
                                        <TouchableOpacity
                                            key={day}
                                            style={[
                                                styles.datePickerDay,
                                                isSelected && styles.datePickerDaySelected,
                                                !isValid && styles.datePickerDayDisabled
                                            ]}
                                            onPress={() => {
                                                if (isValid) {
                                                    const newDate = new Date(selectedDate);
                                                    newDate.setDate(day);
                                                    setSelectedDate(newDate);
                                                    setEditProfileFormData({
                                                        ...editProfileFormData,
                                                        dateOfBirth: newDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
                                                    });
                                                    setIsDatePickerVisible(false);
                                                }
                                            }}
                                            disabled={!isValid}
                                        >
                                            <Text style={[
                                                styles.datePickerDayText,
                                                isSelected && styles.datePickerDayTextSelected,
                                                !isValid && styles.datePickerDayTextDisabled
                                            ]}>
                                                {day}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Gender Dropdown Modal */}
            <Modal
                visible={showGenderDropdown}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowGenderDropdown(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setShowGenderDropdown(false)}
                >
                    <Pressable
                        style={styles.bottomSheet}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <View style={styles.bottomSheetHeader}>
                            <Text style={styles.bottomSheetTitle}>Select Gender</Text>
                            <TouchableOpacity onPress={() => setShowGenderDropdown(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.dropdownScroll} nestedScrollEnabled={true}>
                            {['Male', 'Female'].map((gender) => (
                                <Pressable
                                    key={gender}
                                    style={[
                                        styles.dropdownItem,
                                        editProfileFormData.gender === gender && styles.genderDropdownItemSelected
                                    ]}
                                    onPress={() => {
                                        setEditProfileFormData({ ...editProfileFormData, gender });
                                        setShowGenderDropdown(false);
                                    }}
                                >
                                    <Text style={[
                                        styles.dropdownItemText,
                                        editProfileFormData.gender === gender && styles.genderDropdownItemTextSelected
                                    ]}>
                                        {gender}
                                    </Text>
                                    {editProfileFormData.gender === gender && (
                                        <Ionicons name="checkmark" size={20} color={theme.colors.surface} />
                                    )}
                                </Pressable>
                            ))}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Division Dropdown Modal */}
            <Modal
                visible={showDivisionDropdown}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowDivisionDropdown(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setShowDivisionDropdown(false)}
                >
                    <Pressable
                        style={styles.bottomSheet}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <View style={styles.bottomSheetHeader}>
                            <Text style={styles.bottomSheetTitle}>Select Division</Text>
                            <TouchableOpacity onPress={() => setShowDivisionDropdown(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.dropdownScroll} nestedScrollEnabled={true}>
                            {DIVISIONS.map((division) => (
                                <Pressable
                                    key={division}
                                    style={[
                                        styles.dropdownItem,
                                        editProfileFormData.division === division && styles.genderDropdownItemSelected
                                    ]}
                                    onPress={() => {
                                        setEditProfileFormData({ ...editProfileFormData, division });
                                        setShowDivisionDropdown(false);
                                    }}
                                >
                                    <Text style={[
                                        styles.dropdownItemText,
                                        editProfileFormData.division === division && styles.genderDropdownItemTextSelected
                                    ]}>
                                        {division}
                                    </Text>
                                    {editProfileFormData.division === division && (
                                        <Ionicons name="checkmark" size={20} color={theme.colors.surface} />
                                    )}
                                </Pressable>
                            ))}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Bunk Dropdown Modal */}
            <Modal
                visible={showBunkDropdown}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowBunkDropdown(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setShowBunkDropdown(false)}
                >
                    <Pressable
                        style={styles.bottomSheet}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <View style={styles.bottomSheetHeader}>
                            <Text style={styles.bottomSheetTitle}>Select Bunk</Text>
                            <TouchableOpacity onPress={() => setShowBunkDropdown(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.dropdownScroll} nestedScrollEnabled={true}>
                            <Pressable
                                style={[
                                    styles.dropdownItem,
                                    (!editProfileFormData.bunk || editProfileFormData.bunk === 'No Bunk Assigned') && styles.genderDropdownItemSelected
                                ]}
                                onPress={() => {
                                    setEditProfileFormData({ ...editProfileFormData, bunk: 'No Bunk Assigned' });
                                    setShowBunkDropdown(false);
                                }}
                            >
                                <Text style={[
                                    styles.dropdownItemText,
                                    (!editProfileFormData.bunk || editProfileFormData.bunk === 'No Bunk Assigned') && styles.genderDropdownItemTextSelected
                                ]}>
                                    No Bunk Assigned
                                </Text>
                                {(!editProfileFormData.bunk || editProfileFormData.bunk === 'No Bunk Assigned') && (
                                    <Ionicons name="checkmark" size={20} color={theme.colors.surface} />
                                )}
                            </Pressable>
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Assigned Leader Dropdown Modal */}
            < Modal
                visible={showLeaderDropdown}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowLeaderDropdown(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setShowLeaderDropdown(false)}
                >
                    <Pressable
                        style={styles.bottomSheet}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <View style={styles.bottomSheetHeader}>
                            <Text style={styles.bottomSheetTitle}>Select Assigned Leader</Text>
                            <TouchableOpacity onPress={() => setShowLeaderDropdown(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.dropdownScroll} nestedScrollEnabled={true}>
                            {leaders.map((leader: any) => {
                                const leaderDisplay = `${leader.name} - ${leader.role}`;
                                const isSelected = editProfileFormData.assignedLeader === leaderDisplay;
                                return (
                                    <Pressable
                                        key={leader.name}
                                        style={[
                                            styles.dropdownItem,
                                            isSelected && styles.genderDropdownItemSelected
                                        ]}
                                        onPress={() => {
                                            setEditProfileFormData({ ...editProfileFormData, assignedLeader: leaderDisplay });
                                            setShowLeaderDropdown(false);
                                        }}
                                    >
                                        <View style={styles.leaderItemContent}>
                                            <Text style={[
                                                styles.dropdownItemText,
                                                isSelected && styles.genderDropdownItemTextSelected
                                            ]}>
                                                {leader.name}
                                            </Text>
                                            <Text style={[
                                                styles.leaderRoleText,
                                                isSelected && styles.leaderRoleTextSelected
                                            ]}>
                                                {leader.role}
                                            </Text>
                                        </View>
                                        {isSelected && (
                                            <Ionicons name="checkmark" size={20} color={theme.colors.surface} />
                                        )}
                                    </Pressable>
                                );
                            })}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Birthday Party Preferences Modal */}
            {/* Birthday Party Preferences Modal */}
            <Modal
                visible={showBirthdayPartyModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowBirthdayPartyModal(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setShowBirthdayPartyModal(false)}
                >
                    <Pressable
                        style={styles.addChildModal}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <ScrollView
                            style={styles.addChildModalScroll}
                            showsVerticalScrollIndicator={true}
                            nestedScrollEnabled={true}
                        >
                            {/* Modal Header */}
                            <View style={styles.addChildModalHeader}>
                                <Text style={styles.addChildModalTitle}>Birthday Party Preferences</Text>
                                <TouchableOpacity onPress={() => setShowBirthdayPartyModal(false)}>
                                    <Ionicons name="close" size={24} color={theme.colors.text} />
                                </TouchableOpacity>
                            </View>

                            {/* Form Fields */}
                            <View style={styles.addChildForm}>
                                {/* Birthday Celebration Choice */}
                                <View style={styles.formRow}>
                                    <View style={styles.formFieldFull}>
                                        <Text style={styles.formLabel}>Birthday Celebration Choice</Text>
                                        <View style={styles.radioGroup}>
                                            {[
                                                { value: '', label: 'None' },
                                                { value: 'pizza_soda', label: 'Pizza & Soda Party at Rec Hall' },
                                                { value: 'ice_cream', label: 'Ice Cream Party in the Canteen' },
                                                { value: 'cookies_movie', label: 'Reggies Cookies and Bunk Movie' },
                                                { value: 'campfire_smores', label: 'Campfire and S\'mores' },
                                            ].map((option) => (
                                                <TouchableOpacity
                                                    key={option.value}
                                                    style={styles.radioOption}
                                                    onPress={() => setBirthdayPartyFormData({ ...birthdayPartyFormData, birthdayPartyType: option.value })}
                                                >
                                                    <View style={styles.radioButton}>
                                                        {birthdayPartyFormData.birthdayPartyType === option.value && (
                                                            <View style={styles.radioButtonInner} />
                                                        )}
                                                    </View>
                                                    <Text style={styles.radioLabel}>{option.label}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>
                                </View>

                                {/* Additional Comments */}
                                <View style={styles.formRow}>
                                    <View style={styles.formFieldFull}>
                                        <Text style={styles.formLabel}>Additional Comments</Text>
                                        <TextInput
                                            style={styles.formTextArea}
                                            placeholder="Any special requests (e.g., campfire location, timing, number of people in bunk)"
                                            placeholderTextColor={theme.colors.textSecondary}
                                            value={birthdayPartyFormData.birthdayPartyComments}
                                            onChangeText={(text) => setBirthdayPartyFormData({ ...birthdayPartyFormData, birthdayPartyComments: text })}
                                            multiline
                                            numberOfLines={3}
                                            textAlignVertical="top"
                                        />
                                    </View>
                                </View>

                                {/* When do you want the cake served? */}
                                <View style={styles.formRow}>
                                    <View style={styles.formFieldFull}>
                                        <Text style={styles.formLabel}>When do you want the cake served?</Text>
                                        <View style={styles.radioGroup}>
                                            {[
                                                { value: '', label: 'None' },
                                                { value: 'lunch', label: 'Lunch' },
                                                { value: 'dinner', label: 'Dinner' },
                                            ].map((option) => (
                                                <TouchableOpacity
                                                    key={option.value}
                                                    style={styles.radioOption}
                                                    onPress={() => setBirthdayPartyFormData({ ...birthdayPartyFormData, birthdayCakeMeal: option.value })}
                                                >
                                                    <View style={styles.radioButton}>
                                                        {birthdayPartyFormData.birthdayCakeMeal === option.value && (
                                                            <View style={styles.radioButtonInner} />
                                                        )}
                                                    </View>
                                                    <Text style={styles.radioLabel}>{option.label}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>
                                </View>

                                {/* Cake Customization Section */}
                                <View style={styles.formRow}>
                                    <View style={styles.formFieldFull}>
                                        <View style={styles.sectionDivider} />
                                        <Text style={styles.sectionTitle}>Cake Customization</Text>

                                        {/* Cake Type */}
                                        <Text style={[styles.formLabel, { marginTop: theme.spacing.md }]}>Cake Type (select one)</Text>
                                        <View style={styles.radioGroup}>
                                            {[
                                                { value: 'rice_krispy', label: 'Rice Krispy Sheet Cake' },
                                                { value: 'vanilla', label: 'Vanilla Frosted Cake' },
                                                { value: 'chocolate', label: 'Chocolate Frosted Cake' },
                                            ].map((option) => (
                                                <TouchableOpacity
                                                    key={option.value}
                                                    style={styles.radioOption}
                                                    onPress={() => setBirthdayPartyFormData({ ...birthdayPartyFormData, birthdayCakeType: option.value })}
                                                >
                                                    <View style={styles.radioButton}>
                                                        {birthdayPartyFormData.birthdayCakeType === option.value && (
                                                            <View style={styles.radioButtonInner} />
                                                        )}
                                                    </View>
                                                    <Text style={styles.radioLabel}>{option.label}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>

                                        {/* Frosting Color */}
                                        <Text style={[styles.formLabel, { marginTop: theme.spacing.md }]}>Frosting Color (select all that apply)</Text>
                                        <View style={styles.checkboxGrid}>
                                            {['Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Purple', 'Pink', 'No Color'].map((color) => {
                                                const value = color.toLowerCase().replace(' ', '_');
                                                const isChecked = birthdayPartyFormData.birthdayFrostingColors.includes(value);
                                                return (
                                                    <TouchableOpacity
                                                        key={color}
                                                        style={styles.checkboxOption}
                                                        onPress={() => {
                                                            if (isChecked) {
                                                                setBirthdayPartyFormData({
                                                                    ...birthdayPartyFormData,
                                                                    birthdayFrostingColors: birthdayPartyFormData.birthdayFrostingColors.filter(c => c !== value)
                                                                });
                                                            } else {
                                                                setBirthdayPartyFormData({
                                                                    ...birthdayPartyFormData,
                                                                    birthdayFrostingColors: [...birthdayPartyFormData.birthdayFrostingColors, value]
                                                                });
                                                            }
                                                        }}
                                                    >
                                                        <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                                                            {isChecked && <Ionicons name="checkmark" size={16} color={theme.colors.surface} />}
                                                        </View>
                                                        <Text style={styles.checkboxLabel}>{color}</Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>

                                        {/* Toppings */}
                                        <Text style={[styles.formLabel, { marginTop: theme.spacing.md }]}>Toppings (select all that apply)</Text>
                                        <View style={styles.checkboxGrid}>
                                            {['Rainbow Sprinkles', 'Chocolate Sprinkles', 'Crushed Oreos', 'Sour Patch', 'Marshmallows', 'Graham Crackers', 'Pretzels', 'M&M\'s', 'Strawberries', 'Blueberries', 'Cookies', 'Cherries', 'Chocolate Syrup', 'Caramel Syrup', 'No Toppings'].map((topping) => {
                                                const value = topping.toLowerCase().replace(/[^a-z0-9]/g, '_');
                                                const isChecked = birthdayPartyFormData.birthdayToppings.includes(value);
                                                return (
                                                    <TouchableOpacity
                                                        key={topping}
                                                        style={styles.checkboxOption}
                                                        onPress={() => {
                                                            if (isChecked) {
                                                                setBirthdayPartyFormData({
                                                                    ...birthdayPartyFormData,
                                                                    birthdayToppings: birthdayPartyFormData.birthdayToppings.filter(t => t !== value)
                                                                });
                                                            } else {
                                                                setBirthdayPartyFormData({
                                                                    ...birthdayPartyFormData,
                                                                    birthdayToppings: [...birthdayPartyFormData.birthdayToppings, value]
                                                                });
                                                            }
                                                        }}
                                                    >
                                                        <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                                                            {isChecked && <Ionicons name="checkmark" size={16} color={theme.colors.surface} />}
                                                        </View>
                                                        <Text style={styles.checkboxLabel}>{topping}</Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>

                                        {/* Any Allergies? */}
                                        <Text style={[styles.formLabel, { marginTop: theme.spacing.md }]}>Any Allergies? (select all that apply)</Text>
                                        <View style={styles.checkboxGrid}>
                                            {['Gluten', 'Dairy', 'Sesame', 'Egg', 'Soy', 'Vegan'].map((allergy) => {
                                                const value = allergy.toLowerCase();
                                                const isChecked = birthdayPartyFormData.birthdayCakeAllergies.includes(value);
                                                return (
                                                    <TouchableOpacity
                                                        key={allergy}
                                                        style={styles.checkboxOption}
                                                        onPress={() => {
                                                            if (isChecked) {
                                                                setBirthdayPartyFormData({
                                                                    ...birthdayPartyFormData,
                                                                    birthdayCakeAllergies: birthdayPartyFormData.birthdayCakeAllergies.filter(a => a !== value)
                                                                });
                                                            } else {
                                                                setBirthdayPartyFormData({
                                                                    ...birthdayPartyFormData,
                                                                    birthdayCakeAllergies: [...birthdayPartyFormData.birthdayCakeAllergies, value]
                                                                });
                                                            }
                                                        }}
                                                    >
                                                        <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                                                            {isChecked && <Ionicons name="checkmark" size={16} color={theme.colors.surface} />}
                                                        </View>
                                                        <Text style={styles.checkboxLabel}>{allergy}</Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>

                                        {/* What do you want written on the cake? */}
                                        <Text style={[styles.formLabel, { marginTop: theme.spacing.md }]}>What do you want written on the cake?</Text>
                                        <TextInput
                                            style={styles.formTextArea}
                                            placeholder="Enter custom message for the cake"
                                            placeholderTextColor={theme.colors.textSecondary}
                                            value={birthdayPartyFormData.birthdayCakeMessage}
                                            onChangeText={(text) => setBirthdayPartyFormData({ ...birthdayPartyFormData, birthdayCakeMessage: text })}
                                            multiline
                                            numberOfLines={3}
                                            textAlignVertical="top"
                                        />
                                    </View>
                                </View>

                                {/* Form Buttons */}
                                <View style={styles.formButtons}>
                                    <TouchableOpacity
                                        style={styles.cancelButton}
                                        onPress={() => setShowBirthdayPartyModal(false)}
                                    >
                                        <Text style={styles.cancelButtonText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.submitButton}
                                        onPress={() => {
                                            // TODO: Implement Birthday Party Preferences submission logic
                                            console.log('Birthday Party Form Data:', birthdayPartyFormData);
                                            setShowBirthdayPartyModal(false);
                                        }}
                                    >
                                        <Text style={styles.submitButtonText}>Save Changes</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.lg,
        backgroundColor: '#f8fafc',
        borderBottomWidth: 0,
        gap: 16, // gap-4 = 16px to match web
    },
    headerContent: {
        flex: 1,
        marginLeft: 0,
    },
    headerTitleContainer: {
        marginBottom: theme.spacing.md,
    },
    headerTitle: {
        fontSize: 30,
        fontWeight: '700',
        color: '#374151',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 16,
        color: '#6b7280',
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        flexWrap: 'wrap',
    },
    editButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        backgroundColor: '#2563eb',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
    },
    editButtonText: {
        fontSize: 14,
        color: theme.colors.surface,
        fontWeight: '600',
    },
    activeBadge: {
        backgroundColor: '#a7f3d0',
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.sm,
        borderWidth: 0,
    },
    activeBadgeText: {
        fontSize: 12,
        color: '#065f46',
        fontWeight: '600',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: theme.spacing.lg,
        paddingTop: 0,
    },
    tabsContainer: {
        marginBottom: theme.spacing.lg,
    },
    tabsContent: {
        paddingRight: theme.spacing.md,
        paddingLeft: theme.spacing.xs,
    },
    tab: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        marginRight: theme.spacing.sm,
        borderBottomWidth: 0,
        borderBottomColor: 'transparent',
        backgroundColor: 'transparent',
        borderRadius: theme.borderRadius.sm,
    },
    tabActive: {
        backgroundColor: '#e5e7eb', // Light gray background for active tab on mobile
        borderBottomColor: 'transparent',
        borderRadius: theme.borderRadius.sm,
    },
    tabText: {
        fontSize: 14,
        color: '#6b7280',
        fontWeight: '500',
    },
    tabTextActive: {
        color: '#374151', // Dark gray text on light gray background
        fontWeight: '600',
    },
    tabContent: {
        marginTop: 0,
    },
    cardsRow: {
        flexDirection: 'column', // Always stack vertically on mobile
        gap: 24, // gap-6 = 24px to match web
    },
    infoCard: {
        flex: 1,
        marginBottom: 0,
    },
    cardHeader: {
        marginBottom: theme.spacing.md,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 4,
    },
    cardDescription: {
        fontSize: 14,
        color: '#6b7280',
        lineHeight: 20,
    },
    cardContent: {
        gap: 0,
    },
    infoGrid: {
        flexDirection: 'row',
        gap: 16, // gap-4 = 16px to match web
        flexWrap: 'wrap',
    },
    infoGridItem: {
        flex: 1,
        minWidth: '45%',
        marginBottom: 0,
    },
    infoRow: {
        marginBottom: 0,
    },
    infoLabel: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 8,
    },
    infoValue: {
        fontSize: 16,
        color: '#374151',
        fontWeight: '500',
    },
    infoValueBox: {
        backgroundColor: '#f9fafb',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        minHeight: 44,
        justifyContent: 'center',
        marginTop: 0,
    },
    infoValueText: {
        fontSize: 16,
        color: '#374151',
        fontWeight: '500',
    },
    emptyCard: {
        padding: theme.spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 200,
    },
    emptyText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
    subTabsContainer: {
        marginBottom: theme.spacing.lg,
    },
    subTabsScroll: {
        marginBottom: 0,
    },
    subTabsContent: {
        paddingRight: theme.spacing.md,
        paddingLeft: theme.spacing.xs,
    },
    subTab: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        marginRight: theme.spacing.sm,
        borderBottomWidth: 0,
        borderBottomColor: 'transparent',
        backgroundColor: 'transparent',
        borderRadius: theme.borderRadius.sm,
    },
    subTabActive: {
        backgroundColor: '#e5e7eb',
        borderBottomColor: 'transparent',
        borderRadius: theme.borderRadius.sm,
    },
    subTabText: {
        fontSize: 14,
        color: '#6b7280',
        fontWeight: '500',
    },
    subTabTextActive: {
        color: '#374151',
        fontWeight: '600',
    },
    birthdayInfoContainer: {
        gap: 16,
    },
    birthdayDateBox: {
        backgroundColor: '#eff6ff',
        borderRadius: 8,
        padding: 16,
        borderWidth: 1,
        borderColor: '#bfdbfe',
    },
    birthdayDateContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    birthdayDateText: {
        flex: 1,
    },
    birthdayDateLabel: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 4,
    },
    birthdayDateValue: {
        fontSize: 24,
        fontWeight: '700',
        color: '#2563eb',
    },
    ageBox: {
        backgroundColor: '#f9fafb',
        borderRadius: 8,
        padding: 16,
    },
    ageLabel: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 4,
    },
    ageValue: {
        fontSize: 20,
        fontWeight: '600',
        color: '#374151',
    },
    emptyBirthdayState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 48,
    },
    emptyBirthdayText: {
        fontSize: 14,
        color: '#6b7280',
        marginTop: 12,
        textAlign: 'center',
    },
    emptyBirthdaySubtext: {
        fontSize: 12,
        color: '#9ca3af',
        marginTop: 4,
        textAlign: 'center',
    },
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        width: '100%',
    },
    cardHeaderLeft: {
        flex: 1,
    },
    editButtonSmall: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#2563eb',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: theme.borderRadius.md,
    },
    editButtonSmallText: {
        fontSize: 12,
        color: theme.colors.surface,
        fontWeight: '600',
    },
    emptyPartyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 48,
    },
    emptyPartyText: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 4,
        textAlign: 'center',
    },
    emptyPartySubtext: {
        fontSize: 12,
        color: '#9ca3af',
        textAlign: 'center',
    },
    allergyInputContainer: {
        marginBottom: 16,
    },
    allergyTextArea: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 8,
        padding: 16,
        fontSize: 14,
        color: '#374151',
        minHeight: 200,
        textAlignVertical: 'top',
    },
    saveButton: {
        backgroundColor: '#2563eb',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveButtonText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
    },
    achievementsHeader: {
        marginBottom: 16,
    },
    achievementsCountText: {
        fontSize: 14,
        color: '#6b7280',
    },
    achievementsList: {
        gap: 16,
    },
    achievementCard: {
        marginBottom: 0,
    },
    achievementContent: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 16,
    },
    achievementIconContainer: {
        backgroundColor: '#eff6ff',
        borderRadius: 12,
        padding: 12,
        width: 48,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    achievementDetails: {
        flex: 1,
    },
    achievementTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 4,
    },
    achievementType: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 8,
    },
    achievementFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
    },
    achievementTag: {
        backgroundColor: '#dbeafe',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    achievementTagText: {
        fontSize: 12,
        color: '#2563eb',
        fontWeight: '500',
    },
    achievementDateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    achievementDate: {
        fontSize: 12,
        color: '#6b7280',
    },
    activitiesSection: {
        marginBottom: 24,
    },
    activitiesSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    activitiesSectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#374151',
    },
    // Edit Profile Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        justifyContent: 'flex-end',
    },
    addChildModal: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        width: '100%',
        maxHeight: '92%',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
    },
    addChildModalScroll: {
        maxHeight: '90%',
    },
    addChildModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: isSmallScreen ? theme.spacing.md : theme.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    addChildModalTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: theme.colors.text,
    },
    requiredFieldsNote: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        paddingHorizontal: isSmallScreen ? theme.spacing.md : theme.spacing.lg,
        paddingTop: theme.spacing.md,
        paddingBottom: theme.spacing.sm,
    },
    requiredStar: {
        color: '#ef4444',
    },
    addChildForm: {
        padding: isSmallScreen ? theme.spacing.md : theme.spacing.lg,
        gap: theme.spacing.md,
    },
    formRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.md,
        marginBottom: theme.spacing.md,
    },
    formFieldHalf: {
        flex: 1,
        minWidth: isSmallScreen ? '100%' : '45%',
    },
    formFieldFull: {
        width: '100%',
    },
    formLabel: {
        fontSize: isSmallScreen ? 13 : 14,
        fontWeight: '500',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    formInput: {
        backgroundColor: theme.colors.background,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        fontSize: isSmallScreen ? 13 : 14,
        color: theme.colors.text,
        minHeight: 40,
    },
    formSelect: {
        backgroundColor: theme.colors.background,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        minHeight: 40,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    formSelectText: {
        fontSize: isSmallScreen ? 13 : 14,
        color: theme.colors.text,
    },
    formSelectPlaceholder: {
        color: theme.colors.textSecondary,
    },
    formDescription: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.xs,
    },
    formTextArea: {
        backgroundColor: theme.colors.background,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        fontSize: isSmallScreen ? 13 : 14,
        color: theme.colors.text,
        minHeight: 100,
    },
    formButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: isSmallScreen ? theme.spacing.sm : theme.spacing.md,
        marginTop: theme.spacing.lg,
        paddingTop: theme.spacing.md,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        flexWrap: 'wrap',
    },
    cancelButton: {
        paddingHorizontal: isSmallScreen ? theme.spacing.md : theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        backgroundColor: '#fb923c', // Orange color
        minWidth: isSmallScreen ? '45%' : 'auto',
    },
    cancelButtonText: {
        color: theme.colors.surface,
        fontSize: isSmallScreen ? 13 : 14,
        fontWeight: '600',
    },
    submitButton: {
        paddingHorizontal: isSmallScreen ? theme.spacing.md : theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.secondary,
        minWidth: isSmallScreen ? '45%' : 'auto',
    },
    submitButtonText: {
        color: theme.colors.surface,
        fontSize: isSmallScreen ? 13 : 14,
        fontWeight: '600',
    },
    datePickerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    datePickerContainer: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        width: '85%',
        maxWidth: 400,
        maxHeight: '80%',
        overflow: 'hidden',
    },
    datePickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    datePickerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.text,
    },
    datePickerMonthNav: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    datePickerMonthText: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
    },
    datePickerWeekdays: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    datePickerWeekdayText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        width: 40,
        textAlign: 'center',
    },
    datePickerDaysContainer: {
        maxHeight: 300,
    },
    datePickerDaysGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: theme.spacing.sm,
    },
    datePickerDayEmpty: {
        width: 40,
        height: 40,
        margin: 2,
    },
    datePickerDay: {
        width: 40,
        height: 40,
        margin: 2,
        borderRadius: theme.borderRadius.sm,
        backgroundColor: theme.colors.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    datePickerDaySelected: {
        backgroundColor: theme.colors.secondary,
    },
    datePickerDayDisabled: {
        opacity: 0.3,
    },
    datePickerDayText: {
        fontSize: 14,
        color: theme.colors.text,
    },
    datePickerDayTextSelected: {
        color: theme.colors.surface,
        fontWeight: '600',
    },
    datePickerDayTextDisabled: {
        color: theme.colors.textSecondary,
    },
    dateInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        minHeight: 40,
    },
    dateInput: {
        flex: 1,
        fontSize: isSmallScreen ? 13 : 14,
        color: theme.colors.text,
        paddingVertical: theme.spacing.sm,
    },
    rfidSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.xs,
    },
    rfidSectionTitle: {
        fontSize: isSmallScreen ? 13 : 14,
        fontWeight: '500',
        color: theme.colors.text,
    },
    dropdownModalContainer: {
        position: 'absolute',
        alignSelf: 'flex-start',
    },
    dropdownModal: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        maxHeight: 400,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    dropdownScroll: {
        maxHeight: 400,
    },
    dropdownItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    dropdownItemSelected: {
        backgroundColor: theme.colors.secondary + '20',
    },
    dropdownItemText: {
        fontSize: 14,
        color: theme.colors.text,
    },
    dropdownItemTextSelected: {
        color: theme.colors.secondary,
        fontWeight: '600',
    },
    genderDropdownItemSelected: {
        backgroundColor: '#fb923c', // Orange color
    },
    genderDropdownItemTextSelected: {
        color: theme.colors.surface,
        fontWeight: '600',
    },
    leaderItemContent: {
        flex: 1,
    },
    leaderRoleText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    leaderRoleTextSelected: {
        color: theme.colors.surface,
        opacity: 0.9,
    },
    // Birthday Party Preferences Modal Styles
    sectionDivider: {
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        marginTop: theme.spacing.md,
        paddingTop: theme.spacing.md,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: theme.spacing.md,
    },
    radioGroup: {
        gap: theme.spacing.sm,
        marginTop: theme.spacing.xs,
    },
    radioOption: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
    },
    radioButton: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: theme.colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioButtonInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: theme.colors.secondary,
    },
    radioLabel: {
        fontSize: isSmallScreen ? 13 : 14,
        color: theme.colors.text,
        flex: 1,
    },
    checkboxGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.sm,
        marginTop: theme.spacing.xs,
    },
    checkboxOption: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        width: '48%',
        paddingVertical: theme.spacing.xs,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxChecked: {
        backgroundColor: theme.colors.secondary,
        borderColor: theme.colors.secondary,
    },
    checkboxLabel: {
        fontSize: isSmallScreen ? 13 : 14,
        color: theme.colors.text,
        flex: 1,
    },
    bottomSheet: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        width: '100%',
        paddingBottom: theme.spacing.xl,
    },
    bottomSheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    bottomSheetTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.text,
    },
});

