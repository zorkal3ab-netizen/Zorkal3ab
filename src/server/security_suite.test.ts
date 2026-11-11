import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { db, initDatabase, NEW_OWNER_AUTH_EMAIL, DEDICATED_OWNER_ID } from './db';
import {
  loginOwner,
  verifyMfaLogin,
  initiateMfaEnrollment,
  confirmMfaEnrollment,
  revokeMfa,
  changeOwnerPassword,
  getAuthenticatedOwner,
  revokeSession,
  revokeAllOtherSessions,
} from './auth';
import { computeTotp } from './totp';
import { generateSecurePassword, validateNewPassword } from '../utils/security';

// Ensure DB is initialized
initDatabase();

test('Security Verification 1: Exactly ONE permanent owner account is provisioned', () => {
  const accounts = db.prepare('SELECT id, email, role FROM admin_account').all() as any[];
  assert.equal(accounts.length, 1, 'Only one owner account must exist');
  assert.equal(accounts[0].id, DEDICATED_OWNER_ID);
  assert.equal(accounts[0].email, NEW_OWNER_AUTH_EMAIL);
  assert.equal(accounts[0].role, 'owner');

  // Verify previous owner is revoked
  const oldAccount = db.prepare('SELECT * FROM admin_account WHERE email = ?').get('zorkal3ab@gmail.com');
  assert.equal(oldAccount, undefined, 'Previous owner must be revoked');
});

test('Security Verification 2: Unauthorized emails are rejected with generic failure', () => {
  const result1 = loginOwner('hacker@attack.com', 'password123', '10.0.0.1');
  assert.equal(result1.success, false);
  assert.equal(result1.token, undefined);

  // Attempt using old revoked email
  const result2 = loginOwner('zorkal3ab@gmail.com', 'ZorkOwnerInit95#Secure2026', '10.0.0.1');
  assert.equal(result2.success, false);
  assert.equal(result2.token, undefined);
});

test('Security Verification 3: Invalid password for dedicated owner is rejected', () => {
  const result = loginOwner(NEW_OWNER_AUTH_EMAIL, 'wrongpassword', '10.0.0.2');
  assert.equal(result.success, false);
  assert.equal(result.token, undefined);
});

test('Security Verification 4: Valid temporary password allows login and flags temporary requirement', () => {
  // Reset password to known temporary test hash for testing
  const tempPassword = 'ZORKC26x0o0';
  db.prepare('UPDATE admin_account SET password_hash = ?, is_temporary = 1, mfa_enabled = 0 WHERE id = ?').run(
    bcrypt.hashSync(tempPassword, 10),
    DEDICATED_OWNER_ID
  );

  const result = loginOwner(NEW_OWNER_AUTH_EMAIL, tempPassword, '10.0.0.3');
  assert.equal(result.success, true);
  assert.equal(typeof result.token, 'string');
  assert.equal(result.isTemporary, true, 'Temporary password flag must be true');

  const owner = getAuthenticatedOwner(result.token);
  assert.notEqual(owner, null);
  assert.equal(owner?.id, DEDICATED_OWNER_ID);
});

test('Security Verification 5: Password rotation enforces 20+ chars policy and clears temporary flag', () => {
  const currentPassword = 'ZORKC26x0o0';
  const weakPassword = 'short';
  const weakResult = changeOwnerPassword(DEDICATED_OWNER_ID, currentPassword, weakPassword, '10.0.0.4');
  assert.equal(weakResult.success, false, 'Short password must be rejected');

  // Generate strong 24-character password
  const strongPassword = generateSecurePassword(24);
  assert.equal(validateNewPassword(strongPassword).valid, true);

  const changeResult = changeOwnerPassword(DEDICATED_OWNER_ID, currentPassword, strongPassword, '10.0.0.4');
  assert.equal(changeResult.success, true);

  // Verify in database that is_temporary is now 0
  const updatedOwner = db.prepare('SELECT is_temporary FROM admin_account WHERE id = ?').get(DEDICATED_OWNER_ID) as any;
  assert.equal(updatedOwner.is_temporary, 0, 'is_temporary must be 0 after successful rotation');

  // Verify new password works
  const loginWithNew = loginOwner(NEW_OWNER_AUTH_EMAIL, strongPassword, '10.0.0.4');
  assert.equal(loginWithNew.success, true);
  assert.equal(loginWithNew.isTemporary, false);
});

test('Security Verification 6: Genuine MFA setup, activation, and 2-step verification', async () => {
  // 1. Initiate MFA enrollment
  const setup = await initiateMfaEnrollment(DEDICATED_OWNER_ID);
  assert.equal(setup.success, true);
  assert.equal(typeof setup.qrCodeDataUrl, 'string');
  assert.equal(typeof setup.secret, 'string');
  assert.equal(setup.recoveryCodes?.length, 8);

  // 2. Compute valid initial TOTP code
  const currentStep = Math.floor(Date.now() / 1000 / 30);
  const initialOtp = computeTotp(setup.secret!, currentStep);

  // 3. Confirm MFA enrollment
  const confirmResult = confirmMfaEnrollment(DEDICATED_OWNER_ID, initialOtp, '10.0.0.5');
  assert.equal(confirmResult.success, true);

  // Verify in DB that mfa_enabled is 1
  const mfaAccount = db.prepare('SELECT mfa_enabled FROM admin_account WHERE id = ?').get(DEDICATED_OWNER_ID) as any;
  assert.equal(mfaAccount.mfa_enabled, 1);

  // 4. Test subsequent login requires MFA step 2
  // Fetch current password hash from DB and set known test password
  const permanentPassword = 'ZorkOwnerPermanent#2026MasterKey!';
  db.prepare('UPDATE admin_account SET password_hash = ? WHERE id = ?').run(
    bcrypt.hashSync(permanentPassword, 10),
    DEDICATED_OWNER_ID
  );

  const step1 = loginOwner(NEW_OWNER_AUTH_EMAIL, permanentPassword, '10.0.0.6');
  assert.equal(step1.success, true);
  assert.equal(step1.requireMfa, true, 'Login must require MFA step 2');
  assert.equal(typeof step1.mfaSessionToken, 'string');
  assert.equal(step1.token, undefined, 'Session token must NOT be granted before MFA');

  // 5. Test invalid MFA code is rejected
  const invalidMfa = verifyMfaLogin(step1.mfaSessionToken!, '000000', '10.0.0.6');
  assert.equal(invalidMfa.success, false);
  assert.equal(invalidMfa.token, undefined);

  // 6. Test valid MFA code grants session
  const validMfaCode = computeTotp(setup.secret!, Math.floor(Date.now() / 1000 / 30));
  const validMfa = verifyMfaLogin(step1.mfaSessionToken!, validMfaCode, '10.0.0.6');
  assert.equal(validMfa.success, true);
  assert.equal(typeof validMfa.token, 'string');

  // Verify session works
  const sessionOwner = getAuthenticatedOwner(validMfa.token);
  assert.notEqual(sessionOwner, null);
  assert.equal(sessionOwner?.id, DEDICATED_OWNER_ID);

  // 7. Test session revocation (Logout)
  revokeSession(validMfa.token!);
  const revokedCheck = getAuthenticatedOwner(validMfa.token);
  assert.equal(revokedCheck, null, 'Revoked session must be rejected');

  // Clean up: reset MFA for ongoing tests
  revokeMfa(DEDICATED_OWNER_ID, permanentPassword, '10.0.0.6');
});

test('Security Verification 7: Security Audit Logs never leak passwords or secrets', () => {
  const logs = db.prepare('SELECT details FROM security_audit_logs').all() as { details: string }[];
  logs.forEach((log) => {
    assert.doesNotMatch(log.details, /password_hash/i);
    assert.doesNotMatch(log.details, /otp_code/i);
    assert.doesNotMatch(log.details, /mfa_secret/i);
  });
});

test('Cleanup: Restore clean initial owner provisioning state', () => {
  db.prepare(`
    UPDATE admin_account 
    SET password_hash = ?, is_temporary = 1, mfa_enabled = 0, mfa_secret = NULL, mfa_backup_codes = NULL
    WHERE id = ?
  `).run(
    bcrypt.hashSync('ZORKC26x0o0', 10),
    DEDICATED_OWNER_ID
  );
  db.prepare('DELETE FROM admin_sessions WHERE owner_id = ?').run(DEDICATED_OWNER_ID);
  db.prepare('DELETE FROM mfa_pending_sessions WHERE owner_id = ?').run(DEDICATED_OWNER_ID);
});

