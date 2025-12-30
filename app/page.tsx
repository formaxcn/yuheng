"use client";

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Plus, Settings, RefreshCw, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { displayEnergy, displayWeight, type EnergyUnit, type WeightUnit } from '@/lib/units';
import { BackendStatus } from '@/components/backend-status';

export default function HomePage() {
  const [loading, setLoading] = useState(false);

  const [stats, setStats] = useState({
    calories: 0,
    protein: 0,
    fat: 0,
    carbs: 0,
    targetCalories: 2500,
    targetProtein: 150,
    targetCarbs: 250,
    targetFat: 80,
    meals: [] as { type: string, calories: number }[],
    history: [] as { date: string, calories: number }[]
  });

  const [unitPrefs, setUnitPrefs] = useState<{ energy: EnergyUnit; weight: WeightUnit }>({
    energy: 'kcal',
    weight: 'g'
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      // Load stats and settings in parallel
      const [data, settingsData] = await Promise.all([
        api.getStats(),
        api.getSettings()
      ]);

      setStats(prev => ({
        ...prev,
        calories: data.calories || 0,
        protein: data.protein || 0,
        fat: data.fat || 0,
        carbs: data.carbs || 0,
        targetCalories: data.targetCalories || 2500,
        targetProtein: data.targetProtein || 150,
        targetCarbs: data.targetCarbs || 250,
        targetFat: data.targetFat || 80,
        meals: data.meals || [],
        history: data.history || []
      }));

      if (settingsData.unit_preferences) {
        setUnitPrefs(settingsData.unit_preferences);
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
      <div className="flex justify-between items-start">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
            YuHeng
          </h1>
          <div className="ml-0.5 mt-[-2px]">
            <BackendStatus />
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/settings">
            <Button variant="ghost" size="icon">
              <Settings className="w-5 h-5" />
            </Button>
          </Link>
          <Button variant="ghost" size="icon" onClick={loadStats} disabled={loading}>
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
          </Button>
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
            <div className="text-4xl font-bold">{displayEnergy(stats.calories, unitPrefs.energy)}</div>
            <div className="text-sm text-muted-foreground">/ {displayEnergy(stats.targetCalories, unitPrefs.energy)} {unitPrefs.energy}</div>
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
            <span>{displayWeight(stats.protein, unitPrefs.weight)}{unitPrefs.weight} / {displayWeight(stats.targetProtein, unitPrefs.weight)}{unitPrefs.weight}</span>
          </div>
          <div className="h-3 bg-muted/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-700"
              style={{ width: `${Math.min((stats.protein / stats.targetProtein) * 100, 100)}%` }}
            />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm font-medium">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
              Carbs
            </span>
            <span>{displayWeight(stats.carbs, unitPrefs.weight)}{unitPrefs.weight} / {displayWeight(stats.targetCarbs, unitPrefs.weight)}{unitPrefs.weight}</span>
          </div>
          <div className="h-3 bg-muted/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-700"
              style={{ width: `${Math.min((stats.carbs / stats.targetCarbs) * 100, 100)}%` }}
            />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm font-medium">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500"></span>
              Fat
            </span>
            <span>{displayWeight(stats.fat, unitPrefs.weight)}{unitPrefs.weight} / {displayWeight(stats.targetFat, unitPrefs.weight)}{unitPrefs.weight}</span>
          </div>
          <div className="h-3 bg-muted/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-700"
              style={{ width: `${Math.min((stats.fat / stats.targetFat) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>



      {/* Meals Breakdown */}
      <div className="grid grid-cols-2 gap-3 px-2">
        {stats.meals.filter(m => m.calories > 0).map((meal) => {
          const colors: { [key: string]: string } = {
            'Breakfast': 'bg-emerald-500/10 border-emerald-500/50 text-emerald-700',
            'Lunch': 'bg-blue-500/10 border-blue-500/50 text-blue-700',
            'Dinner': 'bg-purple-500/10 border-purple-500/50 text-purple-700',
            'Snack': 'bg-orange-500/10 border-orange-500/50 text-orange-700',
          };
          const colorClass = colors[meal.type] || colors['Snack'];

          return (
            <div key={meal.type} className={`p-3 rounded-xl border ${colorClass} flex flex-col items-center justify-center`}>
              <span className="text-xs font-semibold uppercase opacity-70">{meal.type}</span>
              <span className="text-xl font-bold">{displayEnergy(meal.calories, unitPrefs.energy)}</span>
              <span className="text-xs opacity-60">{unitPrefs.energy}</span>
            </div>
          );
        })}
      </div>

      {/* History Chart */}
      <div className="px-2 pt-4 pb-20">
        <h3 className="text-lg font-semibold mb-4 text-foreground/80">Last 7 Days</h3>
        <div className="flex items-end justify-between h-40 gap-2">
          {stats.history.map((day) => {
            const height = Math.min((day.calories / stats.targetCalories) * 100, 100);
            const isToday = new Date().toISOString().split('T')[0] === day.date;

            return (
              <div key={day.date} className="flex flex-col items-center flex-1 gap-2 group">
                <div className="w-full relative flex items-end justify-center h-32 bg-muted/20 rounded-t-md overflow-hidden">
                  <div
                    suppressHydrationWarning
                    className={`w-full transition-all duration-1000 ${isToday ? 'bg-primary' : 'bg-primary/40 group-hover:bg-primary/60'}`}
                    style={{ height: `${height}%` }}
                  />
                </div>
                <span suppressHydrationWarning className="text-[10px] text-muted-foreground font-medium">
                  {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Action Button */}
      <Link href="/add" className="fixed bottom-8 right-8 z-50">
        <Button size="icon" className="w-16 h-16 rounded-full shadow-2xl text-white bg-gradient-to-br from-primary to-purple-600 hover:from-primary/90 hover:to-purple-500 transition-all duration-300 hover:scale-110">
          <Plus className="w-8 h-8" />
        </Button>
      </Link>
    </div >
  );
}
