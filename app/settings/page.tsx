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
import { api, Settings } from '@/lib/api-client';
import { kcalToKj, kjToKcal, gramsToOz, ozToGrams, EnergyUnit, WeightUnit } from '@/lib/units';

export default function SettingsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [config, setConfig] = useState<Settings>({
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
        },
        unit_preferences: {
            energy: 'kcal',
            weight: 'g'
        },
        recognition_language: 'zh',
        region: 'CN',
        llm_api_key: '',
        llm_model: 'gemini-2.0-flash'
    });

    const [models, setModels] = useState<{ id: string; name: string }[]>([]);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        setLoading(true);
        try {
            const data = await api.getSettings();
            if (!data.meal_times.other) {
                data.meal_times.other = { name: "Snack" };
            }
            if (!data.unit_preferences) {
                data.unit_preferences = { energy: 'kcal', weight: 'g' };
            }
            if (!data.recognition_language) {
                data.recognition_language = 'zh';
            }
            if (!data.region) {
                data.region = 'CN';
            }
            if (data.llm_api_key === undefined) {
                data.llm_api_key = '';
            }
            if (!data.llm_model) {
                data.llm_model = 'gemini-2.0-flash';
            }
            setConfig(data);

            const modelList = await api.getModels();
            setModels(modelList);
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
            await api.saveSettings(config);
            toast.success('Settings saved successfully');
            router.refresh();
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

    const updateEnergyUnit = (newUnit: EnergyUnit) => {
        if (config.unit_preferences.energy === newUnit) return;

        const oldVal = config.daily_targets.energy;
        const newVal = newUnit === 'kj' ? kcalToKj(oldVal) : kjToKcal(oldVal);

        setConfig(prev => ({
            ...prev,
            daily_targets: { ...prev.daily_targets, energy: Math.round(newVal) },
            unit_preferences: { ...prev.unit_preferences, energy: newUnit }
        }));
    };

    const updateWeightUnit = (newUnit: WeightUnit) => {
        if (config.unit_preferences.weight === newUnit) return;

        const convert = (val: number) => Math.round(newUnit === 'oz' ? gramsToOz(val) : ozToGrams(val));

        setConfig(prev => ({
            ...prev,
            daily_targets: {
                ...prev.daily_targets,
                protein: convert(prev.daily_targets.protein),
                carbs: convert(prev.daily_targets.carbs),
                fat: convert(prev.daily_targets.fat),
            },
            unit_preferences: { ...prev.unit_preferences, weight: newUnit }
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

    const updateRecognitionLanguage = (lang: 'zh' | 'en') => {
        setConfig(prev => ({
            ...prev,
            recognition_language: lang
        }));
    };

    const updateRegion = (newRegion: 'CN' | 'US') => {
        if (config.region === newRegion) return;

        // Auto-adapt settings based on region
        const targetWeightUnit = newRegion === 'CN' ? 'g' : 'oz';
        const targetLang = newRegion === 'CN' ? 'zh' : 'en';

        // Update units if they differ
        if (config.unit_preferences.weight !== targetWeightUnit) {
            updateWeightUnit(targetWeightUnit);
        }

        setConfig(prev => ({
            ...prev,
            region: newRegion,
            recognition_language: targetLang,
            // Weight unit is already updated by updateWeightUnit call above if needed
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
                <Card className="border-primary/50 bg-primary/5">
                    <CardHeader>
                        <CardTitle className="text-primary flex items-center gap-2">
                            Global Region Settings
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Global Region (Quickly adapt units and language)</Label>
                            <div className="flex gap-6">
                                <label className="flex items-center gap-3 cursor-pointer p-3 border rounded-lg hover:bg-background transition-colors flex-1">
                                    <input
                                        type="radio"
                                        name="region"
                                        value="CN"
                                        checked={config.region === 'CN'}
                                        onChange={() => updateRegion('CN')}
                                        className="w-5 h-5 text-primary"
                                    />
                                    <div className="flex flex-col">
                                        <span className="font-semibold">China (中国)</span>
                                        <span className="text-xs text-muted-foreground">g, kcal, 中文</span>
                                    </div>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer p-3 border rounded-lg hover:bg-background transition-colors flex-1">
                                    <input
                                        type="radio"
                                        name="region"
                                        value="US"
                                        checked={config.region === 'US'}
                                        onChange={() => updateRegion('US')}
                                        className="w-5 h-5 text-primary"
                                    />
                                    <div className="flex flex-col">
                                        <span className="font-semibold">United States</span>
                                        <span className="text-xs text-muted-foreground">oz, kcal, English</span>
                                    </div>
                                </label>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                                Selecting a region will automatically set your preferred units and AI recognition language. You can still customize them individually below.
                            </p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Daily Nutrition Targets</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Energy ({config.unit_preferences.energy})</Label>
                                <Input
                                    type="number"
                                    value={config.daily_targets.energy}
                                    onChange={(e) => updateTarget('energy', Number(e.target.value))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Protein ({config.unit_preferences.weight})</Label>
                                <Input
                                    type="number"
                                    value={config.daily_targets.protein}
                                    onChange={(e) => updateTarget('protein', Number(e.target.value))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Carbs ({config.unit_preferences.weight})</Label>
                                <Input
                                    type="number"
                                    value={config.daily_targets.carbs}
                                    onChange={(e) => updateTarget('carbs', Number(e.target.value))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Fat ({config.unit_preferences.weight})</Label>
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
                        <CardTitle>Unit Preferences</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Energy Unit</Label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
                                        <input
                                            type="radio"
                                            name="energyUnit"
                                            value="kcal"
                                            checked={config.unit_preferences.energy === 'kcal'}
                                            onChange={() => updateEnergyUnit('kcal')}
                                            className="w-4 h-4 text-primary"
                                        />
                                        <span>kcal</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
                                        <input
                                            type="radio"
                                            name="energyUnit"
                                            value="kj"
                                            checked={config.unit_preferences.energy === 'kj'}
                                            onChange={() => updateEnergyUnit('kj')}
                                            className="w-4 h-4 text-primary"
                                        />
                                        <span>kJ</span>
                                    </label>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Weight Unit</Label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
                                        <input
                                            type="radio"
                                            name="weightUnit"
                                            value="g"
                                            checked={config.unit_preferences.weight === 'g'}
                                            onChange={() => updateWeightUnit('g')}
                                            className="w-4 h-4 text-primary"
                                        />
                                        <span>g</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
                                        <input
                                            type="radio"
                                            name="weightUnit"
                                            value="oz"
                                            checked={config.unit_preferences.weight === 'oz'}
                                            onChange={() => updateWeightUnit('oz')}
                                            className="w-4 h-4 text-primary"
                                        />
                                        <span>oz</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>AI Recognition Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Language (for recipe names and descriptions)</Label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
                                    <input
                                        type="radio"
                                        name="recognitionLanguage"
                                        value="zh"
                                        checked={config.recognition_language === 'zh'}
                                        onChange={() => updateRecognitionLanguage('zh')}
                                        className="w-4 h-4 text-primary"
                                    />
                                    <span>中文</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
                                    <input
                                        type="radio"
                                        name="recognitionLanguage"
                                        value="en"
                                        checked={config.recognition_language === 'en'}
                                        onChange={() => updateRecognitionLanguage('en')}
                                        className="w-4 h-4 text-primary"
                                    />
                                    <span>English</span>
                                </label>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Changes the language that AI uses to identify dishes. Note: This does not change the app interface language.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>LLM Configuration</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Gemini API Key</Label>
                            <Input
                                type="password"
                                placeholder="Enter your Gemini API key"
                                value={config.llm_api_key}
                                onChange={(e) => setConfig(prev => ({ ...prev, llm_api_key: e.target.value }))}
                            />
                            <p className="text-xs text-muted-foreground">
                                Your API key is stored locally in the database and used for recognition analysis.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label>Model Select</Label>
                            <select
                                className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                value={config.llm_model}
                                onChange={(e) => setConfig(prev => ({ ...prev, llm_model: e.target.value }))}
                            >
                                {models.map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                            </select>
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

