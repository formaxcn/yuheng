/**
 * 设备审批流程测试脚本
 *
 * 模拟完整的设备授权流程：
 * 1. 新设备创建请求 → 验证 pending
 * 2. 已信任设备批准 → 验证 approved
 * 3. 新设备创建会话 → 验证 session 创建成功
 * 4. 列出会话 → 验证会话存在
 * 5. 新设备创建第二个请求 → 拒绝 → 验证 denied
 * 6. 撤销会话 → 验证会话已删除
 *
 * 运行方式: bun run scripts/test-device-auth.ts
 */

// Load env
import { config } from 'dotenv';
config();

import { ensureInit, getAdapter } from '../lib/db/index';
import { DeviceAuthService } from '../lib/auth/device-auth';
import { DEFAULT_USER_ID } from '../lib/db/user-context';
import { randomUUID } from 'crypto';

// Test state tracking
let passed = 0;
let failed = 0;
const testFingerprints: string[] = [];
const testSessionIds: number[] = [];
const testRequestIds: number[] = [];

function assert(condition: boolean, message: string) {
    if (condition) {
        console.log(`  ✅ ${message}`);
        passed++;
    } else {
        console.log(`  ❌ ${message}`);
        failed++;
    }
}

async function cleanup() {
    console.log('\n🧹 Cleaning up test data...');
    const db = getAdapter();

    // Delete test sessions
    for (const sessionId of testSessionIds) {
        try {
            await db.deleteSession(sessionId);
        } catch {}
    }

    // Delete test device requests
    for (const requestId of testRequestIds) {
        try {
            // We need to directly delete from the table since there's no deleteDeviceRequest method
            // Just mark them as expired to remove from pending lists
            await db.updateDeviceRequestStatus(requestId, 'expired');
        } catch {}
    }

    console.log('✅ Cleanup done');
}

async function runTests() {
    console.log('='.repeat(60));
    console.log('🧪 Device Auth Flow Test');
    console.log('='.repeat(60));

    // Initialize database
    console.log('\n📦 Initializing database...');
    await ensureInit();
    console.log('✅ Database ready');

    // ─── Test 1: Create device request ───────────────────────
    console.log('\n📡 Test 1: Create device request (simulating new device)');
    {
        const deviceName = 'Test Device - iPhone';
        const request = await DeviceAuthService.createRequest(deviceName);
        testRequestIds.push(request.id);

        assert(request.id > 0, `Request created with ID: ${request.id}`);
        assert(request.status === 'pending', `Status is "pending" (got: ${request.status})`);
        assert(request.device_name === deviceName, `Device name matches: "${request.device_name}"`);
        assert(!!request.request_code, `Request code generated: ${request.request_code}`);
    }

    // ─── Test 2: Poll status (pending) ───────────────────────
    console.log('\n🔄 Test 2: Poll status (should be pending)');
    {
        const requestId = testRequestIds[0];
        const request = await DeviceAuthService.getRequestStatusById(requestId);

        assert(!!request, 'Request found by ID');
        assert(request?.status === 'pending', `Status is "pending" (got: ${request?.status})`);
    }

    // ─── Test 3: List pending requests ───────────────────────
    console.log('\n📋 Test 3: List pending requests (trusted device view)');
    {
        const pending = await DeviceAuthService.listPendingRequests();
        const found = pending.some(r => r.id === testRequestIds[0]);
        assert(found, `Test request found in pending list (total pending: ${pending.length})`);
    }

    // ─── Test 4: Approve request ─────────────────────────────
    console.log('\n✅ Test 4: Approve request (trusted device action)');
    {
        const requestId = testRequestIds[0];
        const result = await DeviceAuthService.approveRequest(requestId);

        assert(result.success, 'Approve succeeded');

        // Verify status changed
        const request = await DeviceAuthService.getRequestStatusById(requestId);
        assert(request?.status === 'approved', `Status is now "approved" (got: ${request?.status})`);
    }

    // ─── Test 5: Create session from approval ────────────────
    console.log('\n🔑 Test 5: Create session from approval (new device gets session)');
    {
        const requestId = testRequestIds[0];
        const fingerprint = `test-fp-${randomUUID()}`;
        testFingerprints.push(fingerprint);
        const deviceName = 'Test Device - iPhone';

        const result = await DeviceAuthService.createSessionFromApproval(
            requestId,
            fingerprint,
            deviceName
        );

        assert(result.success, 'Session creation succeeded');
        assert(!!result.session, 'Session object returned');
        assert(result.session?.id > 0, `Session ID: ${result.session?.id}`);
        assert(result.session?.fingerprint === fingerprint, 'Fingerprint matches');
        assert(result.session?.device_name === deviceName, `Device name: ${result.session?.device_name}`);

        if (result.session) {
            testSessionIds.push(result.session.id);
        }
    }

    // ─── Test 6: List sessions ───────────────────────────────
    console.log('\n📱 Test 6: List sessions (verify session exists)');
    {
        const sessions = await DeviceAuthService.listSessions();
        const found = sessions.some(s => s.id === testSessionIds[0]);
        assert(found, `Test session found in list (total sessions: ${sessions.length})`);

        const testSession = sessions.find(s => s.id === testSessionIds[0]);
        assert(!!testSession, 'Session details retrieved');
        assert(testSession?.device_name === 'Test Device - iPhone', `Device name: ${testSession?.device_name}`);
    }

    // ─── Test 7: Approve already-approved request (should fail) ─
    console.log('\n⚠️ Test 7: Approve already-approved request (should fail)');
    {
        const requestId = testRequestIds[0];
        const result = await DeviceAuthService.approveRequest(requestId);
        assert(!result.success, 'Second approve failed as expected');
        assert(!!result.error?.includes('already'), `Error message: ${result.error}`);
    }

    // ─── Test 8: Create second request, then deny it ─────────
    console.log('\n❌ Test 8: Create second request and deny it');
    {
        // Create request
        const request2 = await DeviceAuthService.createRequest('Test Device - Android');
        testRequestIds.push(request2.id);
        assert(request2.id > 0, `Second request created with ID: ${request2.id}`);

        // Deny it
        const denyResult = await DeviceAuthService.denyRequest(request2.id);
        assert(denyResult.success, 'Deny succeeded');

        // Verify status
        const status = await DeviceAuthService.getRequestStatusById(request2.id);
        assert(status?.status === 'denied', `Status is "denied" (got: ${status?.status})`);
    }

    // ─── Test 9: Create session from denied request (should fail) ─
    console.log('\n🚫 Test 9: Create session from denied request (should fail)');
    {
        const requestId = testRequestIds[1]; // The denied one
        const fingerprint = `test-fp-denied-${randomUUID()}`;

        const result = await DeviceAuthService.createSessionFromApproval(
            requestId,
            fingerprint,
            'Should Fail'
        );

        assert(!result.success, 'Session creation from denied request failed as expected');
        assert(!!result.error, `Error message: ${result.error}`);
    }

    // ─── Test 10: Revoke session ──────────────────────────────
    console.log('\n🗑️ Test 10: Revoke session');
    {
        const sessionId = testSessionIds[0];

        // Verify session exists before revoke
        const sessionsBefore = await DeviceAuthService.listSessions();
        const existsBefore = sessionsBefore.some(s => s.id === sessionId);
        assert(existsBefore, 'Session exists before revoke');

        // Revoke
        await DeviceAuthService.revokeSession(sessionId);

        // Verify session is gone
        const sessionsAfter = await DeviceAuthService.listSessions();
        const existsAfter = sessionsAfter.some(s => s.id === sessionId);
        assert(!existsAfter, 'Session removed after revoke');
    }

    // ─── Test 11: Approve non-existent request ───────────────
    console.log('\n🔍 Test 11: Approve non-existent request (should fail)');
    {
        const result = await DeviceAuthService.approveRequest(99999);
        assert(!result.success, 'Approve non-existent request failed');
        assert(result.error === 'Request not found', `Error: ${result.error}`);
    }

    // ─── Summary ─────────────────────────────────────────────
    console.log('\n' + '='.repeat(60));
    console.log(`📊 Results: ${passed} passed, ${failed} failed`);
    console.log('='.repeat(60));

    await cleanup();

    if (failed > 0) {
        console.log('\n❌ Some tests failed!');
        process.exit(1);
    } else {
        console.log('\n✅ All tests passed!');
        process.exit(0);
    }
}

// Run
runTests().catch(error => {
    console.error('\n💥 Test script crashed:', error);
    cleanup().then(() => process.exit(1));
});
