'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowLeft, Mail, Phone, MapPin, Briefcase,
  Globe, Edit3, Trash2, Scale, AlertCircle,
  CheckCircle2, ExternalLink, Shield, ShieldOff,
  ChevronRight, User2, Calendar, Copy, Check,
  MessageCircle, FileText, Plus, X, KeyRound, Eye, EyeOff,
} from 'lucide-react';
import { cn } from '@briefli/ui';
import { UpdateClientSchema, type UpdateClientInput, CASE_TYPE_LABELS, CASE_STATUS_LABELS } from '@briefli/shared';
import { useClient, updateClient, deleteClient, enablePortal, disablePortal } from '@/hooks/useClients';
import { api } from '@/lib/api';
import { copyToClipboard } from '@/lib/copy';

// ─── Portal Management types ──────────────────────────────

interface PortalDocRequest {
  id: string;
  title: string;
  description?: string;
  dueDate?: string | null;
  fulfilledAt?: string | null;
  case?: { title: string; internalRef: string } | null;
}

interface PortalMsg {
  id: string;
  senderType: string;
  body: string;
  createdAt: string;
}

// ─── Portal Management card ───────────────────────────────

function PortalManagementSection({ clientId, portalEnabled, onRefetch }: {
  clientId: string;
  portalEnabled: boolean;
  onRefetch: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [docRequests, setDocRequests] = useState<PortalDocRequest[]>([]);
  const [messages, setMessages] = useState<PortalMsg[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [reqTitle, setReqTitle] = useState('');
  const [reqDesc, setReqDesc] = useState('');
  const [reqDue, setReqDue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [showAccessCode, setShowAccessCode] = useState(false);
  const [codeVisible, setCodeVisible] = useState(false);
  const [accessCode, setAccessCode] = useState<string | null>(null);
  const [accessUrl, setAccessUrl] = useState<string | null>(null);
  const [fetchingToken, setFetchingToken] = useState(false);
  const [fetchTokenError, setFetchTokenError] = useState<string | null>(null);
  const [codeMask, setCodeMask] = useState('');

  const portalLoginUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/portal/login`
      : '/portal/login';

  const loadPortalData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [reqRes, activityRes] = await Promise.all([
        api.get<PortalDocRequest[]>(`/portal/clients/${clientId}/document-requests`).catch(() => ({ data: [] as PortalDocRequest[] })),
        api.get<{ messages: PortalMsg[] }>(`/portal/clients/${clientId}/activity`).catch(() => ({ data: { messages: [] } })),
      ]);
      setDocRequests(reqRes.data);
      setMessages(activityRes.data.messages.slice(0, 5));
    } finally {
      setLoadingData(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadPortalData();
  }, [loadPortalData]);

  // Works on HTTP and HTTPS — creates a real visible textarea off-screen,
  // selects it, copies, then removes it immediately.
  function forceCopy(text: string): boolean {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;top:0;left:0;width:2em;height:2em;padding:0;border:none;outline:none;boxShadow:none;background:transparent;opacity:0;';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }

  function smartCopy(text: string, onDone: () => void) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(onDone).catch(() => {
        forceCopy(text);
        onDone();
      });
    } else {
      forceCopy(text);
      onDone();
    }
  }

  const handleCopyLink = () => {
    smartCopy(portalLoginUrl, () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleCopyCode = () => {
    if (!accessCode) return;
    smartCopy(accessCode, () => {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    });
  };

  const handleCopyFullUrl = () => {
    if (!accessUrl) return;
    smartCopy(accessUrl, () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Generates a stable-looking random mask the same length as the real code
  function maskCode(code: string): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
    return code
      .split('')
      .map(() => chars[Math.floor(Math.random() * chars.length)])
      .join('');
  }

  const handleViewCode = async () => {
    setShowAccessCode(true);
    setCodeVisible(false);
    setFetchTokenError(null);
    if (accessCode) return; // already loaded this session
    setFetchingToken(true);
    try {
      const res = await api.get<{ portalToken: string; portalUrl: string }>(`/portal/clients/${clientId}/token`);
      setAccessCode(res.data.portalToken);
      setAccessUrl(res.data.portalUrl);
      setCodeMask(maskCode(res.data.portalToken));
    } catch (err) {
      const e = err as { message?: string; response?: { data?: { message?: string } } };
      setFetchTokenError(e.response?.data?.message ?? e.message ?? 'Could not load access code. Make sure the API server is running.');
    } finally {
      setFetchingToken(false);
    }
  };

  const handleTogglePortal = async () => {
    setPortalLoading(true);
    try {
      if (portalEnabled) {
        await disablePortal(clientId);
        setAccessCode(null);
        setAccessUrl(null);
        onRefetch();
      } else {
        const result = await enablePortal(clientId);
        setAccessCode(result.portalToken);
        setAccessUrl(result.portalUrl);
        setCodeMask(maskCode(result.portalToken));
        setShowAccessCode(true);
        onRefetch();
      }
    } finally {
      setPortalLoading(false);
    }
  };

  const handleNewRequest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/portal/document-requests', {
        title: reqTitle,
        description: reqDesc || undefined,
        dueDate: reqDue || undefined,
        clientId,
      });
      setReqTitle('');
      setReqDesc('');
      setReqDue('');
      setShowNewRequest(false);
      await loadPortalData();
    } catch {
      alert('Failed to create document request.');
    } finally {
      setSubmitting(false);
    }
  };

  function formatDate(iso: string | null | undefined) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  return (
    <div className="space-y-4">
      {/* Portal Access Card */}
      <div className="bg-card border border-border rounded-2xl shadow-sm p-5">
        <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" /> Portal Access
        </h2>

        <div className={cn(
          'flex items-center gap-3 p-3 rounded-xl border mb-3',
          portalEnabled ? 'border-emerald-200 bg-emerald-50' : 'border-border bg-muted/40',
        )}>
          {portalEnabled ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <ShieldOff className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          )}
          <div className="flex-1">
            <p className={cn('text-sm font-medium', portalEnabled ? 'text-emerald-700' : 'text-muted-foreground')}>
              {portalEnabled ? 'Portal Active' : 'Portal Disabled'}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {portalEnabled
                ? 'Client can log in to view their cases'
                : 'Enable to grant client portal access'}
            </p>
          </div>
          <button
            onClick={handleTogglePortal}
            disabled={portalLoading}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50',
              portalEnabled
                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200',
            )}
          >
            {portalLoading ? '…' : portalEnabled ? 'Disable' : 'Enable'}
          </button>
        </div>

        {portalEnabled && (
          <div className="space-y-3">
            {/* Access code row */}
            <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-amber-800">Access Code</p>
                  <p className="text-[10px] text-amber-600">Share this with your client to log in</p>
                </div>
              </div>
              <button
                onClick={handleViewCode}
                className="px-3 py-1.5 text-xs font-semibold bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
              >
                View Code
              </button>
            </div>

            {/* Portal login URL */}
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-1.5">Portal Login URL</p>
              <div className="flex items-center gap-2 bg-muted/40 border border-border rounded-lg px-3 py-2">
                <ExternalLink className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                <span className="text-xs text-foreground flex-1 truncate font-mono">{portalLoginUrl}</span>
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-1 text-xs text-primary hover:opacity-80 transition-opacity flex-shrink-0"
                >
                  {copied ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Access Code Modal */}
        {showAccessCode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
              <div className="bg-amber-500 px-6 py-5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <KeyRound className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Client Access Code</h3>
                  <p className="text-xs text-amber-100">Share this with your client to access the portal</p>
                </div>
                <button onClick={() => setShowAccessCode(false)} className="ml-auto text-white/70 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-5">

                {fetchingToken ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-3">
                    <span className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs text-gray-400">Fetching access code…</p>
                  </div>
                ) : fetchTokenError ? (
                  <div className="space-y-4">
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <p className="text-sm font-semibold text-red-700 mb-1">Could not load access code</p>
                      <p className="text-xs text-red-600">{fetchTokenError}</p>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-700 space-y-1">
                      <p className="font-semibold">Try this:</p>
                      <p>1. Make sure the API server is running (<code className="font-mono bg-amber-100 px-1 rounded">cd apps/api && npm run start:dev</code>)</p>
                      <p>2. Disable and re-enable the portal to generate a fresh code</p>
                    </div>
                    <button onClick={handleViewCode} className="w-full py-2 text-sm font-semibold text-amber-700 border border-amber-300 rounded-xl hover:bg-amber-50 transition-colors">
                      Retry
                    </button>
                  </div>
                ) : (
                  <>
                    {/* The code */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Access Code</p>
                      <div className="flex items-center gap-2 bg-gray-50 border-2 border-dashed border-amber-300 rounded-xl p-3">
                        <p className="flex-1 font-mono text-xs break-all select-none">
                          {codeVisible
                            ? <span className="text-gray-900">{accessCode ?? '—'}</span>
                            : <span className="text-gray-400 blur-[3px] pointer-events-none">{codeMask || accessCode?.replace(/./g, '•') || '••••••••••••••••••••••••••••••••'}</span>
                          }
                        </p>
                        <button
                          onClick={() => setCodeVisible((v) => !v)}
                          className="p-1.5 text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0"
                          title={codeVisible ? 'Hide code' : 'Show code'}
                        >
                          {codeVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={handleCopyCode}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-lg hover:bg-amber-200 transition-colors flex-shrink-0"
                        >
                          {copiedCode ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy</>}
                        </button>
                      </div>
                    </div>

                    {/* Full link */}
                    {accessUrl && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Or share the full link</p>
                        <div className="flex items-center gap-2 bg-gray-50 border border-border rounded-xl p-3">
                          <p className="flex-1 text-xs text-gray-600 break-all font-mono">{accessUrl}</p>
                          <button
                            onClick={handleCopyFullUrl}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-gray-600 border border-border rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
                          >
                            <Copy className="w-3 h-3" /> Copy
                          </button>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1.5">This link auto-fills the access code for the client.</p>
                      </div>
                    )}
                  </>
                )}

                {/* Instructions */}
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-semibold text-blue-700">How to share with your client:</p>
                  <ol className="space-y-1.5 text-xs text-blue-600 list-decimal list-inside leading-relaxed">
                    <li>Send them the access code <span className="font-semibold">or</span> the full link above</li>
                    <li>Direct them to <span className="font-mono font-semibold">{portalLoginUrl}</span></li>
                    <li>They paste the code and click <span className="font-semibold">&ldquo;Access My Case&rdquo;</span></li>
                  </ol>
                </div>

                <button
                  onClick={() => setShowAccessCode(false)}
                  className="w-full py-2.5 text-sm font-semibold text-white bg-[#3B4ECC] rounded-xl hover:bg-[#2d3faa] transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Document Requests */}
      <div className="bg-card border border-border rounded-2xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" /> Document Requests
          </h2>
          <button
            onClick={() => setShowNewRequest(!showNewRequest)}
            className="flex items-center gap-1 text-xs text-primary hover:opacity-80 transition-opacity"
          >
            {showNewRequest ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
            {showNewRequest ? 'Cancel' : 'New Request'}
          </button>
        </div>

        {showNewRequest && (
          <form onSubmit={handleNewRequest} className="mb-4 space-y-3 p-4 bg-muted/30 rounded-xl border border-border">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Title *</label>
              <input
                type="text"
                value={reqTitle}
                onChange={(e) => setReqTitle(e.target.value)}
                required
                className="input-field text-sm"
                placeholder="e.g. Proof of income"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Description</label>
              <textarea
                value={reqDesc}
                onChange={(e) => setReqDesc(e.target.value)}
                rows={2}
                className="input-field text-sm resize-none"
                placeholder="Optional details…"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Due Date</label>
              <input
                type="date"
                value={reqDue}
                onChange={(e) => setReqDue(e.target.value)}
                className="input-field text-sm"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowNewRequest(false)}
                className="flex-1 border border-border rounded-lg py-1.5 text-xs font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !reqTitle.trim()}
                className="flex-1 bg-primary text-white rounded-lg py-1.5 text-xs font-semibold hover:opacity-90 disabled:opacity-60 transition-all"
              >
                {submitting ? 'Creating…' : 'Create Request'}
              </button>
            </div>
          </form>
        )}

        {loadingData ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : docRequests.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No document requests yet.</p>
        ) : (
          <div className="space-y-2">
            {docRequests.map((req) => (
              <div key={req.id} className="flex items-start gap-3 p-3 rounded-xl border border-border">
                <FileText className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{req.title}</p>
                  {req.description && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">{req.description}</p>
                  )}
                  {req.dueDate && (
                    <p className="text-[10px] text-muted-foreground">Due {formatDate(req.dueDate)}</p>
                  )}
                </div>
                {req.fulfilledAt ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 flex-shrink-0">
                    <Check className="w-2.5 h-2.5" /> Done
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 flex-shrink-0">
                    Pending
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Portal Messages */}
      <div className="bg-card border border-border rounded-2xl shadow-sm p-5">
        <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-primary" /> Recent Portal Messages
        </h2>
        {loadingData ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : messages.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No portal messages yet.</p>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className="flex items-start gap-2.5">
                <div className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                  msg.senderType === 'CLIENT' ? 'bg-blue-100' : 'bg-muted',
                )}>
                  <MessageCircle className={cn(
                    'w-2.5 h-2.5',
                    msg.senderType === 'CLIENT' ? 'text-blue-600' : 'text-muted-foreground',
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-medium text-foreground">
                      {msg.senderType === 'CLIENT' ? 'Client' : 'Firm'}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDate(msg.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{msg.body}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────

const AVATAR_COLORS = [
  'bg-primary', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-rose-500', 'bg-indigo-500', 'bg-teal-500', 'bg-orange-500',
];

function avatarColor(id: string) {
  const sum = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

function getInitials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const CASE_STATUS_COLORS: Record<string, string> = {
  INTAKE: 'bg-gray-100 text-gray-600',
  ACTIVE: 'bg-blue-100 text-blue-700',
  PENDING_COURT: 'bg-amber-100 text-amber-700',
  JUDGMENT: 'bg-orange-100 text-orange-700',
  APPEAL: 'bg-purple-100 text-purple-700',
  CLOSED: 'bg-emerald-100 text-emerald-700',
};

const LANG_LABELS: Record<string, string> = {
  en: 'English', es: 'Spanish', fr: 'French', zh: 'Chinese', ar: 'Arabic',
};

// ─── Edit panel ───────────────────────────────────────────

function EditClientPanel({
  client,
  onClose,
  onSaved,
}: {
  client: ReturnType<typeof useClient>['data'];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UpdateClientInput>({
    resolver: zodResolver(UpdateClientSchema),
    defaultValues: {
      firstName: client?.firstName,
      lastName: client?.lastName,
      email: client?.email,
      phone: client?.phone ?? '',
      address: client?.address ?? '',
      preferredLang: client?.preferredLang ?? 'en',
    },
  });

  const onSubmit = async (data: UpdateClientInput) => {
    if (!client) return;
    setServerError(null);
    try {
      await updateClient(client.id, data as unknown as Record<string, unknown>);
      onSaved();
      onClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setServerError(e.response?.data?.error?.message ?? 'Failed to save changes');
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-card border-l border-border shadow-2xl z-50 flex flex-col">
        <div className="px-6 py-5 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="font-bold text-foreground text-lg"
              style={{ fontFamily: 'var(--font-serif, "Playfair Display", Georgia, serif)' }}
            >
              Edit Client
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {client?.firstName} {client?.lastName}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">First Name</label>
              <input {...register('firstName')} type="text" className={cn('input-field', errors.firstName && 'border-destructive')} />
              {errors.firstName && <p className="text-destructive text-xs mt-1">{errors.firstName.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Last Name</label>
              <input {...register('lastName')} type="text" className={cn('input-field', errors.lastName && 'border-destructive')} />
              {errors.lastName && <p className="text-destructive text-xs mt-1">{errors.lastName.message}</p>}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Email Address</label>
            <input {...register('email')} type="email" className={cn('input-field', errors.email && 'border-destructive')} />
            {errors.email && <p className="text-destructive text-xs mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Phone</label>
            <input {...register('phone')} type="tel" className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Address</label>
            <input {...register('address')} type="text" className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Preferred Language</label>
            <select {...register('preferredLang')} className="input-field">
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="zh">Chinese</option>
              <option value="ar">Arabic</option>
            </select>
          </div>
          {serverError && (
            <div className="bg-destructive/5 border border-destructive/20 text-destructive text-sm rounded-xl px-4 py-3">
              {serverError}
            </div>
          )}
        </form>

        <div className="px-6 py-4 border-t border-border flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 border border-border rounded-full py-2.5 text-sm font-medium hover:bg-muted transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            className="flex-1 bg-primary text-white rounded-full py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-all"
          >
            {isSubmitting ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Main component ───────────────────────────────────────

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: client, loading, error, refetch } = useClient(id);
  const [showEditPanel, setShowEditPanel] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const handleDelete = async () => {
    await deleteClient(id);
    router.push('/clients');
  };

  const handlePortalToggle = async () => {
    if (!client) return;
    setPortalLoading(true);
    try {
      if (client.portalEnabled) {
        await disablePortal(id);
      } else {
        await enablePortal(id);
      }
      await refetch();
    } finally {
      setPortalLoading(false);
    }
  };

  // suppress unused-variable lint for portalLoading (used inline below)
  void portalLoading;

  // ── Loading state ─────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-5xl mx-auto animate-pulse space-y-6">
        <div className="h-8 bg-muted rounded w-48" />
        <div className="h-40 bg-muted rounded-2xl" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl px-5 py-4">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Could not load client</p>
            <p className="text-sm opacity-80">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const color = avatarColor(client.id);

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Back */}
      <Link
        href="/clients"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> All Clients
      </Link>

      {/* Profile header */}
      <div className="bg-card border border-border rounded-2xl shadow-sm p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-5">
            {/* Avatar */}
            <div className={cn(
              'w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-xl flex-shrink-0',
              color,
            )}>
              {getInitials(client.firstName, client.lastName)}
            </div>

            {/* Name + meta */}
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                {client.portalEnabled && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                    <Shield className="w-2.5 h-2.5" /> Portal Enabled
                  </span>
                )}
                <span className={cn(
                  'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                  client._count.cases > 0
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-gray-100 text-gray-500',
                )}>
                  {client._count.cases > 0 ? 'Active' : 'New'}
                </span>
              </div>
              <h1
                className="text-2xl font-bold text-foreground"
                style={{ fontFamily: 'var(--font-serif, "Playfair Display", Georgia, serif)' }}
              >
                {client.firstName} {client.lastName}
              </h1>
              <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Mail className="w-3.5 h-3.5" /> {client.email}
                </span>
                {client.phone && (
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Phone className="w-3.5 h-3.5" /> {client.phone}
                  </span>
                )}
                {client.address && (
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5" /> {client.address}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handlePortalToggle}
              disabled={portalLoading}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all',
                client.portalEnabled
                  ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                  : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100',
                'disabled:opacity-50',
              )}
            >
              {client.portalEnabled
                ? <><ShieldOff className="w-3 h-3" /> Disable Portal</>
                : <><Shield className="w-3 h-3" /> Enable Portal</>
              }
            </button>
            <button
              onClick={() => setShowEditPanel(true)}
              className="p-2 rounded-xl border border-border hover:bg-muted transition-colors text-muted-foreground"
              title="Edit client"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDeleteConfirm(true)}
              className="p-2 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground border border-border"
              title="Delete client"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-border">
          {[
            { icon: Briefcase, label: 'Cases', value: client._count.cases },
            { icon: Scale, label: 'Documents', value: client._count.documents },
            { icon: Globe, label: 'Language', value: LANG_LABELS[client.preferredLang] ?? client.preferredLang },
            { icon: Calendar, label: 'Client Since', value: formatDate(client.createdAt) },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <Icon className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm font-semibold text-foreground">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: Cases */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-card border border-border rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <Scale className="w-4 h-4 text-primary" />
                Cases ({client._count.cases})
              </h2>
            </div>

            {client.cases.length === 0 ? (
              <div className="text-center py-10">
                <Briefcase className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No cases linked to this client</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Link cases from the case detail page
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {client.cases.map(({ case: c }) => (
                  <Link
                    key={c.id}
                    href={`/cases/${c.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/30 hover:bg-muted/40 transition-all group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Scale className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                        {c.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-mono text-muted-foreground">{c.internalRef}</span>
                        <span className="text-muted-foreground/40">·</span>
                        <span className="text-xs text-muted-foreground">
                          {CASE_TYPE_LABELS[c.caseType] ?? c.caseType}
                        </span>
                        <span className="text-muted-foreground/40">·</span>
                        <span className="text-xs text-muted-foreground">
                          Opened {formatDate(c.openDate)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={cn(
                        'text-[10px] font-semibold px-2.5 py-1 rounded-full',
                        CASE_STATUS_COLORS[c.status] ?? 'bg-gray-100 text-gray-600',
                      )}>
                        {CASE_STATUS_LABELS[c.status] ?? c.status}
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Contact info + Portal Management */}
        <div className="space-y-4">

          {/* Contact details card */}
          <div className="bg-card border border-border rounded-2xl shadow-sm p-5">
            <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <User2 className="w-4 h-4 text-primary" /> Contact Info
            </h2>
            <div className="space-y-3">
              {[
                { icon: Mail, label: 'Email', value: client.email },
                { icon: Phone, label: 'Phone', value: client.phone },
                { icon: MapPin, label: 'Address', value: client.address },
                { icon: Globe, label: 'Language', value: LANG_LABELS[client.preferredLang] ?? client.preferredLang },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3">
                  <Icon className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">{label}</p>
                    <p className={cn('text-sm', !value && 'text-muted-foreground/40')}>
                      {value || '—'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Portal Management */}
          <PortalManagementSection
            clientId={client.id}
            portalEnabled={client.portalEnabled}
            onRefetch={refetch}
          />

          {/* Dates */}
          <div className="bg-card border border-border rounded-2xl shadow-sm p-5">
            <h2 className="font-semibold text-foreground mb-3 text-sm">Timeline</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground text-xs">Added</span>
                <span className="font-medium text-xs">{formatDate(client.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-xs">Last updated</span>
                <span className="font-medium text-xs">{formatDate(client.updatedAt)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit panel */}
      {showEditPanel && (
        <EditClientPanel
          client={client}
          onClose={() => setShowEditPanel(false)}
          onSaved={refetch}
        />
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-border">
            <h3 className="font-bold text-foreground mb-2">Delete client?</h3>
            <p className="text-sm text-muted-foreground mb-5">
              This will remove <strong>{client.firstName} {client.lastName}</strong> from your firm. Their case history will be preserved.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="flex-1 border border-border rounded-xl py-2 text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 bg-destructive text-white rounded-xl py-2 text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
