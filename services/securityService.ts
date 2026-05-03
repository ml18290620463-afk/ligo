/**
 * SECURITY PROTOCOL: VECTOR_ENCRYPTION_LAYER_V1
 *
 * This service implements a Zero-Knowledge encryption path:
 * 1. Master Password -> PBKDF2 (>= 600,000 iterations, OWASP 2026) -> Derived Key
 * 2. Derived Key -> AES-GCM (256-bit) -> Encrypted Payload
 * 3. All operations are local-only using Web Crypto API.
 *
 * Backwards compatibility:
 *   - The on-disk hash format (`pbkdf2-sha256:v1:<iter>:<base64>`) records
 *     the iteration count it was minted with. `verifyPassword` always re-runs
 *     the derivation at that recorded count, so older hashes (e.g. 100k)
 *     keep validating without forced migration.
 *   - When a user authenticates successfully against a hash with a lower
 *     iteration count, callers may opportunistically re-mint at the current
 *     `ITERATIONS` default and persist the new hash via
 *     `useDiaryData.savePasswordHash`.
 *
 * Forwards compatibility — Argon2id verifier (Phase 3 §3.e-2):
 *   - Hashes minted by `services/argon2idPoc.ts` carry the
 *     `argon2id:v1:<m>:<t>:<p>:<saltB64>:<hashB64>` prefix and are
 *     recognised by `verifyPassword` ONLY when the per-installation
 *     feature flag at `localStorage["vector_argon2_verify"] === "1"`
 *     is set. Without the flag the branch returns false (treated as
 *     "wrong password") so a misconfigured rollout cannot leak data.
 *   - The minter (`hashPassword`) intentionally STAYS on PBKDF2 so we
 *     don't generate any argon2id hashes the rest of the codebase
 *     can't reason about until the flag becomes default. Real
 *     promotion to default is tracked as Phase 4 §4.b-1.
 *   - The `hash-wasm` blob (~52 kB gzipped) is loaded lazily through
 *     a dynamic import so disabling the flag keeps it out of the
 *     production bundle.
 */

const PBKDF2_DEFAULT_ITERATIONS = 600_000;
const PBKDF2_MIN_ALLOWED_ITERATIONS = 100_000;
const PBKDF2_MAX_VERIFY_ITERATIONS = 2_000_000;

const resolveIterationOverride = (): number => {
  // Server / CI may pin a different cost via an env var so the WebCrypto
  // derivation does not blow past test budgets. Browsers ignore process.env.
  const raw =
    typeof process !== 'undefined' && process.env?.VECTOR_PBKDF2_ITERATIONS
      ? Number(process.env.VECTOR_PBKDF2_ITERATIONS)
      : NaN;
  if (!Number.isFinite(raw)) return PBKDF2_DEFAULT_ITERATIONS;
  if (raw < PBKDF2_MIN_ALLOWED_ITERATIONS) return PBKDF2_MIN_ALLOWED_ITERATIONS;
  if (raw > PBKDF2_MAX_VERIFY_ITERATIONS) return PBKDF2_MAX_VERIFY_ITERATIONS;
  return Math.floor(raw);
};

export class SecurityService {
  private static ITERATIONS = resolveIterationOverride();
  private static PASSWORD_HASH_PREFIX = 'pbkdf2-sha256:v1';
  private static ARGON2_HASH_PREFIX = 'argon2id:v1';
  private static ARGON2_VERIFIER_FLAG_KEY = 'vector_argon2_verify';
  private static RECOVERY_HASH_PREFIX = 'recovery-sha256:v1';
  private static MAX_VERIFY_ITERATIONS = PBKDF2_MAX_VERIFY_ITERATIONS;
  private static ALGO = 'AES-GCM';
  private static KEY_LEN = 256;

  /** Public read-only snapshot of the cost factor in use; useful in tests. */
  static getCurrentIterations(): number {
    return this.ITERATIONS;
  }

  /**
   * Returns true when the per-installation feature flag at
   * `localStorage["vector_argon2_verify"]` is set to `"1"` / `"true"`.
   * `verifyPassword` consults this when it sees an Argon2id-prefixed
   * hash and refuses to verify when the flag is off so a corrupted /
   * accidentally-promoted Argon2id record cannot accept any password.
   *
   * Wraps the storage read in a try/catch so quota / disabled-storage
   * environments degrade safely to "feature off".
   */
  static isArgon2idVerifierEnabled(): boolean {
    try {
      if (typeof localStorage === 'undefined') return false;
      const value = localStorage.getItem(this.ARGON2_VERIFIER_FLAG_KEY);
      if (value === null) return false;
      return value === '1' || value.toLowerCase() === 'true';
    } catch {
      return false;
    }
  }

  /**
   * Settings-screen helper. Pass `true` to opt this installation into
   * the Argon2id verifier branch (still PBKDF2 for new mints — this
   * only affects hashes the user has already migrated by other means).
   */
  static setArgon2idVerifierEnabled(enabled: boolean): boolean {
    try {
      if (typeof localStorage === 'undefined') return false;
      if (enabled) {
        localStorage.setItem(this.ARGON2_VERIFIER_FLAG_KEY, '1');
      } else {
        localStorage.removeItem(this.ARGON2_VERIFIER_FLAG_KEY);
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Returns true when the supplied stored hash was minted with fewer
   * iterations than the current default and should be re-minted on the
   * next successful verification. Returns false for unknown / legacy
   * hash formats.
   *
   * Argon2id-prefixed hashes always return false here: Argon2id is
   * already the strongest algorithm we recognise and re-minting one
   * back to PBKDF2 would be a downgrade. (When Phase 4 §4.b-1 makes
   * Argon2id the default minter, this function will start ratcheting
   * Argon2id parameters too.)
   */
  static needsRehash(storedHash: string | null): boolean {
    if (!storedHash) return false;
    if (storedHash.startsWith(this.ARGON2_HASH_PREFIX)) return false;
    if (!storedHash.startsWith(this.PASSWORD_HASH_PREFIX)) return true;
    const [, , iterationsRaw] = storedHash.split(':');
    const iterations = Number(iterationsRaw);
    if (!Number.isInteger(iterations)) return false;
    return iterations < this.ITERATIONS;
  }

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
      ['deriveKey'],
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
      ['encrypt', 'decrypt'],
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
      encoder.encode(text),
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
        ciphertext,
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

  static async verifyPassword(
    password: string,
    salt: string,
    storedHash: string | null,
  ): Promise<boolean> {
    if (!storedHash) return false;

    try {
      // Argon2id branch (Phase 3 §3.e-2, behind feature flag).
      // Lazy import keeps the `hash-wasm` blob out of the production
      // bundle until the flag is on. Salt argument is ignored — the
      // Argon2id self-describing hash format embeds its own salt.
      if (storedHash.startsWith(this.ARGON2_HASH_PREFIX)) {
        if (!this.isArgon2idVerifierEnabled()) return false;
        const { verifyArgon2idPassword } = await import('./argon2idPoc');
        return verifyArgon2idPassword(password, storedHash);
      }

      if (storedHash.startsWith(this.PASSWORD_HASH_PREFIX)) {
        const [, , iterationsRaw, expected] = storedHash.split(':');
        const iterations = Number(iterationsRaw);
        if (
          !expected ||
          !Number.isInteger(iterations) ||
          iterations < 1 ||
          iterations > this.MAX_VERIFY_ITERATIONS
        ) {
          return false;
        }

        const actual = await this.derivePasswordHashBits(
          password,
          this.saltToBytes(salt),
          iterations,
        );
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
    const digest = await window.crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(normalized),
    );
    return `${this.RECOVERY_HASH_PREFIX}:${this.uint8ToBase64(new Uint8Array(digest))}`;
  }

  static async verifyRecoveryKey(
    recoveryKey: string,
    storedValue: string | null,
  ): Promise<boolean> {
    if (!storedValue) return false;
    const normalizedInput = this.normalizeRecoveryKey(recoveryKey);

    if (storedValue.startsWith(this.RECOVERY_HASH_PREFIX)) {
      const expected = storedValue.split(':').pop() || '';
      const actual = await this.hashRecoveryKey(normalizedInput);
      return this.constantTimeEqual(actual.split(':').pop() || '', expected);
    }

    const normalizedStored = this.normalizeRecoveryKey(storedValue);
    return (
      normalizedInput.length === 32 && this.constantTimeEqual(normalizedInput, normalizedStored)
    );
  }

  static recoveryKeyIsHashed(storedValue: string | null): boolean {
    return Boolean(storedValue?.startsWith(this.RECOVERY_HASH_PREFIX));
  }

  private static async derivePasswordHashBits(
    password: string,
    salt: Uint8Array,
    iterations = this.ITERATIONS,
  ): Promise<Uint8Array> {
    const passwordData = new TextEncoder().encode(password);
    const passwordKey = await window.crypto.subtle.importKey('raw', passwordData, 'PBKDF2', false, [
      'deriveBits',
    ]);
    const bits = await window.crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt,
        iterations,
        hash: 'SHA-256',
      },
      passwordKey,
      256,
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
