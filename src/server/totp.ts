import crypto from 'node:crypto';
import QRCode from 'qrcode';

// Base32 alphabet according to RFC 4648
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Generate a random cryptographically secure Base32 secret for TOTP (160 bits / 20 bytes = 32 base32 chars)
 */
export function generateTotpSecret(length = 32): string {
  const randomBytes = crypto.randomBytes(length);
  let secret = '';
  for (let i = 0; i < length; i++) {
    secret += BASE32_ALPHABET[randomBytes[i] % 32];
  }
  return secret;
}

/**
 * Decode base32 string into Buffer
 */
export function base32Decode(base32Str: string): Buffer {
  const cleaned = base32Str.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (let i = 0; i < cleaned.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(cleaned[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      output.push((value >> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return Buffer.from(output);
}

/**
 * Compute RFC 6238 TOTP code for a given secret at a specific counter step
 */
export function computeTotp(secretBase32: string, counter: number): string {
  const key = base32Decode(secretBase32);
  const counterBuffer = Buffer.alloc(8);
  // Write 64-bit big endian integer
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  const hmac = crypto.createHmac('sha1', key).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = binary % 1000000;
  return otp.toString().padStart(6, '0');
}

/**
 * Verify a submitted 6-digit TOTP code against a secret within a time window (+/- window steps of 30s)
 */
export function verifyTotpCode(code: string, secretBase32: string, window = 1): boolean {
  if (!code || typeof code !== 'string') return false;
  const cleanCode = code.trim();
  if (!/^\d{6}$/.test(cleanCode)) return false;

  const currentStep = Math.floor(Date.now() / 1000 / 30);

  for (let i = -window; i <= window; i++) {
    const expected = computeTotp(secretBase32, currentStep + i);
    if (crypto.timingSafeEqual(Buffer.from(cleanCode), Buffer.from(expected))) {
      return true;
    }
  }

  return false;
}

/**
 * Generate standard otpauth URI
 */
export function getTotpUri(secretBase32: string, accountName = 'Owner', issuer = 'ZORK CRAFT'): string {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedAccount = encodeURIComponent(accountName);
  return `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${secretBase32}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Generate QR code as Data URL (image/png) for client-side scanning
 */
export async function generateTotpQrCodeDataUrl(totpUri: string): Promise<string> {
  return QRCode.toDataURL(totpUri, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 256,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });
}

/**
 * Generate 8 cryptographically secure single-use recovery codes
 * Format: XXXX-XXXX-XXXX
 */
export function generateRecoveryCodes(count = 8): {
  plainCodes: string[];
  hashedCodes: string[];
} {
  const plainCodes: string[] = [];
  const hashedCodes: string[] = [];

  for (let i = 0; i < count; i++) {
    const raw = crypto.randomBytes(6).toString('hex').toUpperCase();
    const formatted = `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
    plainCodes.push(formatted);
    const hash = crypto.createHash('sha256').update(formatted).digest('hex');
    hashedCodes.push(hash);
  }

  return { plainCodes, hashedCodes };
}

/**
 * Verify and consume a recovery code from the hashed codes array
 */
export function verifyAndConsumeRecoveryCode(
  inputCode: string,
  hashedCodes: string[]
): { valid: boolean; remainingHashedCodes: string[] } {
  if (!inputCode || typeof inputCode !== 'string') {
    return { valid: false, remainingHashedCodes: hashedCodes };
  }

  // Normalize code (uppercase, trim)
  const normalized = inputCode.trim().toUpperCase();
  const inputHash = crypto.createHash('sha256').update(normalized).digest('hex');

  const idx = hashedCodes.findIndex((h) => h === inputHash);
  if (idx !== -1) {
    const remaining = [...hashedCodes];
    remaining.splice(idx, 1);
    return { valid: true, remainingHashedCodes: remaining };
  }

  return { valid: false, remainingHashedCodes: hashedCodes };
}
