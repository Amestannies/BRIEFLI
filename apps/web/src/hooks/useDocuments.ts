'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export const FOLDERS = [
  { key: 'all',           label: 'All Documents',   icon: 'folder' },
  { key: 'general',       label: 'General',          icon: 'folder' },
  { key: 'contracts',     label: 'Contracts',        icon: 'file-text' },
  { key: 'court-filings', label: 'Court Filings',    icon: 'scale' },
  { key: 'evidence',      label: 'Evidence',         icon: 'search' },
  { key: 'correspondence',label: 'Correspondence',   icon: 'mail' },
  { key: 'financial',     label: 'Financial',        icon: 'dollar-sign' },
] as const;

export type FolderKey = typeof FOLDERS[number]['key'];

export interface DocumentCase {
  id: string;
  title: string;
  internalRef: string;
}

export interface DocumentUploader {
  id: string;
  firstName: string;
  lastName: string;
}

export interface Document {
  id: string;
  firmId: string;
  caseId: string | null;
  clientId: string | null;
  uploadedById: string;
  fileName: string;
  fileKey: string;
  fileSize: number;
  mimeType: string;
  folder: string;
  tags: string[];
  version: number;
  isNotarized: boolean;
  signatureStatus: string;
  ocrText: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  case: DocumentCase | null;
  uploadedBy: DocumentUploader | null;
}

export interface DocumentStats {
  total: number;
  totalSize: number;
  byFolder: Record<string, number>;
  byType: Record<string, number>;
}

export interface DocumentFilters {
  caseId?: string;
  clientId?: string;
  folder?: string;
  search?: string;
}

export interface UploadProgress {
  file: File;
  id: string; // temp id for tracking
  status: 'pending' | 'uploading' | 'confirming' | 'done' | 'error';
  progress: number; // 0-100
  error?: string;
  document?: Document;
}

// ─── Mime type helpers ────────────────────────────────────────────────────────

export function getFileCategory(mimeType: string): string {
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.includes('word') || mimeType === 'application/msword') return 'docx';
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'xlsx';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'text/plain') return 'txt';
  return 'file';
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useDocuments(filters: DocumentFilters = {}) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
      const res = await api.get<Document[]>(`/documents?${params.toString()}`);
      setDocuments(res.data);
    } catch {
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(filters)]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { void fetch(); }, [fetch]);

  return { documents, loading, error, refetch: fetch };
}

export function useDocumentStats() {
  const [stats, setStats] = useState<DocumentStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<DocumentStats>('/documents/stats');
      setStats(res.data);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetch(); }, [fetch]);

  return { stats, loading, refetch: fetch };
}

// ─── Upload engine ────────────────────────────────────────────────────────────

export interface UploadOptions {
  caseId?: string;
  clientId?: string;
  folder?: string;
  tags?: string[];
}

export async function uploadFile(
  file: File,
  options: UploadOptions,
  onProgress: (pct: number) => void,
): Promise<Document> {
  // 1. Get presigned S3 URL
  const { data: { uploadUrl, fileKey } } = await api.post<{ uploadUrl: string; fileKey: string }>(
    '/documents/upload-url',
    { fileName: file.name, mimeType: file.type || 'application/octet-stream' },
  );

  // 2. PUT directly to S3 with progress tracking
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 90));
    });
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`S3 upload failed: ${xhr.status}`));
    });
    xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.send(file);
  });

  onProgress(95);

  // 3. Confirm with the API
  const { data: document } = await api.post<Document>('/documents/confirm', {
    fileKey,
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    fileSize: file.size,
    folder: options.folder ?? 'general',
    caseId: options.caseId,
    clientId: options.clientId,
    tags: options.tags ?? [],
  });

  onProgress(100);
  return document;
}

export async function deleteDocument(id: string): Promise<void> {
  await api.delete(`/documents/${id}`);
}

export async function getDownloadUrl(id: string): Promise<string> {
  const { data } = await api.get<{ downloadUrl: string }>(`/documents/${id}/download-url`);
  return data.downloadUrl;
}

export async function updateDocument(id: string, data: { fileName?: string; folder?: string; tags?: string[] }): Promise<Document> {
  const { data: doc } = await api.patch<Document>(`/documents/${id}`, data);
  return doc;
}
