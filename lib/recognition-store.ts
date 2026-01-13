import { RecognitionTask } from './api-client';
import { Dish } from '@/types';
import { UploadManager } from './upload-manager';

export interface QueuedTask extends RecognitionTask {
    imageData: string; // Base64
}

type Listener = (tasks: QueuedTask[]) => void;

class RecognitionStore {
    private tasks: QueuedTask[] = [];
    private listeners: Set<Listener> = new Set();
    private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();

    constructor() {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('yuheng_recognition_queue');
            if (saved) {
                try {
                    this.tasks = JSON.parse(saved);
                    // Resume unfinished tasks
                    this.tasks.forEach(task => {
                        if (task.status === 'pending' || task.status === 'processing') {
                            this.startPolling(task.id);
                        } else if (task.status === 'uploading') {
                            this.resumeUploading(task.id);
                        }
                    });
                } catch (e) {
                    console.error('Failed to load recognition queue', e);
                }
            }
            this.setupNetworkListeners();
        }
    }

    private setupNetworkListeners() {
        if (typeof window === 'undefined') return;

        window.addEventListener('online', () => {
            console.log('[RecognitionStore] Network back online. Re-syncing tasks...');

            // Short delay to ensure connectivity is initialized
            setTimeout(() => {
                this.tasks.forEach(task => {
                    const isUploadError = task.status === 'failed' && task.error?.toLowerCase().includes('upload');
                    if (task.status === 'uploading' || isUploadError) {
                        console.log(`[RecognitionStore] Proactively restarting upload for ${task.id}`);
                        this.resumeUploading(task.id);
                    } else if (task.status === 'pending' || task.status === 'processing') {
                        this.startPolling(task.id);
                    }
                });
            }, 1000);
        });
    }

    private resumeUploading(id: string) {
        const task = this.getTask(id);
        if (!task) return;

        const isInterrupted = task.status === 'uploading' || (task.status === 'failed' && task.error?.toLowerCase().includes('upload'));
        if (!isInterrupted) return;

        // If it's already uploading in the background (tus client's internal map), don't trigger a FRESH one
        // BUT if it's 'failed', we definitely want a fresh one because the previous object is dead.
        if (task.status === 'uploading' && UploadManager.activeUploads.has(id)) {
            console.log(`[RecognitionStore] ${id} is already in activeUploads, ensuring it starts...`);
            UploadManager.activeUploads.get(id)?.start();
            return;
        }

        console.log(`[RecognitionStore] Creating FRESH upload for task ${id}`);
        // Ensure it shows as uploading
        this.updateTask(id, { status: 'uploading', error: undefined });

        UploadManager.uploadFile(task.id, task.imageData, undefined, (progress) => {
            this.updateTask(id, { progress });
        }).then(() => {
            this.updateTask(id, { status: 'pending', progress: 100 });
            this.startPolling(id);
            this.refreshTask(id);
        }).catch(err => {
            console.error(`[RecognitionStore] Upload interrupted for ${id}, staying in uploading state for auto-retry`, err);
            // We only show FAILED if it's a fatal error that won't auto-retry
            const isFatal = err.message?.toLowerCase().includes('fatal') || err.message?.toLowerCase().includes('not found');
            if (isFatal) {
                this.updateTask(id, { status: 'failed', error: 'Upload failed: ' + (err.message || 'unknown error') });
            } else {
                // Keep it in uploading status so the UI doesn't flip to "Retry"
                // The TUS client is already retrying 100 times in the background
                this.updateTask(id, { status: 'uploading' });
            }
        });
    }

    private save() {
        if (typeof window !== 'undefined') {
            localStorage.setItem('yuheng_recognition_queue', JSON.stringify(this.tasks));
        }
        this.notify();
    }

    private notify() {
        this.listeners.forEach(listener => listener(this.tasks));
    }

    subscribe(listener: Listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    getSnapshot() {
        return this.tasks;
    }

    addTask(task: Partial<QueuedTask> & { id: string; imageData: string }) {
        const newTask: QueuedTask = {
            status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            ...task
        } as QueuedTask;
        this.tasks = [newTask, ...this.tasks];
        this.startPolling(newTask.id);
        this.save();
    }

    private async startPolling(id: string) {
        if (this.pollingIntervals.has(id)) return;

        const interval = setInterval(async () => {
            const task = this.getTask(id);
            if (!task || task.status === 'uploading') return;

            try {
                const res = await fetch(`/api/nutrition/tasks/${id}`);
                if (!res.ok) throw new Error('API failed');
                const data = await res.json();

                this.updateTask(id, {
                    status: data.status,
                    result: data.result,
                    error: data.error,
                    updated_at: new Date().toISOString()
                });

                if (data.status === 'completed' || data.status === 'failed') {
                    this.stopPolling(id);
                }
            } catch (error) {
                console.error(`Polling error for task ${id}:`, error);
            }
        }, 3000);

        this.pollingIntervals.set(id, interval);
    }

    private stopPolling(id: string) {
        const interval = this.pollingIntervals.get(id);
        if (interval) {
            clearInterval(interval);
            this.pollingIntervals.delete(id);
        }
    }

    async refreshTask(id: string) {
        try {
            const res = await fetch(`/api/nutrition/tasks/${id}`);
            if (!res.ok) throw new Error('API failed');
            const data = await res.json();

            this.updateTask(id, {
                status: data.status,
                result: data.result,
                error: data.error,
                updated_at: new Date().toISOString()
            });
        } catch (error) {
            console.error(`Refresh error for task ${id}:`, error);
        }
    }

    updateTask(id: string, updates: Partial<QueuedTask>) {
        this.tasks = this.tasks.map(t => t.id === id ? { ...t, ...updates } : t);
        this.save();
    }

    removeTask(id: string) {
        this.stopPolling(id);
        this.tasks = this.tasks.filter(t => t.id !== id);
        this.save();
    }

    getTask(id: string) {
        return this.tasks.find(t => t.id === id);
    }

    async retryTask(id: string, userPrompt?: string) {
        const task = this.getTask(id);
        if (!task) return;

        // If it was an upload failure, retry the upload
        if (task.status === 'failed' && task.error?.toLowerCase().includes('upload')) {
            this.resumeUploading(id);
            return;
        }

        if (task.status !== 'failed' && task.status !== 'completed') return;

        this.updateTask(id, { status: 'pending', error: undefined, result: undefined });

        try {
            const res = await fetch('/api/nutrition/recognize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: task.imageData, userPrompt })
            });

            if (!res.ok) throw new Error('Retry failed to start');
            const data = await res.json();

            // Store new taskId and start polling
            this.updateTask(id, { id: data.taskId });
            this.startPolling(data.taskId);
            return data.taskId;
        } catch (error) {
            console.error('Retry error:', error);
            this.updateTask(id, { status: 'failed', error: (error as Error).message });
            throw error;
        }
    }
}

export const recognitionStore = new RecognitionStore();

export function useRecognitionQueue() {
    return recognitionStore.getSnapshot();
}
