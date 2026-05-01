/**
 * SECURITY PROTOCOL: VECTOR_ENCRYPTION_LAYER_V1
 * 
 * This service implements a Zero-Knowledge encryption path:
 * 1. Master Password -> PBKDF2 (100,000 iterations) -> Derived Key
 * 2. Derived Key -> AES-GCM (256-bit) -> Encrypted Payload
 * 3. All operations are local-only using Web Crypto API.
 */

export class SecurityService {
  private static ITERATIONS = 100000;
  private static PASSWORD_HASH_PREFIX = 'pbkdf2-sha256:v1';
  private static RECOVERY_HASH_PREFIX = 'recovery-sha256:v1';
  private static MAX_VERIFY_ITERATIONS = 1000000;
  private static ALGO = 'AES-GCM';
  private static KEY_LEN = 256;

  /**
   * Derives a cryptographic key from a plain text password and salt.
   */
  private static async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passwordKey = await window.crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: this.ITERATIONS,
        hash: 'SHA-256',
      },
      passwordKey,
      { name: this.ALGO, length: this.KEY_LEN },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypts a string using a master password.
   * Returns a base64 encoded string containing [salt(16)][iv(12)][ciphertext]
   */
  static async encrypt(text: string, password: string): Promise<string> {
    const encoder = new TextEncoder();
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const key = await this.deriveKey(password, salt);

    const encrypted = await window.crypto.subtle.encrypt(
      { name: this.ALGO, iv },
      key,
      encoder.encode(text)
    );

    const encryptedArray = new Uint8Array(encrypted);
    const combined = new Uint8Array(salt.length + iv.length + encryptedArray.length);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(encryptedArray, salt.length + iv.length);

    return this.uint8ToBase64(combined);
  }

  /**
   * Decrypts a base64 encoded string using a master password.
   */
  static async decrypt(base64: string, password: string): Promise<string> {
    if (!base64 || !password) {
      throw new Error('DECRYPTION_FAILED: Invalid password or corrupted data.');
    }

    try {
      const combined = this.base64ToUint8(base64.trim());
      
      // Minimum length: Salt(16) + IV(12) + GCM tag(16) = 44 bytes
      if (combined.length < 44) {
        throw new Error('CORRUPTED_DATA');
      }

      const salt = combined.slice(0, 16);
      const iv = combined.slice(16, 28);
      const ciphertext = combined.slice(28);

      const key = await this.deriveKey(password, salt);
      const decoder = new TextDecoder();

      const decrypted = await window.crypto.subtle.decrypt(
        { name: this.ALGO, iv },
        key,
        ciphertext
      );

      return decoder.decode(decrypted);
    } catch (e) {
      console.error('Decryption internal error:', e);
      throw new Error('DECRYPTION_FAILED: Invalid password or corrupted data.');
    }
  }

  /**
   * Robust Uint8Array to Base64 conversion
   */
  private static uint8ToBase64(u8: Uint8Array): string {
    let binary = '';
    const len = u8.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(u8[i]);
    }
    return btoa(binary);
  }

  /**
   * Robust Base64 to Uint8Array conversion
   */
  private static base64ToUint8(base64: string): Uint8Array {
    const binary = atob(base64);
    const len = binary.length;
    const u8 = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        u8[i] = binary.charCodeAt(i);
    }
    return u8;
  }

  /**
   * Generates a hash of the password for local verification (Master Lock).
   * Note: We don't store the password, only this hash.
   */
  static async hashPassword(password: string, salt: string): Promise<string> {
    const saltBytes = this.saltToBytes(salt);
    const bits = await this.derivePasswordHashBits(password, saltBytes);
    return `${this.PASSWORD_HASH_PREFIX}:${this.ITERATIONS}:${this.uint8ToBase64(bits)}`;
  }

  static async verifyPassword(password: string, salt: string, storedHash: string | null): Promise<boolean> {
    if (!storedHash) return false;

    try {
      if (storedHash.startsWith(this.PASSWORD_HASH_PREFIX)) {
        const [, , iterationsRaw, expected] = storedHash.split(':');
        const iterations = Number(iterationsRaw);
        if (!expected || !Number.isInteger(iterations) || iterations < 1 || iterations > this.MAX_VERIFY_ITERATIONS) {
          return false;
        }

        const actual = await this.derivePasswordHashBits(password, this.saltToBytes(salt), iterations);
        return this.constantTimeEqual(this.uint8ToBase64(actual), expected);
      }

      const legacyHash = await this.legacyHashPassword(password, salt);
      return this.constantTimeEqual(legacyHash, storedHash);
    } catch {
      return false;
    }
  }

  static async hashRecoveryKey(recoveryKey: string): Promise<string> {
    const normalized = this.normalizeRecoveryKey(recoveryKey);
    const digest = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalized));
    return `${this.RECOVERY_HASH_PREFIX}:${this.uint8ToBase64(new Uint8Array(digest))}`;
  }

  static async verifyRecoveryKey(recoveryKey: string, storedValue: string | null): Promise<boolean> {
    if (!storedValue) return false;
    const normalizedInput = this.normalizeRecoveryKey(recoveryKey);

    if (storedValue.startsWith(this.RECOVERY_HASH_PREFIX)) {
      const expected = storedValue.split(':').pop() || '';
      const actual = await this.hashRecoveryKey(normalizedInput);
      return this.constantTimeEqual(actual.split(':').pop() || '', expected);
    }

    const normalizedStored = this.normalizeRecoveryKey(storedValue);
    return normalizedInput.length === 32 && this.constantTimeEqual(normalizedInput, normalizedStored);
  }

  static recoveryKeyIsHashed(storedValue: string | null): boolean {
    return Boolean(storedValue?.startsWith(this.RECOVERY_HASH_PREFIX));
  }

  private static async derivePasswordHashBits(password: string, salt: Uint8Array, iterations = this.ITERATIONS): Promise<Uint8Array> {
    const passwordData = new TextEncoder().encode(password);
    const passwordKey = await window.crypto.subtle.importKey(
      'raw',
      passwordData,
      'PBKDF2',
      false,
      ['deriveBits']
    );
    const bits = await window.crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt,
        iterations,
        hash: 'SHA-256',
      },
      passwordKey,
      256
    );
    this.wipeSensitive(passwordData);
    return new Uint8Array(bits);
  }

  private static async legacyHashPassword(password: string, salt: string): Promise<string> {
    const encoder = new TextEncoder();
    const passwordData = encoder.encode(password);
    const saltData = encoder.encode(salt);
    const data = new Uint8Array(passwordData.length + saltData.length);
    data.set(passwordData);
    data.set(saltData, passwordData.length);
    
    const hash = await window.crypto.subtle.digest('SHA-256', data);
    
    this.wipeSensitive(passwordData);
    this.wipeSensitive(data);
    
    return this.uint8ToBase64(new Uint8Array(hash));
  }

  private static normalizeRecoveryKey(recoveryKey: string): string {
    return recoveryKey.replace(/-/g, '').trim().toUpperCase();
  }

  private static saltToBytes(salt: string): Uint8Array {
    try {
      return this.base64ToUint8(salt);
    } catch {
      return new TextEncoder().encode(salt);
    }
  }

  private static constantTimeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let index = 0; index < a.length; index += 1) {
      diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
    }
    return diff === 0;
  }

  /**
   * Securely erases sensitive data from memory.
   */
  static wipeSensitive(data: Uint8Array) {
    if (data) {
      data.fill(0);
    }
  }
}
