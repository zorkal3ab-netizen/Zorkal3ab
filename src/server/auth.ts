import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { db, NEW_OWNER_AUTH_EMAIL, DEDICATED_OWNER_ID } from './db';
import {
  generateTotpSecret,
  getTotpUri,
  generateTotpQrCodeDataUrl,
  verifyTotpCode,
  generateRecoveryCodes,
  verifyAndConsumeRecoveryCode,
} from './totp';
import { validateNewPassword, hashIp } from '../utils/security';

export interface AdminAccount {
  id: string;
  email: string;
  role: string;
  is_temporary: number;
  email_verified: number;
  mfa_enabled: number;
  created_at: string;
  updated_at: string;
}

export interface LoginResult {
  success: boolean;
  message?: string;
  token?: string;
  requireMfa?: boolean;
  mfaSessionToken?: string;
  isTemporary?: boolean;
  mfaEnabled?: boolean;
}

/**
 * Validates if the email matches the dedicated authorized owner email.
 * Evaluated strictly in the trusted backend environment.
 */
export function isAuthorizedOwnerEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  return email.trim().toLowerCase() === NEW_OWNER_AUTH_EMAIL;
}

// In-memory or database store for pending MFA enrollment setups
const pendingEnrollments = new Map<
  string,
  { secret: string; hashedRecoveryCodes: string[]; expiresAt: number }
>();

/**
 * Step 1: Owner Primary Password Authentication
 * Enforces email allowlist, rate limiting, bcrypt verification, and MFA branching.
 */
export function loginOwner(
  email: string,
  password: string,
  clientIp: string,
  userAgent = ''
): LoginResult {
  const ipHash = hashIp(clientIp);
  const now = new Date().toISOString();

  // Strict email allowlist check - Reject non-owner emails with generic failure
  if (!isAuthorizedOwnerEmail(email)) {
    db.prepare(`
      INSERT INTO security_audit_logs (event_type, details, severity, ip_hash, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      'LOGIN_UNAUTHORIZED_EMAIL',
      'Rejected authentication attempt for unauthorized identity',
      'WARNING',
      ipHash,
      now
    );

    return {
      success: false,
      message: 'بيانات الدخول غير صحيحة. يرجى التأكد من البريد الإلكتروني وكلمة المرور.',
    };
  }

  // Rate limiting: Maximum 5 failed attempts within 15 minutes
  const recentFails = db.prepare(`
    SELECT COUNT(*) as count FROM security_audit_logs
    WHERE (event_type = 'LOGIN_FAILED_PASSWORD' OR event_type = 'LOGIN_UNAUTHORIZED_EMAIL')
      AND ip_hash = ?
      AND datetime(created_at) > datetime('now', '-15 minutes')
  `).get(ipHash) as { count: number };

  if (recentFails.count >= 5) {
    db.prepare(`
      INSERT INTO security_audit_logs (event_type, details, severity, ip_hash, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      'LOGIN_RATE_LIMITED',
      'Authentication locked due to excessive failed attempts',
      'HIGH',
      ipHash,
      now
    );

    return {
      success: false,
      message: 'تم تجاوز عدد محاولات الدخول المسموح بها. الرجاء الانتظار لمدة 15 دقيقة قبل المحاولة مجدداً.',
    };
  }

  const admin = db.prepare('SELECT * FROM admin_account WHERE id = ?').get(DEDICATED_OWNER_ID) as {
    id: string;
    email: string;
    password_hash: string;
    is_temporary: number;
    email_verified: number;
    mfa_enabled: number;
    mfa_secret: string | null;
  } | undefined;

  if (!admin) {
    return {
      success: false,
      message: 'بيانات الدخول غير صحيحة. يرجى التأكد من البريد الإلكتروني وكلمة المرور.',
    };
  }

  const passwordValid = bcrypt.compareSync(password, admin.password_hash);
  if (!passwordValid) {
    db.prepare(`
      INSERT INTO security_audit_logs (event_type, details, severity, ip_hash, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      'LOGIN_FAILED_PASSWORD',
      'Failed password authentication attempt',
      'HIGH',
      ipHash,
      now
    );

    return {
      success: false,
      message: 'بيانات الدخول غير صحيحة. يرجى التأكد من البريد الإلكتروني وكلمة المرور.',
    };
  }

  // Password valid! Check if MFA is required
  if (admin.mfa_enabled === 1 && admin.mfa_secret) {
    // Generate temporary 5-minute MFA session token
    const mfaSessionToken = 'mfa_' + crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    db.prepare(`
      INSERT INTO mfa_pending_sessions (token, owner_id, email, expires_at, created_at, ip_hash)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(mfaSessionToken, admin.id, admin.email, expiresAt, Date.now(), ipHash);

    return {
      success: true,
      requireMfa: true,
      mfaSessionToken,
      message: 'يرجى إدخال رمز التحقق بخطوتين (MFA) من تطبيق المصادقة الخاص بك.',
    };
  }

  // If MFA is not yet enabled, create regular owner session
  const sessionToken = 'sess_' + crypto.randomBytes(32).toString('hex');
  const sessionExpiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

  db.prepare(`
    INSERT INTO admin_sessions (token, owner_id, email, mfa_verified, expires_at, created_at, user_agent, ip_hash)
    VALUES (?, ?, ?, 0, ?, ?, ?, ?)
  `).run(sessionToken, admin.id, admin.email, sessionExpiresAt, Date.now(), userAgent, ipHash);

  db.prepare(`
    INSERT INTO security_audit_logs (event_type, details, severity, ip_hash, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    'LOGIN_SUCCESS',
    'Owner successfully authenticated via primary password',
    'INFO',
    ipHash,
    now
  );

  return {
    success: true,
    token: sessionToken,
    isTemporary: admin.is_temporary === 1,
    mfaEnabled: false,
  };
}

/**
 * Step 2: MFA Verification (TOTP or Emergency Recovery Code)
 */
export function verifyMfaLogin(
  mfaSessionToken: string,
  code: string,
  clientIp: string,
  userAgent = ''
): LoginResult {
  const ipHash = hashIp(clientIp);
  const now = new Date().toISOString();

  if (!mfaSessionToken || !code) {
    return { success: false, message: 'رمز التحقق مطلوب.' };
  }

  // Check pending MFA session
  const pending = db.prepare(`
    SELECT * FROM mfa_pending_sessions
    WHERE token = ? AND expires_at > ?
  `).get(mfaSessionToken, Date.now()) as {
    token: string;
    owner_id: string;
    email: string;
  } | undefined;

  if (!pending) {
    return {
      success: false,
      message: 'انتهت صلاحية جلسة التحقق الثنائي. يرجى إعادة تسجيل الدخول.',
    };
  }

  const admin = db.prepare('SELECT * FROM admin_account WHERE id = ?').get(pending.owner_id) as {
    id: string;
    email: string;
    is_temporary: number;
    mfa_enabled: number;
    mfa_secret: string;
    mfa_backup_codes: string | null;
  } | undefined;

  if (!admin || !admin.mfa_secret) {
    return { success: false, message: 'إعدادات التحقق الثنائي غير مكتملة.' };
  }

  let verified = false;
  let usedRecoveryCode = false;

  // 1. Check if input is standard 6-digit TOTP
  if (/^\d{6}$/.test(code.trim())) {
    verified = verifyTotpCode(code.trim(), admin.mfa_secret, 1);
  }

  // 2. If not TOTP or TOTP failed, check if it's a backup recovery code (format XXXX-XXXX-XXXX)
  if (!verified && admin.mfa_backup_codes) {
    try {
      const hashes: string[] = JSON.parse(admin.mfa_backup_codes);
      const recoveryCheck = verifyAndConsumeRecoveryCode(code, hashes);
      if (recoveryCheck.valid) {
        verified = true;
        usedRecoveryCode = true;
        // Update remaining backup codes
        db.prepare('UPDATE admin_account SET mfa_backup_codes = ?, updated_at = ? WHERE id = ?').run(
          JSON.stringify(recoveryCheck.remainingHashedCodes),
          now,
          admin.id
        );
      }
    } catch {}
  }

  if (!verified) {
    db.prepare(`
      INSERT INTO security_audit_logs (event_type, details, severity, ip_hash, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      'MFA_FAILED',
      'Invalid MFA code or recovery code submitted',
      'HIGH',
      ipHash,
      now
    );

    return {
      success: false,
      message: 'رمز التحقق الثنائي غير صحيح أو منتهي الصلاحية.',
    };
  }

  // Success! Delete pending session
  db.prepare('DELETE FROM mfa_pending_sessions WHERE token = ?').run(mfaSessionToken);

  // Generate real owner session token
  const sessionToken = 'sess_' + crypto.randomBytes(32).toString('hex');
  const sessionExpiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

  db.prepare(`
    INSERT INTO admin_sessions (token, owner_id, email, mfa_verified, expires_at, created_at, user_agent, ip_hash)
    VALUES (?, ?, ?, 1, ?, ?, ?, ?)
  `).run(sessionToken, admin.id, admin.email, sessionExpiresAt, Date.now(), userAgent, ipHash);

  db.prepare(`
    INSERT INTO security_audit_logs (event_type, details, severity, ip_hash, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    'MFA_SUCCESS',
    usedRecoveryCode
      ? 'Owner successfully verified MFA via emergency recovery code'
      : 'Owner successfully verified MFA via TOTP authenticator',
    'INFO',
    ipHash,
    now
  );

  return {
    success: true,
    token: sessionToken,
    isTemporary: admin.is_temporary === 1,
    mfaEnabled: true,
  };
}

/**
 * Initiate MFA Enrollment (Generate TOTP secret, QR code Data URL, and 8 backup recovery codes)
 */
export async function initiateMfaEnrollment(ownerId: string): Promise<{
  success: boolean;
  message?: string;
  qrCodeDataUrl?: string;
  secret?: string;
  recoveryCodes?: string[];
}> {
  if (ownerId !== DEDICATED_OWNER_ID) {
    return { success: false, message: 'غير مصرح.' };
  }

  const secret = generateTotpSecret(32);
  const uri = getTotpUri(secret, 'Owner', 'ZORK CRAFT');
  const qrCodeDataUrl = await generateTotpQrCodeDataUrl(uri);
  const { plainCodes, hashedCodes } = generateRecoveryCodes(8);

  // Save pending enrollment (expires in 10 minutes)
  pendingEnrollments.set(ownerId, {
    secret,
    hashedRecoveryCodes: hashedCodes,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });

  return {
    success: true,
    qrCodeDataUrl,
    secret,
    recoveryCodes: plainCodes,
  };
}

/**
 * Confirm and Activate MFA Enrollment with initial verification code
 */
export function confirmMfaEnrollment(
  ownerId: string,
  verificationCode: string,
  clientIp: string
): { success: boolean; message: string } {
  const ipHash = hashIp(clientIp);
  const now = new Date().toISOString();

  if (ownerId !== DEDICATED_OWNER_ID) {
    return { success: false, message: 'غير مصرح.' };
  }

  const pending = pendingEnrollments.get(ownerId);
  if (!pending || Date.now() > pending.expiresAt) {
    return { success: false, message: 'انتهت صلاحية جلسة تفعيل التحقق الثنائي. يرجى المحاولة مجدداً.' };
  }

  const isValid = verifyTotpCode(verificationCode, pending.secret, 1);
  if (!isValid) {
    return { success: false, message: 'رمز التحقق من التطبيق غير صحيح. تأكد من ضبط توقيت جهازك.' };
  }

  // Activate in database
  db.prepare(`
    UPDATE admin_account
    SET mfa_enabled = 1,
        mfa_secret = ?,
        mfa_backup_codes = ?,
        updated_at = ?
    WHERE id = ?
  `).run(pending.secret, JSON.stringify(pending.hashedRecoveryCodes), now, DEDICATED_OWNER_ID);

  pendingEnrollments.delete(ownerId);

  db.prepare(`
    INSERT INTO security_audit_logs (event_type, details, severity, ip_hash, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run('MFA_ENROLLED', 'Owner successfully enrolled and activated TOTP MFA protection', 'INFO', ipHash, now);

  return { success: true, message: 'تم تفعيل التحقق الثنائي (MFA) وتأمين الحساب بنجاح!' };
}

/**
 * Revoke MFA Protection (requires current password confirmation)
 */
export function revokeMfa(
  ownerId: string,
  currentPassword: string,
  clientIp: string
): { success: boolean; message: string } {
  const ipHash = hashIp(clientIp);
  const now = new Date().toISOString();

  if (ownerId !== DEDICATED_OWNER_ID) {
    return { success: false, message: 'غير مصرح.' };
  }

  const admin = db.prepare('SELECT password_hash FROM admin_account WHERE id = ?').get(DEDICATED_OWNER_ID) as {
    password_hash: string;
  } | undefined;

  if (!admin || !bcrypt.compareSync(currentPassword, admin.password_hash)) {
    return { success: false, message: 'كلمة المرور الحالية غير صحيحة.' };
  }

  db.prepare(`
    UPDATE admin_account
    SET mfa_enabled = 0,
        mfa_secret = NULL,
        mfa_backup_codes = NULL,
        updated_at = ?
    WHERE id = ?
  `).run(now, DEDICATED_OWNER_ID);

  db.prepare(`
    INSERT INTO security_audit_logs (event_type, details, severity, ip_hash, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run('MFA_REVOKED', 'Owner deactivated TOTP MFA protection', 'WARNING', ipHash, now);

  return { success: true, message: 'تم إلغاء تفعيل التحقق الثنائي.' };
}

/**
 * Change Owner Password (enforces strict 20+ chars, uppercase, lowercase, numbers, symbols)
 */
export function changeOwnerPassword(
  ownerId: string,
  currentPassword: string,
  newPassword: string,
  clientIp: string
): { success: boolean; message: string } {
  const ipHash = hashIp(clientIp);
  const now = new Date().toISOString();

  if (ownerId !== DEDICATED_OWNER_ID) {
    return { success: false, message: 'غير مصرح.' };
  }

  const validation = validateNewPassword(newPassword);
  if (!validation.valid) {
    return { success: false, message: validation.message || 'كلمة المرور غير صالحة.' };
  }

  const admin = db.prepare('SELECT password_hash FROM admin_account WHERE id = ?').get(DEDICATED_OWNER_ID) as {
    password_hash: string;
  } | undefined;

  if (!admin) {
    return { success: false, message: 'حساب المالك غير موجود.' };
  }

  const currentMatch = bcrypt.compareSync(currentPassword, admin.password_hash);
  if (!currentMatch) {
    db.prepare(`
      INSERT INTO security_audit_logs (event_type, details, severity, ip_hash, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      'PASSWORD_CHANGE_FAILED',
      'Invalid current password submitted during password update',
      'HIGH',
      ipHash,
      now
    );

    return { success: false, message: 'كلمة المرور الحالية غير صحيحة.' };
  }

  const newHash = bcrypt.hashSync(newPassword, 10);

  db.prepare(`
    UPDATE admin_account
    SET password_hash = ?, is_temporary = 0, updated_at = ?
    WHERE id = ?
  `).run(newHash, now, DEDICATED_OWNER_ID);

  db.prepare(`
    INSERT INTO security_audit_logs (event_type, details, severity, ip_hash, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    'PASSWORD_CHANGED',
    'Owner password successfully rotated to new 20+ character secure password',
    'INFO',
    ipHash,
    now
  );

  return { success: true, message: 'تم تحديث كلمة المرور بنجاح وتم تفعيل حماية الحساب الدائمة.' };
}

/**
 * Authenticate session token and return sanitized Owner object.
 * Rejects expired sessions or mismatched owner IDs.
 */
export function getAuthenticatedOwner(token: string | undefined): AdminAccount | null {
  if (!token || typeof token !== 'string') return null;

  const now = Date.now();
  const session = db.prepare(`
    SELECT * FROM admin_sessions
    WHERE token = ? AND expires_at > ?
  `).get(token, now) as {
    token: string;
    owner_id: string;
    email: string;
    mfa_verified: number;
  } | undefined;

  if (!session || session.owner_id !== DEDICATED_OWNER_ID) {
    return null;
  }

  const admin = db.prepare(`
    SELECT id, email, role, is_temporary, email_verified, mfa_enabled, created_at, updated_at
    FROM admin_account
    WHERE id = ?
  `).get(session.owner_id) as AdminAccount | undefined;

  return admin || null;
}

/**
 * Revoke single session (Logout)
 */
export function revokeSession(token: string) {
  if (!token) return;
  db.prepare('DELETE FROM admin_sessions WHERE token = ?').run(token);
}

/**
 * Revoke all other sessions for owner
 */
export function revokeAllOtherSessions(ownerId: string, currentToken: string) {
  if (!ownerId) return;
  db.prepare('DELETE FROM admin_sessions WHERE owner_id = ? AND token != ?').run(ownerId, currentToken);
}
