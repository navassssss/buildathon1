/**
 * Web Crypto API encryption service for document vault
 * Uses AES-GCM-256 with PBKDF2 key derivation
 */

export interface EncryptedData {
  encryptedContent: string; // base64 encoded
  iv: string; // base64 encoded initialization vector
  salt: string; // base64 encoded salt for key derivation
}

export interface VaultKey {
  key: CryptoKey;
  salt: Uint8Array;
}

const PBKDF2_ITERATIONS = 600000;
const SALT_LENGTH = 16; // bytes
const IV_LENGTH = 12; // bytes for GCM

/**
 * Generate a random salt for key derivation
 */
function generateSalt(): Uint8Array {
  const arr = new Uint8Array(SALT_LENGTH);
  crypto.getRandomValues(arr);
  return arr;
}

/**
 * Generate a random initialization vector
 */
function generateIV(): Uint8Array {
  const arr = new Uint8Array(IV_LENGTH);
  crypto.getRandomValues(arr);
  return arr;
}

/**
 * Convert ArrayBuffer or Uint8Array to base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert base64 string to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Derive encryption key from passphrase using PBKDF2
 */
export async function deriveKey(
  passphrase: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passphraseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  // Use type assertion to satisfy TypeScript's strict BufferSource requirements
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    passphraseKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Create a new vault key from passphrase
 */
export async function createVaultKey(passphrase: string): Promise<VaultKey> {
  const salt = generateSalt();
  const key = await deriveKey(passphrase, salt);
  return { key, salt };
}

/**
 * Recreate vault key from passphrase and stored salt
 */
export async function unlockVaultKey(
  passphrase: string,
  saltBase64: string
): Promise<CryptoKey> {
  const salt = new Uint8Array(base64ToArrayBuffer(saltBase64));
  return deriveKey(passphrase, salt);
}

/**
 * Encrypt data using AES-GCM-256
 */
export async function encryptData(
  data: ArrayBuffer,
  key: CryptoKey
): Promise<EncryptedData> {
  const iv = generateIV();

  // Use type assertion to satisfy TypeScript's strict BufferSource requirements
  const encryptedContent = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as unknown as BufferSource,
    },
    key,
    data
  );

  // Return salt from the key's derivation context (must be stored separately)
  return {
    encryptedContent: arrayBufferToBase64(encryptedContent),
    iv: btoa(String.fromCharCode(...iv)),
    salt: '', // Salt must be provided from VaultKey context
  };
}

/**
 * Decrypt data using AES-GCM-256
 */
export async function decryptData(
  encryptedData: EncryptedData,
  key: CryptoKey
): Promise<ArrayBuffer> {
  const ivBinary = atob(encryptedData.iv);
  const iv = new Uint8Array(ivBinary.length);
  for (let i = 0; i < ivBinary.length; i++) {
    iv[i] = ivBinary.charCodeAt(i);
  }

  const encryptedBinary = atob(encryptedData.encryptedContent);
  const encrypted = new Uint8Array(encryptedBinary.length);
  for (let i = 0; i < encryptedBinary.length; i++) {
    encrypted[i] = encryptedBinary.charCodeAt(i);
  }

  // Use type assertion to satisfy TypeScript's strict BufferSource requirements
  return crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv as unknown as BufferSource,
    },
    key,
    encrypted as unknown as BufferSource
  );
}

/**
 * Encrypt a file for vault storage
 */
export async function encryptFile(
  file: File,
  vaultKey: VaultKey
): Promise<EncryptedData> {
  const arrayBuffer = await file.arrayBuffer();
  const encrypted = await encryptData(arrayBuffer, vaultKey.key);

  return {
    ...encrypted,
    salt: arrayBufferToBase64(vaultKey.salt),
  };
}

/**
 * Decrypt a vault file back to ArrayBuffer
 */
export async function decryptFile(
  encryptedData: EncryptedData,
  passphrase: string
): Promise<ArrayBuffer> {
  const key = await unlockVaultKey(passphrase, encryptedData.salt);
  const result = await decryptData(encryptedData, key);
  return result as ArrayBuffer;
}

/**
 * Verify passphrase by attempting to decrypt a test payload
 */
export async function verifyPassphrase(
  passphrase: string,
  testEncrypted: EncryptedData
): Promise<boolean> {
  try {
    await decryptFile(testEncrypted, passphrase);
    return true;
  } catch {
    return false;
  }
}
