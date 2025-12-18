"use client";

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Dish } from '@/types';
import { Loader2, Camera, Trash2, Check, Edit2, Clock, Users, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { logger } from '@/lib/logger';
import { UnitPreferences } from '@/lib/db';
import { api } from '@/lib/api-client';

export default function AddPage() {
    const [image, setImage] = useState<string | null>(null);
    const [dishes, setDishes] = useState<Dish[]>([]);
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [taskId, setTaskId] = useState<string | null>(null);
    const [taskStatus, setTaskStatus] = useState<'pending' | 'processing' | 'completed' | 'failed' | null>(null);
    const [unitPrefs, setUnitPrefs] = useState<UnitPreferences>({ energy: 'kcal', weight: 'g' });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    // Edit State
    const [editingDish, setEditingDish] = useState<Dish | null>(null);
    const [editPrompt, setEditPrompt] = useState('');
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    // Backfill State
    const [isBackfill, setIsBackfill] = useState(false);
    const [backfillDate, setBackfillDate] = useState('');
    const [backfillTime, setBackfillTime] = useState('');
    const [backfillType, setBackfillType] = useState('Breakfast');

    // Split State
    const [numPeople, setNumPeople] = useState(1);
    const [personalPortion, setPersonalPortion] = useState(100);

    useEffect(() => {
        // Initialize dates on client to avoid hydration mismatch
        setBackfillDate(new Date().toISOString().split('T')[0]);
        setBackfillTime(new Date().toTimeString().slice(0, 5));

        // Fetch unit preferences on mount
        api.getSettings()
            .then(data => {
                if (data.unit_preferences) setUnitPrefs(data.unit_preferences);
            })
            .catch(err => console.error('Failed to load settings:', err));
    }, []);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (taskId && (taskStatus === 'pending' || taskStatus === 'processing')) {
            interval = setInterval(async () => {
                try {
                    const data = await api.getRecognitionTask(taskId);
                    setTaskStatus(data.status);
                    if (data.status === 'completed') {
                        setDishes(data.result || []);
                        setLoading(false);
                        clearInterval(interval);
                        toast.success("Recognition complete!");
                    } else if (data.status === 'failed') {
                        setLoading(false);
                        clearInterval(interval);
                        toast.error("Recognition failed: " + data.error);
                    }
                } catch (error) {
                    console.error("Polling error:", error);
                }
            }, 2000);
        }
        return () => clearInterval(interval);
    }, [taskId, taskStatus]);

    useEffect(() => {
        // Update personal portion default when numPeople changes
        if (numPeople > 1) {
            setPersonalPortion(Math.round(100 / numPeople));
        } else {
            setPersonalPortion(100);
        }
    }, [numPeople]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImage(reader.result as string);
                analyzeImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const analyzeImage = async (imgData: string) => {
        setLoading(true);
        setTaskId(null);
        setTaskStatus('pending');
        try {
            const data = await api.startRecognition(imgData);
            setTaskId(data.taskId);
            toast.info("Image uploaded! Processing in background...");
        } catch (error) {
            logger.error(error as Error, "Failed to start recognition");
            toast.error("Failed to start recognition");
            setLoading(false);
        }
    };

    const handleFixDish = async () => {
        if (!editingDish) return;
        setLoading(true);
        try {
            const data = await api.geminiFix({
                mode: 'fix',
                userPrompt: editPrompt,
                dish: editingDish,
                image: image || undefined
            });

            // Update dish in list
            setDishes(prev => prev.map(d => d === editingDish ? data : d));
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

    const handleAddAll = async () => {
        setProcessing(true);
        try {
            const data = await api.smartAdd({
                dishes: dishes.map(d => ({
                    ...d,
                    weight: Math.round(d.weight * personalPortion / 100)
                })),
                date: isBackfill ? backfillDate : new Date().toISOString().split('T')[0],
                time: isBackfill ? backfillTime : undefined,
                type: isBackfill ? backfillType : undefined,
            });
            toast.success("All dishes added successfully!");
            router.push('/');
        } catch (error) {
            logger.error(error as Error, "Failed to add dishes");
            toast.error("Failed to add dishes");
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="min-h-screen p-4 pb-24 space-y-4">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Add Meal</h1>
                <Button variant="ghost" onClick={() => router.push('/')}>Cancel</Button>
            </div>

            {!image ? (
                <Card className="border-dashed border-2 h-64 flex flex-col items-center justify-center cursor-pointer hover:bg-accent/50 transition" onClick={() => fileInputRef.current?.click()}>
                    <Camera className="w-12 h-12 mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">Tap to take photo or upload</p>
                    <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                    />
                </Card>
            ) : (
                <div className="relative h-64 w-full rounded-lg overflow-hidden">
                    <Image src={image} alt="Food" fill className="object-cover" />
                    <div className="absolute top-2 right-2 flex gap-2">
                        <Button
                            size="icon"
                            variant="secondary"
                            className="bg-background/80 backdrop-blur-sm"
                            onClick={() => image && analyzeImage(image)}
                            disabled={loading}
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button size="icon" variant="destructive" onClick={() => { setImage(null); setDishes([]); setTaskId(null); setTaskStatus(null); }}>
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}

            {loading && (
                <div className="flex flex-col items-center justify-center p-8 space-y-4">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <div className="text-center">
                        <p className="font-medium">Recognizing food...</p>
                        <p className="text-sm text-muted-foreground">You can leave this page, we'll keep working</p>
                    </div>
                </div>
            )}

            {dishes.length > 0 && (
                <>
                    <div className="space-y-4">
                        {dishes.map((dish, idx) => (
                            <Card key={idx} className="relative">
                                <CardHeader className="pb-2">
                                    <CardTitle className="flex justify-between items-center text-base">
                                        <span>{dish.name}</span>
                                        <div className="flex gap-2">
                                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => {
                                                setEditingDish(dish);
                                                setIsEditDialogOpen(true);
                                            }}>
                                                <Edit2 className="w-4 h-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => {
                                                setDishes(prev => prev.filter((_, i) => i !== idx));
                                            }}>
                                                <Trash2 className="w-4 h-4 text-destructive" />
                                            </Button>
                                        </div>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">Weight ({unitPrefs.weight})</Label>
                                            <Input
                                                type="number"
                                                value={dish.weight}
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value) || 0;
                                                    setDishes(prev => prev.map((d, i) => i === idx ? { ...d, weight: val } : d));
                                                }}
                                                className="h-8"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">Total Energy</Label>
                                            <div className="h-8 flex items-center font-bold text-primary">
                                                {Math.round(dish.calories * dish.weight / 100)} {unitPrefs.energy}
                                            </div>
                                        </div>
                                        <div className="text-muted-foreground col-span-2 text-xs pt-2 border-t">
                                            Per 100g: P: {dish.protein}g | F: {dish.fat}g | C: {dish.carbs}g ({dish.calories}{unitPrefs.energy})
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Multi-user Split */}
                    <Card className="bg-primary/5 border-primary/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Users className="w-4 h-4" /> Meal Sharing
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label>Number of People</Label>
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

                            <div className="space-y-2">
                                <div className="flex justify-between text-xs">
                                    <Label>Personal Portion</Label>
                                    <span className="font-bold">{personalPortion}%</span>
                                </div>
                                <input
                                    type="range"
                                    value={personalPortion}
                                    onChange={(e) => setPersonalPortion(parseInt(e.target.value))}
                                    max={100}
                                    step={1}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                                <p className="text-[10px] text-muted-foreground">
                                    Final log will be {personalPortion}% of the total weight.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Backfill Options - Now visible after recognition */}
                    <div className="bg-muted/30 p-4 rounded-xl space-y-4">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="backfill" className="font-semibold cursor-pointer flex items-center gap-2">
                                <Clock className="w-4 h-4" /> Backfill this meal
                            </Label>
                            <input
                                type="checkbox"
                                id="backfill"
                                checked={isBackfill}
                                onChange={(e) => setIsBackfill(e.target.checked)}
                                className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                        </div>

                        {isBackfill && (
                            <div className="grid grid-cols-2 gap-4 animate-in fade-in zoom-in-95 duration-200">
                                <div className="space-y-1">
                                    <Label className="text-xs">Date</Label>
                                    <Input
                                        type="date"
                                        value={backfillDate}
                                        onChange={(e) => setBackfillDate(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Time</Label>
                                    <Input
                                        type="time"
                                        value={backfillTime}
                                        onChange={(e) => setBackfillTime(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1 col-span-2">
                                    <Label className="text-xs">Meal Type</Label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        value={backfillType}
                                        onChange={(e) => setBackfillType(e.target.value)}
                                    >
                                        <option value="Breakfast">Breakfast</option>
                                        <option value="Lunch">Lunch</option>
                                        <option value="Dinner">Dinner</option>
                                        <option value="Snack">Snack</option>
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {dishes.length > 0 && (
                <Button className="w-full h-12 text-lg" onClick={handleAddAll} disabled={processing}>
                    {processing ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Check className="w-5 h-5 mr-2" />}
                    Confirm Add All
                </Button>
            )}

            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Dish: {editingDish?.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Instructions for AI</Label>
                            <Textarea
                                placeholder="e.g. It's actually beef, not pork. Or: make it 300g."
                                value={editPrompt}
                                onChange={(e) => setEditPrompt(e.target.value)}
                            />
                        </div>
                        <Button onClick={handleFixDish} disabled={loading} className="w-full">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Dish"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
