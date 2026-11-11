import React, { useState, useEffect } from 'react';
import {
  Upload,
  Download,
  Trash2,
  Archive,
  Lock,
  Unlock,
  Search,
  FileText,
  Eye,
  EyeOff,
  Shield,
  Key,
  AlertCircle,
} from 'lucide-react';
import { useDocumentStore } from '../../stores/documentStore';
import type { StoredDocument } from '../../types';

export const DocumentVault: React.FC = () => {
  const {
    isVaultUnlocked,
    filterCategory,
    searchQuery,
    isLoading,
    error,
    initializeVault,
    unlockVault,
    lockVault,
    isVaultInitialized,
    loadDocuments,
    uploadDocument,
    downloadDocument,
    deleteDocument,
    archiveDocument,
    setFilterCategory,
    setSearchQuery,
    clearError,
    getFilteredDocuments,
    getActiveDocuments,
  } = useDocumentStore();

  const [passphrase, setPassphrase] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [vaultExists, setVaultExists] = useState<boolean | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Upload form state
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadCategory, setUploadCategory] = useState<StoredDocument['category']>('other');
  const [uploadDocNumber, setUploadDocNumber] = useState('');
  const [uploadExpiry, setUploadExpiry] = useState('');
  const [uploadNotes, setUploadNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    checkVaultStatus();
  }, []);

  useEffect(() => {
    if (isVaultUnlocked) {
      loadDocuments();
    }
  }, [isVaultUnlocked, loadDocuments]);

  const checkVaultStatus = async () => {
    const exists = await isVaultInitialized();
    setVaultExists(exists);
  };

  const handleVaultAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passphrase.trim()) return;

    try {
      if (vaultExists) {
        const success = await unlockVault(passphrase);
        if (success) {
          setPassphrase('');
        }
      } else {
        await initializeVault(passphrase);
        setPassphrase('');
        setVaultExists(true);
      }
    } catch (err) {
      console.error('Vault action failed:', err);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!uploadFileName) {
        setUploadFileName(file.name);
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !uploadFileName.trim()) return;

    setUploadingFile(true);
    try {
      await uploadDocument(selectedFile, {
        name: uploadFileName,
        category: uploadCategory,
        documentNumber: uploadDocNumber || undefined,
        expiryDate: uploadExpiry || undefined,
        notes: uploadNotes || undefined,
      });

      // Reset form
      setSelectedFile(null);
      setUploadFileName('');
      setUploadCategory('other');
      setUploadDocNumber('');
      setUploadExpiry('');
      setUploadNotes('');
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDownload = async (doc: StoredDocument) => {
    try {
      const blob = await downloadDocument(doc.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const categories: { key: StoredDocument['category'] | 'all'; label: string }[] = [
    { key: 'all', label: 'All Documents' },
    { key: 'passport', label: 'Passport' },
    { key: 'visa', label: 'Visa' },
    { key: 'ticket', label: 'Tickets' },
    { key: 'id_card', label: 'ID Cards' },
    { key: 'insurance', label: 'Insurance' },
    { key: 'hotel', label: 'Hotel' },
    { key: 'other', label: 'Other' },
  ];

  const filteredDocs = getFilteredDocuments();
  const activeDocs = getActiveDocuments();

  // Vault locked/uninitialized view
  if (!isVaultUnlocked) {
    return (
      <div className="space-y-6">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-xl">
          <div className="max-w-md mx-auto text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 mb-4">
              {vaultExists ? (
                <Lock className="w-8 h-8 text-amber-400" />
              ) : (
                <Shield className="w-8 h-8 text-amber-400" />
              )}
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">
              {vaultExists ? 'Vault Locked' : 'Initialize Document Vault'}
            </h2>
            <p className="text-sm text-slate-400 mb-6">
              {vaultExists
                ? 'Enter your passphrase to unlock your encrypted document vault.'
                : 'Create a secure passphrase to encrypt your travel documents locally. This passphrase never leaves your device.'}
            </p>

            {error && (
              <div
                role="alert"
                className="mb-4 p-3 bg-red-950/80 border border-red-800 rounded-xl text-red-200 text-sm flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleVaultAction} className="space-y-4">
              <div className="relative">
                <input
                  type={showPassphrase ? 'text' : 'password'}
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder={vaultExists ? 'Enter passphrase' : 'Create passphrase (min 8 characters)'}
                  className="w-full px-4 py-3 pr-12 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassphrase(!showPassphrase)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
                  aria-label={showPassphrase ? 'Hide passphrase' : 'Show passphrase'}
                >
                  {showPassphrase ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-semibold transition shadow-lg shadow-amber-500/20 disabled:opacity-50"
              >
                {vaultExists ? <Unlock className="w-5 h-5" /> : <Key className="w-5 h-5" />}
                <span>{isLoading ? 'Processing...' : vaultExists ? 'Unlock Vault' : 'Create Vault'}</span>
              </button>
            </form>

            {!vaultExists && (
              <div className="mt-6 p-4 bg-slate-800/60 border border-slate-700 rounded-xl text-left">
                <p className="text-xs text-slate-300 font-semibold mb-2">Security Notes:</p>
                <ul className="text-xs text-slate-400 space-y-1">
                  <li>• Your passphrase encrypts documents using AES-256-GCM</li>
                  <li>• Documents are stored encrypted in your browser's local storage</li>
                  <li>• Your passphrase is never stored or transmitted</li>
                  <li>• Lost passphrases cannot be recovered</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Vault unlocked view
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
              <Unlock className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">Document Vault</h1>
              <p className="text-sm text-slate-400">Encrypted local storage • {activeDocs.length} documents</p>
            </div>
          </div>

          <button
            onClick={lockVault}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-700 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 text-sm transition"
          >
            <Lock className="w-4 h-4" />
            <span>Lock Vault</span>
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-4 p-3 bg-red-950/80 border border-red-800 rounded-xl text-red-200 text-sm flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
            <button onClick={clearError} className="ml-auto text-red-300 hover:text-white">
              ×
            </button>
          </div>
        )}
      </div>

      {/* Upload Form */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Upload className="w-4 h-4 text-sky-400" />
          Upload Document
        </h3>

        <form onSubmit={handleUpload} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="file-upload" className="block text-xs font-medium text-slate-300 mb-1">
                Select File
              </label>
              <input
                id="file-upload"
                type="file"
                onChange={handleFileSelect}
                accept="image/*,application/pdf,.doc,.docx"
                className="w-full text-sm text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-sky-500 file:text-white hover:file:bg-sky-400 file:cursor-pointer"
                required
              />
            </div>

            <div>
              <label htmlFor="doc-name" className="block text-xs font-medium text-slate-300 mb-1">
                Document Name
              </label>
              <input
                id="doc-name"
                type="text"
                value={uploadFileName}
                onChange={(e) => setUploadFileName(e.target.value)}
                placeholder="e.g. US Passport"
                className="w-full px-3 py-2 rounded-lg bg-slate-800/80 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                required
              />
            </div>

            <div>
              <label htmlFor="doc-category" className="block text-xs font-medium text-slate-300 mb-1">
                Category
              </label>
              <select
                id="doc-category"
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value as StoredDocument['category'])}
                className="w-full px-3 py-2 rounded-lg bg-slate-800/80 border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
              >
                <option value="passport">Passport</option>
                <option value="visa">Visa</option>
                <option value="ticket">Ticket</option>
                <option value="id_card">ID Card</option>
                <option value="insurance">Insurance</option>
                <option value="hotel">Hotel Booking</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label htmlFor="doc-number" className="block text-xs font-medium text-slate-300 mb-1">
                Document Number (Optional)
              </label>
              <input
                id="doc-number"
                type="text"
                value={uploadDocNumber}
                onChange={(e) => setUploadDocNumber(e.target.value)}
                placeholder="e.g. A12345678"
                className="w-full px-3 py-2 rounded-lg bg-slate-800/80 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label htmlFor="doc-expiry" className="block text-xs font-medium text-slate-300 mb-1">
                Expiry Date (Optional)
              </label>
              <input
                id="doc-expiry"
                type="date"
                value={uploadExpiry}
                onChange={(e) => setUploadExpiry(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-800/80 border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label htmlFor="doc-notes" className="block text-xs font-medium text-slate-300 mb-1">
                Notes (Optional)
              </label>
              <input
                id="doc-notes"
                type="text"
                value={uploadNotes}
                onChange={(e) => setUploadNotes(e.target.value)}
                placeholder="Additional notes"
                className="w-full px-3 py-2 rounded-lg bg-slate-800/80 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!selectedFile || uploadingFile}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-medium text-sm transition shadow-lg shadow-sky-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="w-4 h-4" />
            <span>{uploadingFile ? 'Encrypting & Uploading...' : 'Upload Document'}</span>
          </button>
        </form>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setFilterCategory(cat.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition ${
                filterCategory === cat.key
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Documents List */}
      {filteredDocs.length === 0 ? (
        <div className="p-12 border-2 border-dashed border-slate-800 rounded-3xl text-center bg-slate-900/40">
          <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-200">No documents found</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto mt-1">
            {filterCategory === 'all'
              ? 'Upload your first document to get started.'
              : `No documents in the "${categories.find((c) => c.key === filterCategory)?.label}" category.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 hover:border-slate-700 transition"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-white truncate">{doc.name}</h4>
                  <p className="text-xs text-slate-400 capitalize mt-0.5">{doc.category.replace('_', ' ')}</p>
                </div>
                {doc.isArchived && (
                  <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded text-[10px] font-medium">
                    Archived
                  </span>
                )}
              </div>

              {doc.documentNumber && (
                <p className="text-xs text-slate-400 mb-2">
                  <span className="font-medium">No:</span> {doc.documentNumber}
                </p>
              )}

              {doc.expiryDate && (
                <p className="text-xs text-slate-400 mb-2">
                  <span className="font-medium">Expires:</span>{' '}
                  {new Date(doc.expiryDate).toLocaleDateString()}
                </p>
              )}

              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-800">
                <button
                  onClick={() => handleDownload(doc)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400 hover:bg-sky-500/20 text-xs font-medium transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>

                {!doc.isArchived && (
                  <button
                    onClick={() => archiveDocument(doc.id)}
                    className="p-1.5 text-slate-500 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition"
                    title="Archive"
                  >
                    <Archive className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={() => {
                    if (window.confirm(`Delete "${doc.name}"? This cannot be undone.`)) {
                      deleteDocument(doc.id);
                    }
                  }}
                  className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
