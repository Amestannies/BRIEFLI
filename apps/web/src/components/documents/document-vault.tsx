'use client';

import { useState, useRef, useCallback, useId } from 'react';
import {
  Upload, FileText, FileImage, File, Table2, LayoutGrid, List,
  Download, Trash2, Search, Tag, FolderOpen, MoreHorizontal,
  X, Check, Loader2, AlertCircle, ChevronRight, SlidersHorizontal,
  Scale, Mail, DollarSign, Folder,
} from 'lucide-react';
import {
  useDocuments, uploadFile, deleteDocument, getDownloadUrl, updateDocument,
  getFileCategory, formatFileSize,
  FOLDERS, type Document, type FolderKey, type UploadProgress, type UploadOptions,
} from '@/hooks/useDocuments';

// ─── Mime / icon helpers ───────────────────────────────────────────────────────

const FILE_ICONS: Record<string, React.ElementType> = {
  pdf:   FileText,
  docx:  FileText,
  txt:   FileText,
  xlsx:  Table2,
  image: FileImage,
  file:  File,
};

const FILE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  pdf:   { bg: 'bg-red-50',    text: 'text-red-600',    border: 'border-red-100' },
  docx:  { bg: 'bg-blue-50',   text: 'text-blue-600',   border: 'border-blue-100' },
  txt:   { bg: 'bg-gray-50',   text: 'text-gray-600',   border: 'border-gray-100' },
  xlsx:  { bg: 'bg-green-50',  text: 'text-green-600',  border: 'border-green-100' },
  image: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100' },
  file:  { bg: 'bg-gray-50',   text: 'text-gray-500',   border: 'border-gray-100' },
};

const FOLDER_ICONS: Record<string, React.ElementType> = {
  all:            FolderOpen,
  general:        Folder,
  contracts:      FileText,
  'court-filings': Scale,
  evidence:       Search,
  correspondence: Mail,
  financial:      DollarSign,
};

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.jpg', '.jpeg', '.png', '.gif', '.webp'];
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
];

function validateFiles(files: FileList | File[]): { valid: File[]; rejected: string[] } {
  const arr = Array.from(files);
  const valid: File[] = [];
  const rejected: string[] = [];
  for (const f of arr) {
    if (!ALLOWED_MIME_TYPES.includes(f.type)) {
      rejected.push(`${f.name} — unsupported type`);
    } else if (f.size > 50 * 1024 * 1024) {
      rejected.push(`${f.name} — exceeds 50 MB`);
    } else {
      valid.push(f);
    }
  }
  return { valid, rejected };
}

// ─── Rename modal ─────────────────────────────────────────────────────────────

function RenameModal({ doc, onSave, onClose }: { doc: Document; onSave: (name: string, folder: string, tags: string[]) => Promise<void>; onClose: () => void }) {
  const [name, setName] = useState(doc.fileName);
  const [folder, setFolder] = useState(doc.folder);
  const [tagInput, setTagInput] = useState(doc.tags.join(', '));
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const tags = tagInput.split(',').map((t) => t.trim()).filter(Boolean);
      await onSave(name, folder, tags);
      onClose();
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-[#121845]">Edit Document</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">File Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B4ECC]/20 focus:border-[#3B4ECC]" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Folder</label>
          <select value={folder} onChange={(e) => setFolder(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B4ECC]/20 focus:border-[#3B4ECC]">
            {FOLDERS.filter((f) => f.key !== 'all').map((f) => (
              <option key={f.key} value={f.key}>{f.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Tags (comma-separated)</label>
          <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="e.g. signed, reviewed"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B4ECC]/20 focus:border-[#3B4ECC]" />
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 px-3 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={saving || !name.trim()} className="flex-1 px-3 py-2 text-sm font-medium text-white bg-[#3B4ECC] rounded-lg hover:bg-[#2d3db0] disabled:opacity-50">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Document card (grid) ─────────────────────────────────────────────────────

function DocumentCard({ doc, onDownload, onDelete, onEdit }: {
  doc: Document;
  onDownload: () => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const cat = getFileCategory(doc.mimeType);
  const Icon = FILE_ICONS[cat] ?? File;
  const colors = FILE_COLORS[cat] ?? FILE_COLORS['file']!;

  return (
    <div className="group relative bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-[#3B4ECC]/20 transition-all p-4 flex flex-col gap-3">
      {/* File icon */}
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors.bg} border ${colors.border}`}>
        <Icon size={22} className={colors.text} />
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate leading-tight" title={doc.fileName}>
          {doc.fileName}
        </p>
        {doc.case && (
          <p className="text-xs text-gray-400 truncate mt-0.5">{doc.case.internalRef}</p>
        )}
      </div>

      {/* Meta */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-400 space-y-0.5">
          <p>{formatFileSize(doc.fileSize)}</p>
          <p>{new Date(doc.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
        </div>
        {doc.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 justify-end max-w-[60%]">
            {doc.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="text-[10px] bg-[#EEF1FB] text-[#3B4ECC] px-1.5 py-0.5 rounded-full font-medium">
                {tag}
              </span>
            ))}
            {doc.tags.length > 2 && (
              <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">+{doc.tags.length - 2}</span>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50"
          >
            <MoreHorizontal size={14} className="text-gray-500" />
          </button>
          {showMenu && (
            <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-100 rounded-xl shadow-lg z-20 overflow-hidden">
              <button onClick={() => { onDownload(); setShowMenu(false); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                <Download size={13} /> Download
              </button>
              <button onClick={() => { onEdit(); setShowMenu(false); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                <Tag size={13} /> Edit / Tags
              </button>
              <button onClick={() => { onDelete(); setShowMenu(false); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50">
                <Trash2 size={13} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Document row (list) ──────────────────────────────────────────────────────

function DocumentRow({ doc, onDownload, onDelete, onEdit, last }: {
  doc: Document;
  onDownload: () => void;
  onDelete: () => void;
  onEdit: () => void;
  last: boolean;
}) {
  const cat = getFileCategory(doc.mimeType);
  const Icon = FILE_ICONS[cat] ?? File;
  const colors = FILE_COLORS[cat] ?? FILE_COLORS['file']!;

  return (
    <div className={`group flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors ${!last ? 'border-b border-gray-50' : ''}`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${colors.bg}`}>
        <Icon size={16} className={colors.text} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{doc.fileName}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {doc.case && <span className="text-xs text-gray-400">{doc.case.internalRef}</span>}
          {doc.uploadedBy && (
            <span className="text-xs text-gray-400">
              {doc.case ? '·' : ''} {doc.uploadedBy.firstName} {doc.uploadedBy.lastName}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {doc.tags.slice(0, 2).map((tag) => (
          <span key={tag} className="text-[10px] bg-[#EEF1FB] text-[#3B4ECC] px-2 py-0.5 rounded-full font-medium">{tag}</span>
        ))}
      </div>
      <div className="text-xs text-gray-400 text-right flex-shrink-0 w-16">{formatFileSize(doc.fileSize)}</div>
      <div className="text-xs text-gray-400 text-right flex-shrink-0 w-24">
        {new Date(doc.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button onClick={onDownload} className="p-1.5 text-gray-400 hover:text-[#3B4ECC] hover:bg-[#EEF1FB] rounded-lg transition-colors" title="Download">
          <Download size={14} />
        </button>
        <button onClick={onEdit} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors" title="Edit">
          <Tag size={14} />
        </button>
        <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Upload progress item ─────────────────────────────────────────────────────

function UploadItem({ item }: { item: UploadProgress }) {
  const cat = item.file.type ? getFileCategory(item.file.type) : 'file';
  const Icon = FILE_ICONS[cat] ?? File;
  const colors = FILE_COLORS[cat] ?? FILE_COLORS['file']!;

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-100">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${colors.bg}`}>
        {item.status === 'done' ? <Check size={16} className="text-green-600" /> :
         item.status === 'error' ? <AlertCircle size={16} className="text-red-500" /> :
         <Icon size={16} className={colors.text} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{item.file.name}</p>
        {item.status === 'error' ? (
          <p className="text-xs text-red-500">{item.error}</p>
        ) : item.status === 'done' ? (
          <p className="text-xs text-green-600">Upload complete</p>
        ) : (
          <div className="mt-1">
            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-[#3B4ECC] rounded-full transition-all duration-300"
                style={{ width: `${item.progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {item.status === 'uploading' ? `${item.progress}%` :
               item.status === 'confirming' ? 'Saving…' : 'Queued'}
            </p>
          </div>
        )}
      </div>
      {item.status === 'uploading' || item.status === 'confirming' ? (
        <Loader2 size={15} className="text-[#3B4ECC] animate-spin flex-shrink-0" />
      ) : item.status === 'done' ? (
        <Check size={15} className="text-green-600 flex-shrink-0" />
      ) : null}
    </div>
  );
}

// ─── Drop zone ────────────────────────────────────────────────────────────────

function DropZone({ onFiles, inputId }: { onFiles: (files: File[]) => void; inputId: string }) {
  const [dragging, setDragging] = useState(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const { valid, rejected } = validateFiles(e.dataTransfer.files);
    if (rejected.length > 0) alert(`Some files were rejected:\n${rejected.join('\n')}`);
    if (valid.length > 0) onFiles(valid);
  }

  return (
    <label
      htmlFor={inputId}
      className={`flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all
        ${dragging
          ? 'border-[#3B4ECC] bg-[#EEF1FB] scale-[1.01]'
          : 'border-gray-200 bg-gray-50 hover:border-[#3B4ECC]/50 hover:bg-[#EEF1FB]/40'
        }`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${dragging ? 'bg-[#3B4ECC]' : 'bg-white border border-gray-200'}`}>
        <Upload size={22} className={dragging ? 'text-white' : 'text-[#3B4ECC]'} />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-gray-700">
          {dragging ? 'Drop files here' : 'Drag & drop files here'}
        </p>
        <p className="text-xs text-gray-400 mt-1">or click to browse</p>
        <p className="text-xs text-gray-300 mt-2">PDF, DOCX, XLSX, images · max 50 MB</p>
      </div>
      <input
        id={inputId}
        type="file"
        multiple
        accept={ALLOWED_EXTENSIONS.join(',')}
        className="sr-only"
        onChange={(e) => {
          if (!e.target.files) return;
          const { valid, rejected } = validateFiles(e.target.files);
          if (rejected.length > 0) alert(`Some files were rejected:\n${rejected.join('\n')}`);
          if (valid.length > 0) onFiles(valid);
          e.target.value = '';
        }}
      />
    </label>
  );
}

// ─── Main DocumentVault ───────────────────────────────────────────────────────

export interface DocumentVaultProps {
  caseId?: string;
  clientId?: string;
  compact?: boolean; // hide folder sidebar
}

export function DocumentVault({ caseId, clientId, compact = false }: DocumentVaultProps) {
  const inputId = useId();
  const [activeFolder, setActiveFolder] = useState<FolderKey>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [editDoc, setEditDoc] = useState<Document | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Document | null>(null);
  const [defaultFolder, setDefaultFolder] = useState<string>('general');
  const [showFolderPicker, setShowFolderPicker] = useState(false);

  const filters = {
    ...(caseId && { caseId }),
    ...(clientId && { clientId }),
    ...(activeFolder !== 'all' && { folder: activeFolder }),
    ...(search && { search }),
  };

  const { documents, loading, error, refetch } = useDocuments(filters);

  // ─── Upload handler ────────────────────────────────────────────────────────

  const handleFiles = useCallback(async (files: File[]) => {
    const newUploads: UploadProgress[] = files.map((file) => ({
      file,
      id: `${Date.now()}-${Math.random()}`,
      status: 'pending',
      progress: 0,
    }));
    setUploads((prev) => [...newUploads, ...prev]);

    for (const up of newUploads) {
      setUploads((prev) => prev.map((u) => u.id === up.id ? { ...u, status: 'uploading' } : u));

      try {
        const doc = await uploadFile(
          up.file,
          { caseId, clientId, folder: defaultFolder },
          (pct) => {
            setUploads((prev) => prev.map((u) => u.id === up.id
              ? { ...u, progress: pct, status: pct < 100 ? 'uploading' : 'confirming' }
              : u
            ));
          },
        );
        setUploads((prev) => prev.map((u) => u.id === up.id ? { ...u, status: 'done', progress: 100, document: doc } : u));
        refetch();
      } catch (err) {
        setUploads((prev) => prev.map((u) => u.id === up.id ? { ...u, status: 'error', error: (err as Error).message } : u));
      }
    }

    // Auto-clear completed uploads after 4s
    setTimeout(() => {
      setUploads((prev) => prev.filter((u) => u.status !== 'done'));
    }, 4000);
  }, [caseId, clientId, defaultFolder, refetch]);

  // ─── Document actions ──────────────────────────────────────────────────────

  async function handleDownload(doc: Document) {
    try {
      const url = await getDownloadUrl(doc.id);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.fileName;
      a.click();
    } catch { alert('Failed to generate download link'); }
  }

  async function handleDelete(doc: Document) {
    try {
      await deleteDocument(doc.id);
      setDeleteConfirm(null);
      refetch();
    } catch { alert('Failed to delete document'); }
  }

  async function handleEdit(name: string, folder: string, tags: string[]) {
    if (!editDoc) return;
    await updateDocument(editDoc.id, { fileName: name, folder, tags });
    refetch();
  }

  // ─── Folder counts ─────────────────────────────────────────────────────────

  const folderCounts = documents.reduce<Record<string, number>>((acc, d) => {
    acc[d.folder] = (acc[d.folder] ?? 0) + 1;
    return acc;
  }, {});

  const activeUploads = uploads.filter((u) => u.status !== 'done');

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={`flex gap-5 ${compact ? '' : 'min-h-0'}`}>
      {/* Folder sidebar */}
      {!compact && (
        <aside className="w-48 flex-shrink-0 space-y-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-2 mb-3">Folders</p>
          {FOLDERS.map((folder) => {
            const Icon = FOLDER_ICONS[folder.key] ?? Folder;
            const count = folder.key === 'all'
              ? documents.length
              : (folderCounts[folder.key] ?? 0);
            const isActive = activeFolder === folder.key;
            return (
              <button
                key={folder.key}
                onClick={() => setActiveFolder(folder.key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all ${
                  isActive
                    ? 'bg-[#3B4ECC] text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon size={15} className="flex-shrink-0" />
                <span className="flex-1 text-left truncate">{folder.label}</span>
                {count > 0 && (
                  <span className={`text-xs font-semibold rounded-full px-1.5 py-0.5 ${isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </aside>
      )}

      {/* Main content */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Toolbar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search documents…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B4ECC]/20 focus:border-[#3B4ECC]"
            />
          </div>
          {compact && (
            <div className="relative">
              <button
                onClick={() => setShowFolderPicker(!showFolderPicker)}
                className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <Folder size={14} className="text-gray-500" />
                <span className="text-sm text-gray-700 capitalize">{defaultFolder}</span>
              </button>
              {showFolderPicker && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-100 rounded-xl shadow-lg z-20 overflow-hidden">
                  {FOLDERS.filter((f) => f.key !== 'all').map((f) => (
                    <button key={f.key} onClick={() => { setDefaultFolder(f.key); setShowFolderPicker(false); }}
                      className={`w-full px-3 py-2.5 text-sm text-left hover:bg-gray-50 ${defaultFolder === f.key ? 'text-[#3B4ECC] font-semibold' : 'text-gray-700'}`}>
                      {f.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="ml-auto flex items-center gap-2">
            {!compact && (
              <div className="relative">
                <button
                  onClick={() => setShowFolderPicker(!showFolderPicker)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                  title="Upload folder"
                >
                  <SlidersHorizontal size={13} />
                  {FOLDERS.find((f) => f.key === defaultFolder)?.label ?? 'General'}
                </button>
                {showFolderPicker && (
                  <div className="absolute top-full right-0 mt-1 w-44 bg-white border border-gray-100 rounded-xl shadow-lg z-20 overflow-hidden">
                    <p className="px-3 py-2 text-xs font-semibold text-gray-400">Upload to folder:</p>
                    {FOLDERS.filter((f) => f.key !== 'all').map((f) => (
                      <button key={f.key} onClick={() => { setDefaultFolder(f.key); setShowFolderPicker(false); }}
                        className={`w-full px-3 py-2.5 text-sm text-left hover:bg-gray-50 flex items-center gap-2 ${defaultFolder === f.key ? 'text-[#3B4ECC] font-semibold' : 'text-gray-700'}`}>
                        {defaultFolder === f.key && <Check size={13} />}
                        <span className={defaultFolder === f.key ? '' : 'ml-[17px]'}>{f.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="flex border border-gray-200 rounded-lg overflow-hidden">
              <button onClick={() => setViewMode('grid')} className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-[#3B4ECC] text-white' : 'text-gray-400 hover:text-gray-600 bg-white'}`}>
                <LayoutGrid size={15} />
              </button>
              <button onClick={() => setViewMode('list')} className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-[#3B4ECC] text-white' : 'text-gray-400 hover:text-gray-600 bg-white'}`}>
                <List size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Drop zone */}
        <DropZone onFiles={handleFiles} inputId={inputId} />

        {/* Active uploads */}
        {activeUploads.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Uploading</p>
            {activeUploads.map((up) => <UploadItem key={up.id} item={up} />)}
          </div>
        )}

        {/* Documents */}
        {error ? (
          <div className="flex items-center gap-3 p-4 bg-red-50 text-red-700 text-sm rounded-xl">
            <AlertCircle size={16} /> {error}
          </div>
        ) : loading ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 h-40 animate-pulse">
                  <div className="w-12 h-12 bg-gray-100 rounded-xl mb-3" />
                  <div className="h-3.5 bg-gray-100 rounded w-4/5 mb-2" />
                  <div className="h-3 bg-gray-50 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                  <div className="w-9 h-9 bg-gray-100 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-gray-100 rounded w-3/4" />
                    <div className="h-3 bg-gray-50 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )
        ) : documents.length === 0 ? (
          <div className="text-center py-10 text-sm text-gray-400">
            <FolderOpen size={36} className="text-gray-200 mx-auto mb-3" />
            {search ? `No documents matching "${search}"` : 'No documents yet. Drop files above to upload.'}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
            {documents.map((doc) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                onDownload={() => handleDownload(doc)}
                onDelete={() => setDeleteConfirm(doc)}
                onEdit={() => setEditDoc(doc)}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wide">
              <span>Name</span>
              <span className="w-16 text-right">Size</span>
              <span className="w-24 text-right">Date</span>
              <span className="w-24" />
            </div>
            {documents.map((doc, i) => (
              <DocumentRow
                key={doc.id}
                doc={doc}
                last={i === documents.length - 1}
                onDownload={() => handleDownload(doc)}
                onDelete={() => setDeleteConfirm(doc)}
                onEdit={() => setEditDoc(doc)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Rename modal */}
      {editDoc && (
        <RenameModal
          doc={editDoc}
          onSave={handleEdit}
          onClose={() => setEditDoc(null)}
        />
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
            <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={18} className="text-red-600" />
            </div>
            <h3 className="text-base font-bold text-center text-[#121845] mb-2">Delete Document?</h3>
            <p className="text-sm text-center text-gray-500 mb-5 break-words px-2">
              "{deleteConfirm.fileName}" will be removed permanently.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2.5 text-sm font-medium border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
