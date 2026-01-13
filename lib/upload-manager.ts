import * as tus from 'tus-js-client';

interface UploadProgressCallback {
    (progress: number): void;
}

export class UploadManager {
    static activeUploads = new Map<string, tus.Upload>();

    private static base64ToBlob(base64: string): Blob {
        const parts = base64.split(';base64,');
        const contentType = parts[0].split(':')[1];
        const raw = window.atob(parts[1]);
        const rawLength = raw.length;
        const uInt8Array = new Uint8Array(rawLength);
        for (let i = 0; i < rawLength; ++i) {
            uInt8Array[i] = raw.charCodeAt(i);
        }
        return new Blob([uInt8Array], { type: contentType });
    }

    static async createTask(): Promise<string> {
        const initRes = await fetch('/api/upload/init', { method: 'POST' });
        if (!initRes.ok) throw new Error('Failed to init upload');
        const { taskId } = await initRes.json();
        return taskId;
    }

    static async uploadFile(taskId: string, originalData: File | string, userPrompt?: string, onProgress?: UploadProgressCallback): Promise<void> {
        // Prevent duplicate uploads for same task
        if (this.activeUploads.has(taskId)) {
            console.log(`[UploadManager] Upload already in progress for ${taskId}`);
            return;
        }

        let file: File | Blob;
        if (typeof originalData === 'string') {
            file = this.base64ToBlob(originalData);
        } else {
            file = originalData;
        }

        return new Promise((resolve, reject) => {
            const upload = new tus.Upload(file as File, {
                endpoint: '/api/upload/tus',
                // 100 retries, starting from 1s, maxing at 3min, total ~5 hours
                retryDelays: Array.from({ length: 100 }, (_, i) => Math.min(1000 * Math.pow(1.2, i), 180000)),
                parallelUploads: 1,
                fingerprint: async (file, options) => {
                    return `tus-yuheng-${taskId}`;
                },
                metadata: {
                    filename: typeof originalData === 'string' ? 'image.jpg' : originalData.name,
                    filetype: 'image/jpeg',
                    taskId: taskId,
                    userPrompt: userPrompt || ''
                },
                onError: (error) => {
                    console.warn('[TUS] Temporary upload error (will retry):', error);
                    // We don't reject here for network errors because tus is still retrying internally.
                    // We only reject if it's a fatal error that tus won't recover from.
                    const isFatal = error.message.includes('file not found') || error.message.includes('unauthorized');
                    if (isFatal) {
                        this.activeUploads.delete(taskId);
                        reject(error);
                    }
                },
                onProgress: (bytesUploaded, bytesTotal) => {
                    const pct = (bytesUploaded / bytesTotal) * 100;
                    console.log(`[TUS] Progress for ${taskId}: ${pct.toFixed(2)}%`);
                    if (onProgress) onProgress(pct);
                },
                onSuccess: () => {
                    console.log('[TUS] Upload complete:', taskId);
                    this.activeUploads.delete(taskId);
                    resolve();
                },
                onAfterResponse: (req, res) => {
                    if (res.getStatus() >= 500) {
                        console.warn(`[TUS] Server issue (${res.getStatus()}), waiting for auto-retry...`);
                    }
                },
                removeFingerprintOnSuccess: true,
                chunkSize: 256 * 1024
            });

            this.activeUploads.set(taskId, upload);

            upload.findPreviousUploads().then((previousUploads) => {
                if (previousUploads.length) {
                    upload.resumeFromPreviousUpload(previousUploads[0]);
                }
                upload.start();
            });
        });
    }

    static resumeAll() {
        this.activeUploads.forEach(upload => {
            upload.start();
        });
    }
}
