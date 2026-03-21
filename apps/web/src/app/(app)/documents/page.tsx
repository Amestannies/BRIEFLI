'use client';

import { useDocumentStats } from '@/hooks/useDocuments';
import { DocumentVault } from '@/components/documents/document-vault';
import { HardDrive, FileText, Image, Table2, File } from 'lucide-react';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export default function DocumentsPage() {
  const { stats, loading: statsLoading } = useDocumentStats();

  const typeCards = [
    { key: 'pdf',   label: 'PDFs',       icon: FileText,  color: 'text-red-600',    bg: 'bg-red-50' },
    { key: 'docx',  label: 'Word Docs',  icon: FileText,  color: 'text-blue-600',   bg: 'bg-blue-50' },
    { key: 'xlsx',  label: 'Spreadsheets', icon: Table2,  color: 'text-green-600',  bg: 'bg-green-50' },
    { key: 'image', label: 'Images',     icon: Image,     color: 'text-purple-600', bg: 'bg-purple-50' },
    { key: 'other', label: 'Other',      icon: File,      color: 'text-gray-500',   bg: 'bg-gray-100' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#121845]" style={{ fontFamily: 'Playfair Display, serif' }}>
          Documents
        </h1>
        <p className="text-sm text-gray-500 mt-1">Firm-wide document library</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {/* Storage */}
        <div className="col-span-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="w-9 h-9 bg-[#EEF1FB] rounded-xl flex items-center justify-center mb-3">
            <HardDrive size={16} className="text-[#3B4ECC]" />
          </div>
          <p className="text-xl font-bold text-[#121845]">
            {statsLoading ? '—' : formatFileSize(stats?.totalSize ?? 0)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">Storage used</p>
        </div>

        {/* Per-type cards */}
        {typeCards.map((t) => (
          <div key={t.key} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className={`w-9 h-9 ${t.bg} rounded-xl flex items-center justify-center mb-3`}>
              <t.icon size={16} className={t.color} />
            </div>
            <p className="text-xl font-bold text-[#121845]">
              {statsLoading ? '—' : (stats?.byType[t.key] ?? 0)}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{t.label}</p>
          </div>
        ))}
      </div>

      {/* Vault */}
      <DocumentVault />
    </div>
  );
}
