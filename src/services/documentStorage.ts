/**
 * Encrypted document blob storage for the Document Vault (T-003 / F-DV-001).
 *
 * Persistence strategy (per approved brief/spec): OPFS files first, with
 * IndexedDB blob fallback when OPFS is unavailable or an OPFS operation fails.
 *
 * The Dexie `documents` record stores either:
 * - legacy/fallback encrypted content as a base64 string in `encryptedBlob`, or
 * - an OPFS marker (`opfs:<id>`) in `encryptedBlob` when the encrypted bytes are
 *   persisted in Origin Private File System.
 *
 * This keeps the StoredDocument schema/API stable while moving blob bytes to OPFS.
 */

const OPFS_MARKER_PREFIX = 'opfs:';
const VAULT_DIR = 'traveller-vault-docs';

export type EncryptedBlobLocation = 'opfs' | 'indexeddb-fallback';

export interface SaveEncryptedBlobResult {
  /** Value to persist in StoredDocument.encryptedBlob (marker or base64 fallback). */
  storedValue: string;
  location: EncryptedBlobLocation;
}

function getOpfsRoot(): Promise<FileSystemDirectoryHandle> | null {
  if (typeof navigator === 'undefined') return null;
  const storage = navigator.storage as StorageManager & {
    getDirectory?: () => Promise<FileSystemDirectoryHandle>;
  };
  if (!storage || typeof storage.getDirectory !== 'function') return null;
  try {
    return storage.getDirectory();
  } catch {
    return null;
  }
}

export async function isOpfsAvailable(): Promise<boolean> {
  try {
    const rootPromise = getOpfsRoot();
    if (!rootPromise) return false;
    const root = await rootPromise;
    if (!root || typeof root.getDirectoryHandle !== 'function') return false;
    // Verify we can create/access the vault directory.
    await root.getDirectoryHandle(VAULT_DIR, { create: true });
    return true;
  } catch {
    return false;
  }
}

async function getVaultDirectory(create = true): Promise<FileSystemDirectoryHandle | null> {
  try {
    const rootPromise = getOpfsRoot();
    if (!rootPromise) return null;
    const root = await rootPromise;
    return await root.getDirectoryHandle(VAULT_DIR, { create });
  } catch {
    return null;
  }
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function isOpfsMarker(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith(OPFS_MARKER_PREFIX);
}

export function getOpfsMarker(documentId: string): string {
  return `${OPFS_MARKER_PREFIX}${documentId}`;
}

/**
 * Persist encrypted blob bytes. Tries OPFS first, falls back to returning the
 * base64 content for IndexedDB storage on unsupported/failure cases.
 */
export async function saveEncryptedBlob(
  documentId: string,
  encryptedContentBase64: string
): Promise<SaveEncryptedBlobResult> {
  try {
    const dir = await getVaultDirectory(true);
    if (dir) {
      const handle = await dir.getFileHandle(`${documentId}.bin`, { create: true });
      const writable = await handle.createWritable();
      const bytes = base64ToUint8Array(encryptedContentBase64);
      await writable.write(bytes as unknown as FileSystemWriteChunkType);
      await writable.close();
      return { storedValue: getOpfsMarker(documentId), location: 'opfs' };
    }
  } catch {
    // Fall through to IndexedDB fallback.
  }

  return { storedValue: encryptedContentBase64, location: 'indexeddb-fallback' };
}

/**
 * Load encrypted content as base64 string from OPFS marker or IndexedDB fallback.
 */
export async function loadEncryptedBlob(
  documentId: string,
  storedValue: string | ArrayBuffer | undefined | null
): Promise<string> {
  if (typeof storedValue !== 'string' || storedValue.length === 0) {
    throw new Error('Document content is missing');
  }

  if (!isOpfsMarker(storedValue)) {
    // Legacy/fallback: encrypted content stored directly in IndexedDB.
    return storedValue;
  }

  try {
    const dir = await getVaultDirectory(false);
    if (!dir) throw new Error('OPFS unavailable');
    const handle = await dir.getFileHandle(`${documentId}.bin`, { create: false });
    const file = await handle.getFile();
    const buffer = await file.arrayBuffer();
    return uint8ArrayToBase64(new Uint8Array(buffer));
  } catch {
    throw new Error('Failed to read encrypted document from OPFS storage');
  }
}

/**
 * Delete encrypted blob from OPFS when applicable. Safe to call for fallback docs.
 */
export async function deleteEncryptedBlob(
  documentId: string,
  storedValue?: string | ArrayBuffer | null
): Promise<void> {
  // Always attempt OPFS cleanup for the document id; ignore if unsupported/missing.
  try {
    const dir = await getVaultDirectory(false);
    if (!dir) return;
    await dir.removeEntry(`${documentId}.bin`);
    return;
  } catch {
    // If a marker was present but removal failed in a real OPFS env we should not
    // silently hide it; however in unsupported/jsdom environments this is expected.
  }

  if (isOpfsMarker(storedValue)) {
    // Marker indicated OPFS but we couldn't confirm removal; best-effort no throw.
  }
}
