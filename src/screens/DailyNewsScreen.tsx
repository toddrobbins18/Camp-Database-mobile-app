import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { StyledCard } from '../components/StyledCard';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 375;

export const DailyNewsScreen = ({ navigation }: any) => {
    const currentDate = new Date();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    const dayName = dayNames[currentDate.getDay()];
    const monthName = monthNames[currentDate.getMonth()];
    const day = currentDate.getDate();
    const year = currentDate.getFullYear();
    const formattedDate = `${dayName}, ${monthName} ${day}, ${year}`;

    const handlePrint = () => {
        // TODO: Implement print functionality
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuButton}>
                    <Ionicons name="menu" size={28} color={theme.colors.primary} />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>Tyler Hill Daily News</Text>
                </View>
                <TouchableOpacity
                    style={styles.printButton}
                    onPress={handlePrint}
                >
                    <Ionicons name="print-outline" size={20} color={theme.colors.text} style={styles.printIcon} />
                    {!isSmallScreen && <Text style={styles.printButtonText}>Print</Text>}
                </TouchableOpacity>
            </View>

            <ScrollView 
                style={styles.scrollView} 
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* News Content Card */}
                <StyledCard style={styles.newsCard}>
                    {/* Header Section */}
                    <View style={styles.newsHeader}>
                        <Text style={styles.newsTitle}>TYLER HILL DAILY NEWS</Text>
                        <Text style={styles.newsSubtitle}>HOME OF THE BEARS</Text>
                        <Text style={styles.newsDate}>{formattedDate}</Text>
                    </View>

                    {/* Birthday Wishes */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="gift-outline" size={20} color={theme.colors.text} style={styles.sectionIcon} />
                            <Text style={styles.sectionTitle}>Birthday Wishes</Text>
                        </View>
                        <Text style={styles.birthdayNames}>Olivia Goldberg, Brody Landauer, Nash Landauer</Text>
                    </View>

                    {/* Today's Schedule */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Today's Schedule</Text>
                        <Text style={styles.emptyMessage}>No events scheduled for today</Text>
                    </View>

                    {/* Today's Menu */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Today's Menu</Text>
                        <View style={styles.menuContainer}>
                            <View style={styles.menuItem}>
                                <Text style={styles.menuLabel}>Breakfast:</Text>
                                <Text style={styles.menuValue}>TBD</Text>
                            </View>
                            <View style={styles.menuItem}>
                                <Text style={styles.menuLabel}>Lunch:</Text>
                                <Text style={styles.menuValue}>TBD</Text>
                            </View>
                            <View style={styles.menuItem}>
                                <Text style={styles.menuLabel}>Snack:</Text>
                                <Text style={styles.menuValue}>TBD</Text>
                            </View>
                            <View style={styles.menuItem}>
                                <Text style={styles.menuLabel}>Dinner:</Text>
                                <Text style={styles.menuValue}>TBD</Text>
                            </View>
                        </View>
                    </View>
                </StyledCard>
            </ScrollView>
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
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.sm,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        minHeight: 60,
    },
    menuButton: {
        padding: theme.spacing.xs,
    },
    headerTitleContainer: {
        flex: 1,
        marginHorizontal: theme.spacing.md,
    },
    headerTitle: {
        ...theme.typography.h1,
        fontSize: isSmallScreen ? 18 : 24,
        fontWeight: '700',
        color: theme.colors.text,
    },
    printButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        minHeight: 44,
    },
    printIcon: {
        marginRight: isSmallScreen ? 0 : theme.spacing.xs,
    },
    printButtonText: {
        ...theme.typography.body,
        fontSize: isSmallScreen ? 12 : 14,
        color: theme.colors.text,
        fontWeight: '500',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: theme.spacing.md,
    },
    newsCard: {
        padding: theme.spacing.lg,
    },
    newsHeader: {
        alignItems: 'center',
        marginBottom: theme.spacing.xl,
        paddingBottom: theme.spacing.lg,
        borderBottomWidth: 2,
        borderBottomColor: theme.colors.border,
    },
    newsTitle: {
        ...theme.typography.h1,
        fontSize: isSmallScreen ? 20 : 24,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
        letterSpacing: 1,
        textAlign: 'center',
    },
    newsSubtitle: {
        ...theme.typography.body,
        fontSize: isSmallScreen ? 14 : 16,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.sm,
        fontStyle: 'italic',
        textAlign: 'center',
    },
    newsDate: {
        ...theme.typography.body,
        fontSize: isSmallScreen ? 12 : 14,
        color: theme.colors.text,
        fontWeight: '500',
        textAlign: 'center',
    },
    section: {
        marginBottom: theme.spacing.xl,
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
        ...theme.typography.h3,
        fontSize: isSmallScreen ? 16 : 18,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: theme.spacing.sm,
    },
    birthdayNames: {
        ...theme.typography.body,
        fontSize: isSmallScreen ? 14 : 16,
        color: theme.colors.text,
        lineHeight: isSmallScreen ? 20 : 24,
    },
    emptyMessage: {
        ...theme.typography.body,
        fontSize: isSmallScreen ? 14 : 16,
        color: theme.colors.textSecondary,
        fontStyle: 'italic',
    },
    menuContainer: {
        gap: theme.spacing.md,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing.xs,
    },
    menuLabel: {
        ...theme.typography.body,
        fontSize: isSmallScreen ? 14 : 16,
        fontWeight: '600',
        color: theme.colors.text,
        minWidth: 80,
    },
    menuValue: {
        ...theme.typography.body,
        fontSize: isSmallScreen ? 14 : 16,
        color: theme.colors.text,
        flex: 1,
    },
});

