"use client";

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Save, Loader2, Plus, Trash2, X, Sparkles, Bot, Globe, ChevronDown, Check, Brain, Settings as SettingsIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { setLocale } from '@/app/actions';
import { api, Settings } from '@/lib/api-client';
import { kcalToKj, kjToKcal, gramsToOz, ozToGrams, EnergyUnit, WeightUnit } from '@/lib/units';
import { Slider } from '@/components/ui/slider';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { SmartTimeInput } from './SmartTimeInput';
import { cn } from "@/lib/utils"
import { Switch } from "@/components/ui/switch"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

export default function SettingsPage() {
    const t = useTranslations('Settings');
    const tCommon = useTranslations('Common');
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [advancedOpen, setAdvancedOpen] = useState(false);

    const [config, setConfig] = useState<Settings>({
        meal_times: [],
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
        llm_provider: 'gemini',
        llm_model: 'gemini-2.5-flash',
        llm_base_url: '',
        other_meal_name: 'Snack',
        time_format: '24h',
        image_compression_enabled: true,
        image_compression_quality: 0.85
    });

    const [version, setVersion] = useState<string>('');

    const [models, setModels] = useState<{ id: string; name: string }[]>([]);
    const [modelDropdownOpen, setModelDropdownOpen] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        setLoading(true);
        try {
            const data = await api.getSettings();
            if (!data.unit_preferences) {
                data.unit_preferences = { energy: 'kcal', weight: 'g' };
            }
            if (!data.recognition_language) {
                data.recognition_language = 'zh';
            }
            if (data.llm_api_key === undefined || data.llm_api_key === null) {
                data.llm_api_key = '';
            }
            if (!data.llm_provider) {
                data.llm_provider = 'gemini';
            }
            if (!data.llm_model) {
                data.llm_model = 'gemini-2.5-flash';
            }
            if (data.llm_base_url === undefined || data.llm_base_url === null) {
                data.llm_base_url = '';
            }
            if (!data.other_meal_name) {
                data.other_meal_name = 'Snack';
            }
            if (!data.time_format) {
                data.time_format = '24h';
            }
            if (data.image_compression_enabled === undefined) {
                data.image_compression_enabled = true;
            }
            if (data.image_compression_quality === undefined) {
                data.image_compression_quality = 0.85;
            }
            setConfig(data);
        } catch (error) {
            console.error(error);
            toast.error('Error loading settings');
        } finally {
            setLoading(false);
        }

        try {
            const health = await api.checkHealth();
            setVersion(health.version);
        } catch (error) {
            console.error('Failed to fetch version:', error);
        }
    };

    useEffect(() => {
        const fetchModels = async () => {
            try {
                const modelList = await api.getModels();
                setModels(modelList);
            } catch (error) {
                console.error(error);
            }
        };
        fetchModels();
    }, [config.llm_provider]);

    const handleProviderChange = (provider: string) => {
        let defaultModel = 'gemini-3-flash-preview';
        if (provider === 'openai') defaultModel = 'gpt-4o';
        else if (provider === 'openai-compatible') defaultModel = 'mimo-v2-flash';
        else if (provider === 'zhipu') defaultModel = 'GLM-4.1V-Thinking-Flash';

        setConfig(prev => ({
            ...prev,
            llm_provider: provider,
            llm_model: defaultModel
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.saveSettings(config);
            toast.success(t('saveSuccess'));
            router.push('/');
        } catch (error) {
            console.error(error);
            toast.error(t('saveError'));
        } finally {
            setSaving(false);
        }
    };

    const addMeal = () => {
        const newMeal = { name: "New Meal", start: 12, end: 13, default: "12:30" };
        setConfig(prev => ({
            ...prev,
            meal_times: [...prev.meal_times, newMeal]
        }));
    };

    const removeMeal = (index: number) => {
        setConfig(prev => ({
            ...prev,
            meal_times: prev.meal_times.filter((_, i) => i !== index)
        }));
    };

    const updateMeal = (index: number, field: string, value: any) => {
        setConfig(prev => {
            const newMeals = [...prev.meal_times];
            const oldMeal = newMeals[index];
            let updatedMeal = { ...oldMeal, [field]: value };

            // Auto-shift range when default time changes
            if (field === 'default') {
                const hour = parseInt(value.split(':')[0]);
                const minute = parseInt(value.split(':')[1]);
                const floatHour = hour + minute / 60;
                // Default range is ±1 hour from the default time
                updatedMeal.start = (Math.floor(floatHour - 1) + 24) % 24;
                updatedMeal.end = (Math.ceil(floatHour + 1) + 24) % 24;
            }

            newMeals[index] = updatedMeal;
            return { ...prev, meal_times: newMeals };
        });
    };

    /**
     * Converts DB values (0-24) to visual slider values (-2 to 26)
     * based on proximity to the default time.
     */
    const getVisualRange = (start: number, end: number, defaultTime: string): [number, number] => {
        const defaultHour = parseInt(defaultTime.split(':')[0]);
        let s = start;
        let e = end;

        // If it's a cross-midnight range (start > end)
        if (s > e) {
            if (defaultHour >= 12) {
                // Closer to end of day, keep start as is, move end to tomorrow
                e += 24;
            } else {
                // Closer to start of day, keep end as is, move start to yesterday
                s -= 24;
            }
        } else {
            // Normal range, but might need shifting if default is near boundaries
            if (defaultHour < 2 && s > 20) {
                s -= 24;
                e -= 24;
            } else if (defaultHour > 22 && e < 4) {
                s += 24;
                e += 24;
            }
        }

        return [s, e];
    };

    /**
     * Converts visual slider values (-2 to 26) back to DB values (0-24)
     * Enforces an 8-hour maximum duration constraint.
     */
    const handleSliderChange = (index: number, visualVals: number[]) => {
        let [vs, ve] = visualVals;

        const currentMeal = config.meal_times[index];
        const [oldVs, oldVe] = getVisualRange(currentMeal.start, currentMeal.end, currentMeal.default);

        // Enforce 8-hour maximum duration
        if (ve - vs > 8) {
            if (Math.abs(vs - oldVs) > 0.01) {
                // Start handle was dragged
                vs = ve - 8;
            } else {
                // End handle was dragged
                ve = vs + 8;
            }
        }

        const dbStart = (Math.round(vs) + 24) % 24;
        const dbEnd = (Math.round(ve) + 24) % 24;

        setConfig(prev => {
            const newMeals = [...prev.meal_times];
            newMeals[index] = { ...newMeals[index], start: dbStart, end: dbEnd };
            return { ...prev, meal_times: newMeals };
        });
    };

    const formatMarkerHour = (hour: number) => {
        const formatted = formatHour(hour);
        if (hour < 0) return `T-1 ${formatted}`;
        if (hour >= 24) return `T+1 ${formatted}`;
        return `T ${formatted}`;
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

    const updateRecognitionLanguage = async (lang: 'zh' | 'en') => {
        setConfig(prev => ({
            ...prev,
            recognition_language: lang
        }));
        await setLocale(lang);
        router.refresh();
    };

    const updateRegion = async (newRegion: 'CN' | 'US') => {
        if (config.region === newRegion) return;

        // Auto-adapt settings based on region
        const targetWeightUnit = newRegion === 'CN' ? 'g' : 'oz';
        const targetLang = newRegion === 'CN' ? 'zh' : 'en';
        const targetTimeFormat = newRegion === 'CN' ? '24h' : '12h';

        // Update units if they differ
        if (config.unit_preferences.weight !== targetWeightUnit) {
            updateWeightUnit(targetWeightUnit);
        }

        setConfig(prev => ({
            ...prev,
            region: newRegion,
            recognition_language: targetLang,
            time_format: targetTimeFormat,
            // Weight unit is already updated by updateWeightUnit call above if needed
        }));

        await setLocale(targetLang);
        router.refresh();
    };

    const formatHour = (hour: number) => {
        const h = (hour + 24) % 24;
        if (config.time_format === '24h') return `${h}:00`;
        const period = h >= 12 ? 'PM' : 'AM';
        const displayH = h % 12 || 12;
        return `${displayH} ${period}`;
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
                <h1 className="text-2xl font-bold">{t('title')}</h1>
            </div>

            <div className="space-y-6 max-w-2xl mx-auto">
                <Card className="border-primary/50 bg-primary/5">
                    <CardHeader>
                        <CardTitle className="text-primary flex items-center gap-2">
                            {t('globalRegionSettings')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>{t('globalRegionDescription')}</Label>
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
                                        <span className="font-semibold">{t('regionCN')}</span>
                                        <span className="text-xs text-muted-foreground">{t('regionCNDesc')}</span>
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
                                        <span className="font-semibold">{t('regionUS')}</span>
                                        <span className="text-xs text-muted-foreground">{t('regionUSDesc')}</span>
                                    </div>
                                </label>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                                {t('autoSetNote')}
                            </p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>{t('dailyNutritionTargets')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t('energy')} ({config.unit_preferences.energy})</Label>
                                <Input
                                    type="number"
                                    value={config.daily_targets.energy}
                                    onChange={(e) => updateTarget('energy', Number(e.target.value))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('protein')} ({config.unit_preferences.weight})</Label>
                                <Input
                                    type="number"
                                    value={config.daily_targets.protein}
                                    onChange={(e) => updateTarget('protein', Number(e.target.value))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('carbs')} ({config.unit_preferences.weight})</Label>
                                <Input
                                    type="number"
                                    value={config.daily_targets.carbs}
                                    onChange={(e) => updateTarget('carbs', Number(e.target.value))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('fat')} ({config.unit_preferences.weight})</Label>
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
                        <CardTitle>{t('unitPreferences')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t('energyUnit')}</Label>
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
                                <Label>{t('weightUnit')}</Label>
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
                            <div className="space-y-2">
                                <Label>{t('timeFormat')}</Label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
                                        <input
                                            type="radio"
                                            name="timeFormat"
                                            value="24h"
                                            checked={config.time_format === '24h'}
                                            onChange={() => setConfig(prev => ({ ...prev, time_format: '24h' }))}
                                            className="w-4 h-4 text-primary"
                                        />
                                        <span>24h</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
                                        <input
                                            type="radio"
                                            name="timeFormat"
                                            value="12h"
                                            checked={config.time_format === '12h'}
                                            onChange={() => setConfig(prev => ({ ...prev, time_format: '12h' }))}
                                            className="w-4 h-4 text-primary"
                                        />
                                        <span>12h (AM/PM)</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('aiSetup')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 pb-2">
                            <div className="space-y-2">
                                <Label>{t('llmProvider')}</Label>
                                <Select value={config.llm_provider || 'gemini'} onValueChange={handleProviderChange}>
                                    <SelectTrigger className="w-full h-10">
                                        <SelectValue placeholder="Select provider" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="gemini">
                                            <div className="flex items-center gap-2">
                                                <Sparkles className="w-4 h-4" />
                                                <span>Gemini</span>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="zhipu">
                                            <div className="flex items-center gap-2">
                                                <Brain className="w-4 h-4" />
                                                <span>Zhipu</span>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="openai">
                                            <div className="flex items-center gap-2">
                                                <Bot className="w-4 h-4" />
                                                <span>OpenAI</span>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="openai-compatible">
                                            <div className="flex items-center gap-2">
                                                <Globe className="w-4 h-4" />
                                                <span>Compatible</span>
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>{t('recognitionLanguage')}</Label>
                                <div className="flex gap-4 px-3 h-10 items-center border rounded-md">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="recognitionLanguage"
                                            value="zh"
                                            checked={config.recognition_language === 'zh'}
                                            onChange={() => updateRecognitionLanguage('zh')}
                                            className="w-4 h-4 text-primary"
                                        />
                                        <span className="text-sm whitespace-nowrap">中文</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="recognitionLanguage"
                                            value="en"
                                            checked={config.recognition_language === 'en'}
                                            onChange={() => updateRecognitionLanguage('en')}
                                            className="w-4 h-4 text-primary"
                                        />
                                        <span className="text-sm whitespace-nowrap">English</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground -mt-2">
                            {t('recognitionLangNote')}
                        </p>


                        {config.llm_provider === 'openai-compatible' && (
                            <div className="space-y-2">
                                <Label>Base URL</Label>
                                <Input
                                    placeholder="e.g. https://api.openai.com/v1"
                                    value={config.llm_base_url}
                                    onChange={(e) => setConfig(prev => ({ ...prev, llm_base_url: e.target.value }))}
                                />
                                <p className="text-xs text-muted-foreground">The endpoint for the OpenAI compatible API.</p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>API Key</Label>
                            <Input
                                type="password"
                                placeholder={`Enter your ${config.llm_provider} API key`}
                                value={config.llm_api_key}
                                onChange={(e) => setConfig(prev => ({ ...prev, llm_api_key: e.target.value }))}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>{t('modelName')}</Label>
                            <Popover open={modelDropdownOpen} onOpenChange={setModelDropdownOpen}>
                                <div className="relative flex w-full">
                                    <Input
                                        placeholder={t('modelNamePlaceholder')}
                                        value={config.llm_model}
                                        onChange={(e) => setConfig(prev => ({ ...prev, llm_model: e.target.value }))}
                                        className="w-full pr-10 rounded-r-none"
                                    />
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className="rounded-l-none border-l-0 px-3"
                                            type="button"
                                        >
                                            <ChevronDown className="h-4 w-4 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                </div>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                    <div className="max-h-[300px] overflow-y-auto">
                                        {models && models.length > 0 ? (
                                            models.map((model) => (
                                                <button
                                                    key={model.id}
                                                    onClick={() => {
                                                        setConfig(prev => ({ ...prev, llm_model: model.id }));
                                                        setModelDropdownOpen(false);
                                                    }}
                                                    className={cn(
                                                        "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                                                        config.llm_model === model.id && "bg-accent"
                                                    )}
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            config.llm_model === model.id ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                    <span>{model.name}</span>
                                                </button>
                                            ))
                                        ) : (
                                            <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                                                No models available
                                            </div>
                                        )}
                                    </div>
                                </PopoverContent>
                            </Popover>
                            <p className="text-xs text-muted-foreground">
                                {t('modelNameNote')}
                            </p>
                        </div>
                    </CardContent>
                </Card>


                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle>{t('mealTimes')}</CardTitle>
                        <Button variant="outline" size="sm" onClick={addMeal} className="gap-2">
                            <Plus className="w-4 h-4" /> {t('addMeal')}
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-8 mt-4">
                        {config.meal_times.map((meal, index) => (
                            <div key={index} className="space-y-4 relative p-4 border rounded-xl bg-card/50">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
                                    onClick={() => removeMeal(index)}
                                >
                                    <X className="w-4 h-4" />
                                </Button>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>{t('mealName')}</Label>
                                        <Input
                                            value={meal.name}
                                            onChange={(e) => updateMeal(index, 'name', e.target.value)}
                                            placeholder="e.g. Afternoon Tea"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('defaultTime')}</Label>
                                        <SmartTimeInput
                                            value={meal.default}
                                            format={config.time_format}
                                            onChange={(val) => updateMeal(index, 'default', val)}
                                            className="font-mono"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4 pt-2">
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span className="whitespace-nowrap">{t('timeRange')}: {formatHour(meal.start)} - {formatHour(meal.end)}</span>
                                        <span className="whitespace-nowrap">{(meal.end - meal.start + 24) % 24}h {t('duration')}</span>
                                    </div>

                                    <div className="relative pt-6 pb-2">
                                        {/* Scale markers */}
                                        <div className="absolute top-0 left-0 right-0 flex justify-between px-0.5 text-[7px] text-muted-foreground cursor-default select-none pointer-events-none opacity-80">
                                            <span>{formatMarkerHour(-2)}</span>
                                            <span>{formatMarkerHour(2)}</span>
                                            <span>{formatMarkerHour(6)}</span>
                                            <span>{formatMarkerHour(10)}</span>
                                            <span>{formatMarkerHour(14)}</span>
                                            <span>{formatMarkerHour(18)}</span>
                                            <span>{formatMarkerHour(22)}</span>
                                            <span>{formatMarkerHour(26)}</span>
                                        </div>

                                        <Slider
                                            value={getVisualRange(meal.start, meal.end, meal.default)}
                                            min={-2}
                                            max={26}
                                            step={1}
                                            onValueChange={(vals) => handleSliderChange(index, vals)}
                                            className="relative z-10"
                                        />
                                    </div>

                                </div>
                            </div>
                        ))}

                        <div className="pt-4 border-t space-y-3">
                            <Label className="font-semibold px-1">{t('otherMealsFallback')}</Label>
                            <div className="flex gap-4 items-center">
                                <Input
                                    placeholder="e.g. Snack"
                                    value={config.other_meal_name}
                                    onChange={(e) => setConfig(prev => ({ ...prev, other_meal_name: e.target.value }))}
                                    className="flex-1"
                                />
                                <p className="text-[10px] text-muted-foreground max-w-[200px]">
                                    {t('otherMealsNote')}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen} className="space-y-2">
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="flex items-center gap-2 w-full justify-between p-4 hover:bg-accent/50 rounded-xl border border-dashed border-muted-foreground/20">
                            <div className="flex items-center gap-2">
                                <SettingsIcon className="w-4 h-4 text-muted-foreground" />
                                <span className="font-semibold">{t('advancedOptions')}</span>
                            </div>
                            <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", advancedOpen && "rotate-180")} />
                        </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-4">
                        <Card>
                            <CardContent className="pt-6 space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">{t('imageCompression')}</Label>
                                        <p className="text-sm text-muted-foreground">
                                            {t('compressionQualityNote')}
                                        </p>
                                    </div>
                                    <Switch
                                        checked={config.image_compression_enabled}
                                        onCheckedChange={(checked: boolean) => setConfig(prev => ({ ...prev, image_compression_enabled: checked }))}
                                    />
                                </div>

                                {config.image_compression_enabled && (
                                    <div className="space-y-4 pt-2">
                                        <div className="flex justify-between items-center">
                                            <Label>{t('compressionQuality')}</Label>
                                            <span className="text-sm font-mono font-bold text-primary">
                                                {Math.round((config.image_compression_quality || 0.85) * 100)}%
                                            </span>
                                        </div>
                                        <Slider
                                            value={[config.image_compression_quality || 0.85]}
                                            min={0.1}
                                            max={1.0}
                                            step={0.05}
                                            onValueChange={([val]) => setConfig(prev => ({ ...prev, image_compression_quality: val }))}
                                            className="py-2"
                                        />
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </CollapsibleContent>
                </Collapsible>

                <Button
                    className="w-full h-12 text-lg"
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                    {t('saveSettings')}
                </Button>

                {version && (
                    <div className="pt-8 pb-4 text-center">
                        <p className="text-xs text-muted-foreground opacity-50">
                            YuHeng v{version}
                        </p>
                    </div>
                )}
            </div>
        </div >
    );
}

