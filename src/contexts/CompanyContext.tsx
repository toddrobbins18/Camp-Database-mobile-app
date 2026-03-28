import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { isTimberLakeCamp, isTimberLakeWest, isTylerHillCamp } from '../constants/camps';

/** Super-admins can switch camps in-app; profile.company_id alone would reset to "home" camp on every auth refetch. */
const SUPER_ADMIN_COMPANY_PREFERENCE_KEY = '@the_nest_active_company_id';

interface Company {
    id: string;
    name: string;
    slug: string;
    theme_color?: string | null;
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
    isLoading: boolean;
    profile: any | null;
    availableCompanies: Company[];
    switchCompany: (companyId: string) => void;
    isSuperAdmin: boolean;
    /** Set when profile/company fetch fails; clear on retry */
    loadError: string | null;
    retryLoad: () => void;
}

const DEFAULT_SEASONS = ['2025', '2026'];

const CompanyContext = createContext<CompanyContextType>({
    companyId: null,
    companySlug: null,
    companyThemeColor: null,
    season: new Date().getFullYear().toString(),
    setSeason: () => { },
    availableSeasons: DEFAULT_SEASONS,
    isTylerHill: false,
    isTimberLakeCamp: false,
    isTimberLakeWest: false,
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

const ALLOWED_COMPANY_SLUGS = new Set([
    'timber-lake-camp',
    'timber-lake-west',
    'tyler-hill-camp',
]);

export const CompanyProvider = ({ children }: CompanyProviderProps) => {
    /** Bumps on each fetch start so stale async completions cannot overwrite newer session/company. */
    const fetchGenerationRef = useRef(0);
    const fetchCompanyDataRef = useRef<(() => Promise<void>) | null>(null);

    const [companyId, setCompanyId] = useState<string | null>(null);
    const [companySlug, setCompanySlug] = useState<string | null>(null);
    const [companyThemeColor, setCompanyThemeColor] = useState<string | null>(null);
    const [season, setSeason] = useState(new Date().getFullYear().toString());
    const [availableSeasons, setAvailableSeasons] = useState<string[]>(DEFAULT_SEASONS);
    const [isTylerHill, setIsTylerHill] = useState(false);
    const [isTimberLakeCampState, setIsTimberLakeCampState] = useState(false);
    const [isTimberLakeWestState, setIsTimberLakeWestState] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [profile, setProfile] = useState<any | null>(null);
    const [availableCompanies, setAvailableCompanies] = useState<Company[]>([]);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);

    const switchCompany = (newCompanyId: string) => {
        const company = availableCompanies.find(c => c.id === newCompanyId);
        if (company) {
            setCompanyId(newCompanyId);
            setCompanySlug(company.slug);
            setCompanyThemeColor(company.theme_color ?? null);
            setIsTylerHill(isTylerHillCamp(company.slug));
            setIsTimberLakeCampState(isTimberLakeCamp(company.slug));
            setIsTimberLakeWestState(isTimberLakeWest(company.slug));
            void AsyncStorage.setItem(SUPER_ADMIN_COMPANY_PREFERENCE_KEY, newCompanyId);
        }
    };

    useEffect(() => {
        const applyCompanyMeta = (
            effectiveId: string | null,
            allowedList: Company[],
            seq: number
        ) => {
            if (seq !== fetchGenerationRef.current) return;
            setCompanyId(effectiveId);
            if (!effectiveId) {
                setCompanySlug(null);
                setCompanyThemeColor(null);
                setIsTylerHill(false);
                setIsTimberLakeCampState(false);
                setIsTimberLakeWestState(false);
                return;
            }
            const fromList = allowedList.find((c) => c.id === effectiveId);
            if (fromList) {
                setCompanySlug(fromList.slug);
                setCompanyThemeColor(fromList.theme_color ?? null);
                setIsTylerHill(isTylerHillCamp(fromList.slug));
                setIsTimberLakeCampState(isTimberLakeCamp(fromList.slug));
                setIsTimberLakeWestState(isTimberLakeWest(fromList.slug));
            }
        };

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
                    .select('role')
                    .eq('user_id', user.id);

                if (seq !== fetchGenerationRef.current) return;

                const superAdmin = roleData?.some(r => r.role === 'super_admin') || false;
                setIsSuperAdmin(superAdmin);

                let allowedCompanies: Company[] = [];
                if (superAdmin) {
                    const { data: allCompanies } = await supabase
                        .from('companies')
                        .select('id, name, slug, theme_color')
                        .order('name');

                    if (seq !== fetchGenerationRef.current) return;

                    allowedCompanies = (allCompanies || []).filter((company) =>
                        ALLOWED_COMPANY_SLUGS.has(company.slug)
                    );
                    setAvailableCompanies(allowedCompanies);
                } else {
                    setAvailableCompanies([]);
                }

                const { data: seasonRows } = await supabase
                    .from('children')
                    .select('season')
                    .order('season', { ascending: false });

                if (seq !== fetchGenerationRef.current) return;

                if (seasonRows) {
                    const dbSeasons = [...new Set(
                        seasonRows.map((r: any) => r.season).filter(Boolean) as string[]
                    )];
                    const merged = [...new Set([...DEFAULT_SEASONS, ...dbSeasons])].sort().reverse();
                    setAvailableSeasons(merged);
                }

                let effectiveCompanyId: string | null = profileData.company_id ?? null;

                if (superAdmin && allowedCompanies.length > 0) {
                    const stored = await AsyncStorage.getItem(SUPER_ADMIN_COMPANY_PREFERENCE_KEY);
                    if (seq !== fetchGenerationRef.current) return;
                    if (stored && allowedCompanies.some((c) => c.id === stored)) {
                        effectiveCompanyId = stored;
                    }
                }

                applyCompanyMeta(effectiveCompanyId, allowedCompanies, seq);

                if (seq !== fetchGenerationRef.current) return;

                if (effectiveCompanyId && !allowedCompanies.find((c) => c.id === effectiveCompanyId)) {
                    const { data: companyData, error: companyError } = await supabase
                        .from('companies')
                        .select('slug, name, theme_color')
                        .eq('id', effectiveCompanyId)
                        .single();

                    if (seq !== fetchGenerationRef.current) return;

                    if (!companyError && companyData) {
                        setCompanySlug(companyData.slug);
                        setCompanyThemeColor(companyData.theme_color ?? null);
                        setIsTylerHill(isTylerHillCamp(companyData.slug));
                        setIsTimberLakeCampState(isTimberLakeCamp(companyData.slug));
                        setIsTimberLakeWestState(isTimberLakeWest(companyData.slug));
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

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event) => {
                // Extra refetch after sign-in (e.g. some clients emit this after refresh). Super-admin camp
                // selection survives refetch via AsyncStorage. Avoid TOKEN_REFRESHED — too noisy.
                if (event === 'SIGNED_IN') {
                    fetchCompanyData();
                } else if (event === 'SIGNED_OUT') {
                    fetchGenerationRef.current += 1;
                    void AsyncStorage.removeItem(SUPER_ADMIN_COMPANY_PREFERENCE_KEY);
                    setCompanyId(null);
                    setCompanySlug(null);
                    setCompanyThemeColor(null);
                    setIsTylerHill(false);
                    setIsTimberLakeCampState(false);
                    setIsTimberLakeWestState(false);
                    setProfile(null);
                    setAvailableCompanies([]);
                    setIsSuperAdmin(false);
                    setIsLoading(false);
                    setLoadError(null);
                }
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const retryLoad = () => {
        setLoadError(null);
        setIsLoading(true);
        void fetchCompanyDataRef.current?.();
    };

    return (
        <CompanyContext.Provider
            value={{
                companyId,
                companySlug,
                companyThemeColor,
                season,
                setSeason,
                availableSeasons,
                isTylerHill,
                isTimberLakeCamp: isTimberLakeCampState,
                isTimberLakeWest: isTimberLakeWestState,
                isLoading,
                profile,
                availableCompanies,
                switchCompany,
                isSuperAdmin,
                loadError,
                retryLoad,
            }}
        >
            {children}
        </CompanyContext.Provider>
    );
};
