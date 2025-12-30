import { NextResponse } from 'next/server';
import pkg from '@/package.json';

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Check if the backend is online and get version
 *     tags: [system]
 *     responses:
 *       200:
 *         description: Backend is online
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 version:
 *                   type: string
 *                   example: 0.1.0
 */
export async function GET() {
    return NextResponse.json({
        status: 'ok',
        version: pkg.version
    });
}
