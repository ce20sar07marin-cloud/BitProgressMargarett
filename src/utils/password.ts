import forge from "node-forge";

/**
 * Utilidades de contraseñas compatibles con Expo/React Native.
 *
 * Se usa PBKDF2-SHA256 con una sal aleatoria individual por usuario.
 * El formato almacenado es: pbkdf2$sha256$<iteraciones>$<salt_hex>$<hash_hex>
 * Las contraseñas legacy en texto plano se detectan y se migran al primer
 * inicio de sesión exitoso.
 */

const PBKDF2_ITERATIONS = 10_000;
const SALT_BYTES = 16;
const KEY_BYTES = 32;
const SCHEME = "pbkdf2";
const DIGEST = "sha256";

const TEMP_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
const MIN_SUPPORTED_ITERATIONS = 10_000;
const MAX_SUPPORTED_ITERATIONS = 1_000_000;

export interface ParsedPasswordHash {
  iterations: number;
  saltHex: string;
  hashHex: string;
}

function toHex(bytes: string): string {
  return forge.util.bytesToHex(bytes);
}

function secureRandomBytes(length: number): string {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi || typeof cryptoApi.getRandomValues !== "function") {
    throw new Error("A cryptographically secure random number generator is unavailable.");
  }
  const bytes = cryptoApi.getRandomValues(new Uint8Array(length));
  return String.fromCharCode(...bytes);
}

/** Genera una sal aleatoria individual (16 bytes en hex). */
export function generateSalt(): string {
  return toHex(secureRandomBytes(SALT_BYTES));
}

function yieldToUI(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 50));
}

function deriveKeyAsync(password: string, salt: string, iterations: number): Promise<string> {
  return new Promise((resolve, reject) => {
    forge.pkcs5.pbkdf2(
      password,
      salt,
      iterations,
      KEY_BYTES,
      forge.md.sha256.create(),
      (error: unknown, derived: string) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(derived);
      },
    );
  });
}

/** Genera una contraseña temporal aleatoria para el flujo de recuperación. */
export function generateTemporaryPassword(length = 12): string {
  if (!Number.isInteger(length) || length < 1 || length > 128) {
    throw new RangeError("Temporary password length must be between 1 and 128.");
  }
  const maxByte = Math.floor(256 / TEMP_ALPHABET.length) * TEMP_ALPHABET.length;
  let out = "";
  while (out.length < length) {
    for (const byte of secureRandomBytes(Math.max(16, length - out.length))) {
      const value = byte.charCodeAt(0);
      if (value < maxByte) {
        out += TEMP_ALPHABET[value % TEMP_ALPHABET.length];
        if (out.length === length) break;
      }
    }
  }
  return out;
}

/** Calcula el hash PBKDF2-SHA256 de una contraseña con la sal dada. */
export async function hashPassword(password: string): Promise<string> {
  const saltHex = generateSalt();
  await yieldToUI();
  const derived = await deriveKeyAsync(
    password,
    forge.util.hexToBytes(saltHex),
    PBKDF2_ITERATIONS,
  );
  return `${SCHEME}$${DIGEST}$${PBKDF2_ITERATIONS}$${saltHex}$${toHex(derived)}`;
}

/** Devuelve true si el valor almacenado tiene el formato de hash seguro. */
export function isHashed(stored: string): boolean {
  return parsePasswordHash(stored) !== null;
}

export function parsePasswordHash(stored: string): ParsedPasswordHash | null {
  if (!stored) return null;
  const parts = stored.split("$");
  if (parts.length !== 5 || parts[0] !== SCHEME || parts[1] !== DIGEST) return null;

  const iterations = Number(parts[2]);
  if (
    !Number.isInteger(iterations) ||
    iterations < MIN_SUPPORTED_ITERATIONS ||
    iterations > MAX_SUPPORTED_ITERATIONS
  ) {
    return null;
  }

  const saltHex = parts[3];
  const hashHex = parts[4];
  if (!/^[0-9a-f]{32}$/i.test(saltHex) || !/^[0-9a-f]{64}$/i.test(hashHex)) {
    return null;
  }

  return { iterations, saltHex, hashHex };
}

function constantTimeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Verifica una contraseña contra el valor almacenado.
 * Si el valor es texto plano legacy, se compara directamente (migración).
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parsed = parsePasswordHash(stored);
  if (!parsed) {
    return !stored.startsWith(`${SCHEME}$`) && stored === password;
  }

  await yieldToUI();
  const derived = await deriveKeyAsync(
    password,
    forge.util.hexToBytes(parsed.saltHex),
    parsed.iterations,
  );

  return constantTimeEqualHex(toHex(derived), parsed.hashHex.toLowerCase());
}
