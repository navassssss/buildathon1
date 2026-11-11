import { describe, it, expect } from 'vitest';
import {
  createVaultKey,
  unlockVaultKey,
  encryptData,
  decryptData,
  encryptFile,
  decryptFile,
} from './encryption';

describe('Encryption Service (T-003: F-DV-001)', () => {
  const testPassphrase = 'mySecurePassphrase123!';

  describe('Vault Key Management', () => {
    it('creates a vault key with salt', async () => {
      const vaultKey = await createVaultKey(testPassphrase);

      expect(vaultKey).toBeDefined();
      expect(vaultKey.key).toBeInstanceOf(CryptoKey);
      expect(vaultKey.salt).toBeInstanceOf(Uint8Array);
      expect(vaultKey.salt.length).toBe(16); // 16 bytes
    });

    it('recreates the same key from passphrase and salt', async () => {
      const vaultKey1 = await createVaultKey(testPassphrase);
      const saltBase64 = btoa(String.fromCharCode(...vaultKey1.salt));

      const key2 = await unlockVaultKey(testPassphrase, saltBase64);

      expect(key2).toBeInstanceOf(CryptoKey);
      expect(key2.algorithm).toEqual(vaultKey1.key.algorithm);
    });
  });

  describe('Data Encryption and Decryption', () => {
    it('encrypts and decrypts data correctly', async () => {
      const vaultKey = await createVaultKey(testPassphrase);
      const originalData = new TextEncoder().encode('Sensitive passport information');

      const encrypted = await encryptData(originalData.buffer, vaultKey.key);

      expect(encrypted.encryptedContent).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.encryptedContent).not.toBe(btoa(String.fromCharCode(...originalData)));

      const decrypted = await decryptData(
        {
          ...encrypted,
          salt: btoa(String.fromCharCode(...vaultKey.salt)),
        },
        vaultKey.key
      );

      const decryptedText = new TextDecoder().decode(decrypted);
      expect(decryptedText).toBe('Sensitive passport information');
    });

    it('produces different ciphertext for same plaintext (due to random IV)', async () => {
      const vaultKey = await createVaultKey(testPassphrase);
      const originalData = new TextEncoder().encode('Test data');

      const encrypted1 = await encryptData(originalData.buffer, vaultKey.key);
      const encrypted2 = await encryptData(originalData.buffer, vaultKey.key);

      expect(encrypted1.encryptedContent).not.toBe(encrypted2.encryptedContent);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
    });

    it('fails to decrypt with wrong passphrase', async () => {
      const vaultKey = await createVaultKey(testPassphrase);
      const originalData = new TextEncoder().encode('Secret document');

      const encrypted = await encryptData(originalData.buffer, vaultKey.key);
      const saltBase64 = btoa(String.fromCharCode(...vaultKey.salt));

      const wrongKey = await unlockVaultKey('wrongPassphrase123!', saltBase64);

      await expect(
        decryptData(
          {
            ...encrypted,
            salt: saltBase64,
          },
          wrongKey
        )
      ).rejects.toThrow();
    });
  });

  describe('File Encryption and Decryption', () => {
    it('encrypts and decrypts a file correctly', async () => {
      const vaultKey = await createVaultKey(testPassphrase);
      const fileContent = 'Mock passport scan PDF content';
      const file = new File([fileContent], 'passport.pdf', { type: 'application/pdf' });

      const encrypted = await encryptFile(file, vaultKey);

      expect(encrypted.encryptedContent).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.salt).toBeDefined();

      const decrypted = await decryptFile(encrypted, testPassphrase);
      const decryptedText = new TextDecoder().decode(decrypted);

      expect(decryptedText).toBe(fileContent);
    });

    it('handles binary file data', async () => {
      const vaultKey = await createVaultKey(testPassphrase);
      const binaryData = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]); // JPEG header
      const file = new File([binaryData], 'photo.jpg', { type: 'image/jpeg' });

      const encrypted = await encryptFile(file, vaultKey);
      const decrypted = await decryptFile(encrypted, testPassphrase);

      const decryptedBytes = new Uint8Array(decrypted);
      expect(decryptedBytes).toEqual(binaryData);
    });
  });
});
