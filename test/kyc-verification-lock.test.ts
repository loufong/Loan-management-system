import assert from 'assert';
import http from 'http';
import { createApp } from '../src/app';
import { createToken } from '../src/middlewares/auth.middleware';
import { UserRole, UserStatus } from '@prisma/client';
import { prisma } from '../src/config/prisma';
import { ALLOWED_KYC_MIME_TYPES, MAX_KYC_FILE_SIZE_BYTES } from '../src/services/s3StorageService';

// Fast mocks for audit log & refresh tokens during test execution
prisma.auditLog.create = (async () => ({})) as any;
prisma.refreshToken.create = (async () => ({})) as any;

console.log('🧪 Starting Regulatory KYC Verification & Borrowing Lock Test Suite...\n');

const app = createApp();

function request(method: string, url: string, body?: any, headers: Record<string, string> = {}) {
  return new Promise<{ status: number; body: any; headers: http.IncomingHttpHeaders }>((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const port = (server.address() as any).port;
      const jsonBody = body ? JSON.stringify(body) : undefined;
      const reqHeaders: Record<string, string> = {
        ...headers,
        ...(jsonBody ? { 'Content-Type': 'application/json', 'Content-Length': String(Buffer.byteLength(jsonBody)) } : {}),
      };

      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path: url,
          method,
          headers: reqHeaders,
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            server.close();
            let parsedBody = data;
            if (res.headers['content-type']?.includes('application/json')) {
              try {
                parsedBody = JSON.parse(data);
              } catch (e) {
                // Keep raw string if JSON parse fails
              }
            }
            resolve({ status: res.statusCode || 500, body: parsedBody, headers: res.headers });
          });
        }
      );

      req.on('error', (err) => {
        server.close();
        reject(err);
      });

      if (jsonBody) req.write(jsonBody);
      req.end();
    });
  });
}

async function runTests() {
  const borrowerId = 'usr-test-borrower-8801';
  const borrowerToken = createToken({
    id: borrowerId,
    username: 'johnathan_doe',
    email: 'johnathan.doe@gmail.com',
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
  });

  const adminToken = createToken({
    id: 'usr-admin-director',
    username: 'admin_sophea',
    email: 'sophea.pich@jamsongvich.com',
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
  });

  // TEST 1: Retrieve KYC Status (Initial baseline)
  console.log('--- TEST 1: Retrieve KYC Status & 3-of-3 Verification Summary ---');
  const resStatus = await request('GET', '/api/v1/kyc/status', undefined, {
    Authorization: `Bearer ${borrowerToken}`,
  });

  assert.strictEqual(resStatus.status, 200, 'KYC status should return 200 OK');
  assert.strictEqual(resStatus.body.success, true);
  assert.strictEqual(resStatus.body.data.totalRequired, 3, 'Must require exactly 3 regulatory documents');
  assert.strictEqual(resStatus.body.data.verifiedCount, 3, 'Baseline user should start verified');
  assert.strictEqual(resStatus.body.data.isEligibleToBorrow, true, 'User with 3 of 3 is eligible to borrow');
  assert.strictEqual(resStatus.body.data.documents.length, 3, 'Must return 3 document objects');
  assert.ok(resStatus.body.data.documents[0].viewUrl, 'Document must contain pre-signed short-lived view URL');
  console.log('✅ KYC Status successfully returned: "3 of 3 Verified", eligibleToBorrow: true\n');

  // TEST 2: Validate Pre-signed Upload URL generation with MIME & Size restrictions
  console.log('--- TEST 2: Pre-signed Upload URL Validation (MIME & Size Limits) ---');

  // 2a. Reject executable or disallowed MIME type
  const resBadMime = await request(
    'POST',
    '/api/v1/kyc/upload-url',
    {
      documentType: 'NATIONAL_ID',
      originalFilename: 'malicious_payload.exe',
      mimeType: 'application/x-msdownload',
      fileSizeBytes: 2048,
    },
    { Authorization: `Bearer ${borrowerToken}` }
  );
  assert.strictEqual(resBadMime.status, 400, 'Disallowed MIME type must return 400 Bad Request');
  assert.ok(resBadMime.body.message.includes('PDF, JPEG, or PNG'), 'Error message must specify allowed formats');

  // 2b. Reject oversized file (> 10MB)
  const resTooLarge = await request(
    'POST',
    '/api/v1/kyc/upload-url',
    {
      documentType: 'NATIONAL_ID',
      originalFilename: 'huge_scan.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 12 * 1024 * 1024, // 12MB
    },
    { Authorization: `Bearer ${borrowerToken}` }
  );
  assert.strictEqual(resTooLarge.status, 400, 'File > 10MB must return 400 Bad Request');
  assert.ok(resTooLarge.body.message.includes('10MB'), 'Error message must cite 10MB maximum limit');

  // 2c. Accept valid file (PDF <= 10MB)
  const resValidUpload = await request(
    'POST',
    '/api/v1/kyc/upload-url',
    {
      documentType: 'NATIONAL_ID',
      originalFilename: 'khmer_national_id_card.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 2.4 * 1024 * 1024,
    },
    { Authorization: `Bearer ${borrowerToken}` }
  );
  assert.strictEqual(resValidUpload.status, 200, 'Valid upload specification must return 200 OK');
  assert.ok(resValidUpload.body.data.uploadUrl, 'Must return pre-signed S3/R2 uploadUrl');
  assert.ok(resValidUpload.body.data.fileKey.startsWith(`kyc/${borrowerId}/national_id_`), 'Must generate private fileKey');
  console.log('✅ S3 upload-url correctly rejected .exe / >10MB and generated pre-signed URL for valid PDF\n');

  // TEST 3: Confirm upload sets document status to PENDING_REVIEW
  console.log('--- TEST 3: Confirm Upload Transitions Status to PENDING_REVIEW ---');
  const uploadedKey = resValidUpload.body.data.fileKey;

  const resConfirm = await request(
    'POST',
    '/api/v1/kyc/confirm-upload',
    {
      documentType: 'NATIONAL_ID',
      fileKey: uploadedKey,
      originalFilename: 'khmer_national_id_card.pdf',
      referenceNumber: 'NID-KH-2026-99120',
      fileSizeBytes: 2.4 * 1024 * 1024,
      mimeType: 'application/pdf',
    },
    { Authorization: `Bearer ${borrowerToken}` }
  );
  assert.strictEqual(resConfirm.status, 200, 'Confirm upload must return 200 OK');
  assert.strictEqual(resConfirm.body.data.status, 'PENDING_REVIEW', 'Document status must be PENDING_REVIEW');

  // Check overall KYC status now reflects 2 of 3 verified
  const resStatusPending = await request('GET', '/api/v1/kyc/status', undefined, {
    Authorization: `Bearer ${borrowerToken}`,
  });
  assert.strictEqual(resStatusPending.body.data.verifiedCount, 2, 'Verified count must drop to 2');
  assert.strictEqual(resStatusPending.body.data.isEligibleToBorrow, false, 'Borrowing must be LOCKED when < 3 verified');
  assert.ok(resStatusPending.body.data.missingOrPending.includes('NATIONAL_ID'), 'Must list NATIONAL_ID as pending');
  console.log('✅ Document successfully marked PENDING_REVIEW; overall status: "2 of 3 Verified", isEligibleToBorrow: false\n');

  // TEST 4: Borrowing Lock / Loan Guard blocks /api/loans/apply with HTTP 403 Forbidden
  console.log('--- TEST 4: Borrowing Lock Guard Rejects Loan Application with 403 ---');
  const resApplyLocked = await request(
    'POST',
    '/api/v1/loans/apply',
    {
      productType: 'SME Working Capital',
      principalAmount: 5000,
      tenureMonths: 12,
      borrowerId,
    },
    { Authorization: `Bearer ${borrowerToken}` }
  );

  assert.strictEqual(resApplyLocked.status, 403, 'Must return HTTP 403 Forbidden');
  assert.strictEqual(resApplyLocked.body.error, 'KYC_INCOMPLETE_BORROW_LOCKED', 'Must return KYC_INCOMPLETE_BORROW_LOCKED error code');
  assert.strictEqual(resApplyLocked.body.kycStatus.isEligibleToBorrow, false);
  assert.strictEqual(resApplyLocked.body.kycStatus.verifiedCount, 2);
  console.log('✅ Borrowing Lock successfully rejected loan application with 403 Forbidden and structured KYC status\n');

  // TEST 5: Document Rejection Simulation
  console.log('--- TEST 5: Document Rejection and Rejection Reason ---');
  const resReject = await request(
    'POST',
    '/api/v1/kyc/simulate-status',
    {
      userId: borrowerId,
      documentType: 'PROOF_OF_RESIDENCE',
      status: 'REJECTED',
      rejectionReason: 'Soft title copy is illegible and missing official commune stamp.',
    },
    { Authorization: `Bearer ${adminToken}` }
  );
  assert.strictEqual(resReject.status, 200);
  assert.strictEqual(resReject.body.data.updatedDocument.status, 'REJECTED');
  assert.ok(resReject.body.data.updatedDocument.rejectionReason.includes('commune stamp'));

  const resStatusRejected = await request('GET', '/api/v1/kyc/status', undefined, {
    Authorization: `Bearer ${borrowerToken}`,
  });
  assert.strictEqual(resStatusRejected.body.data.verifiedCount, 1, 'Verified count is now 1 of 3');
  assert.strictEqual(resStatusRejected.body.data.isEligibleToBorrow, false);
  console.log('✅ Document rejection properly recorded with reason and counted in eligibility guard\n');

  // TEST 6: Admin Approves / Verifies All Documents -> Loan Application Unlocks
  console.log('--- TEST 6: Compliance Verification Unlocks Borrowing Guard ---');
  // Verify NATIONAL_ID
  await request(
    'POST',
    '/api/v1/kyc/verify',
    {
      userId: borrowerId,
      documentType: 'NATIONAL_ID',
      status: 'VERIFIED',
    },
    { Authorization: `Bearer ${adminToken}` }
  );

  // Verify PROOF_OF_RESIDENCE
  await request(
    'POST',
    '/api/v1/kyc/verify',
    {
      userId: borrowerId,
      documentType: 'PROOF_OF_RESIDENCE',
      status: 'VERIFIED',
    },
    { Authorization: `Bearer ${adminToken}` }
  );

  // Check status is now 3 of 3 Verified
  const resUnlockedStatus = await request('GET', '/api/v1/kyc/status', undefined, {
    Authorization: `Bearer ${borrowerToken}`,
  });
  assert.strictEqual(resUnlockedStatus.body.data.verifiedCount, 3);
  assert.strictEqual(resUnlockedStatus.body.data.isEligibleToBorrow, true, 'isEligibleToBorrow must now be TRUE');

  // Submit loan application now that 3 of 3 is verified
  const resApplySuccess = await request(
    'POST',
    '/api/v1/loans/apply',
    {
      productType: 'SME Working Capital',
      principalAmount: 5000,
      tenureMonths: 12,
      borrowerId,
      borrowerName: 'Johnathan Doe',
    },
    { Authorization: `Bearer ${borrowerToken}` }
  );

  assert.strictEqual(resApplySuccess.status, 201, 'Loan application must succeed with HTTP 201 Created');
  assert.strictEqual(resApplySuccess.body.success, true);
  assert.ok(resApplySuccess.body.data.loanId.startsWith('LN-2026-'));
  console.log(`✅ Loan application successfully authorized with 3/3 KYC! Assigned Loan ID: ${resApplySuccess.body.data.loanId}\n`);

  console.log('🎉 ALL 6 REGULATORY KYC VERIFICATION & BORROWING LOCK TESTS PASSED PERFECTLY!\n');
}

runTests().catch((err) => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});

