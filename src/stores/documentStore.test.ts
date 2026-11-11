import { describe, it, expect, beforeEach } from 'vitest';
import { useDocumentStore } from './documentStore';
import { db } from '../services/db';

describe('Document Store (T-003: F-DV-001)', () => {
  const testPassphrase = 'testVaultPass123!';

  beforeEach(async () => {
    await db.documents.clear();
    localStorage.clear();
    useDocumentStore.setState({
      documents: [],
      isVaultUnlocked: false,
      vaultKey: null,
      vaultSalt: null,
      filterCategory: 'all',
      searchQuery: '',
      isLoading: false,
      error: null,
    });
  });

  describe('Vault Initialization and Unlock', () => {
    it('initializes a new vault with passphrase', async () => {
      const store = useDocumentStore.getState();
      
      const initialized = await store.isVaultInitialized();
      expect(initialized).toBe(false);

      await store.initializeVault(testPassphrase);

      const state = useDocumentStore.getState();
      expect(state.isVaultUnlocked).toBe(true);
      expect(state.vaultKey).toBeDefined();
      expect(state.vaultSalt).toBeDefined();

      const nowInitialized = await store.isVaultInitialized();
      expect(nowInitialized).toBe(true);
    });

    it('rejects weak passphrases', async () => {
      const store = useDocumentStore.getState();

      await expect(store.initializeVault('short')).rejects.toThrow(
        'Passphrase must be at least 8 characters'
      );
    });

    it('unlocks an existing vault with correct passphrase', async () => {
      const store = useDocumentStore.getState();

      // Initialize vault
      await store.initializeVault(testPassphrase);
      const salt = useDocumentStore.getState().vaultSalt;

      // Lock vault
      store.lockVault();
      expect(useDocumentStore.getState().isVaultUnlocked).toBe(false);

      // Unlock with correct passphrase
      const unlocked = await store.unlockVault(testPassphrase);
      const finalState = useDocumentStore.getState();
      
      expect(unlocked).toBe(true);
      expect(finalState.isVaultUnlocked).toBe(true);
      expect(finalState.vaultSalt).toBe(salt);
    });

    it('rejects incorrect passphrase when unlocking', async () => {
      const store = useDocumentStore.getState();

      await store.initializeVault(testPassphrase);
      
      // Upload a document to test passphrase verification
      const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      await store.uploadDocument(testFile, {
        name: 'Test Doc',
        category: 'other',
      });

      store.lockVault();

      const unlocked = await store.unlockVault('wrongPassphrase123!');
      expect(unlocked).toBe(false);
      expect(store.isVaultUnlocked).toBe(false);
    });

    it('locks vault and clears sensitive data', () => {
      useDocumentStore.setState({
        isVaultUnlocked: true,
        vaultKey: {} as any,
        documents: [{ id: '1' } as any],
      });

      const store = useDocumentStore.getState();
      store.lockVault();

      const finalState = useDocumentStore.getState();
      expect(finalState.isVaultUnlocked).toBe(false);
      expect(finalState.vaultKey).toBeNull();
      expect(finalState.documents).toEqual([]);
    });
  });

  describe('Document Upload and Storage', () => {
    it('uploads and encrypts a document', async () => {
      const store = useDocumentStore.getState();
      await store.initializeVault(testPassphrase);

      const file = new File(['Passport content'], 'passport.pdf', { type: 'application/pdf' });
      const doc = await store.uploadDocument(file, {
        name: 'US Passport',
        category: 'passport',
        documentNumber: 'A12345678',
        expiryDate: '2030-12-31',
        notes: 'Valid for international travel',
      });

      expect(doc.id).toBeDefined();
      expect(doc.name).toBe('US Passport');
      expect(doc.category).toBe('passport');
      expect(doc.documentNumber).toBe('A12345678');
      expect(doc.encryptedBlob).toBeDefined();
      expect(doc.iv).toBeDefined();
      expect(doc.isArchived).toBe(false);

      // Verify in database
      const inDb = await db.documents.get(doc.id);
      expect(inDb).toBeDefined();
      expect(inDb?.encryptedBlob).toBe(doc.encryptedBlob);
    });

    it('prevents upload when vault is locked', async () => {
      const store = useDocumentStore.getState();
      const file = new File(['content'], 'doc.pdf', { type: 'application/pdf' });

      await expect(
        store.uploadDocument(file, { name: 'Test', category: 'other' })
      ).rejects.toThrow('Vault is locked');
    });

    it('stores multiple documents', async () => {
      const store = useDocumentStore.getState();
      await store.initializeVault(testPassphrase);

      const file1 = new File(['content1'], 'passport.pdf', { type: 'application/pdf' });
      const file2 = new File(['content2'], 'visa.pdf', { type: 'application/pdf' });

      await store.uploadDocument(file1, { name: 'Passport', category: 'passport' });
      await store.uploadDocument(file2, { name: 'Visa', category: 'visa' });

      const state = useDocumentStore.getState();
      expect(state.documents).toHaveLength(2);

      const inDb = await db.documents.toArray();
      expect(inDb).toHaveLength(2);
    });
  });

  describe('Document Download and Decryption', () => {
    it('downloads and decrypts a document', async () => {
      const store = useDocumentStore.getState();
      await store.initializeVault(testPassphrase);

      const originalContent = 'Secret passport data';
      const file = new File([originalContent], 'passport.pdf', { type: 'application/pdf' });
      const doc = await store.uploadDocument(file, {
        name: 'Passport',
        category: 'passport',
      });

      const blob = await store.downloadDocument(doc.id);
      const decryptedContent = await blob.text();

      expect(decryptedContent).toBe(originalContent);
      expect(blob.type).toBe('application/pdf');
    });

    it('fails to download when vault is locked', async () => {
      const store = useDocumentStore.getState();
      await store.initializeVault(testPassphrase);

      const file = new File(['content'], 'doc.pdf', { type: 'application/pdf' });
      const doc = await store.uploadDocument(file, { name: 'Test', category: 'other' });

      store.lockVault();

      await expect(store.downloadDocument(doc.id)).rejects.toThrow('Vault is locked');
    });
  });

  describe('Document Management', () => {
    it('deletes a document', async () => {
      const store = useDocumentStore.getState();
      await store.initializeVault(testPassphrase);

      const file = new File(['content'], 'doc.pdf', { type: 'application/pdf' });
      const doc = await store.uploadDocument(file, { name: 'Test', category: 'other' });

      await store.deleteDocument(doc.id);

      expect(store.documents).toHaveLength(0);

      const inDb = await db.documents.get(doc.id);
      expect(inDb).toBeUndefined();
    });

    it('archives a document', async () => {
      const store = useDocumentStore.getState();
      await store.initializeVault(testPassphrase);

      const file = new File(['content'], 'doc.pdf', { type: 'application/pdf' });
      const doc = await store.uploadDocument(file, { name: 'Test', category: 'other' });

      await store.archiveDocument(doc.id);

      const state = useDocumentStore.getState();
      const archived = state.documents.find((d) => d.id === doc.id);
      expect(archived?.isArchived).toBe(true);
    });

    it('updates document metadata', async () => {
      const store = useDocumentStore.getState();
      await store.initializeVault(testPassphrase);

      const file = new File(['content'], 'doc.pdf', { type: 'application/pdf' });
      const doc = await store.uploadDocument(file, {
        name: 'Original Name',
        category: 'other',
      });

      await store.updateDocument(doc.id, {
        name: 'Updated Name',
        category: 'passport',
        documentNumber: 'X9876',
      });

      const state = useDocumentStore.getState();
      const updated = state.documents.find((d) => d.id === doc.id);
      expect(updated?.name).toBe('Updated Name');
      expect(updated?.category).toBe('passport');
      expect(updated?.documentNumber).toBe('X9876');
    });
  });

  describe('Filtering and Search', () => {
    beforeEach(async () => {
      const store = useDocumentStore.getState();
      await store.initializeVault(testPassphrase);

      const files = [
        { name: 'US Passport', category: 'passport' as const },
        { name: 'Schengen Visa', category: 'visa' as const },
        { name: 'Flight Ticket', category: 'ticket' as const },
        { name: 'Travel Insurance', category: 'insurance' as const },
      ];

      for (const fileData of files) {
        const file = new File(['content'], `${fileData.name}.pdf`, { type: 'application/pdf' });
        await store.uploadDocument(file, fileData);
      }
    });

    it('filters documents by category', () => {
      const store = useDocumentStore.getState();

      store.setFilterCategory('passport');
      const filtered = store.getFilteredDocuments();

      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('US Passport');
    });

    it('searches documents by name', () => {
      const store = useDocumentStore.getState();

      store.setSearchQuery('visa');
      const filtered = store.getFilteredDocuments();

      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Schengen Visa');
    });

    it('returns all documents when filter is "all"', () => {
      const store = useDocumentStore.getState();

      store.setFilterCategory('all');
      const filtered = store.getFilteredDocuments();

      expect(filtered).toHaveLength(4);
    });

    it('groups documents by category', () => {
      const store = useDocumentStore.getState();

      const grouped = store.getDocumentsByCategory();

      expect(grouped.passport).toHaveLength(1);
      expect(grouped.visa).toHaveLength(1);
      expect(grouped.ticket).toHaveLength(1);
      expect(grouped.insurance).toHaveLength(1);
      expect(grouped.other).toHaveLength(0);
    });

    it('separates active and archived documents', async () => {
      const store = useDocumentStore.getState();

      const passportDoc = store.documents.find((d) => d.category === 'passport');
      if (passportDoc) {
        await store.archiveDocument(passportDoc.id);
      }

      const active = store.getActiveDocuments();
      const archived = store.getArchivedDocuments();

      expect(active).toHaveLength(3);
      expect(archived).toHaveLength(1);
    });
  });
});
