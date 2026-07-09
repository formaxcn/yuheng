import { getAdapter } from '../db';
import { DEFAULT_USER_ID } from '../db/user-context';
import { DeviceRequest, SessionRecord } from '../db/types';
import { randomBytes } from 'crypto';
import { logger } from '../logger';

// Sessions never expire - set far future date
const SESSION_EXPIRES_AT = new Date('2099-12-31T23:59:59Z');
const REQUEST_EXPIRE_MINUTES = 10;
const REQUEST_CODE_LENGTH = 4;

export class DeviceAuthService {
    /**
     * Generate a 4-char alphanumeric request code (internal use, not shown to user)
     */
    static generateRequestCode(): string {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        const bytes = randomBytes(REQUEST_CODE_LENGTH);
        let code = '';
        for (let i = 0; i < REQUEST_CODE_LENGTH; i++) {
            code += chars[bytes[i] % chars.length];
        }
        return code;
    }

    /**
     * Create a pending device request for the default user.
     * Returns the request with its ID - the new device polls by ID.
     */
    static async createRequest(deviceName: string | null): Promise<DeviceRequest> {
        const db = getAdapter();
        const requestCode = this.generateRequestCode();

        logger.info('[DeviceAuth] createRequest - starting', { deviceName, requestCode });

        // Expire old pending requests first
        await db.expireOldDeviceRequests(DEFAULT_USER_ID, REQUEST_EXPIRE_MINUTES);

        const request = await db.createDeviceRequest(DEFAULT_USER_ID, requestCode, deviceName);
        logger.info('[DeviceAuth] createRequest - success', { requestId: request.id, deviceName, requestCode });
        return request;
    }

    /**
     * Poll the status of a device request by its ID
     */
    static async getRequestStatusById(requestId: number): Promise<DeviceRequest | undefined> {
        const db = getAdapter();

        // Expire old requests
        await db.expireOldDeviceRequests(DEFAULT_USER_ID, REQUEST_EXPIRE_MINUTES);

        const request = await db.getDeviceRequest(requestId);
        if (!request) {
            logger.warn('[DeviceAuth] getRequestStatusById - not found', { requestId });
        }
        return request;
    }

    /**
     * List pending device requests (for existing device to approve/deny)
     */
    static async listPendingRequests(): Promise<DeviceRequest[]> {
        const db = getAdapter();
        await db.expireOldDeviceRequests(DEFAULT_USER_ID, REQUEST_EXPIRE_MINUTES);
        const requests = await db.listPendingDeviceRequests(DEFAULT_USER_ID);
        logger.info('[DeviceAuth] listPendingRequests', { count: requests.length });
        return requests;
    }

    /**
     * Approve a pending device request (marks status as approved only).
     * The new device must call createSessionFromApproval separately to obtain
     * a trusted session using its own fingerprint.
     */
    static async approveRequest(
        requestId: number
    ): Promise<{ success: boolean; error?: string }> {
        const db = getAdapter();
        logger.info('[DeviceAuth] approveRequest - starting', { requestId });

        const request = await db.getDeviceRequest(requestId);

        if (!request) {
            logger.error('[DeviceAuth] approveRequest - FAILED: request not found', { requestId });
            return { success: false, error: 'Request not found' };
        }

        logger.info('[DeviceAuth] approveRequest - request found', {
            requestId,
            currentStatus: request.status,
            deviceName: request.device_name,
            requestCode: request.request_code,
            createdAt: request.created_at
        });

        if (request.status !== 'pending') {
            logger.warn('[DeviceAuth] approveRequest - FAILED: request already resolved', {
                requestId,
                currentStatus: request.status
            });
            return { success: false, error: `Request already ${request.status}` };
        }

        // Check expiry
        const createdAt = new Date(request.created_at).getTime();
        const ageMinutes = (Date.now() - createdAt) / (60 * 1000);
        if (ageMinutes > REQUEST_EXPIRE_MINUTES) {
            logger.warn('[DeviceAuth] approveRequest - FAILED: request expired', {
                requestId,
                ageMinutes: Math.round(ageMinutes),
                maxMinutes: REQUEST_EXPIRE_MINUTES
            });
            await db.updateDeviceRequestStatus(requestId, 'expired');
            return { success: false, error: 'Request expired' };
        }

        // Approve the request
        await db.updateDeviceRequestStatus(requestId, 'approved');
        logger.info('[DeviceAuth] approveRequest - SUCCESS: request approved', {
            requestId,
            deviceName: request.device_name
        });

        return { success: true };
    }

    /**
     * Create a trusted session for a new device after its request has been
     * approved. Uses requestId to look up the approved request.
     */
    static async createSessionFromApproval(
        requestId: number,
        fingerprint: string,
        deviceName: string | null
    ): Promise<{ success: boolean; session?: SessionRecord; error?: string }> {
        const db = getAdapter();
        logger.info('[DeviceAuth] createSessionFromApproval - starting', {
            requestId,
            deviceName,
            fingerprint: fingerprint.substring(0, 8) + '...'
        });

        const request = await db.getDeviceRequest(requestId);
        if (!request) {
            logger.error('[DeviceAuth] createSessionFromApproval - FAILED: request not found', { requestId });
            return { success: false, error: 'Request not found' };
        }

        if (request.status !== 'approved') {
            logger.warn('[DeviceAuth] createSessionFromApproval - FAILED: request not approved', {
                requestId,
                currentStatus: request.status
            });
            return { success: false, error: `Request is ${request.status}` };
        }

        // Create a trusted session for the new device (never expires)
        const finalDeviceName = deviceName || request.device_name;
        const session = await db.createSession(
            DEFAULT_USER_ID,
            fingerprint,
            finalDeviceName,
            SESSION_EXPIRES_AT
        );

        logger.info('[DeviceAuth] createSessionFromApproval - SUCCESS: session created', {
            requestId,
            sessionId: session.id,
            deviceName: finalDeviceName,
            fingerprint: fingerprint.substring(0, 8) + '...'
        });

        return { success: true, session };
    }

    /**
     * Deny a pending device request
     */
    static async denyRequest(requestId: number): Promise<{ success: boolean; error?: string }> {
        const db = getAdapter();
        logger.info('[DeviceAuth] denyRequest - starting', { requestId });

        const request = await db.getDeviceRequest(requestId);

        if (!request) {
            logger.error('[DeviceAuth] denyRequest - FAILED: request not found', { requestId });
            return { success: false, error: 'Request not found' };
        }

        logger.info('[DeviceAuth] denyRequest - request found', {
            requestId,
            currentStatus: request.status,
            deviceName: request.device_name,
            createdAt: request.created_at
        });

        if (request.status !== 'pending') {
            logger.warn('[DeviceAuth] denyRequest - FAILED: request already resolved', {
                requestId,
                currentStatus: request.status
            });
            return { success: false, error: `Request already ${request.status}` };
        }

        await db.updateDeviceRequestStatus(requestId, 'denied');
        logger.info('[DeviceAuth] denyRequest - SUCCESS: request denied', {
            requestId,
            deviceName: request.device_name
        });

        return { success: true };
    }

    /**
     * List all active sessions for the default user
     */
    static async listSessions(): Promise<SessionRecord[]> {
        const db = getAdapter();
        const sessions = await db.listSessions(DEFAULT_USER_ID);
        logger.info('[DeviceAuth] listSessions', { count: sessions.length });
        return sessions;
    }

    /**
     * Revoke (delete) a session by ID
     */
    static async revokeSession(sessionId: number): Promise<void> {
        const db = getAdapter();
        logger.info('[DeviceAuth] revokeSession - starting', { sessionId });
        await db.deleteSession(sessionId);
        logger.info('[DeviceAuth] revokeSession - SUCCESS', { sessionId });
    }

    /**
     * Create a trusted session directly (used by TOTP login)
     */
    static async createTrustedSession(
        fingerprint: string,
        deviceName: string | null
    ): Promise<SessionRecord> {
        const db = getAdapter();
        logger.info('[DeviceAuth] createTrustedSession (TOTP)', { deviceName });
        const session = await db.createSession(DEFAULT_USER_ID, fingerprint, deviceName, SESSION_EXPIRES_AT);
        logger.info('[DeviceAuth] createTrustedSession - SUCCESS', {
            sessionId: session.id,
            deviceName
        });
        return session;
    }

    /**
     * Validate a session by fingerprint
     */
    static async validateSession(fingerprint: string): Promise<SessionRecord | undefined> {
        const db = getAdapter();
        const session = await db.getSessionByFingerprint(DEFAULT_USER_ID, fingerprint);
        if (session) {
            await db.updateSessionActivity(session.id);
        }
        return session;
    }
}
