"use client";

import { useSyncExternalStore } from 'react';
import { recognitionStore, QueuedTask } from '@/lib/recognition-store';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, ChevronRight, Trash2, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslations, useLocale } from 'next-intl';

const emptyTasks: QueuedTask[] = [];

export function RecognitionQueue() {
    const t = useTranslations('Queue');
    const locale = useLocale();
    const tasks = useSyncExternalStore(
        recognitionStore.subscribe.bind(recognitionStore),
        recognitionStore.getSnapshot.bind(recognitionStore),
        () => emptyTasks
    );

    if (tasks.length === 0) return null;

    return (
        <div className="space-y-4 px-2">
            <div className="px-1 flex items-center justify-between mb-2">
                <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] leading-tight opacity-50">{t('processingStatus')}</span>
                    <h2 className="text-2xl font-black text-foreground tracking-tighter uppercase italic">{t('title')}</h2>
                </div>
                <span className="text-[10px] font-black bg-muted/20 border border-muted/30 px-2 py-0.5 rounded-full text-muted-foreground">
                    {tasks.length} {tasks.length === 1 ? t('item') : t('items')}
                </span>
            </div>
            <div className="grid gap-3">
                {tasks.map((task) => (
                    <Card key={task.id} className="overflow-hidden border-primary/10 shadow-sm">
                        <CardContent className="p-0">
                            <div className="flex h-24">
                                {/* Thumbnail */}
                                <div className="relative w-24 h-full bg-muted">
                                    <Image
                                        src={task.imageData}
                                        alt="Food"
                                        fill
                                        className="object-cover"
                                    />
                                    {(task.status === 'pending' || task.status === 'processing') && (
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                            <Loader2 className="w-5 h-5 text-white animate-spin" />
                                        </div>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                                    <div className="flex justify-between items-start">
                                        <div className="truncate pr-2">
                                            <p className="text-xs text-muted-foreground">
                                                {new Date(task.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                            <p className="font-medium text-sm truncate">
                                                {task.status === 'completed'
                                                    ? t('dishesFound', { count: task.result?.length || 0 })
                                                    : task.status === 'failed' ? t('failed') : t('processing')}
                                            </p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                            onClick={() => recognitionStore.removeTask(task.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {task.status === 'completed' ? (
                                            <Link href={`/recognition/${task.id}`} className="flex-1">
                                                <Button size="sm" className="w-full h-8 gap-1">
                                                    {t('viewResults')} <ChevronRight className="w-3 h-3" />
                                                </Button>
                                            </Link>
                                        ) : task.status === 'failed' ? (
                                            <div className="flex-1 flex gap-2 items-center min-w-0">
                                                <p className="text-xs text-destructive truncate flex-1">{task.error || t('unknownError')}</p>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 gap-1 whitespace-nowrap"
                                                    onClick={() => recognitionStore.retryTask(task.id)}
                                                >
                                                    <RefreshCw className="w-3 h-3" /> {t('retry')}
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="flex-1 space-y-1">
                                                <div className="flex justify-between text-[10px] text-muted-foreground uppercase tracking-wider">
                                                    <span>{task.status}</span>
                                                    <span>{task.status === 'uploading' ? t('uploading') : t('refining')}</span>
                                                </div>
                                                <Progress
                                                    value={
                                                        task.status === 'processing' ? 65 :
                                                            task.status === 'uploading' ? (task.progress ?? 5) :
                                                                15
                                                    }
                                                    className="h-1.5"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
