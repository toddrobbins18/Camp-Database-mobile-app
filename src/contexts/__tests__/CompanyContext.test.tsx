import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { CompanyProvider, useCompany } from '../CompanyContext';

// Mock supabase at module level
jest.mock('../../lib/supabase', () => {
    const mockSubscription = { unsubscribe: jest.fn() };
    return {
        supabase: {
            auth: {
                getUser: jest.fn().mockResolvedValue({
                    data: { user: { id: 'test-user-id' } },
                }),
                onAuthStateChange: jest.fn().mockReturnValue({
                    data: { subscription: mockSubscription },
                }),
            },
            from: jest.fn(),
        },
    };
});

import { supabase } from '../../lib/supabase';

// Helper wrapper for hooks that need CompanyProvider
const wrapper = ({ children }: { children: React.ReactNode }) => (
    <CompanyProvider>{children}</CompanyProvider>
);

describe('CompanyContext', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Default mock for supabase.from - returns no data
        (supabase.from as jest.Mock).mockImplementation(() => ({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                        data: null,
                        error: { message: 'No profile found' },
                    }),
                }),
            }),
        }));

        // Reset auth mock
        (supabase.auth.getUser as jest.Mock).mockResolvedValue({
            data: { user: { id: 'test-user-id' } },
        });

        (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
            data: { subscription: { unsubscribe: jest.fn() } },
        });
    });

    it('should provide default values before data loads', () => {
        const { result } = renderHook(() => useCompany(), { wrapper });

        expect(result.current.companyId).toBeNull();
        expect(result.current.companySlug).toBeNull();
        expect(result.current.season).toBe(new Date().getFullYear().toString());
        expect(result.current.isTylerHill).toBe(false);
    });

    it('should fetch company data and identify Tyler Hill', async () => {
        // Mock chained supabase calls
        (supabase.from as jest.Mock).mockImplementation((table: string) => {
            if (table === 'profiles') {
                return {
                    select: jest.fn().mockReturnValue({
                        eq: jest.fn().mockReturnValue({
                            single: jest.fn().mockResolvedValue({
                                data: {
                                    id: 'test-user-id',
                                    company_id: 'company-123',
                                    full_name: 'Test User',
                                },
                                error: null,
                            }),
                        }),
                    }),
                };
            }
            if (table === 'companies') {
                return {
                    select: jest.fn().mockReturnValue({
                        eq: jest.fn().mockReturnValue({
                            single: jest.fn().mockResolvedValue({
                                data: { slug: 'tyler-hill', name: 'Tyler Hill' },
                                error: null,
                            }),
                        }),
                    }),
                };
            }
            return {
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({
                            data: null,
                            error: null,
                        }),
                    }),
                }),
            };
        });

        const { result } = renderHook(() => useCompany(), { wrapper });

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.companyId).toBe('company-123');
        expect(result.current.companySlug).toBe('tyler-hill');
        expect(result.current.isTylerHill).toBe(true);
    });

    it('should allow season to be updated', async () => {
        const { result } = renderHook(() => useCompany(), { wrapper });

        expect(result.current.season).toBe(new Date().getFullYear().toString());

        act(() => {
            result.current.setSeason('2025');
        });

        expect(result.current.season).toBe('2025');
    });

    it('should handle no authenticated user', async () => {
        (supabase.auth.getUser as jest.Mock).mockResolvedValue({
            data: { user: null },
        });

        const { result } = renderHook(() => useCompany(), { wrapper });

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.companyId).toBeNull();
        expect(result.current.companySlug).toBeNull();
        expect(result.current.isTylerHill).toBe(false);
    });
});
