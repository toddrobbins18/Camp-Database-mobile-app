import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import {
    COMPANY_BOOTSTRAP_VERSION,
    DEFAULT_COMPANY_SLUG,
    isTimberLakeWestCompany,
    isTylerHillCamp,
    isDayCampCompany,
    shouldShowTigerTimes,
} from '../constants/camps';
import {
    AVAILABLE_SEASONS,
    DEFAULT_SEASON,
    SEASON_BOOTSTRAP_VERSION,
    isCampSeason,
} from '../constants/seasonConstants';
import { invalidateCampScopedQueries } from '../lib/queryClient';

/** Persists in-session camp switch (cleared on bootstrap bump). */
const SUPER_ADMIN_COMPANY_PREFERENCE_KEY = '@the_nest_active_company_id';
const COMPANY_BOOTSTRAP_KEY = '@the_nest_company_bootstrap_version';

interface Company {
    id: string;
    name: string;
    slug: string;
    theme_color?: string | null;
    owl_pay_enabled?: boolean | null;
    camp_type?: string | null;
}

interface CompanyContextType {
    companyId: string | null;
    companySlug: string | null;
    companyThemeColor: string | null;
    season: string;
    setSeason: (season: string) => void;
    availableSeasons: string[];
    isTylerHill: boolean;
    isTimberLakeCamp: boolean;
    isTimberLakeWest: boolean;
    isDayCamp: boolean;
    owlPayEnabled: boolean;
    isLoading: boolean;
    profile: any | null;
    availableCompanies: Company[];
    switchCompany: (companyId: string) => void;
    isSuperAdmin: boolean;
    loadError: string | null;
    retryLoad: () => void;
}

const DEFAULT_SEASONS: string[] = [...AVAILABLE_SEASONS];
const SEASON_STORAGE_KEY = '@the_nest_current_season';
const SEASON_BOOTSTRAP_KEY = '@the_nest_season_bootstrap_version';

const CompanyContext = createContext<CompanyContextType>({
    companyId: null,
    companySlug: null,
    companyThemeColor: null,
    season: DEFAULT_SEASON,
    setSeason: () => { },
    availableSeasons: DEFAULT_SEASONS,
    isTylerHill: false,
    isTimberLakeCamp: false,
    isTimberLakeWest: false,
    isDayCamp: false,
    owlPayEnabled: false,
    isLoading: true,
    profile: null,
    availableCompanies: [],
    switchCompany: () => { },
    isSuperAdmin: false,
    loadError: null,
    retryLoad: () => { },
});

export const useCompany = () => useContext(CompanyContext);

interface CompanyProviderProps {
    children: ReactNode;
}

function applyCompanyFlags(company: Pick<Company, 'slug' | 'camp_type'> | null | undefined) {
    const slug = company?.slug ?? null;
    return {
        isTylerHill: isTylerHillCamp(slug),
        isTimberLakeCamp: shouldShowTigerTimes(company ?? undefined),
        isTimberLakeWest: isTimberLakeWestCompany(company ?? undefined),
        isDayCamp: isDayCampCompany(company ?? undefined),
    };
}

function computeOwlPayEnabled(
    row: { owl_pay_enabled?: boolean | null } | undefined,
    slug: string | null,
): boolean {
    if (!slug) return false;
    if (row?.owl_pay_enabled === true) return true;
    if (row?.owl_pay_enabled === false) return false;
    return isTylerHillCamp(slug);
}

const COMPANY_SELECT = 'id, name, slug, theme_color, owl_pay_enabled, camp_type';

export const CompanyProvider = ({ children }: CompanyProviderProps) => {
    const fetchGenerationRef = useRef(0);
    const fetchCompanyDataRef = useRef<(() => Promise<void>) | null>(null);
    /** In-session camp pick (null = use North Shore default on next cold resolve). */
    const activeCompanyIdRef = useRef<string | null>(null);

    const [companyId, setCompanyId] = useState<string | null>(null);
    const [companySlug, setCompanySlug] = useState<string | null>(null);
    const [companyThemeColor, setCompanyThemeColor] = useState<string | null>(null);
    const [season, setSeasonState] = useState(DEFAULT_SEASON);
    const [availableSeasons, setAvailableSeasons] = useState<string[]>(DEFAULT_SEASONS);
    const [isTylerHill, setIsTylerHill] = useState(false);
    const [isTimberLakeCampState, setIsTimberLakeCampState] = useState(false);
    const [isTimberLakeWestState, setIsTimberLakeWestState] = useState(false);
    const [isDayCampState, setIsDayCampState] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [profile, setProfile] = useState<any | null>(null);
    const [availableCompanies, setAvailableCompanies] = useState<Company[]>([]);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [owlPayEnabled, setOwlPayEnabled] = useState(false);

    const applyCompanyState = useCallback((company: Company | null) => {
        if (!company) {
            setCompanySlug(null);
            setCompanyThemeColor(null);
            setIsTylerHill(false);
            setIsTimberLakeCampState(false);
            setIsTimberLakeWestState(false);
            setIsDayCampState(false);
            setOwlPayEnabled(false);
            return;
        }
        const flags = applyCompanyFlags(company);
        setCompanySlug(company.slug);
        setCompanyThemeColor(company.theme_color ?? null);
        setIsTylerHill(flags.isTylerHill);
        setIsTimberLakeCampState(flags.isTimberLakeCamp);
        setIsTimberLakeWestState(flags.isTimberLakeWest);
        setIsDayCampState(flags.isDayCamp);
        setOwlPayEnabled(computeOwlPayEnabled(company, company.slug));
    }, []);

    const switchCompany = useCallback(async (newCompanyId: string) => {
        const company = availableCompanies.find((c) => c.id === newCompanyId);
        if (!company) return;

        if (!isSuperAdmin && profile?.id) {
            const { error } = await supabase
                .from('profiles')
                .update({ company_id: newCompanyId })
                .eq('id', profile.id);
            if (error) {
                console.error('Failed to persist active camp on profile:', error);
                return;
            }
            setProfile((prev: any) => (prev ? { ...prev, company_id: newCompanyId } : prev));
        }

        activeCompanyIdRef.current = newCompanyId;
        setCompanyId(newCompanyId);
        applyCompanyState(company);
        invalidateCampScopedQueries();
        await AsyncStorage.setItem(SUPER_ADMIN_COMPANY_PREFERENCE_KEY, newCompanyId);
    }, [availableCompanies, isSuperAdmin, profile?.id, applyCompanyState]);

    useEffect(() => {
        const fetchCompanyData = async () => {
            const seq = ++fetchGenerationRef.current;
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (seq !== fetchGenerationRef.current) return;
                if (!user) {
                    setIsLoading(false);
                    return;
                }

                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                if (seq !== fetchGenerationRef.current) return;
                if (profileError) throw profileError;

                setProfile(profileData);

                const { data: roleData } = await supabase
                    .from('user_roles')
                    .select('role, company_id')
                    .eq('user_id', user.id);

                if (seq !== fetchGenerationRef.current) return;

                const superAdmin = roleData?.some((r) => r.role === 'super_admin') || false;
                setIsSuperAdmin(superAdmin);

                const allowedCompanyIds = new Set<string>();
                for (const row of roleData || []) {
                    if (row.company_id) allowedCompanyIds.add(row.company_id);
                }
                if (profileData.company_id) {
                    allowedCompanyIds.add(profileData.company_id);
                }

                let allowedCompanies: Company[] = [];
                if (superAdmin) {
                    const { data: allCompanies } = await supabase
                        .from('companies')
                        .select(COMPANY_SELECT)
                        .eq('is_active', true)
                        .order('name');

                    if (seq !== fetchGenerationRef.current) return;
                    allowedCompanies = allCompanies || [];
                } else if (allowedCompanyIds.size > 0) {
                    const { data: roleCompanies } = await supabase
                        .from('companies')
                        .select(COMPANY_SELECT)
                        .eq('is_active', true)
                        .in('id', Array.from(allowedCompanyIds))
                        .order('name');

                    if (seq !== fetchGenerationRef.current) return;
                    allowedCompanies = roleCompanies || [];
                }

                setAvailableCompanies(allowedCompanies);

                const { data: seasonRows } = await supabase
                    .from('children')
                    .select('season')
                    .order('season', { ascending: false });

                if (seq !== fetchGenerationRef.current) return;

                if (seasonRows) {
                    const dbSeasons = [...new Set(
                        seasonRows.map((r: any) => r.season).filter(Boolean) as string[],
                    )];
                    const merged = [...new Set([...DEFAULT_SEASONS, ...dbSeasons])].sort().reverse();
                    setAvailableSeasons(merged);
                }

                const bootstrapDone = await AsyncStorage.getItem(COMPANY_BOOTSTRAP_KEY);
                if (seq !== fetchGenerationRef.current) return;
                if (bootstrapDone !== COMPANY_BOOTSTRAP_VERSION) {
                    await AsyncStorage.removeItem(SUPER_ADMIN_COMPANY_PREFERENCE_KEY);
                    await AsyncStorage.setItem(COMPANY_BOOTSTRAP_KEY, COMPANY_BOOTSTRAP_VERSION);
                }

                const defaultCompany = allowedCompanies.find(
                    (c) => c.slug === DEFAULT_COMPANY_SLUG,
                );
                const defaultCompanyId =
                    defaultCompany?.id
                    ?? profileData.company_id
                    ?? allowedCompanies[0]?.id
                    ?? null;

                const resolvedCompanyId = activeCompanyIdRef.current ?? defaultCompanyId;
                setCompanyId(resolvedCompanyId);

                let activeCompany =
                    allowedCompanies.find((c) => c.id === resolvedCompanyId) ?? null;
                applyCompanyState(activeCompany);

                if (seq !== fetchGenerationRef.current) return;

                if (resolvedCompanyId && !activeCompany) {
                    const { data: companyData, error: companyError } = await supabase
                        .from('companies')
                        .select(COMPANY_SELECT)
                        .eq('id', resolvedCompanyId)
                        .single();

                    if (seq !== fetchGenerationRef.current) return;

                    if (!companyError && companyData) {
                        applyCompanyState(companyData);
                    }
                }
            } catch (error: any) {
                if (seq !== fetchGenerationRef.current) return;
                console.error('Error fetching company data:', error);
                setLoadError(error?.message ?? 'Failed to load company. Check your connection.');
            } finally {
                if (seq === fetchGenerationRef.current) {
                    setIsLoading(false);
                }
            }
        };

        setLoadError(null);
        fetchCompanyDataRef.current = fetchCompanyData;
        fetchCompanyData();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_IN') {
                fetchCompanyData();
            } else if (event === 'SIGNED_OUT') {
                fetchGenerationRef.current += 1;
                activeCompanyIdRef.current = null;
                void AsyncStorage.removeItem(SUPER_ADMIN_COMPANY_PREFERENCE_KEY);
                setCompanyId(null);
                setCompanySlug(null);
                setCompanyThemeColor(null);
                setIsTylerHill(false);
                setIsTimberLakeCampState(false);
                setIsTimberLakeWestState(false);
                setIsDayCampState(false);
                setProfile(null);
                setAvailableCompanies([]);
                setIsSuperAdmin(false);
                setOwlPayEnabled(false);
                setIsLoading(false);
                setLoadError(null);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [applyCompanyState]);

    const retryLoad = useCallback(() => {
        setLoadError(null);
        setIsLoading(true);
        void fetchCompanyDataRef.current?.();
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const bootstrapDone = await AsyncStorage.getItem(SEASON_BOOTSTRAP_KEY);
                if (cancelled) return;
                if (bootstrapDone !== SEASON_BOOTSTRAP_VERSION) {
                    await AsyncStorage.setItem(SEASON_STORAGE_KEY, DEFAULT_SEASON);
                    await AsyncStorage.setItem(SEASON_BOOTSTRAP_KEY, SEASON_BOOTSTRAP_VERSION);
                    setSeasonState(DEFAULT_SEASON);
                    return;
                }
                const stored = await AsyncStorage.getItem(SEASON_STORAGE_KEY);
                if (!cancelled && stored && isCampSeason(stored)) {
                    setSeasonState(stored);
                } else if (!cancelled && stored && !isCampSeason(stored)) {
                    setSeasonState(DEFAULT_SEASON);
                    await AsyncStorage.setItem(SEASON_STORAGE_KEY, DEFAULT_SEASON);
                }
            } catch {
                // keep DEFAULT_SEASON
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const setSeason = useCallback((nextSeason: string) => {
        if (!isCampSeason(nextSeason)) return;
        setSeasonState(nextSeason);
        void AsyncStorage.setItem(SEASON_STORAGE_KEY, nextSeason);
    }, []);

    const contextValue = useMemo(
        () => ({
            companyId,
            companySlug,
            companyThemeColor,
            season,
            setSeason,
            availableSeasons,
            isTylerHill,
            isTimberLakeCamp: isTimberLakeCampState,
            isTimberLakeWest: isTimberLakeWestState,
            isDayCamp: isDayCampState,
            owlPayEnabled,
            isLoading,
            profile,
            availableCompanies,
            switchCompany,
            isSuperAdmin,
            loadError,
            retryLoad,
        }),
        [
            companyId,
            companySlug,
            companyThemeColor,
            season,
            availableSeasons,
            isTylerHill,
            isTimberLakeCampState,
            isTimberLakeWestState,
            isDayCampState,
            owlPayEnabled,
            isLoading,
            profile,
            availableCompanies,
            switchCompany,
            isSuperAdmin,
            loadError,
            retryLoad,
        ],
    );

    return (
        <CompanyContext.Provider value={contextValue}>
            {children}
        </CompanyContext.Provider>
    );
};
