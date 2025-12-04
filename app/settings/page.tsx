"use client";

import { useEffect, useState } from 'react';
import { useApp } from '@/components/app-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function SettingsPage() {
    const { token, baseUrl, planId, plans, setToken, setBaseUrl, setPlanId, fetchPlans } = useApp();
    const [localToken, setLocalToken] = useState(token);
    const [localBaseUrl, setLocalBaseUrl] = useState(baseUrl || process.env.NEXT_PUBLIC_WGER_BASE_URL || 'https://wger.de');
    const router = useRouter();

    useEffect(() => {
        if (token) setLocalToken(token);
        if (baseUrl) setLocalBaseUrl(baseUrl);
    }, [token, baseUrl]);

    const handleSaveCredentials = async () => {
        if (!localToken || !localBaseUrl) {
            toast.error("Please fill in all fields");
            return;
        }
        setToken(localToken);
        setBaseUrl(localBaseUrl);
        await fetchPlans();
        toast.success("Credentials saved. Please select a plan.");
    };

    const handlePlanSelect = (id: string) => {
        setPlanId(Number(id));
        toast.success("Plan selected!");
        router.push('/');
    };

    return (
        <div className="min-h-screen p-4 flex flex-col items-center justify-center bg-background text-foreground">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="baseUrl">Wger Base URL</Label>
                        <Input
                            id="baseUrl"
                            value={localBaseUrl}
                            onChange={(e) => setLocalBaseUrl(e.target.value)}
                            placeholder="https://wger.de"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="token">API Token</Label>
                        <Input
                            id="token"
                            type="password"
                            value={localToken}
                            onChange={(e) => setLocalToken(e.target.value)}
                            placeholder="Your Wger API Token"
                        />
                        <p className="text-xs text-muted-foreground">
                            Create one at {localBaseUrl}/en/user/api-key
                        </p>
                    </div>
                    <Button onClick={handleSaveCredentials} className="w-full">
                        Load Plans
                    </Button>

                    {plans.length > 0 && (
                        <div className="space-y-2 pt-4">
                            <Label>Select Nutritional Plan</Label>
                            <Select onValueChange={handlePlanSelect} value={planId ? String(planId) : undefined}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a plan" />
                                </SelectTrigger>
                                <SelectContent>
                                    {plans.map((plan) => (
                                        <SelectItem key={plan.id} value={String(plan.id)}>
                                            {plan.description || `Plan ${plan.id}`} ({plan.creation_date})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
