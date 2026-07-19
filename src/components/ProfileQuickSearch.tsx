import React, { useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { theme } from '../theme/theme';
import { supabase } from '../lib/supabase';
import { useCompany } from '../contexts/CompanyContext';
import { useRosterDivisionFilter } from '../api/campers';
import { useDivisionsLookup } from '../api/permissions';
import { expandDivisionIdsForRosterFilter } from '../lib/divisionFilterUtils';

type ProfileQuickSearchProps = {
    type: 'child' | 'staff';
    currentId?: string;
    navigation: any;
};

type SearchResult = {
    id: string;
    name: string;
    subtitle?: string;
};

export function ProfileQuickSearch({ type, currentId, navigation }: ProfileQuickSearchProps) {
    const { companyId, season } = useCompany();
    const [search, setSearch] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const { data: divisionFilter, isLoading: divisionFilterLoading } = useRosterDivisionFilter(companyId);
    const { data: divisions = [] } = useDivisionsLookup(companyId);

    const { data: results = [], isLoading } = useQuery({
        queryKey: ['profile_quick_search', type, companyId, season, divisionFilter],
        queryFn: async (): Promise<SearchResult[]> => {
            if (!companyId || !season) return [];

            if (type === 'child') {
                let query = supabase
                    .from('children')
                    .select('id, name, grade, divisions(name)')
                    .eq('company_id', companyId)
                    .eq('season', season)
                    .neq('status', 'inactive')
                    .order('name');

                if (divisionFilter !== null && divisionFilter.length > 0) {
                    const expanded = expandDivisionIdsForRosterFilter(divisionFilter, divisions);
                    query = query.in('division_id', expanded);
                }

                const { data, error } = await query;
                if (error) throw error;

                return (data || []).map((child: any) => ({
                    id: child.id,
                    name: child.name,
                    subtitle: [child.grade, child.divisions?.name].filter(Boolean).join(' • '),
                }));
            }

            const { data, error } = await supabase
                .from('staff')
                .select('id, name, role, department')
                .eq('company_id', companyId)
                .eq('season', season)
                .neq('status', 'inactive')
                .order('name');

            if (error) throw error;

            return (data || []).map((member: any) => ({
                id: member.id,
                name: member.name,
                subtitle: [member.role, member.department].filter(Boolean).join(' • '),
            }));
        },
        enabled: !!companyId && !!season && (type === 'staff' || !divisionFilterLoading),
    });

    const filteredResults = useMemo(() => {
        if (!search.trim()) return results.slice(0, 8);
        const searchLower = search.toLowerCase();
        return results
            .filter(
                (item) =>
                    item.name.toLowerCase().includes(searchLower) ||
                    (item.subtitle || '').toLowerCase().includes(searchLower),
            )
            .slice(0, 8);
    }, [results, search]);

    const placeholder =
        type === 'child'
            ? 'Search campers by name, grade, or division...'
            : 'Search staff by name, role, or department...';

    const handleSelect = (item: SearchResult) => {
        setSearch('');
        setIsOpen(false);
        if (item.id === currentId) return;

        if (type === 'child') {
            navigation.replace('CamperDetail', { camper: { id: item.id, name: item.name } });
        } else {
            navigation.replace('StaffDetail', { staff: { id: item.id, name: item.name } });
        }
    };

    const showDropdown = isOpen && (isLoading || filteredResults.length > 0 || search.trim());

    return (
        <View style={styles.container}>
            <View style={styles.inputRow}>
                <Ionicons name="search" size={18} color={theme.colors.textSecondary} />
                <TextInput
                    style={styles.input}
                    value={search}
                    onChangeText={(value) => {
                        setSearch(value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    onBlur={() => {
                        setTimeout(() => setIsOpen(false), 200);
                    }}
                    placeholder={placeholder}
                    placeholderTextColor={theme.colors.textSecondary}
                    autoCorrect={false}
                    autoCapitalize="words"
                />
            </View>
            {showDropdown ? (
                <View style={styles.dropdown}>
                    {isLoading ? (
                        <View style={styles.dropdownMessage}>
                            <ActivityIndicator size="small" color={theme.colors.primary} />
                        </View>
                    ) : filteredResults.length > 0 ? (
                        <ScrollView keyboardShouldPersistTaps="handled" style={styles.dropdownScroll}>
                            {filteredResults.map((item) => (
                                <TouchableOpacity
                                    key={item.id}
                                    style={[
                                        styles.resultRow,
                                        item.id === currentId && styles.resultRowActive,
                                    ]}
                                    onPress={() => handleSelect(item)}
                                >
                                    <Text style={styles.resultName}>{item.name}</Text>
                                    {item.subtitle ? (
                                        <Text style={styles.resultSubtitle}>{item.subtitle}</Text>
                                    ) : null}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    ) : (
                        <View style={styles.dropdownMessage}>
                            <Text style={styles.emptyText}>No results found</Text>
                        </View>
                    )}
                </View>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        position: 'relative',
        zIndex: 20,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surface,
        paddingHorizontal: 12,
        minHeight: 44,
    },
    input: {
        flex: 1,
        fontSize: 15,
        color: theme.colors.text,
        paddingVertical: 10,
    },
    dropdown: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        marginTop: 4,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        maxHeight: 240,
        ...theme.shadows.card,
        elevation: 8,
    },
    dropdownScroll: {
        maxHeight: 240,
    },
    resultRow: {
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    resultRowActive: {
        backgroundColor: theme.colors.background,
    },
    resultName: {
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.text,
    },
    resultSubtitle: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    dropdownMessage: {
        padding: 12,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
});
