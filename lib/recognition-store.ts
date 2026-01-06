import { RecognitionTask } from './api-client';
import { Dish } from '@/types';

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
                    // Resume polling for unfinished tasks
                    this.tasks.forEach(task => {
                        if (task.status === 'pending' || task.status === 'processing') {
                            this.startPolling(task.id);
                        }
                    });
                } catch (e) {
                    console.error('Failed to load recognition queue', e);
                }
            }
        }
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
        if (!task || (task.status !== 'failed' && task.status !== 'completed')) return;

        this.updateTask(id, { status: 'pending', error: undefined, result: undefined });

        try {
            const res = await fetch('/api/nutrition/recognize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: task.imageData, userPrompt })
            });

            if (!res.ok) throw new Error('Retry failed to start');
            const data = await res.json();

            // Update task ID and start polling
            this.tasks = this.tasks.map(t => t.id === id ? { ...t, id: data.taskId } : t);
            this.startPolling(data.taskId);
            this.save();
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
