"use client";

import { useState, useRef } from 'react';
import { useApp } from '@/components/app-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Dish } from '@/types';
import { Loader2, Plus, Camera, Upload, Trash2, Check, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { logger } from '@/lib/logger';

export default function AddPage() {
    const { token, baseUrl, planId } = useApp();
    const [image, setImage] = useState<string | null>(null);
    const [dishes, setDishes] = useState<Dish[]>([]);
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    // Edit State
    const [editingDish, setEditingDish] = useState<Dish | null>(null);
    const [editPrompt, setEditPrompt] = useState('');
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

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
        try {
            const res = await fetch('/api/gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: imgData, mode: 'init' }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setDishes(data);
        } catch (error) {
            logger.error(error as Error, "Failed to analyze image");
            toast.error("Failed to analyze image");
        } finally {
            setLoading(false);
        }
    };

    const handleFixDish = async () => {
        if (!editingDish) return;
        setLoading(true);
        try {
            const res = await fetch('/api/gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mode: 'fix',
                    prompt: editPrompt,
                    dish: editingDish,
                    image: image // Optional, but good for context
                }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);

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
        if (!planId) {
            toast.error("No plan selected. Go to settings.");
            return;
        }
        setProcessing(true);
        try {
            const res = await fetch('/api/wger/smart-add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-wger-token': token,
                    'x-wger-base-url': baseUrl,
                },
                body: JSON.stringify({
                    dishes,
                    planId,
                    date: new Date().toISOString().split('T')[0],
                }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            toast.success("All dishes added successfully!");
            router.push('/');
        } catch (error) {
            logger.error(error as Error, "Failed to add dishes to Wger");
            toast.error("Failed to add dishes to Wger");
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
                    <Button size="icon" variant="destructive" className="absolute top-2 right-2" onClick={() => { setImage(null); setDishes([]); }}>
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            )}

            {loading && (
                <div className="flex justify-center p-8">
                    <Loader2 className="w-8 h-8 animate-spin" />
                </div>
            )}

            <div className="space-y-4">
                {dishes.map((dish, idx) => (
                    <Card key={idx} className="relative">
                        <CardHeader className="pb-2">
                            <CardTitle className="flex justify-between items-center">
                                <span>{dish.name}</span>
                                <div className="flex gap-2">
                                    <Button size="icon" variant="ghost" onClick={() => {
                                        setEditingDish(dish);
                                        setIsEditDialogOpen(true);
                                    }}>
                                        <Edit2 className="w-4 h-4" />
                                    </Button>
                                    <Button size="icon" variant="ghost" onClick={() => {
                                        setDishes(prev => prev.filter((_, i) => i !== idx));
                                    }}>
                                        <Trash2 className="w-4 h-4 text-destructive" />
                                    </Button>
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>Weight: {dish.weight}g</div>
                                <div>Calories: {Math.round(dish.calories * dish.weight / 100)} kcal</div>
                                <div className="text-muted-foreground col-span-2 text-xs">
                                    P: {dish.protein}g | F: {dish.fat}g | C: {dish.carbs}g (per 100g)
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

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
