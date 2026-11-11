import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateNewPassword,
  generateSecurePassword,
  generateOtpCode,
  hashOtpCode,
  hashIp,
  isAllowedFilename,
  sanitizeFilename,
  validateExternalUrl,
} from './security';
import { isAuthorizedOwnerEmail } from '../server/auth';
import {
  generateTotpSecret,
  computeTotp,
  verifyTotpCode,
  generateRecoveryCodes,
  verifyAndConsumeRecoveryCode,
} from '../server/totp';

test('Dedicated owner email authorization allows ONLY zork.l3b.craftwebsite95@gmail.com', () => {
  // Authorized dedicated owner email
  assert.equal(isAuthorizedOwnerEmail('zork.l3b.craftwebsite95@gmail.com'), true);
  assert.equal(isAuthorizedOwnerEmail('  zork.l3b.craftwebsite95@gmail.com  '), true);
  assert.equal(isAuthorizedOwnerEmail('ZORK.L3B.CRAFTWEBSITE95@GMAIL.COM'), true);

  // Previous owner or arbitrary accounts MUST be rejected
  assert.equal(isAuthorizedOwnerEmail('zorkal3ab@gmail.com'), false);
  assert.equal(isAuthorizedOwnerEmail('admin@zorkcraft.com'), false);
  assert.equal(isAuthorizedOwnerEmail('hacker@gmail.com'), false);
  assert.equal(isAuthorizedOwnerEmail(''), false);
});

test('Password validation strictly enforces 20+ chars, uppercase, lowercase, number, and symbol', () => {
  // Reject empty
  assert.equal(validateNewPassword('').valid, false);

  // Reject < 20 characters
  assert.equal(validateNewPassword('Short123!').valid, false);
  assert.equal(validateNewPassword('1234567890123456789').valid, false); // 19 chars

  // Reject missing uppercase
  assert.equal(validateNewPassword('lowercaseonly1234567890!@#').valid, false);

  // Reject missing lowercase
  assert.equal(validateNewPassword('UPPERCASEONLY1234567890!@#').valid, false);

  // Reject missing numbers
  assert.equal(validateNewPassword('NoNumbersHereAtAllLettersOnly!@#').valid, false);

  // Reject missing symbols
  assert.equal(validateNewPassword('NoSymbolsHereAtAll1234567890Aa').valid, false);

  // Valid 20+ character passwords with mixed case, digits, and symbols
  const valid1 = validateNewPassword('ZorkBedrock#2026MasterKey!');
  assert.equal(valid1.valid, true);

  const valid2 = validateNewPassword('A!b@C#d$E%f^1&2*3(4)5_6+7-8=');
  assert.equal(valid2.valid, true);
});

test('generateSecurePassword generates 24-character password compliant with all security rules', () => {
  const generated = generateSecurePassword(24);
  assert.equal(generated.length, 24);

  const check = validateNewPassword(generated);
  assert.equal(check.valid, true, `Generated password should be valid: ${check.message}`);
});

test('RFC 6238 TOTP engine correctly computes and validates time-based one-time passwords', () => {
  const secret = generateTotpSecret(32);
  assert.equal(secret.length, 32);
  assert.match(secret, /^[A-Z2-7]{32}$/);

  // Current counter step
  const counter = Math.floor(Date.now() / 1000 / 30);
  const validCode = computeTotp(secret, counter);

  assert.equal(validCode.length, 6);
  assert.match(validCode, /^\d{6}$/);

  // Valid verification
  assert.equal(verifyTotpCode(validCode, secret, 1), true);

  // Invalid verification
  assert.equal(verifyTotpCode('000000' === validCode ? '999999' : '000000', secret, 0), false);
  assert.equal(verifyTotpCode('notdigits', secret), false);
  assert.equal(verifyTotpCode('', secret), false);
});

test('Recovery codes generation, hashing, and single-use consumption', () => {
  const { plainCodes, hashedCodes } = generateRecoveryCodes(8);
  assert.equal(plainCodes.length, 8);
  assert.equal(hashedCodes.length, 8);

  // Verify format XXXX-XXXX-XXXX
  plainCodes.forEach((code) => {
    assert.match(code, /^[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/);
  });

  // Verify first code can be consumed
  const firstCode = plainCodes[0];
  const consume1 = verifyAndConsumeRecoveryCode(firstCode, hashedCodes);
  assert.equal(consume1.valid, true);
  assert.equal(consume1.remainingHashedCodes.length, 7);

  // Attempting to consume the same code again fails (single-use enforcement)
  const consume2 = verifyAndConsumeRecoveryCode(firstCode, consume1.remainingHashedCodes);
  assert.equal(consume2.valid, false);
  assert.equal(consume2.remainingHashedCodes.length, 7);
});

test('IP hashing produces consistent anonymized string', () => {
  const h1 = hashIp('192.168.1.1');
  const h2 = hashIp('192.168.1.1');
  const h3 = hashIp('192.168.1.2');
  assert.equal(h1, h2);
  assert.notEqual(h1, h3);
});

test('Minecraft file validation accepts valid bedrock formats and rejects dangerous extensions', () => {
  assert.equal(isAllowedFilename('world.mcworld'), true);
  assert.equal(isAllowedFilename('addon.mcaddon'), true);
  assert.equal(isAllowedFilename('pack.mcpack'), true);
  assert.equal(isAllowedFilename('archive.zip'), true);
  assert.equal(isAllowedFilename('cover.png'), true);
  assert.equal(isAllowedFilename('screenshot.webp'), true);

  // Reject dangerous extensions
  assert.equal(isAllowedFilename('malware.exe'), false);
  assert.equal(isAllowedFilename('script.sh'), false);
  assert.equal(isAllowedFilename('exploit.php'), false);
  assert.equal(isAllowedFilename('hack.js'), false);
});

test('Android file validation detects MIME types when extension is absent', () => {
  assert.equal(isAllowedFilename('image_picker_3821', 'image/jpeg'), true);
  assert.equal(isAllowedFilename('Screenshot_2026', 'image/png'), true);
  assert.equal(isAllowedFilename('bedrock_pack', 'application/zip'), true);
  assert.equal(isAllowedFilename('dangerous_script', 'application/x-sh'), false);
});

test('MediaFire and external URL validation verifies HTTPS and rejects malicious schemes', () => {
  // Valid MediaFire URL
  const mfResult = validateExternalUrl('https://www.mediafire.com/file/abcdef12345/zork_addon.mcaddon/file');
  assert.equal(mfResult.valid, true);
  assert.equal(mfResult.isMediaFire, true);

  // Valid external download link
  const extResult = validateExternalUrl('https://drive.google.com/uc?id=12345');
  assert.equal(extResult.valid, true);
  assert.equal(extResult.isMediaFire, false);

  // Reject javascript scheme
  assert.equal(validateExternalUrl('javascript:alert(1)').valid, false);

  // Reject local IP SSRF attempt
  assert.equal(validateExternalUrl('http://127.0.0.1:8080/exploit').valid, false);
  assert.equal(validateExternalUrl('http://localhost:3000/api/admin').valid, false);
});
