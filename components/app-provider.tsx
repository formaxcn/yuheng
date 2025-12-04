"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getCookie, setCookie } from 'cookies-next';
import { WgerPlan } from '@/types';
import { useRouter } from 'next/navigation';

interface AppContextType {
    token: string;
    baseUrl: string;
    planId: number | null;
    plans: WgerPlan[];
    setToken: (token: string) => void;
    setBaseUrl: (url: string) => void;
    setPlanId: (id: number) => void;
    fetchPlans: () => Promise<void>;
    logout: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
    const [token, setTokenState] = useState('');
    const [baseUrl, setBaseUrlState] = useState('');
    const [planId, setPlanIdState] = useState<number | null>(null);
    const [plans, setPlans] = useState<WgerPlan[]>([]);
    const router = useRouter();

    useEffect(() => {
        // Load from localStorage on mount
        const storedToken = localStorage.getItem('wger_token');
        const storedBaseUrl = localStorage.getItem('wger_base_url');
        const storedPlanId = localStorage.getItem('wger_plan_id');

        if (storedToken) setTokenState(storedToken);
        if (storedBaseUrl) setBaseUrlState(storedBaseUrl);
        if (storedPlanId) setPlanIdState(Number(storedPlanId));
    }, []);

    const setToken = (newToken: string) => {
        setTokenState(newToken);
        localStorage.setItem('wger_token', newToken);
        setCookie('wger_token', newToken);
    };

    const setBaseUrl = (newUrl: string) => {
        setBaseUrlState(newUrl);
        localStorage.setItem('wger_base_url', newUrl);
        setCookie('wger_base_url', newUrl);
    };

    const setPlanId = (newId: number) => {
        setPlanIdState(newId);
        localStorage.setItem('wger_plan_id', String(newId));
        setCookie('wger_plan_id', String(newId));
    };

    const fetchPlans = async () => {
        if (!token || !baseUrl) return;
        try {
            const res = await fetch('/api/wger/plans', {
                headers: {
                    'x-wger-token': token,
                    'x-wger-base-url': baseUrl,
                },
            });
            const data = await res.json();
            if (data.plans) {
                setPlans(data.plans);
            }
        } catch (error) {
            console.error("Failed to fetch plans", error);
        }
    };

    const logout = () => {
        setToken('');
        setPlanIdState(null);
        localStorage.removeItem('wger_token');
        localStorage.removeItem('wger_plan_id');
        setCookie('wger_token', '');
        setCookie('wger_plan_id', '');
        router.push('/settings');
    };

    return (
        <AppContext.Provider value={{ token, baseUrl, planId, plans, setToken, setBaseUrl, setPlanId, fetchPlans, logout }}>
            {children}
        </AppContext.Provider>
    );
}

export function useApp() {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
}
