import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile, mkdir, stat, appendFile, rm } from 'fs/promises';
import { join } from 'path';
import { updateRecognitionTask } from '@/lib/db';
import { processRecognition } from '@/lib/recognition';
import { logger } from '@/lib/logger';
import { existsSync } from 'fs';

const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads');

// Ensure upload directory exists
async function ensureDir() {
    if (!existsSync(UPLOAD_DIR)) {
        await mkdir(UPLOAD_DIR, { recursive: true });
    }
}

export async function OPTIONS(req: NextRequest) {
    return new NextResponse(null, {
        status: 204,
        headers: {
            'Tus-Resumable': '1.0.0',
            'Tus-Version': '1.0.0',
            'Tus-Max-Size': '104857600', // 100MB
            'Tus-Extension': 'creation,termination',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, GET, PATCH, OPTIONS, HEAD, DELETE',
            'Access-Control-Allow-Headers': 'Tus-Resumable, Upload-Length, Upload-Metadata, Upload-Offset, Content-Type',
            'Access-Control-Expose-Headers': 'Tus-Resumable, Location, Upload-Offset, Upload-Length',
        },
    });
}

export async function HEAD(req: NextRequest) {
    await ensureDir();
    const id = req.nextUrl.pathname.split('/').pop();
    if (!id || id === 'tus') return new NextResponse(null, { status: 400 });

    const filePath = join(UPLOAD_DIR, id);
    const metaPath = join(UPLOAD_DIR, `${id}.json`);

    if (!existsSync(filePath)) {
        return new NextResponse(null, { status: 404 });
    }

    const { size } = await stat(filePath);
    let totalLength = '0';
    if (existsSync(metaPath)) {
        const meta = JSON.parse(await readFile(metaPath, 'utf8'));
        totalLength = meta.size;
    }

    return new NextResponse(null, {
        status: 200,
        headers: {
            'Tus-Resumable': '1.0.0',
            'Upload-Offset': size.toString(),
            'Upload-Length': totalLength,
            'Cache-Control': 'no-store',
        },
    });
}

export async function POST(req: NextRequest) {
    await ensureDir();
    const length = req.headers.get('upload-length');
    const metadataStr = req.headers.get('upload-metadata') || '';

    // Parse metadata
    const metadata: Record<string, string> = {};
    metadataStr.split(',').forEach(part => {
        const [key, value] = part.split(' ');
        if (key && value) {
            metadata[key] = Buffer.from(value, 'base64').toString();
        }
    });

    const taskId = metadata.taskId || crypto.randomUUID();
    const fileId = taskId; // We use taskId as fileId for simplicity

    const filePath = join(UPLOAD_DIR, fileId);
    const metaPath = join(UPLOAD_DIR, `${fileId}.json`);

    const url = new URL(req.url);
    const location = `/api/upload/tus/${fileId}`;

    // If file already exists, don't overwrite, just return existing location for resume
    if (existsSync(filePath)) {
        console.log(`[TUS] POST: File ${fileId} already exists, returning existing location.`);
        return new NextResponse(null, {
            status: 201, // 201 Created is fine even if it existed, or 204
            headers: {
                'Tus-Resumable': '1.0.0',
                'Location': location,
                'Access-Control-Expose-Headers': 'Location, Tus-Resumable',
            },
        });
    }

    // Initialize empty file
    await writeFile(filePath, '');
    await writeFile(metaPath, JSON.stringify({
        size: length,
        metadata,
        created: new Date().toISOString()
    }));

    return new NextResponse(null, {
        status: 201,
        headers: {
            'Tus-Resumable': '1.0.0',
            'Location': location,
            'Access-Control-Expose-Headers': 'Location, Tus-Resumable',
        },
    });
}

export async function PATCH(req: NextRequest) {
    await ensureDir();
    const id = req.nextUrl.pathname.split('/').pop();
    if (!id || id === 'tus') return new NextResponse(null, { status: 400 });

    const offset = parseInt(req.headers.get('upload-offset') || '0', 10);
    const contentType = req.headers.get('content-type');

    if (contentType !== 'application/offset+octet-stream') {
        return new NextResponse(null, { status: 415 });
    }

    const filePath = join(UPLOAD_DIR, id);
    const metaPath = join(UPLOAD_DIR, `${id}.json`);

    if (!existsSync(filePath)) {
        return new NextResponse(null, { status: 404 });
    }

    const { size: currentSize } = await stat(filePath);
    if (currentSize !== offset) {
        return new NextResponse(null, { status: 409 });
    }

    // Read body as buffer
    const body = await req.arrayBuffer();
    await appendFile(filePath, Buffer.from(body));

    const newSize = currentSize + body.byteLength;

    // Check if upload is complete
    if (existsSync(metaPath)) {
        const meta = JSON.parse(await readFile(metaPath, 'utf8'));
        console.log(`[TUS] PATCH chunk. Offset: ${offset}, Size: ${body.byteLength}, Total Received: ${newSize}, Target: ${meta.size}`);
        if (newSize >= parseInt(meta.size, 10)) {
            const taskId = meta.metadata.taskId || id;
            console.log(`[TUS] Upload complete for task ${taskId}. Reassembling...`);

            // Processing complete
            const buffer = await readFile(filePath);
            const base64Data = buffer.toString('base64');
            const userPrompt = meta.metadata.userPrompt;

            await updateRecognitionTask(taskId, { status: 'pending' });
            console.log(`[TUS] Task ${taskId} status updated to pending on server.`);
            processRecognition(taskId, base64Data, userPrompt);

            // Clean up files
            await rm(filePath);
            await rm(metaPath);
            console.log(`[TUS] Task ${taskId} transitioned to pending and cleanup done.`);
        }
    }

    return new NextResponse(null, {
        status: 204,
        headers: {
            'Tus-Resumable': '1.0.0',
            'Upload-Offset': newSize.toString(),
            'Access-Control-Expose-Headers': 'Upload-Offset, Tus-Resumable',
        },
    });
}
