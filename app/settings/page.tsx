"use client";

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function SettingsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [config, setConfig] = useState({
        meal_times: {
            Breakfast: { start: 6, end: 10, default: "08:00" },
            Lunch: { start: 10, end: 14, default: "12:00" },
            Dinner: { start: 17, end: 19, default: "18:00" },
            other: { name: "Snack" }
        },
        daily_targets: {
            energy: 2000,
            protein: 150,
            carbs: 200,
            fat: 65
        }
    });

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/settings');
            const data = await res.json();
            if (res.ok) {
                // Ensure other exists for backward compatibility during dev
                if (!data.meal_times.other) {
                    data.meal_times.other = { name: "Snack" };
                }
                setConfig(data);
            } else {
                toast.error('Failed to load settings');
            }
        } catch (error) {
            console.error(error);
            toast.error('Error loading settings');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });
            const data = await res.json();

            if (res.ok) {
                toast.success('Settings saved successfully');
                router.refresh();
            } else {
                toast.error(data.error || 'Failed to save settings');
            }
        } catch (error) {
            console.error(error);
            toast.error('Error saving settings');
        } finally {
            setSaving(false);
        }
    };

    const updateMealTime = (meal: 'Breakfast' | 'Lunch' | 'Dinner', field: 'start' | 'end' | 'default', value: string | number) => {
        setConfig(prev => ({
            ...prev,
            meal_times: {
                ...prev.meal_times,
                [meal]: {
                    ...prev.meal_times[meal],
                    [field]: field === 'default' ? value : Number(value)
                }
            }
        }));
    };

    const updateOtherMealName = (value: string) => {
        setConfig(prev => ({
            ...prev,
            meal_times: {
                ...prev.meal_times,
                other: { name: value }
            }
        }));
    };

    const updateTarget = (field: keyof typeof config.daily_targets, value: number) => {
        setConfig(prev => ({
            ...prev,
            daily_targets: {
                ...prev.daily_targets,
                [field]: Number(value)
            }
        }));
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 pb-24 bg-background">
            <div className="flex items-center gap-4 mb-6">
                <Link href="/">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="w-6 h-6" />
                    </Button>
                </Link>
                <h1 className="text-2xl font-bold">Settings</h1>
            </div>

            <div className="space-y-6 max-w-2xl mx-auto">
                <Card>
                    <CardHeader>
                        <CardTitle>Daily Nutrition Targets</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Energy (kcal)</Label>
                                <Input
                                    type="number"
                                    value={config.daily_targets.energy}
                                    onChange={(e) => updateTarget('energy', Number(e.target.value))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Protein (g)</Label>
                                <Input
                                    type="number"
                                    value={config.daily_targets.protein}
                                    onChange={(e) => updateTarget('protein', Number(e.target.value))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Carbs (g)</Label>
                                <Input
                                    type="number"
                                    value={config.daily_targets.carbs}
                                    onChange={(e) => updateTarget('carbs', Number(e.target.value))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Fat (g)</Label>
                                <Input
                                    type="number"
                                    value={config.daily_targets.fat}
                                    onChange={(e) => updateTarget('fat', Number(e.target.value))}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Meal Times</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {(['Breakfast', 'Lunch', 'Dinner'] as const).map(meal => (
                            <div key={meal} className="space-y-3">
                                <div className="font-semibold text-lg">{meal}</div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">Start Hour (0-23)</Label>
                                        <Input
                                            type="number"
                                            min={0} max={23}
                                            value={config.meal_times[meal].start}
                                            onChange={(e) => updateMealTime(meal, 'start', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">End Hour (0-23)</Label>
                                        <Input
                                            type="number"
                                            min={0} max={23}
                                            value={config.meal_times[meal].end}
                                            onChange={(e) => updateMealTime(meal, 'end', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">Default Time</Label>
                                        <Input
                                            type="time"
                                            value={config.meal_times[meal].default}
                                            onChange={(e) => updateMealTime(meal, 'default', e.target.value)}
                                        />
                                    </div>
                                </div>
                                <Separator />
                            </div>
                        ))}

                        <div className="space-y-3">
                            <div className="font-semibold text-lg">Other Meals</div>
                            <div className="grid grid-cols-1 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Default Meal Name</Label>
                                    <Input
                                        type="text"
                                        placeholder="Snack"
                                        value={config.meal_times.other?.name || "Snack"}
                                        onChange={(e) => updateOtherMealName(e.target.value)}
                                    />
                                    <p className="text-[10px] text-muted-foreground mt-1">
                                        Any meal outside standard time ranges will use this name.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Button
                    className="w-full h-12 text-lg"
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                    Save Settings
                </Button>
            </div>
        </div>
    );
}

