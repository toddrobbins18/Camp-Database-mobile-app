import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

interface CompanyContextType {
    companyId: string | null;
    companySlug: string | null;
    season: string;
    setSeason: (season: string) => void;
    isTylerHill: boolean;
    isLoading: boolean;
    profile: any | null;
}

const CompanyContext = createContext<CompanyContextType>({
    companyId: null,
    companySlug: null,
    season: new Date().getFullYear().toString(),
    setSeason: () => {},
    isTylerHill: false,
    isLoading: true,
    profile: null,
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
                        setIsTylerHill(companyData.slug === 'tyler-hill');
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
            }}
        >
            {children}
        </CompanyContext.Provider>
    );
};
