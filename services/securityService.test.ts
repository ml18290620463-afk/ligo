import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SecurityService } from './securityService';

// Mock Web Crypto API if not available in the environment
if (!global.crypto) {
  // @ts-ignore
  global.crypto = require('crypto').webcrypto;
}

describe('SecurityService', () => {
  const password = 'StrongPassword123!';
  const text = 'This is a secret message.';

  it('should encrypt and decrypt a message correctly', async () => {
    const encrypted = await SecurityService.encrypt(text, password);
    expect(typeof encrypted).toBe('string');
    expect(encrypted).not.toBe(text);

    const decrypted = await SecurityService.decrypt(encrypted, password);
    expect(decrypted).toBe(text);
  });

  it('should throw an error on incorrect password', async () => {
    const encrypted = await SecurityService.encrypt(text, password);
    await expect(SecurityService.decrypt(encrypted, 'wrong-password')).rejects.toThrow(
      'DECRYPTION_FAILED: Invalid password or corrupted data.'
    );
  });

  it('should throw an error on corrupted data', async () => {
    const encrypted = await SecurityService.encrypt(text, password);
    const corrupted = encrypted.substring(0, encrypted.length - 1) + (encrypted.endsWith('A') ? 'B' : 'A');
    await expect(SecurityService.decrypt(corrupted, password)).rejects.toThrow(
      'DECRYPTION_FAILED: Invalid password or corrupted data.'
    );
  });

  it('should hash a password consistently with the same salt', async () => {
    const salt = 'constant-salt';
    const hash1 = await SecurityService.hashPassword(password, salt);
    const hash2 = await SecurityService.hashPassword(password, salt);
    expect(hash1).toBe(hash2);
    await expect(SecurityService.verifyPassword(password, salt, hash1)).resolves.toBe(true);
  });

  it('should produce different hashes for different passwords with same salt', async () => {
    const salt = 'constant-salt';
    const hash1 = await SecurityService.hashPassword(password, salt);
    const hash2 = await SecurityService.hashPassword('another-password', salt);
    expect(hash1).not.toBe(hash2);
  });

  it('should verify legacy password hashes for backward compatibility', async () => {
    const salt = 'legacy-salt';
    const digest = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(password + salt)
    );
    const legacyHash = btoa(String.fromCharCode(...new Uint8Array(digest)));

    await expect(SecurityService.verifyPassword(password, salt, legacyHash)).resolves.toBe(true);
  });

  it('should hash and verify recovery keys without storing plaintext', async () => {
    const recoveryKey = 'ABCD-1234-EFGH-5678-IJKL-9012-MNOP-3456';
    const stored = await SecurityService.hashRecoveryKey(recoveryKey);

    expect(stored).not.toContain('ABCD');
    expect(SecurityService.recoveryKeyIsHashed(stored)).toBe(true);
    await expect(SecurityService.verifyRecoveryKey(recoveryKey, stored)).resolves.toBe(true);
  });

  it('should wipe sensitive data', () => {
    const data = new Uint8Array([1, 2, 3, 4, 5]);
    SecurityService.wipeSensitive(data);
    expect(Array.from(data)).toEqual([0, 0, 0, 0, 0]);
  });
});
