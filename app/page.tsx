"use client";

import { useEffect, useState } from 'react';
import { useApp } from '@/components/app-provider';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Plus, Settings, RefreshCw, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const { token, baseUrl, planId, fetchPlans } = useApp();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [stats, setStats] = useState({
    calories: 0,
    protein: 0,
    fat: 0,
    carbs: 0,
    targetCalories: 2500
  });

  useEffect(() => {
    if (!token) {
      router.push('/settings');
      return;
    }
    if (!planId) {
      fetchPlans();
      router.push('/settings');
      return;
    }
    loadPlanStats();
  }, [token, planId]);

  const loadPlanStats = async () => {
    if (!planId || !token || !baseUrl) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/wger/stats?planId=${planId}`, {
        headers: {
          'x-wger-token': token,
          'x-wger-base-url': baseUrl,
        },
      });
      const data = await res.json();
      if (!data.error) {
        setStats(prev => ({
          ...prev,
          calories: data.calories || 0,
          protein: data.protein || 0,
          fat: data.fat || 0,
          carbs: data.carbs || 0,
        }));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const caloriePercent = Math.min((stats.calories / stats.targetCalories) * 100, 100);

  return (
    <div className="min-h-screen p-4 pb-24 flex flex-col gap-6 bg-gradient-to-b from-background to-background/80">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
          WgerLens
        </h1>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={loadPlanStats} disabled={loading}>
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
          </Button>
          <Link href="/settings">
            <Button variant="ghost" size="icon">
              <Settings className="w-6 h-6" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Circular Progress for Calories */}
      <div className="flex justify-center py-8">
        <div className="relative w-52 h-52 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90">
            <defs>
              <linearGradient id="calGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--primary))" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
            <circle
              cx="104"
              cy="104"
              r="92"
              stroke="currentColor"
              strokeWidth="14"
              fill="transparent"
              className="text-muted/20"
            />
            <circle
              cx="104"
              cy="104"
              r="92"
              stroke="url(#calGradient)"
              strokeWidth="14"
              fill="transparent"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 92}
              strokeDashoffset={2 * Math.PI * 92 * (1 - caloriePercent / 100)}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute text-center">
            <div className="text-4xl font-bold">{Math.round(stats.calories)}</div>
            <div className="text-sm text-muted-foreground">/ {stats.targetCalories} kcal</div>
          </div>
        </div>
      </div>

      {/* Macros Bars */}
      <div className="space-y-5 px-2">
        <div className="space-y-2">
          <div className="flex justify-between text-sm font-medium">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500"></span>
              Protein
            </span>
            <span>{Math.round(stats.protein)}g / 150g</span>
          </div>
          <div className="h-3 bg-muted/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-700"
              style={{ width: `${Math.min((stats.protein / 150) * 100, 100)}%` }}
            />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm font-medium">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
              Carbs
            </span>
            <span>{Math.round(stats.carbs)}g / 250g</span>
          </div>
          <div className="h-3 bg-muted/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-700"
              style={{ width: `${Math.min((stats.carbs / 250) * 100, 100)}%` }}
            />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm font-medium">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500"></span>
              Fat
            </span>
            <span>{Math.round(stats.fat)}g / 80g</span>
          </div>
          <div className="h-3 bg-muted/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-700"
              style={{ width: `${Math.min((stats.fat / 80) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <Link href="/add" className="fixed bottom-8 right-8 z-50">
        <Button size="icon" className="w-16 h-16 rounded-full shadow-2xl text-white bg-gradient-to-br from-primary to-purple-600 hover:from-primary/90 hover:to-purple-500 transition-all duration-300 hover:scale-110">
          <Plus className="w-8 h-8" />
        </Button>
      </Link>
    </div>
  );
}
