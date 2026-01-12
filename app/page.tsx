"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Settings, RefreshCw, Flame, Shield, Wheat, Droplets, Calendar, Loader2 as Loader } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { displayEnergy, displayWeight, type EnergyUnit, type WeightUnit } from '@/lib/units';
import { RecognitionQueue } from '@/components/recognition-queue';
import { useBackendStatus } from '@/hooks/use-backend-status';
import { toast } from 'sonner';
import { recognitionStore } from '@/lib/recognition-store';
import { logger } from '@/lib/logger';


export default function HomePage() {
  const [loading, setLoading] = useState(false);
  const loadingHistory = useRef(false);
  const isInitialLoad = useRef(true);
  const status = useBackendStatus();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageLoading, setImageLoading] = useState(false);

  const HISTORY_BATCH_DAYS = 30;
  const LOAD_THRESHOLD = 200; // pixels from edge to trigger load

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

  const loadHistoryRange = useCallback(async (start: string, end: string, append = false) => {
    if (loadingHistory.current) return;
    loadingHistory.current = true;
    try {
      const data = await api.getStats(undefined, 0, start, end);
      setStats(prev => {
        const newHistory = [...data.history];
        const existing = [...prev.history];

        // Simple merge by date to avoid duplicates
        const merged = append
          ? [...existing, ...newHistory]
          : [...newHistory, ...existing];

        const unique = Array.from(new Map(merged.map(item => [item.date, item])).values())
          .sort((a, b) => a.date.localeCompare(b.date));

        // Limit to 100 days for performance
        const finalHistory = unique.length > 100
          ? (append ? unique.slice(-100) : unique.slice(0, 100))
          : unique;

        return { ...prev, history: finalHistory };
      });
    } catch (error) {
      console.error('Failed to load history batch:', error);
    } finally {
      loadingHistory.current = false;
    }
  }, []);

  const loadStats = useCallback(async (date?: string) => {
    setLoading(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const fetchDate = date || todayStr;

      // Calculate a window around the fetchDate: 20 days before, 10 days after (capped at today)
      const histEnd = new Date(fetchDate);
      histEnd.setDate(histEnd.getDate() + 10);
      const histEndStr = histEnd.toISOString().split('T')[0] > todayStr ? todayStr : histEnd.toISOString().split('T')[0];

      const histStart = new Date(histEndStr);
      histStart.setDate(histStart.getDate() - (HISTORY_BATCH_DAYS - 1));

      const [data, settingsData] = await Promise.all([
        api.getStats(fetchDate, 0, histStart.toISOString().split('T')[0], histEndStr),
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
  }, [HISTORY_BATCH_DAYS]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Initial scroll to today or centering
  useEffect(() => {
    if (!scrollRef.current || stats.history.length === 0) return;

    const todayStr = new Date().toISOString().split('T')[0];

    // Case 1: Initial load, scroll to Today (far right)
    if (isInitialLoad.current && !selectedDate) {
      const scrollToEnd = () => {
        if (scrollRef.current) {
          scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
          // If we haven't reached the end yet (images still loading/layout shifting), retry once
          if (scrollRef.current.scrollLeft < scrollRef.current.scrollWidth - scrollRef.current.clientWidth - 10) {
            requestAnimationFrame(scrollToEnd);
          } else {
            isInitialLoad.current = false;
          }
        }
      };

      // Delay slightly for initial layout stability
      const timer = setTimeout(scrollToEnd, 100);
      return () => clearTimeout(timer);
    }

    // Case 2: Selected date changed (via click or picker)
    if (selectedRef.current) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const dayBefore = new Date(Date.now() - 172800000).toISOString().split('T')[0];

      const isRecent = selectedDate === todayStr || selectedDate === yesterday || selectedDate === dayBefore;

      // Small delay to let the highlight (amber color) be seen before the scroll starts
      const timer = setTimeout(() => {
        if (!scrollRef.current) return;

        if (isRecent) {
          scrollRef.current.scrollTo({
            left: scrollRef.current.scrollWidth,
            behavior: 'smooth'
          });
        } else if (selectedRef.current) {
          selectedRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'center'
          });
        }
      }, 150);
      return () => clearTimeout(timer);
    }

    // Case 3: Return to Today (selectedDate reset to null)
    if (!selectedDate && !isInitialLoad.current) {
      const timer = setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTo({
            left: scrollRef.current.scrollWidth,
            behavior: 'smooth'
          });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [selectedDate, stats.history]);

  const handleScroll = () => {
    if (!scrollRef.current || loadingHistory.current || isInitialLoad.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;

    // Only load more if we're not aggressively scrolling/centering
    // and if we have some data to calculate ranges from
    if (stats.history.length === 0) return;

    // Load older (left)
    if (scrollLeft < LOAD_THRESHOLD) {
      const firstDate = stats.history[0]?.date;
      if (firstDate) {
        const end = new Date(firstDate);
        end.setDate(end.getDate() - 1);
        const start = new Date(end);
        start.setDate(start.getDate() - (HISTORY_BATCH_DAYS - 1));
        loadHistoryRange(start.toISOString().split('T')[0], end.toISOString().split('T')[0], false);
      }
    }

    // Load newer (right)
    if (scrollWidth - scrollLeft - clientWidth < LOAD_THRESHOLD) {
      const lastDate = stats.history[stats.history.length - 1]?.date;
      const today = new Date().toISOString().split('T')[0];
      if (lastDate && lastDate < today) {
        const start = new Date(lastDate);
        start.setDate(start.getDate() + 1);
        const end = new Date(start);
        end.setDate(end.getDate() + (HISTORY_BATCH_DAYS - 1));
        const endStr = end.toISOString().split('T')[0];
        loadHistoryRange(start.toISOString().split('T')[0], endStr > today ? today : endStr, true);
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        analyzeImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async (imgData: string) => {
    setImageLoading(true);
    try {
      const data = await api.startRecognition(imgData);
      recognitionStore.addTask({
        id: data.taskId,
        imageData: imgData,
        status: 'pending'
      });
      toast.success("Recognition started in background!");
    } catch (error) {
      logger.error(error as Error, "Failed to start recognition");
      toast.error("Failed to start recognition");
    } finally {
      setImageLoading(false);
    }
  };



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
            onClick={() => {
              setSelectedDate(null);
              loadStats();
            }}
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
      <div className="px-3 flex items-center justify-between gap-4 mb-[-12px] mt-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] leading-tight opacity-50">Activity Status</span>
          <h2 className="text-2xl font-black text-foreground tracking-tighter uppercase italic">
            {selectedDate ? (
              <>
                {new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} Progress
              </>
            ) : (
              "Today's Progress"
            )}
          </h2>
        </div>
        {selectedDate && (
          <Button
            onClick={() => {
              setSelectedDate(null);
              loadStats();
            }}
            variant="outline"
            size="sm"
            className="rounded-full text-xs font-bold px-4 shrink-0"
          >
            Return to Today
          </Button>
        )}
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
              const renderRing = (val: number, target: number, r: number, color: string, glow: string, idx: number, Icon: React.ElementType<{ size: number; className?: string }>) => {
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
            switch (key) {
              case 'calories':
                return (
                  <div key={i} className="flex items-center gap-3 group/stat">
                    <div className="p-1.5 rounded-lg bg-muted/10 border border-muted/20 group-hover/stat:bg-muted/15 transition-colors">
                      <Flame className="w-4 h-4" style={{ color: '#ff3b30' }} />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-[10px] font-black text-muted-foreground uppercase opacity-30 leading-none mb-1 tracking-[0.1em] shrink-0 whitespace-nowrap">Energy ({unitPrefs.energy})</span>
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        <span className="text-xl sm:text-2xl font-black leading-none tracking-tighter shrink-0" style={{ color: '#ff3b30' }}>
                          {displayEnergy(stats.calories, unitPrefs.energy)}
                        </span>
                        <span className={`text-[10px] sm:text-xs font-bold tracking-tight leading-none whitespace-nowrap transition-colors ${stats.calories > stats.targetCalories ? 'text-red-500 opacity-100 font-black' : 'opacity-30'}`}>
                          / {displayEnergy(stats.targetCalories, unitPrefs.energy)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              case 'protein':
                return (
                  <div key={i} className="flex items-center gap-3 group/stat">
                    <div className="p-1.5 rounded-lg bg-muted/10 border border-muted/20 group-hover/stat:bg-muted/15 transition-colors">
                      <Shield className="w-4 h-4" style={{ color: '#007aff' }} />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-[10px] font-black text-muted-foreground uppercase opacity-30 leading-none mb-1 tracking-[0.1em] shrink-0 whitespace-nowrap">Protein ({unitPrefs.weight})</span>
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        <span className="text-xl sm:text-2xl font-black leading-none tracking-tighter shrink-0" style={{ color: '#007aff' }}>
                          {displayWeight(stats.protein, unitPrefs.weight)}
                        </span>
                        <span className={`text-[10px] sm:text-xs font-bold tracking-tight leading-none whitespace-nowrap transition-colors ${stats.protein > stats.targetProtein ? 'text-red-500 opacity-100 font-black' : 'opacity-30'}`}>
                          / {displayWeight(stats.targetProtein, unitPrefs.weight)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              case 'carbs':
                return (
                  <div key={i} className="flex items-center gap-3 group/stat">
                    <div className="p-1.5 rounded-lg bg-muted/10 border border-muted/20 group-hover/stat:bg-muted/15 transition-colors">
                      <Wheat className="w-4 h-4" style={{ color: '#34c759' }} />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-[10px] font-black text-muted-foreground uppercase opacity-30 leading-none mb-1 tracking-[0.1em] shrink-0 whitespace-nowrap">Carbs ({unitPrefs.weight})</span>
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        <span className="text-xl sm:text-2xl font-black leading-none tracking-tighter shrink-0" style={{ color: '#34c759' }}>
                          {displayWeight(stats.carbs, unitPrefs.weight)}
                        </span>
                        <span className={`text-[10px] sm:text-xs font-bold tracking-tight leading-none whitespace-nowrap transition-colors ${stats.carbs > stats.targetCarbs ? 'text-red-500 opacity-100 font-black' : 'opacity-30'}`}>
                          / {displayWeight(stats.targetCarbs, unitPrefs.weight)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              case 'fat':
                return (
                  <div key={i} className="flex items-center gap-3 group/stat">
                    <div className="p-1.5 rounded-lg bg-muted/10 border border-muted/20 group-hover/stat:bg-muted/15 transition-colors">
                      <Droplets className="w-4 h-4" style={{ color: '#ff9500' }} />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-[10px] font-black text-muted-foreground uppercase opacity-30 leading-none mb-1 tracking-[0.1em] shrink-0 whitespace-nowrap">Fat ({unitPrefs.weight})</span>
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        <span className="text-xl sm:text-2xl font-black leading-none tracking-tighter shrink-0" style={{ color: '#ff9500' }}>
                          {displayWeight(stats.fat, unitPrefs.weight)}
                        </span>
                        <span className={`text-[10px] sm:text-xs font-bold tracking-tight leading-none whitespace-nowrap transition-colors ${stats.fat > stats.targetFat ? 'text-red-500 opacity-100 font-black' : 'opacity-30'}`}>
                          / {displayWeight(stats.targetFat, unitPrefs.weight)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              default:
                return null;
            }
          })}
        </div>
      </div>

      {/* Redesigned Primary Action Button - Only show when viewing today */}
      <div className={`transition-all duration-500 ease-in-out overflow-hidden ${!selectedDate ? 'opacity-100 max-h-32 translate-y-0' : 'opacity-0 max-h-0 -translate-y-4 pointer-events-none'}`}>
        <div className="px-2">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="group relative w-full h-24 rounded-[1.75rem] border-2 border-dashed border-primary/20 flex items-center gap-6 px-6 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 transition-all cursor-pointer shadow-lg active:scale-[0.98]"
          >
            <div className="w-14 h-14 rounded-2xl bg-primary shadow-lg shadow-primary/30 flex items-center justify-center text-white transition-all group-hover:scale-105 group-hover:rotate-6">
              {imageLoading ? (
                <Loader className="w-8 h-8 animate-spin" />
              ) : (
                <Plus className="w-8 h-8 stroke-[4]" />
              )}
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
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageUpload}
            disabled={imageLoading}
          />
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


      <div className={`transition-all duration-500 ease-in-out overflow-hidden ${!selectedDate ? 'opacity-100 max-h-[1000px] translate-y-0' : 'opacity-0 max-h-0 translate-y-4 pointer-events-none'}`}>
        <RecognitionQueue />
      </div>


      {/* History Chart */}
      <div className="px-2 pt-4 pb-20">
        <div className="px-3 flex items-center justify-between gap-4 mb-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] leading-tight opacity-50">Trend Analysis</span>
            <h2 className="text-2xl font-black text-foreground tracking-tighter uppercase italic">History Progress</h2>
          </div>
          <div className="flex items-center gap-2">
            {selectedDate && (
              <Button
                onClick={() => {
                  setSelectedDate(null);
                  loadStats();
                }}
                variant="outline"
                size="sm"
                className="rounded-full text-xs font-bold px-3 h-8"
              >
                Today
              </Button>
            )}
            <div className="relative">
              <input
                type="date"
                max={new Date().toISOString().split('T')[0]}
                value={selectedDate || new Date().toISOString().split('T')[0]}
                onChange={(e) => {
                  const newDate = e.target.value;
                  setSelectedDate(newDate);
                  loadStats(newDate);
                }}
                className="absolute opacity-0 w-8 h-8 cursor-pointer z-10"
              />
              <Button
                variant="outline"
                size="sm"
                className="rounded-full w-8 h-8 p-0"
              >
                <Calendar className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Scrollable Container with Gradient Hints */}
        <div className="relative">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex items-end h-40 gap-3 overflow-x-auto scroll-smooth no-scrollbar px-10 mask-fade-edges"
          >
            {stats.history.map((day) => {
              const height = stats.targetCalories > 0 ? Math.min((day.calories / stats.targetCalories) * 100, 100) : 0;
              const isToday = new Date().toISOString().split('T')[0] === day.date;
              const isSelected = selectedDate === day.date;
              const date = new Date(day.date);

              return (
                <div
                  key={day.date}
                  ref={isSelected ? selectedRef : null}
                  className="flex flex-col items-center flex-shrink-0 w-12 gap-2 group cursor-pointer"
                  onClick={() => {
                    setSelectedDate(day.date);
                    loadStats(day.date);
                  }}
                >
                  <div className={`w-full relative flex items-end justify-center h-32 bg-muted/10 rounded-xl overflow-hidden transition-all border-2 ${isSelected ? 'border-amber-500/50 bg-amber-500/5' : 'border-transparent'}`}>
                    <div
                      suppressHydrationWarning
                      className={`w-full transition-all duration-500 ${isSelected
                        ? 'bg-amber-500 shadow-lg shadow-amber-500/50'
                        : isToday
                          ? 'bg-primary'
                          : 'bg-primary/35 group-hover:bg-primary/50'
                        }`}
                      style={{ height: `${Math.max(height, isSelected ? 4 : 0)}%` }}
                    />
                  </div>
                  <div className="flex flex-col items-center">
                    <span suppressHydrationWarning className={`text-[10px] font-black transition-colors leading-tight uppercase ${isSelected ? 'text-amber-500' : 'text-muted-foreground/60'
                      }`}>
                      {date.toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                    <span suppressHydrationWarning className={`text-[9px] font-bold transition-colors leading-tight ${isSelected ? 'text-amber-500' : 'text-muted-foreground/40'
                      }`}>
                      {date.getMonth() + 1}/{date.getDate()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
}
