import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar,
  FlatList, TextInput, ActivityIndicator, Alert, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';

const PRIMARY = '#3B4ECC';
const NAVY = '#121845';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Doc {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  folder: string;
  tags: string[];
  createdAt: string;
  case: { id: string; title: string; internalRef: string } | null;
  uploadedBy: { firstName: string; lastName: string } | null;
}

interface DocStats {
  total: number;
  totalSize: number;
  byFolder: Record<string, number>;
  byType: Record<string, number>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getFileIcon(mimeType: string): string {
  if (mimeType.includes('pdf')) return 'file-text';
  if (mimeType.includes('word')) return 'file-text';
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'grid';
  if (mimeType.startsWith('image/')) return 'image';
  return 'file';
}

function getFileColor(mimeType: string): { bg: string; text: string } {
  if (mimeType.includes('pdf')) return { bg: '#FEE2E2', text: '#DC2626' };
  if (mimeType.includes('word')) return { bg: '#EEF1FB', text: PRIMARY };
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return { bg: '#D1FAE5', text: '#059669' };
  if (mimeType.startsWith('image/')) return { bg: '#EDE9FE', text: '#7C3AED' };
  return { bg: '#F3F4F6', text: '#6B7280' };
}

const FOLDERS = [
  { key: 'all',            label: 'All',           icon: 'folder' as const },
  { key: 'general',        label: 'General',        icon: 'folder' as const },
  { key: 'contracts',      label: 'Contracts',      icon: 'file-text' as const },
  { key: 'court-filings',  label: 'Court Filings',  icon: 'scale' as const },
  { key: 'evidence',       label: 'Evidence',       icon: 'search' as const },
  { key: 'correspondence', label: 'Correspondence', icon: 'mail' as const },
];

const ALLOWED_MIME = [
  'application/pdf',
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
];

// ─── API ──────────────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('access_token') : null;
  const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001'}/api/v1${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  if (res.status === 204) return null as T;
  return res.json() as Promise<T>;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function DocumentsScreen() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [stats, setStats] = useState<DocStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [activeFolder, setActiveFolder] = useState('all');
  const [uploading, setUploading] = useState(false);
  const [uploadFolder, setUploadFolder] = useState('general');
  const [showFolderPicker, setShowFolderPicker] = useState(false);

  const loadDocs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeFolder !== 'all') params.set('folder', activeFolder);
      if (search) params.set('search', search);
      const [d, s] = await Promise.allSettled([
        apiFetch<Doc[]>(`/documents?${params.toString()}`),
        apiFetch<DocStats>('/documents/stats'),
      ]);
      if (d.status === 'fulfilled') setDocs(d.value);
      if (s.status === 'fulfilled') setStats(s.value);
    } finally {
      setLoading(false);
    }
  }, [activeFolder, search]);

  // Load on mount and when filters change
  useState(() => { void loadDocs(); });

  async function handleUpload() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ALLOWED_MIME,
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      setUploading(true);
      for (const asset of result.assets) {
        try {
          // 1. Get presigned URL
          const { uploadUrl, fileKey } = await apiFetch<{ uploadUrl: string; fileKey: string }>(
            '/documents/upload-url',
            {
              method: 'POST',
              body: JSON.stringify({ fileName: asset.name, mimeType: asset.mimeType ?? 'application/octet-stream' }),
            },
          );

          // 2. Upload to S3
          const fileRes = await fetch(asset.uri);
          const blob = await fileRes.blob();
          await fetch(uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': asset.mimeType ?? 'application/octet-stream' },
            body: blob,
          });

          // 3. Confirm
          await apiFetch('/documents/confirm', {
            method: 'POST',
            body: JSON.stringify({
              fileKey,
              fileName: asset.name,
              mimeType: asset.mimeType ?? 'application/octet-stream',
              fileSize: asset.size ?? 0,
              folder: uploadFolder,
            }),
          });
        } catch {
          Alert.alert('Upload Failed', `Failed to upload ${asset.name}`);
        }
      }
      await loadDocs();
    } catch {
      Alert.alert('Error', 'Failed to open document picker');
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(doc: Doc) {
    try {
      const { downloadUrl } = await apiFetch<{ downloadUrl: string }>(`/documents/${doc.id}/download-url`);
      await Linking.openURL(downloadUrl);
    } catch {
      Alert.alert('Error', 'Failed to generate download link');
    }
  }

  async function handleDelete(doc: Doc) {
    Alert.alert(
      'Delete Document',
      `Delete "${doc.fileName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiFetch(`/documents/${doc.id}`, { method: 'DELETE' });
              setDocs((prev) => prev.filter((d) => d.id !== doc.id));
            } catch {
              Alert.alert('Error', 'Failed to delete document');
            }
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Documents</Text>
          <Text style={styles.headerSub}>
            {stats ? `${stats.total} files · ${fmt(stats.totalSize)}` : 'Firm library'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={[styles.folderBtn, { backgroundColor: 'rgba(255,255,255,0.15)' }]}
            onPress={() => setShowFolderPicker(true)}
          >
            <Feather name="folder" size={14} color="#fff" />
            <Text style={styles.folderBtnText} numberOfLines={1}>
              {FOLDERS.find((f) => f.key === uploadFolder)?.label ?? 'General'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.uploadBtn, uploading && { opacity: 0.6 }]}
            onPress={handleUpload}
            disabled={uploading}
          >
            {uploading
              ? <ActivityIndicator size="small" color="#fff" />
              : <Feather name="upload" size={14} color="#fff" />
            }
            <Text style={styles.uploadBtnText}>{uploading ? 'Uploading…' : 'Upload'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Folder picker sheet */}
      {showFolderPicker && (
        <View style={styles.folderSheet}>
          <Text style={styles.folderSheetTitle}>Upload to Folder</Text>
          {FOLDERS.filter((f) => f.key !== 'all').map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.folderOption, uploadFolder === f.key && styles.folderOptionActive]}
              onPress={() => { setUploadFolder(f.key); setShowFolderPicker(false); }}
            >
              <Text style={[styles.folderOptionText, uploadFolder === f.key && { color: PRIMARY, fontWeight: '700' }]}>
                {f.label}
              </Text>
              {uploadFolder === f.key && <Feather name="check" size={16} color={PRIMARY} />}
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.folderDismiss} onPress={() => setShowFolderPicker(false)}>
            <Text style={styles.folderDismissText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Search */}
      <View style={styles.searchRow}>
        <Feather name="search" size={14} color="#9CA3AF" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={(t) => { setSearch(t); void loadDocs(); }}
          placeholder="Search documents…"
          placeholderTextColor="#9CA3AF"
          returnKeyType="search"
          onSubmitEditing={() => loadDocs()}
        />
        {search !== '' && (
          <TouchableOpacity onPress={() => { setSearch(''); void loadDocs(); }}>
            <Feather name="x" size={14} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Folder filter pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.folderPills} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {FOLDERS.map((f) => {
          const count = f.key === 'all' ? docs.length : (stats?.byFolder[f.key] ?? 0);
          const isActive = activeFolder === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.pill, isActive && styles.pillActive]}
              onPress={() => { setActiveFolder(f.key); void loadDocs(); }}
            >
              <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                {f.label}{count > 0 ? ` ${count}` : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Document list */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : docs.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="folder" size={48} color="#D1D5DB" style={{ marginBottom: 12 }} />
          <Text style={styles.emptyTitle}>No documents</Text>
          <Text style={styles.emptySub}>
            {search ? `No results for "${search}"` : 'Tap Upload to add your first document'}
          </Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={handleUpload} disabled={uploading}>
            <Text style={styles.emptyBtnText}>Upload Document</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={docs}
          keyExtractor={(d) => d.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 8 }}
          renderItem={({ item: doc }) => {
            const { bg, text } = getFileColor(doc.mimeType);
            const icon = getFileIcon(doc.mimeType);
            return (
              <View style={styles.docRow}>
                <View style={[styles.docIcon, { backgroundColor: bg }]}>
                  <Feather name={icon as any} size={18} color={text} />
                </View>
                <View style={styles.docInfo}>
                  <Text style={styles.docName} numberOfLines={1}>{doc.fileName}</Text>
                  <Text style={styles.docMeta}>
                    {fmt(doc.fileSize)} · {fmtDate(doc.createdAt)}
                    {doc.case ? ` · ${doc.case.internalRef}` : ''}
                  </Text>
                  {doc.tags.length > 0 && (
                    <View style={styles.tagRow}>
                      {doc.tags.slice(0, 3).map((tag) => (
                        <View key={tag} style={styles.tag}>
                          <Text style={styles.tagText}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
                <View style={styles.docActions}>
                  <TouchableOpacity style={styles.docActionBtn} onPress={() => handleDownload(doc)}>
                    <Feather name="download" size={15} color={PRIMARY} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.docActionBtn} onPress={() => handleDelete(doc)}>
                    <Feather name="trash-2" size={15} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: NAVY },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: NAVY },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 11, color: '#8A9AC0', marginTop: 2 },
  folderBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 20, maxWidth: 100 },
  folderBtnText: { color: '#fff', fontWeight: '600', fontSize: 12 },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: PRIMARY, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  uploadBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  folderSheet: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  folderSheetTitle: { fontSize: 12, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  folderOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  folderOptionActive: { },
  folderOptionText: { fontSize: 14, color: '#374151' },
  folderDismiss: { marginTop: 12, alignItems: 'center' },
  folderDismissText: { fontSize: 14, fontWeight: '600', color: '#9CA3AF' },

  searchRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 8, marginBottom: 4, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 14, color: '#111827' },

  folderPills: { flexGrow: 0, paddingVertical: 10 },
  pill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#1e2d6b' },
  pillActive: { backgroundColor: PRIMARY },
  pillText: { fontSize: 12, fontWeight: '600', color: '#8A9AC0' },
  pillTextActive: { color: '#fff' },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#F4F6FA' },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#374151', marginBottom: 6 },
  emptySub: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 },
  emptyBtn: { marginTop: 20, backgroundColor: PRIMARY, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  docRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: '#fff', borderRadius: 16, padding: 14 },
  docIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  docInfo: { flex: 1, minWidth: 0 },
  docName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  docMeta: { fontSize: 11, color: '#9CA3AF', marginTop: 3 },
  tagRow: { flexDirection: 'row', gap: 4, marginTop: 6, flexWrap: 'wrap' },
  tag: { backgroundColor: '#EEF1FB', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  tagText: { fontSize: 10, fontWeight: '700', color: PRIMARY },
  docActions: { flexDirection: 'row', gap: 4, flexShrink: 0 },
  docActionBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center' },
});
