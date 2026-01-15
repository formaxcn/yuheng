/**
 * Client-side image compression utility
 * Compresses images before upload to reduce bandwidth and improve API performance
 */

export interface CompressionOptions {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    outputType?: 'image/jpeg' | 'image/webp';
}

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
    maxWidth: 1920,
    maxHeight: 1920,
    quality: 0.85,
    outputType: 'image/jpeg'
};

/**
 * Compress an image file
 * @param file The image file to compress
 * @param options Compression options
 * @returns Promise<{ file: File, dataUrl: string }> Compressed file and data URL
 */
export async function compressImage(
    file: File,
    options: CompressionOptions = {}
): Promise<{ file: File; dataUrl: string }> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();

        reader.onload = (e) => {
            img.onload = () => {
                try {
                    // Calculate new dimensions while maintaining aspect ratio
                    let { width, height } = img;
                    const aspectRatio = width / height;

                    if (width > opts.maxWidth) {
                        width = opts.maxWidth;
                        height = Math.round(width / aspectRatio);
                    }
                    if (height > opts.maxHeight) {
                        height = opts.maxHeight;
                        width = Math.round(height * aspectRatio);
                    }

                    // Create canvas and draw resized image
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        throw new Error('Failed to get canvas context');
                    }

                    // Use high quality image smoothing
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(img, 0, 0, width, height);

                    // Convert to blob
                    canvas.toBlob(
                        (blob) => {
                            if (!blob) {
                                reject(new Error('Failed to compress image'));
                                return;
                            }

                            // Create new file with compressed data
                            const compressedFile = new File(
                                [blob],
                                file.name.replace(/\.[^.]+$/, '.jpg'),
                                { type: opts.outputType }
                            );

                            // Get data URL for preview
                            const dataUrl = canvas.toDataURL(opts.outputType, opts.quality);

                            console.log(`[ImageCompressor] Compressed: ${Math.round(file.size / 1024)}KB → ${Math.round(blob.size / 1024)}KB (${img.width}x${img.height} → ${width}x${height})`);

                            resolve({ file: compressedFile, dataUrl });
                        },
                        opts.outputType,
                        opts.quality
                    );
                } catch (error) {
                    reject(error);
                }
            };

            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = e.target?.result as string;
        };

        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}

/**
 * Check if a file needs compression
 * @param file The file to check
 * @param maxSizeKB Maximum size in KB before compression is recommended
 * @returns boolean
 */
export function shouldCompress(file: File, maxSizeKB: number = 500): boolean {
    return file.size > maxSizeKB * 1024;
}
