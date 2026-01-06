"use client";

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Plus, Settings, RefreshCw, Loader2, Flame, Shield, Wheat, Droplets } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { displayEnergy, displayWeight, type EnergyUnit, type WeightUnit } from '@/lib/units';
import { RecognitionQueue } from '@/components/recognition-queue';
import { useBackendStatus } from '@/hooks/use-backend-status';


export default function HomePage() {
  const [loading, setLoading] = useState(false);
  const status = useBackendStatus();

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
    <div className="min-h-screen p-4 pb-24 flex flex-col gap-6 bg-gradient-to-b from-background to-background/80 max-w-2xl mx-auto w-full">
      <div className="flex justify-between items-center px-1">
        <div className="flex flex-col">
          <h1 className="text-2xl font-black bg-gradient-to-r from-primary via-purple-400 to-primary bg-clip-text text-transparent tracking-tighter">
            YuHeng
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/settings">
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted/10 transition-colors">
              <Settings className="w-5 h-5 text-muted-foreground/60" />
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={loadStats}
            disabled={loading}
            className={`rounded-full transition-all duration-500 ${status?.online ? 'hover:bg-emerald-500/10' : 'hover:bg-red-500/10'}`}
          >
            <div className={`relative flex items-center justify-center ${loading || (status?.online) ? 'animate-none' : ''}`}>
              <RefreshCw className={`w-5 h-5 transition-colors ${status?.online
                ? 'text-emerald-500 animate-[spin_4s_linear_infinite]'
                : 'text-red-500'
                } ${loading ? 'animate-spin' : ''}`} />
            </div>
          </Button>
        </div>
      </div>

      {/* Progress Header */}
      <div className="px-3 flex flex-col gap-0.5 mb-[-12px] mt-2">
        <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] leading-tight opacity-50">Activity Status</span>
        <h2 className="text-2xl font-black text-foreground tracking-tighter uppercase italic">Today's Progress</h2>
      </div>

      {/* Advanced Dashboard (Responsive Side-by-Side) */}
      <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-8 p-6 sm:p-5 bg-muted/5 rounded-[2.5rem] border border-muted/10 mx-2 shadow-xl backdrop-blur-xl shrink-0 overflow-hidden group">
        {/* Left Side: Stacking Rings */}
        <div className="relative w-44 h-44 sm:w-48 sm:h-48 flex items-center justify-center shrink-0">
          <svg className="w-full h-full transform -rotate-90 filter drop-shadow-[0_0_20px_rgba(0,0,0,0.5)]" viewBox="0 0 160 160">
            {/* Background Rings */}
            {[72, 54, 36, 18].map(r => (
              <circle key={r} cx="80" cy="80" r={r} stroke="currentColor" strokeWidth="10" fill="transparent" className="text-muted/5" />
            ))}

            {(() => {
              const renderRing = (val: number, target: number, r: number, color: string, glow: string, idx: number, Icon: any) => {
                const percent = (val / target) * 100;
                const lap1 = Math.min(percent, 100);
                const lap2 = Math.max(0, Math.min(percent - 100, 100));
                const circ = 2 * Math.PI * r;
                return (
                  <g key={idx}>
                    <circle cx="80" cy="80" r={r} stroke={color} strokeWidth="10" fill="transparent" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - lap1 / 100)} className="transition-all duration-1000 ease-out" />
                    {lap2 > 0 && (
                      <circle cx="80" cy="80" r={r} stroke={glow} strokeWidth="10" fill="transparent" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - lap2 / 100)} className="transition-all duration-1000 animate-in fade-in zoom-in-95" />
                    )}
                    {/* 12 o'clock Marker with Icon (Rotated to stay upright) */}
                    <g transform={`rotate(90 ${80 + r} 80)`}>
                      <circle cx={80 + r} cy={80} r="7" fill={color} className="shadow-lg" />
                      <g transform={`translate(${80 + r - 3.5}, ${80 - 3.5})`}>
                        <Icon size={7} className="text-white fill-white" />
                      </g>
                    </g>
                  </g>
                );
              };
              return [
                renderRing(stats.calories, stats.targetCalories, 72, "#ff3b30", "#ff7b72", 0, Flame),
                renderRing(stats.protein, stats.targetProtein, 54, "#007aff", "#58a6ff", 1, Shield),
                renderRing(stats.carbs, stats.targetCarbs, 36, "#34c759", "#66d982", 2, Wheat),
                renderRing(stats.fat, stats.targetFat, 18, "#ff9500", "#ffcc00", 3, Droplets)
              ];
            })()}
          </svg>
          <div className="absolute flex flex-col items-center pointer-events-none group-hover:scale-110 transition-transform duration-500">
            <Flame size={20} className="text-[#ff3b30] opacity-10 animate-pulse" />
          </div>
        </div>

        {/* Right Side: Detailed Stats (Responsive Grid) */}
        <div className="w-full flex-1 grid grid-cols-2 sm:flex sm:flex-col gap-x-4 gap-y-6 sm:gap-4 min-w-0 pr-1">
          {(['calories', 'protein', 'carbs', 'fat'] as const).map((key, i) => {
            const items = {
              calories: { label: `Energy (${unitPrefs.energy})`, val: stats.calories, target: stats.targetCalories, color: '#ff3b30', icon: Flame, unit: unitPrefs.energy, disp: displayEnergy },
              protein: { label: `Protein (${unitPrefs.weight})`, val: stats.protein, target: stats.targetProtein, color: '#007aff', icon: Shield, unit: unitPrefs.weight, disp: displayWeight },
              carbs: { label: `Carbs (${unitPrefs.weight})`, val: stats.carbs, target: stats.targetCarbs, color: '#34c759', icon: Wheat, unit: unitPrefs.weight, disp: displayWeight },
              fat: { label: `Fat (${unitPrefs.weight})`, val: stats.fat, target: stats.targetFat, color: '#ff9500', icon: Droplets, unit: unitPrefs.weight, disp: displayWeight }
            };
            const item = items[key];
            return (
              <div key={i} className="flex items-center gap-3 group/stat">
                <div className="p-1.5 rounded-lg bg-muted/10 border border-muted/20 group-hover/stat:bg-muted/15 transition-colors">
                  <item.icon className="w-4 h-4" style={{ color: item.color }} />
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-[10px] font-black text-muted-foreground uppercase opacity-30 leading-none mb-1 tracking-[0.1em] shrink-0 whitespace-nowrap">{item.label}</span>
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    <span className="text-xl sm:text-2xl font-black leading-none tracking-tighter shrink-0" style={{ color: item.color }}>
                      {(item.disp as Function)(item.val, item.unit)}
                    </span>
                    <span className={`text-[10px] sm:text-xs font-bold tracking-tight leading-none whitespace-nowrap transition-colors ${item.val > item.target ? 'text-red-500 opacity-100 font-black' : 'opacity-30'}`}>
                      / {(item.disp as Function)(item.target, item.unit)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Redesigned Primary Action Button */}
      <div className="px-2">
        <Link href="/add" className="block outline-none">
          <div className="group relative w-full h-24 rounded-[1.75rem] border-2 border-dashed border-primary/20 flex items-center gap-6 px-6 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 transition-all cursor-pointer shadow-lg active:scale-[0.98]">
            <div className="w-14 h-14 rounded-2xl bg-primary shadow-lg shadow-primary/30 flex items-center justify-center text-white transition-all group-hover:scale-105 group-hover:rotate-6">
              <Plus className="w-8 h-8 stroke-[4]" />
            </div>
            <div className="flex flex-col items-start gap-0.5">
              <span className="text-sm font-black text-muted-foreground uppercase tracking-[0.2em] opacity-50">Record</span>
              <span className="text-3xl font-black text-foreground group-hover:text-primary transition-colors tracking-tighter italic uppercase">
                {(() => {
                  const hour = new Date().getHours();
                  if (hour >= 5 && hour < 11) return 'Breakfast';
                  if (hour >= 11 && hour < 14) return 'Lunch';
                  if (hour >= 17 && hour < 21) return 'Dinner';
                  return 'Snack';
                })()}
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Start Tracking Now</span>
              </div>
            </div>
          </div>
        </Link>
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

      <RecognitionQueue />

      {/* History Chart */}
      <div className="px-2 pt-4 pb-20">
        <div className="px-1 flex flex-col gap-0.5 mb-6">
          <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] leading-tight opacity-50">Trend Analysis</span>
          <h2 className="text-2xl font-black text-foreground tracking-tighter uppercase italic">Last 7 Days</h2>
        </div>
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
    </div>
  );
}
