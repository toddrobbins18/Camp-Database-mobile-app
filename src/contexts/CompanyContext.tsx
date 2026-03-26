import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

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
    isTylerHill: boolean;
    isLoading: boolean;
    profile: any | null;
    availableCompanies: Company[];
    switchCompany: (companyId: string) => void;
    isSuperAdmin: boolean;
    /** Set when profile/company fetch fails; clear on retry */
    loadError: string | null;
    retryLoad: () => void;
}

const CompanyContext = createContext<CompanyContextType>({
    companyId: null,
    companySlug: null,
    companyThemeColor: null,
    season: new Date().getFullYear().toString(),
    setSeason: () => { },
    isTylerHill: false,
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

export const CompanyProvider = ({ children }: CompanyProviderProps) => {
    const [companyId, setCompanyId] = useState<string | null>(null);
    const [companySlug, setCompanySlug] = useState<string | null>(null);
    const [companyThemeColor, setCompanyThemeColor] = useState<string | null>(null);
    const [season, setSeason] = useState(new Date().getFullYear().toString());
    const [isTylerHill, setIsTylerHill] = useState(false);
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
            setIsTylerHill(company.slug === 'tyler-hill-camp');
        }
    };

    useEffect(() => {
        const fetchCompanyData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    setIsLoading(false);
                    return;
                }

                // Fetch user profile
                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                if (profileError) throw profileError;

                setProfile(profileData);

                // Check if user is super_admin
                const { data: roleData } = await supabase
                    .from('user_roles')
                    .select('role')
                    .eq('user_id', user.id);

                const superAdmin = roleData?.some(r => r.role === 'super_admin') || false;
                setIsSuperAdmin(superAdmin);

                // If super_admin, fetch ALL companies for the switcher
                if (superAdmin) {
                    const { data: allCompanies } = await supabase
                        .from('companies')
                        .select('id, name, slug, theme_color')
                        .order('name');

                    if (allCompanies) {
                        setAvailableCompanies(allCompanies);
                    }
                }

                // Set initial company from profile
                setCompanyId(profileData.company_id);

                // Fetch company details to get slug and check if Tyler Hill
                if (profileData.company_id) {
                    const { data: companyData, error: companyError } = await supabase
                        .from('companies')
                        .select('slug, name, theme_color')
                        .eq('id', profileData.company_id)
                        .single();

                    if (!companyError && companyData) {
                        setCompanySlug(companyData.slug);
                        setCompanyThemeColor(companyData.theme_color ?? null);
                        setIsTylerHill(companyData.slug === 'tyler-hill-camp');
                    }
                }
            } catch (error: any) {
                console.error('Error fetching company data:', error);
                setLoadError(error?.message ?? 'Failed to load company. Check your connection.');
            } finally {
                setIsLoading(false);
            }
        };

        setLoadError(null);
        fetchCompanyData();

        // Listen for auth state changes to refetch company data
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event) => {
                if (event === 'SIGNED_IN') {
                    fetchCompanyData();
                } else if (event === 'SIGNED_OUT') {
                    setCompanyId(null);
                    setCompanySlug(null);
                    setCompanyThemeColor(null);
                    setIsTylerHill(false);
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
        supabase.auth.getUser().then(async ({ data: { user } }) => {
            if (!user) {
                setIsLoading(false);
                return;
            }
            try {
                const { data: profileData, error: profileError } = await supabase.from('profiles').select('*').eq('id', user.id).single();
                if (profileError) throw profileError;
                setProfile(profileData);
                const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
                const superAdmin = roleData?.some((r: any) => r.role === 'super_admin') || false;
                setIsSuperAdmin(superAdmin);
                if (superAdmin) {
                    const { data: allCompanies } = await supabase.from('companies').select('id, name, slug, theme_color').order('name');
                    if (allCompanies) setAvailableCompanies(allCompanies);
                }
                setCompanyId(profileData.company_id);
                if (profileData.company_id) {
                    const { data: companyData, error: companyError } = await supabase.from('companies').select('slug, name, theme_color').eq('id', profileData.company_id).single();
                    if (!companyError && companyData) {
                        setCompanySlug(companyData.slug);
                        setCompanyThemeColor(companyData.theme_color ?? null);
                        setIsTylerHill(companyData.slug === 'tyler-hill-camp');
                    }
                }
                setLoadError(null);
            } catch (err: any) {
                setLoadError(err?.message ?? 'Failed to load');
            } finally {
                setIsLoading(false);
            }
        });
    };

    return (
        <CompanyContext.Provider
            value={{
                companyId,
                companySlug,
                companyThemeColor,
                season,
                setSeason,
                isTylerHill,
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
