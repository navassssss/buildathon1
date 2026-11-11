import { create } from 'zustand';
import { db } from '../services/db';
import type { StoredDocument } from '../types';
import {
  createVaultKey,
  encryptFile,
  decryptFile,
  unlockVaultKey,
  type VaultKey,
} from '../services/encryption';
import {
  deleteEncryptedBlob,
  loadEncryptedBlob,
  saveEncryptedBlob,
} from '../services/documentStorage';

export interface DocumentStoreState {
  documents: StoredDocument[];
  isVaultUnlocked: boolean;
  vaultKey: VaultKey | null;
  vaultSalt: string | null; // Stored salt for vault
  filterCategory: StoredDocument['category'] | 'all';
  searchQuery: string;
  isLoading: boolean;
  error: string | null;

  // Vault management
  initializeVault: (passphrase: string) => Promise<void>;
  unlockVault: (passphrase: string) => Promise<boolean>;
  lockVault: () => void;
  isVaultInitialized: () => Promise<boolean>;

  // Document CRUD
  loadDocuments: (tripId?: string) => Promise<void>;
  uploadDocument: (
    file: File,
    metadata: {
      name: string;
      category: StoredDocument['category'];
      documentNumber?: string;
      expiryDate?: string;
      notes?: string;
      tripId?: string;
    }
  ) => Promise<StoredDocument>;
  downloadDocument: (id: string) => Promise<Blob>;
  deleteDocument: (id: string) => Promise<void>;
  archiveDocument: (id: string) => Promise<void>;
  updateDocument: (
    id: string,
    updates: Partial<Pick<StoredDocument, 'name' | 'category' | 'documentNumber' | 'expiryDate' | 'notes'>>
  ) => Promise<void>;

  // Filters
  setFilterCategory: (category: StoredDocument['category'] | 'all') => void;
  setSearchQuery: (query: string) => void;
  clearError: () => void;

  // Selectors
  getFilteredDocuments: () => StoredDocument[];
  getDocumentsByCategory: () => Record<StoredDocument['category'], StoredDocument[]>;
  getActiveDocuments: () => StoredDocument[];
  getArchivedDocuments: () => StoredDocument[];
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

const VAULT_SALT_KEY = 'travellerVaultSalt';

export const useDocumentStore = create<DocumentStoreState>((set, get) => ({
  documents: [],
  isVaultUnlocked: false,
  vaultKey: null,
  vaultSalt: null,
  filterCategory: 'all',
  searchQuery: '',
  isLoading: false,
  error: null,

  clearError: () => set({ error: null }),

  isVaultInitialized: async () => {
    const storedSalt = localStorage.getItem(VAULT_SALT_KEY);
    return storedSalt !== null;
  },

  initializeVault: async (passphrase: string) => {
    if (!passphrase || passphrase.trim().length < 8) {
      const err = new Error('Passphrase must be at least 8 characters');
      set({ error: err.message });
      throw err;
    }

    set({ isLoading: true, error: null });

    try {
      const vaultKey = await createVaultKey(passphrase);
      const saltBase64 = btoa(String.fromCharCode(...vaultKey.salt));

      // Store salt in localStorage (salt is not secret)
      localStorage.setItem(VAULT_SALT_KEY, saltBase64);

      set({
        vaultKey,
        vaultSalt: saltBase64,
        isVaultUnlocked: true,
        isLoading: false,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to initialize vault';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  unlockVault: async (passphrase: string) => {
    const storedSalt = localStorage.getItem(VAULT_SALT_KEY);
    if (!storedSalt) {
      set({ error: 'Vault not initialized. Create vault first.' });
      return false;
    }

    set({ isLoading: true, error: null });

    try {
      const key = await unlockVaultKey(passphrase, storedSalt);

      // Verify passphrase by attempting to decrypt an existing document
      const docs = await db.documents.limit(1).toArray();
      if (docs.length > 0 && docs[0].encryptedBlob && docs[0].iv) {
        try {
          const encryptedContent = await loadEncryptedBlob(docs[0].id, docs[0].encryptedBlob);
          await decryptFile(
            {
              encryptedContent,
              iv: docs[0].iv,
              salt: storedSalt,
            },
            passphrase
          );
        } catch {
          set({ error: 'Incorrect passphrase', isLoading: false });
          return false;
        }
      }

      const saltBytes = Uint8Array.from(atob(storedSalt), (c) => c.charCodeAt(0));

      set({
        vaultKey: { key, salt: saltBytes },
        vaultSalt: storedSalt,
        isVaultUnlocked: true,
        isLoading: false,
      });

      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to unlock vault';
      set({ error: msg, isLoading: false });
      return false;
    }
  },

  lockVault: () => {
    set({
      vaultKey: null,
      isVaultUnlocked: false,
      documents: [],
    });
  },

  loadDocuments: async (tripId) => {
    const { isVaultUnlocked } = get();
    if (!isVaultUnlocked) {
      set({ error: 'Vault is locked. Unlock vault to view documents.' });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      let docs: StoredDocument[];
      if (tripId) {
        docs = await db.documents.where('tripId').equals(tripId).toArray();
      } else {
        docs = await db.documents.toArray();
      }

      set({ documents: docs, isLoading: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load documents';
      set({ error: msg, isLoading: false });
    }
  },

  uploadDocument: async (file, metadata) => {
    const state = get();
    const { vaultKey, isVaultUnlocked } = state;

    if (!isVaultUnlocked || !vaultKey) {
      const err = new Error('Vault is locked. Unlock vault to upload documents.');
      set({ error: err.message });
      throw err;
    }

    set({ isLoading: true, error: null });

    try {
      // Encrypt file
      const encrypted = await encryptFile(file, vaultKey);
      const docId = generateId();

      // Persist encrypted blob: OPFS-first with IndexedDB fallback.
      const stored = await saveEncryptedBlob(docId, encrypted.encryptedContent);

      const newDoc: StoredDocument = {
        id: docId,
        name: metadata.name || file.name,
        category: metadata.category,
        documentNumber: metadata.documentNumber,
        expiryDate: metadata.expiryDate,
        mimeType: file.type,
        fileSize: file.size,
        encryptedBlob: stored.storedValue,
        iv: encrypted.iv,
        isArchived: false,
        notes: metadata.notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await db.documents.add(newDoc);

      // Get fresh state and update
      const currentState = get();
      set({
        documents: [newDoc, ...currentState.documents],
        isLoading: false,
        error: null,
      });

      return newDoc;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to upload document';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  downloadDocument: async (id: string) => {
    const { vaultKey, isVaultUnlocked, vaultSalt } = get();

    if (!isVaultUnlocked || !vaultKey || !vaultSalt) {
      throw new Error('Vault is locked');
    }

    const doc = await db.documents.get(id);
    if (!doc) {
      throw new Error('Document not found');
    }

    if (!doc.encryptedBlob || !doc.iv) {
      throw new Error('Document content is missing');
    }

    const encryptedContent = await loadEncryptedBlob(id, doc.encryptedBlob);

    try {
      // Prefer direct decryption with unlocked key.
      const iv = Uint8Array.from(atob(doc.iv), (c) => c.charCodeAt(0));
      const encryptedData = Uint8Array.from(atob(encryptedContent), (c) => c.charCodeAt(0));

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv as unknown as BufferSource },
        vaultKey.key,
        encryptedData as unknown as BufferSource
      );

      return new Blob([decrypted], { type: doc.mimeType });
    } catch {
      // Fallback path for compatibility.
      const decrypted = await decryptFile(
        {
          encryptedContent,
          iv: doc.iv,
          salt: vaultSalt,
        },
        ''
      );

      return new Blob([decrypted], { type: doc.mimeType });
    }
  },

  deleteDocument: async (id: string) => {
    try {
      const existing = await db.documents.get(id);
      await db.documents.delete(id);
      await deleteEncryptedBlob(id, existing?.encryptedBlob ?? null);
      set((state) => ({
        documents: state.documents.filter((d) => d.id !== id),
        error: null,
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete document';
      set({ error: msg });
      throw err;
    }
  },

  archiveDocument: async (id: string) => {
    try {
      const now = new Date().toISOString();
      await db.documents.update(id, { isArchived: true, updatedAt: now });
      
      const currentState = get();
      set({
        documents: currentState.documents.map((d) =>
          d.id === id ? { ...d, isArchived: true, updatedAt: now } : d
        ),
        error: null,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to archive document';
      set({ error: msg });
      throw err;
    }
  },

  updateDocument: async (id, updates) => {
    try {
      const updateData = { ...updates, updatedAt: new Date().toISOString() };
      await db.documents.update(id, updateData);
      
      const currentState = get();
      set({
        documents: currentState.documents.map((d) => (d.id === id ? { ...d, ...updateData } : d)),
        error: null,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update document';
      set({ error: msg });
      throw err;
    }
  },

  setFilterCategory: (category) => set({ filterCategory: category }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  getFilteredDocuments: () => {
    const { documents, filterCategory, searchQuery } = get();

    return documents.filter((doc) => {
      // Category filter
      if (filterCategory !== 'all' && doc.category !== filterCategory) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          doc.name.toLowerCase().includes(q) ||
          doc.category.toLowerCase().includes(q) ||
          doc.documentNumber?.toLowerCase().includes(q) ||
          doc.notes?.toLowerCase().includes(q)
        );
      }

      return true;
    });
  },

  getDocumentsByCategory: () => {
    const filtered = get().getFilteredDocuments();
    const grouped: Record<StoredDocument['category'], StoredDocument[]> = {
      passport: [],
      visa: [],
      ticket: [],
      id_card: [],
      insurance: [],
      hotel: [],
      other: [],
    };

    for (const doc of filtered) {
      if (grouped[doc.category]) {
        grouped[doc.category].push(doc);
      }
    }

    return grouped;
  },

  getActiveDocuments: () => {
    return get().documents.filter((d) => !d.isArchived);
  },

  getArchivedDocuments: () => {
    return get().documents.filter((d) => d.isArchived);
  },
}));
