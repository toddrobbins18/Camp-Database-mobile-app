import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

interface Company {
    id: string;
    name: string;
    slug: string;
}

interface CompanyContextType {
    companyId: string | null;
    companySlug: string | null;
    season: string;
    setSeason: (season: string) => void;
    isTylerHill: boolean;
    isLoading: boolean;
    profile: any | null;
    // Super Admin multi-camp support
    availableCompanies: Company[];
    switchCompany: (companyId: string) => void;
    isSuperAdmin: boolean;
}

const CompanyContext = createContext<CompanyContextType>({
    companyId: null,
    companySlug: null,
    season: new Date().getFullYear().toString(),
    setSeason: () => { },
    isTylerHill: false,
    isLoading: true,
    profile: null,
    availableCompanies: [],
    switchCompany: () => { },
    isSuperAdmin: false,
});

export const useCompany = () => useContext(CompanyContext);

interface CompanyProviderProps {
    children: ReactNode;
}

export const CompanyProvider = ({ children }: CompanyProviderProps) => {
    const [companyId, setCompanyId] = useState<string | null>(null);
    const [companySlug, setCompanySlug] = useState<string | null>(null);
    const [season, setSeason] = useState(new Date().getFullYear().toString());
    const [isTylerHill, setIsTylerHill] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [profile, setProfile] = useState<any | null>(null);
    const [availableCompanies, setAvailableCompanies] = useState<Company[]>([]);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);

    const switchCompany = (newCompanyId: string) => {
        const company = availableCompanies.find(c => c.id === newCompanyId);
        if (company) {
            setCompanyId(newCompanyId);
            setCompanySlug(company.slug);
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
                        .select('id, name, slug')
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
                        .select('slug, name')
                        .eq('id', profileData.company_id)
                        .single();

                    if (!companyError && companyData) {
                        setCompanySlug(companyData.slug);
                        setIsTylerHill(companyData.slug === 'tyler-hill-camp');
                    }
                }
            } catch (error) {
                console.error('Error fetching company data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchCompanyData();

        // Listen for auth state changes to refetch company data
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event) => {
                if (event === 'SIGNED_IN') {
                    fetchCompanyData();
                } else if (event === 'SIGNED_OUT') {
                    setCompanyId(null);
                    setCompanySlug(null);
                    setIsTylerHill(false);
                    setProfile(null);
                    setAvailableCompanies([]);
                    setIsSuperAdmin(false);
                    setIsLoading(false);
                }
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    return (
        <CompanyContext.Provider
            value={{
                companyId,
                companySlug,
                season,
                setSeason,
                isTylerHill,
                isLoading,
                profile,
                availableCompanies,
                switchCompany,
                isSuperAdmin,
            }}
        >
            {children}
        </CompanyContext.Provider>
    );
};
