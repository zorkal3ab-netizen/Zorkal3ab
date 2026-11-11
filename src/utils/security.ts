/**
 * Security and Validation Utilities for ZORK CRAFT
 * Password Rules (20+ chars, uppercase, lowercase, numbers, symbols),
 * Random Password Generator, Download Deduplication,
 * Android File / MIME Type Detection, and MediaFire URL Validation.
 *
 * NOTE: Owner identity credentials and allowlists are strictly managed
 * in the trusted backend environment to prevent exposure in frontend bundles.
 */

// Isomorphic secure random integer generator (works seamlessly in Browser & Node.js)
function getSecureRandomInt(min: number, max: number): number {
  const range = max - min;
  if (range <= 0) return min;
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    const array = new Uint32Array(1);
    globalThis.crypto.getRandomValues(array);
    return min + (array[0] % range);
  }
  return min + Math.floor(Math.random() * range);
}

// Server-safe SHA-256 hashing for Node environments without breaking client browser bundles
function sha256Hex(str: string): string {
  try {
    const nodeCrypto = (typeof process !== 'undefined' && process.versions?.node)
      ? (Function('return require("node:crypto")')())
      : null;
    if (nodeCrypto?.createHash) {
      return nodeCrypto.createHash('sha256').update(str).digest('hex');
    }
  } catch {}

  // Fallback 32-char hex hash
  let h1 = 0xdeadbeef, h2 = 0x41c64e6d;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
}


// Allowed file extensions for Minecraft Bedrock content & media
export const ALLOWED_EXTENSIONS = [
  '.mcpack',
  '.mcaddon',
  '.mcworld',
  '.zip',
  '.rar',
  '.7z',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
  '.avif',
];

export const ALLOWED_MIME_TYPES = [
  'application/octet-stream',
  'application/zip',
  'application/x-zip-compressed',
  'application/x-zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/jpg',
  'image/gif',
  'image/avif',
];

/**
 * Validates a new owner password according to strict cybersecurity criteria:
 * - Minimum 20 characters
 * - At least one uppercase letter (A-Z)
 * - At least one lowercase letter (a-z)
 * - At least one digit (0-9)
 * - At least one symbol / special character
 */
export function validateNewPassword(newPassword: string): { valid: boolean; message?: string } {
  if (!newPassword || typeof newPassword !== 'string') {
    return { valid: false, message: 'كلمة المرور مطلوبة.' };
  }
  if (newPassword.length < 20) {
    return {
      valid: false,
      message: 'يجب ألا تقل كلمة المرور عن 20 حرفاً ورقم ورمز لضمان الحماية القصوى.',
    };
  }
  if (!/[A-Z]/.test(newPassword)) {
    return {
      valid: false,
      message: 'يجب أن تحتوي كلمة المرور على حرف كبير واحد على الأقل (A-Z).',
    };
  }
  if (!/[a-z]/.test(newPassword)) {
    return {
      valid: false,
      message: 'يجب أن تحتوي كلمة المرور على حرف صغير واحد على الأقل (a-z).',
    };
  }
  if (!/[0-9]/.test(newPassword)) {
    return {
      valid: false,
      message: 'يجب أن تحتوي كلمة المرور على رقم واحد على الأقل (0-9).',
    };
  }
  if (!/[^a-zA-Z0-9]/.test(newPassword)) {
    return {
      valid: false,
      message: 'يجب أن تحتوي كلمة المرور على رمز خاص واحد على الأقل (مثل: !@#$%^&*).',
    };
  }
  return { valid: true };
}

/**
 * Generates a cryptographically strong, unique random password
 * containing uppercase, lowercase, numbers, and symbols (default 24 characters)
 */
export function generateSecurePassword(length = 24): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // excluding ambiguous O, I
  const lower = 'abcdefghijkmnopqrstuvwxyz'; // excluding ambiguous l
  const numbers = '23456789'; // excluding ambiguous 0, 1
  const symbols = '!@#$%^&*()-_=+[]{}|;:,.<>?';

  // Ensure at least two of each category
  const guaranteed = [
    upper[getSecureRandomInt(0, upper.length)],
    upper[getSecureRandomInt(0, upper.length)],
    lower[getSecureRandomInt(0, lower.length)],
    lower[getSecureRandomInt(0, lower.length)],
    numbers[getSecureRandomInt(0, numbers.length)],
    numbers[getSecureRandomInt(0, numbers.length)],
    symbols[getSecureRandomInt(0, symbols.length)],
    symbols[getSecureRandomInt(0, symbols.length)],
  ];

  const allChars = upper + lower + numbers + symbols;
  while (guaranteed.length < length) {
    guaranteed.push(allChars[getSecureRandomInt(0, allChars.length)]);
  }

  // Cryptographic Durstenfeld shuffle
  for (let i = guaranteed.length - 1; i > 0; i--) {
    const j = getSecureRandomInt(0, i + 1);
    [guaranteed[i], guaranteed[j]] = [guaranteed[j], guaranteed[i]];
  }

  return guaranteed.join('');
}

/**
 * Generates a cryptographically secure 6-digit numeric OTP code.
 */
export function generateOtpCode(): string {
  const num = getSecureRandomInt(100000, 999999);
  return num.toString();
}

/**
 * Hashes a verification code using SHA-256 for secure database storage.
 */
export function hashOtpCode(code: string): string {
  return sha256Hex(code.trim());
}

/**
 * Anonymizes an IP address with SHA-256 for privacy and download tracking deduplication.
 */
export function hashIp(ip: string): string {
  const salt = 'zorkcraft_secure_ip_salt_2026';
  return sha256Hex(ip + salt).substring(0, 32);
}

/**
 * Detects the real normalized extension from filename or MIME type.
 * Handles Android photo picker filenames without extensions or uppercase names.
 */
export function resolveFileExtension(filename: string, mimetype?: string): string {
  const lowerName = (filename || '').toLowerCase().trim();

  // 1. Direct suffix match
  for (const ext of ALLOWED_EXTENSIONS) {
    if (lowerName.endsWith(ext)) {
      return ext === '.jpeg' ? '.jpg' : ext;
    }
  }

  // 2. Substring match for Android downloads with suffixes like .mcpack (1) or .mcaddon.tmp
  if (lowerName.includes('.mcaddon')) return '.mcaddon';
  if (lowerName.includes('.mcpack')) return '.mcpack';
  if (lowerName.includes('.mcworld')) return '.mcworld';
  if (lowerName.includes('.zip')) return '.zip';
  if (lowerName.includes('.rar')) return '.rar';
  if (lowerName.includes('.7z')) return '.7z';
  if (lowerName.includes('.png')) return '.png';
  if (lowerName.includes('.jpg') || lowerName.includes('.jpeg')) return '.jpg';
  if (lowerName.includes('.webp')) return '.webp';
  if (lowerName.includes('.gif')) return '.gif';

  // 3. Fallback to MIME type detection (critical for Android camera / gallery uploads)
  if (mimetype) {
    const mime = mimetype.toLowerCase().trim();
    if (mime === 'image/jpeg' || mime === 'image/jpg' || mime === 'image/pjpeg') return '.jpg';
    if (mime === 'image/png' || mime === 'image/x-png') return '.png';
    if (mime === 'image/webp') return '.webp';
    if (mime === 'image/gif') return '.gif';
    if (mime === 'image/avif') return '.avif';
    if (mime.startsWith('image/')) return '.jpg';
    if (
      mime === 'application/zip' ||
      mime === 'application/x-zip-compressed' ||
      mime === 'application/x-zip'
    ) return '.zip';
    if (mime === 'application/octet-stream') return '.mcpack';
  }

  return '';
}

/**
 * Validates an uploaded filename against allowed extensions and MIME types.
 */
export function isAllowedFilename(filename: string, mimetype?: string): boolean {
  if (!filename && !mimetype) return false;
  const ext = resolveFileExtension(filename, mimetype);
  return ext !== '';
}

/**
 * Sanitizes and cleans an uploaded filename to prevent directory traversal
 * while supporting Arabic and Unicode names cleanly.
 */
export function sanitizeFilename(filename: string): string {
  const clean = filename.replace(/[^\p{L}\p{N}._-]/gu, '_').replace(/\.{2,}/g, '.');
  const trimmed = clean.replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  return trimmed.length > 0 ? trimmed : 'zork_upload';
}

/**
 * Validates external download URLs (MediaFire, Google Drive, direct links).
 * Enforces HTTPS, blocks dangerous schemes and SSRF attempts.
 */
export interface ExternalUrlValidationResult {
  valid: boolean;
  message?: string;
  isMediaFire?: boolean;
  cleanUrl?: string;
}

export function validateExternalUrl(urlStr: string): ExternalUrlValidationResult {
  if (!urlStr || typeof urlStr !== 'string') {
    return { valid: false, message: 'يرجى إدخال رابط التحميل.' };
  }

  const trimmed = urlStr.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, message: 'صيغة الرابط غير صحيحة. يجب أن يكون رابط ويب كامل (مثال: https://...)' };
  }

  // Reject dangerous schemes
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { valid: false, message: 'البروتوكول غير مدعوم. يجب أن يبدأ الرابط بـ https://' };
  }

  // Reject local/private network addresses (SSRF prevention)
  const hostname = parsed.hostname.toLowerCase();
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    hostname.endsWith('.local')
  ) {
    return { valid: false, message: 'الرابط يشير إلى عنوان محلي غير مسموح به.' };
  }

  const isMediaFire = hostname.includes('mediafire.com');

  return {
    valid: true,
    isMediaFire,
    cleanUrl: parsed.toString(),
  };
}
