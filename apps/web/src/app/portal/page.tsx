'use client';

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  Suspense,
  ChangeEvent,
  FormEvent,
  DragEvent,
} from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import {
  FileText,
  MessageCircle,
  CreditCard,
  Home,
  Upload,
  Download,
  Check,
  Clock,
  Send,
  X,
  AlertCircle,
  ChevronRight,
  Briefcase,
  Calendar,
  LogOut,
  Plus,
} from 'lucide-react';
import { portalFetch, getPortalApiBase } from '@/lib/portal-api';
import { LogoWithText } from '@/components/ui/logo';

// ─── Types ────────────────────────────────────────────────

interface PortalClient {
  clientId: string;
  firmId: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface CaseInfo {
  id: string;
  title: string;
  status: string;
  internalRef: string;
  caseType: string;
}

interface Milestone {
  id: string;
  title: string;
  completedAt?: string | null;
  dueDate?: string | null;
}

interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;
}

interface CaseNote {
  id: string;
  body: string;
  createdAt: string;
  author?: { firstName: string; lastName: string } | null;
}

interface CaseDetail {
  id: string;
  title: string;
  status: string;
  internalRef: string;
  caseType: string;
  milestones?: Milestone[];
  events?: CalendarEvent[];
  notes?: CaseNote[];
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  total: string;
  subtotal: string;
  tax: string;
  dueDate: string;
  paidAt?: string;
  status: string;
  notes?: string;
}

interface Meeting {
  id: string;
  title: string;
  status: string;
  confirmedTime?: string;
  proposedTimes?: string[];
  durationMinutes: number;
  notes?: string;
  meetingLink?: string;
  case?: { title: string } | null;
}

interface PortalMessage {
  id: string;
  senderId: string;
  senderType: string;
  body: string;
  createdAt: string;
  isRead: boolean;
}

interface DocumentRequest {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  fulfilledAt?: string;
  case?: { title: string; internalRef: string } | null;
}

interface PortalDoc {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  folder: string;
  createdAt: string;
}

interface Profile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  cases: Array<{ case: CaseInfo }>;
}

// ─── Constants ────────────────────────────────────────────

const TABS = ['Overview', 'Documents', 'Messages', 'Invoices', 'Meetings'] as const;
type TabType = (typeof TABS)[number];

const CASE_STATUS_COLORS: Record<string, string> = {
  INTAKE: 'bg-muted text-muted-foreground',
  ACTIVE: 'bg-blue-100 text-blue-700',
  PENDING_COURT: 'bg-amber-100 text-amber-700',
  JUDGMENT: 'bg-orange-100 text-orange-700',
  APPEAL: 'bg-purple-100 text-purple-700',
  CLOSED: 'bg-emerald-100 text-emerald-700',
};

const MEETING_STATUS_COLORS: Record<string, string> = {
  REQUESTED: 'bg-amber-100 text-amber-700',
  CONFIRMED: 'bg-emerald-100 text-emerald-700',
  DECLINED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-muted text-muted-foreground',
  COMPLETED: 'bg-blue-100 text-blue-700',
};

const INVOICE_STATUS_COLORS: Record<string, string> = {
  PAID: 'bg-emerald-100 text-emerald-700',
  SENT: 'bg-blue-100 text-blue-700',
  VIEWED: 'bg-blue-100 text-blue-700',
  OVERDUE: 'bg-red-100 text-red-700',
  DRAFT: 'bg-muted text-muted-foreground',
};

const ACCEPTED_TYPES = '.pdf,.docx,.doc,.jpg,.jpeg,.png';
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function formatCurrency(value: string | number) {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '$0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType === 'application/pdf') return '📄';
  return '📎';
}

// ─── Sub-components ───────────────────────────────────────

function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sz = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-8 h-8' : 'w-6 h-6';
  return (
    <svg className={`animate-spin ${sz} text-[#3B4ECC]`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

function StatusBadge({ status, colorMap }: { status: string; colorMap: Record<string, string> }) {
  const color = colorMap[status] ?? 'bg-muted text-muted-foreground';
  return (
    <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${color}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

// ─── Overview Tab ─────────────────────────────────────────

function OverviewTab({
  profile,
  onSelectCase,
}: {
  profile: Profile;
  onSelectCase: (c: CaseInfo) => void;
}) {
  const [selectedCase, setSelectedCase] = useState<CaseDetail | null>(null);
  const [caseLoading, setCaseLoading] = useState(false);
  const [updates, setUpdates] = useState<CaseNote[]>([]);

  const handleViewCase = async (c: CaseInfo) => {
    setCaseLoading(true);
    try {
      const [detail, caseUpdates] = await Promise.all([
        portalFetch<CaseDetail>(`/portal/cases/${c.id}`),
        portalFetch<CaseNote[]>(`/portal/cases/${c.id}/updates`),
      ]);
      setSelectedCase(detail);
      setUpdates(caseUpdates);
      onSelectCase(c);
    } catch {
      // ignore
    } finally {
      setCaseLoading(false);
    }
  };

  if (selectedCase) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => setSelectedCase(null)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" /> Back to cases
        </button>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">{selectedCase.title}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono text-xs text-muted-foreground/60">{selectedCase.internalRef}</span>
                <StatusBadge status={selectedCase.status} colorMap={CASE_STATUS_COLORS} />
              </div>
            </div>
          </div>

          {/* Milestones */}
          {(selectedCase.milestones?.length ?? 0) > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-foreground/80 mb-3">Milestones</h3>
              <div className="space-y-2">
                {selectedCase.milestones!.map((m) => (
                  <div key={m.id} className="flex items-center gap-3">
                    {m.completedAt ? (
                      <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full border-2 border-border flex-shrink-0" />
                    )}
                    <span className={`text-sm ${m.completedAt ? 'text-muted-foreground/60 line-through' : 'text-foreground/80'}`}>
                      {m.title}
                    </span>
                    {m.dueDate && !m.completedAt && (
                      <span className="text-xs text-muted-foreground/60 ml-auto">Due {formatDate(m.dueDate)}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming events */}
          {(selectedCase.events?.length ?? 0) > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-foreground/80 mb-3">Upcoming Events</h3>
              <div className="space-y-2">
                {selectedCase.events!.map((ev) => (
                  <div key={ev.id} className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg">
                    <Calendar className="w-4 h-4 text-[#3B4ECC] flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{ev.title}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(ev.startTime)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent updates */}
          <div>
            <h3 className="text-sm font-semibold text-foreground/80 mb-3">Recent Updates</h3>
            {updates.length === 0 ? (
              <p className="text-sm text-muted-foreground/60">No updates yet.</p>
            ) : (
              <div className="space-y-3">
                {updates.map((note) => (
                  <div key={note.id} className="border-l-2 border-[#3B4ECC] pl-4 py-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        {note.author
                          ? `${note.author.firstName} ${note.author.lastName}`
                          : 'Your attorney'}
                      </span>
                      <span className="text-xs text-muted-foreground/60">{formatDate(note.createdAt)}</span>
                    </div>
                    <p className="text-sm text-foreground/80">{note.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div
        className="rounded-2xl p-6 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #3B4ECC 0%, #121845 100%)' }}
      >
        {/* Subtle dot texture */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        <div className="relative z-10">
          <h2
            className="text-2xl font-bold mb-1"
            style={{ fontFamily: 'var(--font-serif, "Playfair Display", Georgia, serif)' }}
          >
            Welcome back, {profile.firstName}!
          </h2>
          <p className="text-blue-200 text-sm">
            You have {profile.cases.length} {profile.cases.length === 1 ? 'case' : 'cases'} on file.
          </p>
        </div>
      </div>

      {/* Case cards */}
      {profile.cases.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <Briefcase className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No cases on file yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {profile.cases.map(({ case: c }) => (
            <div key={c.id} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{c.title}</p>
                  <span className="font-mono text-[10px] text-muted-foreground/60">{c.internalRef}</span>
                </div>
                <StatusBadge status={c.status} colorMap={CASE_STATUS_COLORS} />
              </div>
              <p className="text-xs text-muted-foreground mb-4">{c.caseType.replace(/_/g, ' ')}</p>
              <button
                onClick={() => handleViewCase(c)}
                disabled={caseLoading}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-[#3B4ECC] text-[#3B4ECC] text-xs font-semibold hover:bg-blue-50 transition-colors disabled:opacity-60"
              >
                {caseLoading ? <LoadingSpinner size="sm" /> : (
                  <>View Details <ChevronRight className="w-3.5 h-3.5" /></>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Documents Tab ────────────────────────────────────────

interface UploadProgress {
  fileKey: string;
  fileName: string;
  progress: number;
  done: boolean;
  error?: string;
}

function DocumentsTab({ profile }: { profile: Profile }) {
  const [requests, setRequests] = useState<DocumentRequest[]>([]);
  const [docs, setDocs] = useState<PortalDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const requestFileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [reqs, documents] = await Promise.all([
        portalFetch<DocumentRequest[]>('/portal/document-requests'),
        portalFetch<PortalDoc[]>('/portal/documents'),
      ]);
      setRequests(reqs);
      setDocs(documents);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const uploadFile = async (
    file: File,
    options: { caseId?: string; documentRequestId?: string } = {}
  ) => {
    if (file.size > MAX_FILE_SIZE) {
      alert(`File "${file.name}" exceeds 50MB limit.`);
      return;
    }

    const tempKey = `${Date.now()}-${file.name}`;
    setUploads((prev) => [
      ...prev,
      { fileKey: tempKey, fileName: file.name, progress: 0, done: false },
    ]);

    try {
      // Get upload URL
      const { uploadUrl, fileKey } = await portalFetch<{ uploadUrl: string; fileKey: string }>(
        '/portal/documents/upload-url',
        {
          method: 'POST',
          body: JSON.stringify({ fileName: file.name, mimeType: file.type }),
        }
      );

      // Upload to S3
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.upload.addEventListener('progress', (ev) => {
          if (ev.lengthComputable) {
            const pct = Math.round((ev.loaded / ev.total) * 90);
            setUploads((prev) =>
              prev.map((u) => (u.fileKey === tempKey ? { ...u, progress: pct } : u))
            );
          }
        });
        xhr.onload = () => (xhr.status < 400 ? resolve() : reject(new Error('Upload failed')));
        xhr.onerror = () => reject(new Error('Upload failed'));
        xhr.send(file);
      });

      // Confirm upload
      await portalFetch('/portal/documents/confirm', {
        method: 'POST',
        body: JSON.stringify({
          fileKey,
          fileName: file.name,
          mimeType: file.type,
          fileSize: file.size,
          ...(options.caseId ? { caseId: options.caseId } : {}),
          ...(options.documentRequestId ? { documentRequestId: options.documentRequestId } : {}),
        }),
      });

      setUploads((prev) =>
        prev.map((u) => (u.fileKey === tempKey ? { ...u, progress: 100, done: true } : u))
      );
      await load();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setUploads((prev) =>
        prev.map((u) =>
          u.fileKey === tempKey
            ? { ...u, error: e.message ?? 'Upload failed', done: true }
            : u
        )
      );
    }
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    for (const f of files) await uploadFile(f);
  };

  const handleGenericFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    for (const f of files) await uploadFile(f);
    e.target.value = '';
  };

  const handleRequestFile = async (
    e: ChangeEvent<HTMLInputElement>,
    req: DocumentRequest,
    caseId?: string
  ) => {
    const files = Array.from(e.target.files ?? []);
    for (const f of files) {
      await uploadFile(f, {
        ...(caseId ? { caseId } : {}),
        documentRequestId: req.id,
      });
    }
    e.target.value = '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Requested Documents */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-4">Requested Documents</h3>
        {requests.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-6 text-center">
            <p className="text-sm text-muted-foreground/60">No document requests at this time.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => {
              const caseId = profile.cases.find(
                (cc) => cc.case.internalRef === req.case?.internalRef
              )?.case.id;
              return (
                <div
                  key={req.id}
                  className="bg-card border border-border rounded-xl p-5 flex items-start justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{req.title}</p>
                    {req.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{req.description}</p>
                    )}
                    {req.case && (
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        Case: {req.case.title} ({req.case.internalRef})
                      </p>
                    )}
                    {req.dueDate && (
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                        Due: {formatDate(req.dueDate)}
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    {req.fulfilledAt ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
                        <Check className="w-3 h-3" /> Submitted
                      </span>
                    ) : (
                      <>
                        <input
                          type="file"
                          accept={ACCEPTED_TYPES}
                          className="hidden"
                          ref={(el) => { requestFileRefs.current[req.id] = el; }}
                          onChange={(e) => handleRequestFile(e, req, caseId)}
                        />
                        <button
                          onClick={() => requestFileRefs.current[req.id]?.click()}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#3B4ECC] text-white text-xs font-semibold hover:opacity-90 transition-opacity"
                        >
                          <Upload className="w-3.5 h-3.5" /> Upload
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upload progress bars */}
      {uploads.length > 0 && (
        <div className="space-y-2">
          {uploads.filter((u) => !u.done || u.error).map((u) => (
            <div key={u.fileKey} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-foreground/80 truncate">{u.fileName}</span>
                {u.error ? (
                  <span className="text-xs text-red-500">{u.error}</span>
                ) : (
                  <span className="text-xs text-muted-foreground/60">{u.progress}%</span>
                )}
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${u.error ? 'bg-red-400' : 'bg-[#3B4ECC]'}`}
                  style={{ width: `${u.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* My Documents */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-4">My Documents</h3>

        {/* Drag and drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors mb-4 ${
            dragging
              ? 'border-[#3B4ECC] bg-blue-50'
              : 'border-border hover:border-[#3B4ECC] hover:bg-blue-50/30'
          }`}
        >
          <Upload className="w-6 h-6 text-muted-foreground/60 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Drag files here or <span className="text-[#3B4ECC] font-medium">click to browse</span>
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">PDF, DOCX, DOC, JPG, PNG — max 50MB</p>
          <input
            type="file"
            accept={ACCEPTED_TYPES}
            multiple
            className="hidden"
            ref={fileInputRef}
            onChange={handleGenericFile}
          />
        </div>

        {docs.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-6 text-center">
            <p className="text-sm text-muted-foreground/60">No documents uploaded yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {docs.map((doc) => (
              <div
                key={doc.id}
                className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3"
              >
                <span className="text-xl flex-shrink-0">{fileIcon(doc.mimeType)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{doc.fileName}</p>
                  <p className="text-[10px] text-muted-foreground/60">
                    {formatBytes(doc.fileSize)} · {formatDate(doc.createdAt)}
                  </p>
                </div>
                <a
                  href={`${getPortalApiBase()}/documents/${doc.id}/download-url`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-muted-foreground/60 hover:text-[#3B4ECC] transition-colors"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Messages Tab ─────────────────────────────────────────

function MessagesTab({ clientId }: { clientId: string }) {
  const [messages, setMessages] = useState<PortalMessage[]>([]);
  const [input, setInput] = useState('');
  const [firmTyping, setFirmTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Load existing messages
    portalFetch<PortalMessage[]>('/portal/messages')
      .then((msgs) => {
        setMessages(msgs);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // Connect socket
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:3001';
    const socket = io(`${wsUrl}/chat`, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join', { room: `portal-${clientId}` });
    });

    socket.on('message', (msg: PortalMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    socket.on('typing', () => {
      setFirmTyping(true);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => setFirmTyping(false), 3000);
    });

    return () => {
      socket.disconnect();
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, [clientId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, firmTyping]);

  useEffect(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('read', { room: `portal-${clientId}` });
    }
  }, [clientId]);

  const handleSend = async () => {
    const body = input.trim();
    if (!body) return;

    const optimistic: PortalMessage = {
      id: `opt-${Date.now()}`,
      senderId: clientId,
      senderType: 'CLIENT',
      body,
      createdAt: new Date().toISOString(),
      isRead: false,
    };
    setMessages((prev) => [...prev, optimistic]);
    setInput('');

    socketRef.current?.emit('message', { room: `portal-${clientId}`, body });

    try {
      await portalFetch('/portal/messages', {
        method: 'POST',
        body: JSON.stringify({ body }),
      });
    } catch {
      // keep optimistic
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 220px)', minHeight: '400px' }}>
      <div className="flex-1 overflow-y-auto space-y-3 pb-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <MessageCircle className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground/60">No messages yet. Start a conversation!</p>
          </div>
        )}
        {messages.map((msg) => {
          const isClient = msg.senderType === 'CLIENT';
          return (
            <div key={msg.id} className={`flex ${isClient ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] ${isClient ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                <span className="text-[10px] text-muted-foreground/60 px-1">
                  {isClient ? 'You' : 'Firm'}
                </span>
                <div
                  className={`px-4 py-2.5 rounded-2xl text-sm ${
                    isClient
                      ? 'text-white rounded-br-md'
                      : 'bg-muted text-foreground rounded-bl-md'
                  }`}
                  style={isClient ? { backgroundColor: '#3B4ECC' } : {}}
                >
                  {msg.body}
                </div>
                <span className="text-[10px] text-muted-foreground/60 px-1">
                  {formatDateTime(msg.createdAt)}
                </span>
              </div>
            </div>
          );
        })}
        {firmTyping && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-2.5">
              <span className="text-xs text-muted-foreground/60 italic">Firm is typing…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 pt-4 flex gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="Type a message…"
          className="flex-1 border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B4ECC] focus:border-transparent"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className="p-2.5 rounded-xl text-white disabled:opacity-50 transition-opacity"
          style={{ backgroundColor: '#3B4ECC' }}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Invoices Tab ─────────────────────────────────────────

function InvoicesTab({ showPaymentBanner }: { showPaymentBanner: boolean }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState<Record<string, 'stripe' | 'paypal' | null>>({});

  useEffect(() => {
    portalFetch<Invoice[]>('/portal/invoices')
      .then((data) => { setInvoices(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleStripe = async (invoice: Invoice) => {
    setPaymentLoading((prev) => ({ ...prev, [invoice.id]: 'stripe' }));
    try {
      const { url } = await portalFetch<{ url: string }>(
        `/portal/invoices/${invoice.id}/checkout/stripe`,
        { method: 'POST' }
      );
      window.open(url, '_blank');
    } catch (err: unknown) {
      const e = err as { message?: string };
      alert(e.message ?? 'Payment failed. Please try again.');
    } finally {
      setPaymentLoading((prev) => ({ ...prev, [invoice.id]: null }));
    }
  };

  const handlePayPal = async (invoice: Invoice) => {
    setPaymentLoading((prev) => ({ ...prev, [invoice.id]: 'paypal' }));
    try {
      const { approvalUrl } = await portalFetch<{ orderId: string; approvalUrl: string }>(
        `/portal/invoices/${invoice.id}/checkout/paypal`,
        { method: 'POST' }
      );
      window.open(approvalUrl, '_blank');
    } catch (err: unknown) {
      const e = err as { message?: string };
      alert(e.message ?? 'PayPal checkout failed. Please try again.');
    } finally {
      setPaymentLoading((prev) => ({ ...prev, [invoice.id]: null }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showPaymentBanner && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-5 py-4">
          <Check className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <p className="text-sm font-medium">Payment received! Thank you.</p>
        </div>
      )}

      {invoices.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <CreditCard className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground/60">No invoices yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv) => {
            const unpaid = ['SENT', 'VIEWED', 'OVERDUE'].includes(inv.status);
            const pl = paymentLoading[inv.id];
            return (
              <div key={inv.id} className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Invoice #{inv.invoiceNumber}
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">
                      Due {formatDate(inv.dueDate)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-foreground">
                      {formatCurrency(inv.total)}
                    </span>
                    <StatusBadge status={inv.status} colorMap={INVOICE_STATUS_COLORS} />
                  </div>
                </div>
                {unpaid && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                    <button
                      onClick={() => handleStripe(inv)}
                      disabled={!!pl}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#3B4ECC] text-white text-xs font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity"
                    >
                      {pl === 'stripe' ? <LoadingSpinner size="sm" /> : <CreditCard className="w-3.5 h-3.5" />}
                      Pay with Card
                    </button>
                    <button
                      onClick={() => handlePayPal(inv)}
                      disabled={!!pl}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500 text-white text-xs font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity"
                    >
                      {pl === 'paypal' ? <LoadingSpinner size="sm" /> : null}
                      Pay with PayPal
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Meetings Tab ─────────────────────────────────────────

function MeetingsTab({ profile }: { profile: Profile }) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formCaseId, setFormCaseId] = useState('');
  const [formDuration, setFormDuration] = useState('30');
  const [formTimes, setFormTimes] = useState<string[]>(['', '', '']);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await portalFetch<Meeting[]>('/portal/meetings');
      setMeetings(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const proposedTimes = formTimes.filter(Boolean);
      await portalFetch('/portal/meetings/request', {
        method: 'POST',
        body: JSON.stringify({
          title: formTitle,
          notes: formNotes || undefined,
          caseId: formCaseId || undefined,
          durationMinutes: parseInt(formDuration, 10),
          proposedTimes: proposedTimes.length > 0 ? proposedTimes : undefined,
        }),
      });
      setSuccess(true);
      setShowForm(false);
      setFormTitle('');
      setFormNotes('');
      setFormCaseId('');
      setFormDuration('30');
      setFormTimes(['', '', '']);
      await load();
    } catch (err: unknown) {
      const e = err as { message?: string };
      alert(e.message ?? 'Failed to request meeting.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {success && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-5 py-4">
          <Check className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <p className="text-sm font-medium">Meeting request submitted successfully.</p>
          <button onClick={() => setSuccess(false)} className="ml-auto">
            <X className="w-4 h-4 text-emerald-600" />
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">Your Meetings</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#3B4ECC] text-white text-xs font-semibold hover:opacity-90 transition-opacity"
        >
          <Plus className="w-3.5 h-3.5" />
          Request a Meeting
        </button>
      </div>

      {/* Request form */}
      {showForm && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h4 className="text-sm font-semibold text-foreground mb-4">Request a Meeting</h4>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-foreground/80 mb-1">Title *</label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                required
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B4ECC] focus:border-transparent"
                placeholder="e.g. Case review, Documents discussion"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground/80 mb-1">Notes</label>
              <textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                rows={3}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B4ECC] focus:border-transparent resize-none"
                placeholder="Any additional notes…"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground/80 mb-1">Related Case</label>
                <select
                  value={formCaseId}
                  onChange={(e) => setFormCaseId(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B4ECC] focus:border-transparent"
                >
                  <option value="">No specific case</option>
                  {profile.cases.map(({ case: c }) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground/80 mb-1">Duration</label>
                <select
                  value={formDuration}
                  onChange={(e) => setFormDuration(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B4ECC] focus:border-transparent"
                >
                  <option value="30">30 minutes</option>
                  <option value="60">60 minutes</option>
                  <option value="90">90 minutes</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground/80 mb-2">
                Proposed Times (up to 3)
              </label>
              <div className="space-y-2">
                {formTimes.map((t, i) => (
                  <input
                    key={i}
                    type="datetime-local"
                    value={t}
                    onChange={(e) => {
                      const updated = [...formTimes];
                      updated[i] = e.target.value;
                      setFormTimes(updated);
                    }}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B4ECC] focus:border-transparent"
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 border border-border rounded-full py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !formTitle.trim()}
                className="flex-1 rounded-lg py-2 text-sm font-semibold text-white disabled:opacity-60 transition-opacity flex items-center justify-center gap-2"
                style={{ backgroundColor: '#3B4ECC' }}
              >
                {submitting ? <><LoadingSpinner size="sm" /> Submitting…</> : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Meetings list */}
      {meetings.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <Calendar className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground/60">No meetings scheduled yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {meetings.map((mtg) => (
            <div key={mtg.id} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">{mtg.title}</p>
                  {mtg.case && (
                    <p className="text-xs text-muted-foreground/60 mt-0.5">{mtg.case.title}</p>
                  )}
                </div>
                <StatusBadge status={mtg.status} colorMap={MEETING_STATUS_COLORS} />
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                <Clock className="w-3.5 h-3.5" />
                <span>{mtg.durationMinutes} min</span>
                {mtg.confirmedTime ? (
                  <span className="font-medium text-foreground/80">
                    {formatDateTime(mtg.confirmedTime)}
                  </span>
                ) : (mtg.proposedTimes?.length ?? 0) > 0 ? (
                  <span>
                    Proposed: {mtg.proposedTimes!.map(formatDateTime).join(', ')}
                  </span>
                ) : null}
              </div>
              {mtg.notes && (
                <p className="text-xs text-muted-foreground mt-2">{mtg.notes}</p>
              )}
              {mtg.status === 'CONFIRMED' && mtg.meetingLink && (
                <a
                  href={mtg.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 text-xs font-semibold hover:bg-blue-200 transition-colors"
                >
                  Join Meeting
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Inner page (uses useSearchParams) ────────────────────

function PortalInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [clientInfo, setClientInfo] = useState<PortalClient | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('Overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [_selectedCase, setSelectedCase] = useState<CaseInfo | null>(null);

  const showPaymentBanner =
    searchParams.get('paid') === 'true' || searchParams.get('paypalPaid') === 'true';

  useEffect(() => {
    const init = async () => {
      // Resolve token — prefer URL param (freshest), fall back to sessionStorage
      let token = searchParams.get('token') ?? searchParams.get('prefill');
      if (!token && typeof window !== 'undefined') {
        token = sessionStorage.getItem('portal_token');
      }

      if (!token) {
        router.replace('/portal/login');
        return;
      }

      // Persist to sessionStorage so subsequent requests work
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('portal_token', token);
      }

      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

        // Validate token — now returns full client info
        const authRes = await fetch(
          `${apiBase}/portal/auth?token=${encodeURIComponent(token)}`,
        );

        if (!authRes.ok) {
          // Token is invalid or expired — send back to login
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('portal_token');
          }
          router.replace('/portal/login');
          return;
        }

        const auth = (await authRes.json()) as PortalClient;
        setClientInfo(auth);

        // Load full profile (cases, etc.)
        const me = await portalFetch<Profile>('/portal/me');
        if (!me) {
          setError('Could not load your profile. Please try signing in again.');
          return;
        }
        setProfile(me);
      } catch (err) {
        const e = err as { message?: string };
        setError(e.message ?? 'Failed to load your portal. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSignOut = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('portal_token');
      // Clear the portal_session cookie so middleware stops allowing /portal routes
      document.cookie = 'portal_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict';
    }
    router.replace('/portal/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <LogoWithText dark size={28} />
        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-4">
          <LoadingSpinner size="sm" />
          Loading your portal…
        </div>
      </div>
    );
  }

  if (error || !clientInfo || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
        <LogoWithText dark size={28} className="mb-8" />
        <div className="bg-card border border-border rounded-2xl shadow-sm p-8 max-w-sm w-full text-center">
          <AlertCircle className="w-10 h-10 text-destructive/60 mx-auto mb-3" />
          <h2 className="text-base font-semibold text-foreground mb-2">Unable to load portal</h2>
          <p className="text-sm text-muted-foreground mb-5">{error ?? 'Something went wrong.'}</p>
          <button
            onClick={() => router.replace('/portal/login')}
            className="w-full bg-primary text-primary-foreground rounded-full py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  const TAB_ICONS: Record<TabType, React.ReactNode> = {
    Overview: <Home className="w-4 h-4" />,
    Documents: <FileText className="w-4 h-4" />,
    Messages: <MessageCircle className="w-4 h-4" />,
    Invoices: <CreditCard className="w-4 h-4" />,
    Meetings: <Calendar className="w-4 h-4" />,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ── Top bar — navy, matches attorney sidebar colour ─────────── */}
      <header className="bg-[#121845] border-b border-[#1e2d6b] sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* Logo */}
          <LogoWithText size={22} />

          {/* Right: client name + sign out */}
          <div className="flex items-center gap-3">
            {/* Client avatar chip */}
            <div className="hidden sm:flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5">
              <div className="w-6 h-6 rounded-full bg-primary/70 flex items-center justify-center text-white text-[10px] font-bold">
                {clientInfo.firstName[0]}{clientInfo.lastName[0]}
              </div>
              <span className="text-sm font-medium text-blue-100">
                {clientInfo.firstName} {clientInfo.lastName}
              </span>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 text-xs text-blue-200/70 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/10"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex gap-0.5 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-all ${
                  activeTab === tab
                    ? 'border-white text-white'
                    : 'border-transparent text-blue-200/60 hover:text-blue-100 hover:border-blue-200/30'
                }`}
              >
                {TAB_ICONS[tab]}
                {tab}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'Overview' && (
          <OverviewTab
            profile={profile}
            onSelectCase={setSelectedCase}
          />
        )}
        {activeTab === 'Documents' && (
          <DocumentsTab profile={profile} />
        )}
        {activeTab === 'Messages' && (
          <MessagesTab clientId={clientInfo.clientId} />
        )}
        {activeTab === 'Invoices' && (
          <InvoicesTab showPaymentBanner={showPaymentBanner} />
        )}
        {activeTab === 'Meetings' && (
          <MeetingsTab profile={profile} />
        )}
      </main>
    </div>
  );
}

// ─── Page export (wraps inner in Suspense for useSearchParams) ──

export default function PortalPage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ backgroundColor: '#F4F6FA' }}
        >
          <div className="text-center">
            <svg className="animate-spin w-8 h-8 text-[#3B4ECC] mx-auto" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <p className="text-sm text-muted-foreground/60 mt-3">Loading…</p>
          </div>
        </div>
      }
    >
      <PortalInner />
    </Suspense>
  );
}
