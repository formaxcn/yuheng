"use client";

import React, { use, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Dish } from '@/types';
import { Loader2, Trash2, Check, Edit2, Clock, Users, ChevronLeft, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { logger } from '@/lib/logger';
import { UnitPreferences } from '@/lib/db';
import { api } from '@/lib/api-client';
import { recognitionStore } from '@/lib/recognition-store';
import Link from 'next/link';

export default function RecognitionResultPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [task, setTask] = useState<any>(null);
    const [dishes, setDishes] = useState<Dish[]>([]);
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [retrying, setRetrying] = useState(false);
    const [unitPrefs, setUnitPrefs] = useState<UnitPreferences>({ energy: 'kcal', weight: 'g' });

    // Edit State
    const [editingDish, setEditingDish] = useState<Dish | null>(null);
    const [editPrompt, setEditPrompt] = useState('');
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    // Retry State
    const [retryPrompt, setRetryPrompt] = useState('');
    const [isRetryDialogOpen, setIsRetryDialogOpen] = useState(false);

    // Backfill State
    const [isBackfill, setIsBackfill] = useState(false);
    const [backfillDate, setBackfillDate] = useState('');
    const [backfillTime, setBackfillTime] = useState('');
    const [backfillType, setBackfillType] = useState('Breakfast');
    const [mealNames, setMealNames] = useState<string[]>(['Breakfast', 'Lunch', 'Dinner', 'Snack']);
    const [mealSettings, setMealSettings] = useState<any[]>([]);
    const [otherMealName, setOtherMealName] = useState('Snack');
    const [initialTimeSet, setInitialTimeSet] = useState(false);

    // Function to match time to meal name
    const matchTimeToMeal = (time: string): string => {
        // If we have meal settings, try to match the time to a meal
        if (mealSettings && mealSettings.length > 0) {
            const [hours, minutes] = time.split(':').map(Number);
            const selectedHour = hours + minutes / 60;

            for (const meal of mealSettings) {
                const { start, end } = meal;
                
                // Check if selected time falls within the meal's time range
                if (start < end) {
                    // Normal range (e.g., 8:00 - 12:00)
                    if (selectedHour >= start && selectedHour < end) {
                        return meal.name;
                    }
                } else {
                    // Cross-midnight range (e.g., 22:00 - 2:00)
                    if (selectedHour >= start || selectedHour < end) {
                        return meal.name;
                    }
                }
            }
        }

        // If no match found or no meal settings, use the configured other meal name
        return otherMealName || 'Snack';
    };

    // Split State
    const [isSharing, setIsSharing] = useState(false);
    const [numPeople, setNumPeople] = useState(1);
    const [personalPortion, setPersonalPortion] = useState(100);

    useEffect(() => {
        const t = recognitionStore.getTask(id);
        if (!t) {
            toast.error("Task not found");
            router.push('/');
            return;
        }
        setTask(t);
        setDishes(t.result || []);

        // Use local timezone for backfill date and time
        const now = new Date();
        setBackfillDate(now.toLocaleDateString('en-CA'));
        const currentTime = now.toTimeString().slice(0, 5);
        setBackfillTime(currentTime);

        api.getSettings()
            .then(data => {
                if (data.unit_preferences) setUnitPrefs(data.unit_preferences);
                if (data.meal_times && data.meal_times.length > 0) {
                    // Extract meal names from user settings
                    const names = data.meal_times.map((meal: any) => meal.name);
                    // Always include the other meal name in the dropdown
                    if (data.other_meal_name && !names.includes(data.other_meal_name)) {
                        names.push(data.other_meal_name);
                    }
                    setMealNames(names);
                    setMealSettings(data.meal_times);
                    
                    // Set default backfill type based on current time
                    const matchedMeal = matchTimeToMeal(currentTime);
                    setBackfillType(matchedMeal);
                } else {
                    // Fallback to default meal names if no custom settings
                    const defaultNames = ['Breakfast', 'Lunch', 'Dinner'];
                    // Include the other meal name in the dropdown
                    if (data.other_meal_name && !defaultNames.includes(data.other_meal_name)) {
                        defaultNames.push(data.other_meal_name);
                    }
                    setMealNames(defaultNames);
                    setBackfillType('Dinner');
                }
                if (data.other_meal_name) {
                    setOtherMealName(data.other_meal_name);
                }
                setInitialTimeSet(true);
            })
            .catch(err => {
                console.error('Failed to load settings:', err);
                // Set default meal type based on current time even if settings fail
                const matchedMeal = matchTimeToMeal(currentTime);
                setBackfillType(matchedMeal);
                // Use default snack name if settings fail to load
                setOtherMealName('Snack');
                setMealNames(['Breakfast', 'Lunch', 'Dinner', 'Snack']);
                setInitialTimeSet(true);
            });
    }, [id]);

    useEffect(() => {
        if (numPeople > 1) {
            setPersonalPortion(Math.round(100 / numPeople));
        } else {
            setPersonalPortion(100);
        }
    }, [numPeople]);

    const handleFixDish = async () => {
        if (!editingDish || !task) return;
        setLoading(true);
        try {
            const data = await api.adjustment({
                mode: 'fix',
                userPrompt: editPrompt,
                dish: editingDish,
                image: task.imageData
            });

            // Update dish in list
            const updatedDishes = dishes.map(d => d === editingDish ? data : d);
            setDishes(updatedDishes);
            recognitionStore.updateTask(id, { result: updatedDishes });

            setIsEditDialogOpen(false);
            setEditingDish(null);
            setEditPrompt('');
            toast.success("Dish updated!");
        } catch (error) {
            logger.error(error as Error, "Failed to update dish");
            toast.error("Failed to update dish");
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmAdd = async () => {
        setProcessing(true);
        try {
            await api.smartAdd({
            dishes: dishes.map(d => ({
                ...d,
                weight: isSharing ? Math.round(d.weight * personalPortion / 100) : d.weight
            })),
            date: isBackfill ? backfillDate : new Date().toLocaleDateString('en-CA'),
            time: isBackfill ? backfillTime : undefined,
            type: isBackfill ? backfillType : undefined,
        });
            toast.success("Meal added successfully!");
            recognitionStore.removeTask(id);
            router.push('/');
        } catch (error) {
            logger.error(error as Error, "Failed to add meal");
            toast.error("Failed to add meal");
        } finally {
            setProcessing(false);
        }
    };

    const handleGuidedRetry = async () => {
        setRetrying(true);
        try {
            await recognitionStore.retryTask(id, retryPrompt);
            toast.success("Re-recognition started!");
            router.push('/'); // Redirect to home to see progress in queue
        } catch (error) {
            toast.error("Failed to restart recognition");
        } finally {
            setRetrying(false);
            setIsRetryDialogOpen(false);
        }
    };

    if (!task) return null;

    return (
        <div className="min-h-screen p-4 pb-24 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Link href="/">
                        <Button variant="ghost" size="icon">
                            <ChevronLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-bold">Recognition Results</h1>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 h-9 border-primary/20 hover:bg-primary/5"
                    onClick={() => setIsRetryDialogOpen(true)}
                >
                    <RefreshCw className="w-4 h-4" /> Guided Retry
                </Button>
            </div>

            <div className="relative h-64 w-full rounded-2xl overflow-hidden shadow-lg">
                <Image src={task.imageData} alt="Food" fill className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                    <p className="text-white/80 text-sm">
                        Captured on {new Date(task.created_at).toLocaleString()}
                    </p>
                </div>
            </div>

            <div className="space-y-4">
                {dishes.length === 0 && task.status === 'completed' && (
                    <Card className="bg-muted/50 border-dashed">
                        <CardContent className="h-40 flex items-center justify-center text-muted-foreground italic">
                            No dishes were identified. Try again with a clearer photo.
                        </CardContent>
                    </Card>
                )}

                {dishes.map((dish, idx) => (
                    <Card key={idx} className="relative overflow-hidden border-primary/10">
                        <CardHeader className="pb-3 bg-primary/5">
                            <CardTitle className="flex justify-between items-center text-base">
                                <span>{dish.name}</span>
                                <div className="flex gap-1">
                                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => {
                                        setEditingDish(dish);
                                        setIsEditDialogOpen(true);
                                    }}>
                                        <Edit2 className="w-4 h-4" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => {
                                        const newDishes = dishes.filter((_, i) => i !== idx);
                                        setDishes(newDishes);
                                        recognitionStore.updateTask(id, { result: newDishes });
                                    }}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Weight ({unitPrefs.weight})</Label>
                                    <Input
                                        type="number"
                                        value={dish.weight}
                                        onChange={(e) => {
                                            // Handle empty input by converting to 0
                                            const val = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                                            const newDishes = dishes.map((d, i) => i === idx ? { ...d, weight: val } : d);
                                            setDishes(newDishes);
                                            recognitionStore.updateTask(id, { result: newDishes });
                                        }}
                                        onFocus={(e) => {
                                            // Select all text when input gains focus
                                            e.target.select();
                                        }}
                                        className="h-9 focus-visible:ring-primary"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Total Energy</Label>
                                    <div className="h-9 flex items-center font-bold text-lg text-primary">
                                        {Math.round(dish.calories * dish.weight / 100)} <span className="text-xs ml-1 font-normal opacity-70">{unitPrefs.energy}</span>
                                    </div>
                                </div>
                                <div className="col-span-2 p-3 bg-muted/40 rounded-lg text-[11px] grid grid-cols-4 gap-2 text-center border border-muted/20">
                                    <div>P: <span className="font-bold text-blue-600">{dish.protein}g</span></div>
                                    <div>F: <span className="font-bold text-amber-600">{dish.fat}g</span></div>
                                    <div>C: <span className="font-bold text-green-600">{dish.carbs}g</span></div>
                                    <div>({dish.calories}{unitPrefs.energy}/100g)</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {dishes.length > 0 && (
                <>
                    <div className="bg-primary/5 border border-primary/20 p-5 rounded-2xl space-y-4">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="sharing" className="font-bold cursor-pointer flex items-center gap-2 text-primary">
                                <Users className="w-4 h-4" /> Meal Sharing
                            </Label>
                            <input
                                type="checkbox"
                                id="sharing"
                                checked={isSharing}
                                onChange={(e) => setIsSharing(e.target.checked)}
                                className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary transition-all"
                            />
                        </div>

                        {isSharing && (
                            <div className="space-y-5 animate-in slide-in-from-top-2 duration-300">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm font-medium">Number of People</Label>
                                    <div className="flex items-center gap-2">
                                        {[1, 2, 3, 4].map(n => (
                                            <Button
                                                key={n}
                                                variant={numPeople === n ? "default" : "outline"}
                                                size="sm"
                                                className="h-8 w-8 p-0"
                                                onClick={() => setNumPeople(n)}
                                            >
                                                {n}
                                            </Button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between text-xs font-medium">
                                        <Label>Personal Portion</Label>
                                        <span className="text-primary font-bold">{personalPortion}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        value={personalPortion}
                                        onChange={(e) => setPersonalPortion(parseInt(e.target.value))}
                                        max={100}
                                        step={1}
                                        className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                                    />
                                    <p className="text-[10px] text-muted-foreground italic">
                                        Final log will be {personalPortion}% of the total weight for all dishes.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-muted/30 p-5 rounded-2xl space-y-4 border border-transparent">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="backfill" className="font-bold cursor-pointer flex items-center gap-2">
                                <Clock className="w-4 h-4" /> Backfill this meal
                            </Label>
                            <input
                                type="checkbox"
                                id="backfill"
                                checked={isBackfill}
                                onChange={(e) => setIsBackfill(e.target.checked)}
                                className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary transition-all"
                            />
                        </div>

                        {isBackfill && (
                            <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold uppercase tracking-wider opacity-60">Date</Label>
                                    <Input
                                        type="date"
                                        value={backfillDate}
                                        onChange={(e) => setBackfillDate(e.target.value)}
                                        className="h-10"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold uppercase tracking-wider opacity-60">Time</Label>
                                    <Input
                                        type="time"
                                        value={backfillTime}
                                        onChange={(e) => {
                                            const newTime = e.target.value;
                                            setBackfillTime(newTime);
                                            // Auto-update meal type based on selected time
                                            const matchedMeal = matchTimeToMeal(newTime);
                                            setBackfillType(matchedMeal);
                                        }}
                                        className="h-10"
                                    />
                                </div>
                                <div className="space-y-1.5 col-span-2">
                                    <Label className="text-xs font-semibold uppercase tracking-wider opacity-60">Meal Type</Label>
                                    <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                                    value={backfillType}
                                    onChange={(e) => setBackfillType(e.target.value)}
                                >
                                    {mealNames.map(mealName => (
                                        <option key={mealName} value={mealName}>
                                            {mealName}
                                        </option>
                                    ))}
                                </select>
                                </div>
                            </div>
                        )}
                    </div>

                    <Button
                        className="w-full h-14 text-lg font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all active:scale-95"
                        onClick={handleConfirmAdd}
                        disabled={processing}
                    >
                        {processing ? <Loader2 className="w-6 h-6 animate-spin mr-2" /> : <Check className="w-6 h-6 mr-2" />}
                        Confirm & Save to Log
                    </Button>
                </>
            )}

            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Refine Dish: {editingDish?.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-5 pt-2">
                        <div className="space-y-2.5">
                            <Label className="text-sm font-medium">Instructions for AI</Label>
                            <Textarea
                                placeholder="e.g. It's actually beef, not pork. Or: make it 300g."
                                value={editPrompt}
                                onChange={(e) => setEditPrompt(e.target.value)}
                                className="min-h-[100px] resize-none focus-visible:ring-primary"
                            />
                            <p className="text-[10px] text-muted-foreground">
                                The AI will re-evaluate the nutrition based on your feedback and the original photo.
                            </p>
                        </div>
                        <Button onClick={handleFixDish} disabled={loading} className="w-full h-11">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Update Dish Nutrition
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isRetryDialogOpen} onOpenChange={setIsRetryDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Guided Re-recognition</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-5 pt-2">
                        <div className="space-y-2.5">
                            <Label className="text-sm font-medium">Extra Instructions for AI</Label>
                            <Textarea
                                placeholder="e.g. Total weight is about 500g. It's mostly rice. The yellowish part is actually curry."
                                value={retryPrompt}
                                onChange={(e) => setRetryPrompt(e.target.value)}
                                className="min-h-[120px] resize-none focus-visible:ring-primary"
                            />
                            <p className="text-[10px] text-muted-foreground italic">
                                This will restart the entire recognition process using the original photo and your new instructions.
                            </p>
                        </div>
                        <Button onClick={handleGuidedRetry} disabled={retrying} className="w-full h-11 bg-primary hover:bg-primary/90">
                            {retrying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                            Restart Recognition
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
