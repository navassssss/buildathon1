import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  deleteEncryptedBlob,
  getOpfsMarker,
  isOpfsAvailable,
  loadEncryptedBlob,
  saveEncryptedBlob,
} from './documentStorage';

type StoredFile = { data: Uint8Array };

function createMockOpfs(options?: { failWrite?: boolean; failRead?: boolean; failRemove?: boolean }) {
  const files = new Map<string, StoredFile>();

  const fileHandle = (name: string) => ({
    async createWritable() {
      if (options?.failWrite) throw new Error('write failed');
      return {
        async write(data: Uint8Array | ArrayBuffer) {
          const bytes = data instanceof Uint8Array ? new Uint8Array(data) : new Uint8Array(data);
          files.set(name, { data: bytes });
        },
        async close() {},
      };
    },
    async getFile() {
      if (options?.failRead) throw new Error('read failed');
      const entry = files.get(name);
      if (!entry) throw new Error('not found');
      const copy = new Uint8Array(entry.data);
      return {
        async arrayBuffer() {
          return copy.buffer;
        },
      } as File;
    },
  });

  const dirHandle = {
    async getDirectoryHandle(_name: string, _opts?: { create?: boolean }) {
      return dirHandle;
    },
    async getFileHandle(name: string, _opts?: { create?: boolean }) {
      if (!_opts?.create && !files.has(name) && !options?.failRead) {
        throw new Error('missing');
      }
      return fileHandle(name);
    },
    async removeEntry(name: string) {
      if (options?.failRemove) throw new Error('remove failed');
      files.delete(name);
    },
  };

  const root = {
    async getDirectoryHandle(_name: string, _opts?: { create?: boolean }) {
      return dirHandle;
    },
  };

  return { files, root };
}

const originalNavigator = globalThis.navigator;

describe('documentStorage (T-003 OPFS-first with IndexedDB fallback)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      configurable: true,
      writable: true,
    });
  });

  it('reports OPFS unavailable when storage API is missing', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {},
      configurable: true,
      writable: true,
    });
    await expect(isOpfsAvailable()).resolves.toBe(false);

    const saved = await saveEncryptedBlob('doc-1', btoa('encrypted-payload'));
    expect(saved.location).toBe('indexeddb-fallback');
    expect(saved.storedValue).toBe(btoa('encrypted-payload'));
  });

  it('saves to OPFS when available and loads/deletes from OPFS', async () => {
    const mock = createMockOpfs();
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        storage: {
          getDirectory: vi.fn(async () => mock.root),
        },
      },
      configurable: true,
      writable: true,
    });

    await expect(isOpfsAvailable()).resolves.toBe(true);

    const content = btoa('secret-encrypted-bytes');
    const saved = await saveEncryptedBlob('doc-opfs', content);
    expect(saved.location).toBe('opfs');
    expect(saved.storedValue).toBe(getOpfsMarker('doc-opfs'));

    const loaded = await loadEncryptedBlob('doc-opfs', saved.storedValue);
    expect(loaded).toBe(content);

    await expect(deleteEncryptedBlob('doc-opfs', saved.storedValue)).resolves.toBeUndefined();
    // After deletion, OPFS read should fail for marker.
    await expect(loadEncryptedBlob('doc-opfs', saved.storedValue)).rejects.toThrow(/OPFS/i);
  });

  it('falls back to IndexedDB value on OPFS write failure', async () => {
    const mock = createMockOpfs({ failWrite: true });
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        storage: {
          getDirectory: vi.fn(async () => mock.root),
        },
      },
      configurable: true,
      writable: true,
    });

    const content = btoa('fallback-content');
    const saved = await saveEncryptedBlob('doc-fallback', content);
    expect(saved.location).toBe('indexeddb-fallback');
    expect(saved.storedValue).toBe(content);

    const loaded = await loadEncryptedBlob('doc-fallback', saved.storedValue);
    expect(loaded).toBe(content);
  });

  it('loads legacy IndexedDB base64 content for retrieval compatibility', async () => {
    const legacy = btoa('legacy-ciphertext');
    await expect(loadEncryptedBlob('legacy-doc', legacy)).resolves.toBe(legacy);
  });

  it('deletion is best-effort/safe for fallback docs and missing OPFS support', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {},
      configurable: true,
      writable: true,
    });
    await expect(deleteEncryptedBlob('doc-x', btoa('abc'))).resolves.toBeUndefined();
    await expect(deleteEncryptedBlob('doc-y', getOpfsMarker('doc-y'))).resolves.toBeUndefined();
  });
});
