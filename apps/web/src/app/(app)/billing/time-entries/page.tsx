'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Clock, Play, Square, Plus, Trash2, Filter, X, Check } from 'lucide-react';
import { useTimeEntries, createTimeEntry, deleteTimeEntry, type TimeEntry, type CreateTimeEntryInput } from '@/hooks/useBilling';
import { api } from '@/lib/api';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);
}

function fmtDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtTimer(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ─── Case selector ────────────────────────────────────────────────────────────

interface CaseOption { id: string; title: string; internalRef: string; }

function useCaseOptions() {
  const [cases, setCases] = useState<CaseOption[]>([]);
  useEffect(() => {
    api.get<CaseOption[]>('/cases?limit=100').then((r: { data: CaseOption[] }) => setCases(r.data)).catch(() => {});
  }, []);
  return cases;
}

// ─── Log Time Panel ───────────────────────────────────────────────────────────

interface LogTimePanelProps {
  cases: CaseOption[];
  onSaved: () => void;
  onClose: () => void;
  prefillMinutes?: number;
  prefillCaseId?: string;
}

function LogTimePanel({ cases, onSaved, onClose, prefillMinutes, prefillCaseId }: LogTimePanelProps) {
  const [caseId, setCaseId] = useState(prefillCaseId ?? '');
  const [description, setDescription] = useState('');
  const [hours, setHours] = useState(prefillMinutes ? String(Math.floor(prefillMinutes / 60)) : '0');
  const [minutes, setMinutes] = useState(prefillMinutes ? String(prefillMinutes % 60) : '30');
  const [rate, setRate] = useState('290');
  const [billable, setBillable] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  async function handleSave() {
    if (!caseId || !description.trim()) { setErr('Case and description are required'); return; }
    const durationMinutes = parseInt(hours) * 60 + parseInt(minutes);
    if (durationMinutes <= 0) { setErr('Duration must be greater than 0'); return; }
    setSaving(true);
    setErr('');
    try {
      await createTimeEntry({ caseId, description, durationMinutes, hourlyRate: Number(rate), isBillable: billable, date });
      onSaved();
    } catch {
      setErr('Failed to save time entry');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-md bg-white shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-semibold text-[#121845]">Log Time</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {err && <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{err}</div>}

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Case *</label>
            <select
              value={caseId}
              onChange={(e) => setCaseId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B4ECC]/20 focus:border-[#3B4ECC]"
            >
              <option value="">Select a case…</option>
              {cases.map((c) => (
                <option key={c.id} value={c.id}>{c.internalRef} — {c.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Description *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="What did you work on?"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#3B4ECC]/20 focus:border-[#3B4ECC]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Hours</label>
              <input type="number" min="0" max="23" value={hours} onChange={(e) => setHours(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B4ECC]/20 focus:border-[#3B4ECC]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Minutes</label>
              <input type="number" min="0" max="59" value={minutes} onChange={(e) => setMinutes(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B4ECC]/20 focus:border-[#3B4ECC]" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Hourly Rate ($)</label>
              <input type="number" min="0" value={rate} onChange={(e) => setRate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B4ECC]/20 focus:border-[#3B4ECC]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B4ECC]/20 focus:border-[#3B4ECC]" />
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <button
              type="button"
              onClick={() => setBillable(!billable)}
              className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${billable ? 'bg-[#3B4ECC]' : 'border-2 border-gray-300 bg-white'}`}
            >
              {billable && <Check size={12} className="text-white" />}
            </button>
            <span className="text-sm text-gray-700">Mark as billable</span>
          </label>

          {caseId && description && (
            <div className="bg-[#EEF1FB] rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Estimated total</p>
              <p className="text-xl font-bold text-[#3B4ECC]">
                {fmt(((parseInt(hours) * 60 + parseInt(minutes || '0')) / 60) * Number(rate))}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {fmtDuration(parseInt(hours) * 60 + parseInt(minutes || '0'))} @ ${rate}/hr
              </p>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-[#3B4ECC] rounded-lg hover:bg-[#2d3db0] disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Entry'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Live Timer ───────────────────────────────────────────────────────────────

interface LiveTimerProps { cases: CaseOption[]; onSaved: () => void; }

function LiveTimer({ cases, onSaved }: LiveTimerProps) {
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [caseId, setCaseId] = useState('');
  const [desc, setDesc] = useState('');
  const [showSave, setShowSave] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  function stop() {
    setRunning(false);
    if (seconds > 0) setShowSave(true);
  }

  function discard() {
    setSeconds(0);
    setShowSave(false);
    setDesc('');
    setCaseId('');
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-[#121845]">Live Timer</h2>
          {running && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              Recording
            </span>
          )}
        </div>
        <div className="text-5xl font-mono font-bold text-[#121845] text-center my-4 tabular-nums">
          {fmtTimer(seconds)}
        </div>
        <div className="flex gap-3 mb-4">
          <select
            value={caseId}
            onChange={(e) => setCaseId(e.target.value)}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B4ECC]/20 focus:border-[#3B4ECC]"
          >
            <option value="">Select case…</option>
            {cases.map((c) => <option key={c.id} value={c.id}>{c.internalRef} — {c.title}</option>)}
          </select>
          <input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="What are you working on?"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B4ECC]/20 focus:border-[#3B4ECC]"
          />
        </div>
        <div className="flex justify-center gap-3">
          {!running ? (
            <button
              onClick={() => setRunning(true)}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-[#3B4ECC] rounded-full hover:bg-[#2d3db0] transition-colors"
            >
              <Play size={15} fill="white" /> Start Timer
            </button>
          ) : (
            <button
              onClick={stop}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-full hover:bg-red-700 transition-colors"
            >
              <Square size={15} fill="white" /> Stop
            </button>
          )}
        </div>
      </div>

      {showSave && (
        <LogTimePanel
          cases={cases}
          prefillMinutes={Math.ceil(seconds / 60)}
          prefillCaseId={caseId}
          onSaved={() => { setShowSave(false); discard(); onSaved(); }}
          onClose={() => { setShowSave(false); discard(); }}
        />
      )}
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TimeEntriesPage() {
  const [showLog, setShowLog] = useState(false);
  const [filterBillable, setFilterBillable] = useState<'all' | 'billable' | 'unbilled'>('all');
  const [deleting, setDeleting] = useState<string | null>(null);
  const cases = useCaseOptions();

  const filters = {
    ...(filterBillable === 'billable' && { billable: 'true' as const }),
    ...(filterBillable === 'unbilled' && { billable: 'true' as const }),
  };
  const { entries, loading, error, refetch } = useTimeEntries(filters);

  const visibleEntries = filterBillable === 'unbilled'
    ? entries.filter((e) => !e.invoiceId)
    : entries;

  async function handleDelete(id: string) {
    setDeleting(id);
    try { await deleteTimeEntry(id); refetch(); } catch { /* ignore */ } finally { setDeleting(null); }
  }

  const totalHours = visibleEntries.reduce((acc, e) => acc + e.durationMinutes / 60, 0);
  const totalValue = visibleEntries.reduce((acc, e) => acc + (e.durationMinutes / 60) * Number(e.hourlyRate), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#121845]" style={{ fontFamily: 'Playfair Display, serif' }}>
            Time Entries
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {visibleEntries.length} entries · {totalHours.toFixed(1)}h · {fmt(totalValue)}
          </p>
        </div>
        <button
          onClick={() => setShowLog(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#3B4ECC] rounded-lg hover:bg-[#2d3db0] transition-colors"
        >
          <Plus size={15} /> Log Time
        </button>
      </div>

      {/* Live Timer */}
      <LiveTimer cases={cases} onSaved={refetch} />

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Filter size={14} className="text-gray-400" />
        {(['all', 'billable', 'unbilled'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilterBillable(f)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full capitalize transition-colors ${
              filterBillable === f ? 'bg-[#3B4ECC] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f === 'unbilled' ? 'Unbilled Only' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Entries List */}
      {error ? (
        <div className="bg-red-50 text-red-600 text-sm rounded-xl p-4">{error}</div>
      ) : loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
              <div className="w-9 h-9 rounded-xl bg-gray-100" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-gray-100 rounded w-3/4" />
                <div className="h-3 bg-gray-50 rounded w-1/2" />
              </div>
              <div className="w-16 h-4 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      ) : visibleEntries.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="w-12 h-12 bg-[#EEF1FB] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Clock size={22} className="text-[#3B4ECC]" />
          </div>
          <p className="text-gray-500 text-sm">No time entries yet. Start the timer or log time manually.</p>
          <button onClick={() => setShowLog(true)} className="mt-4 text-[#3B4ECC] text-sm font-medium hover:underline">
            + Log first entry
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-50">
            {visibleEntries.map((entry) => {
              const hrs = (entry.durationMinutes / 60).toFixed(1);
              const total = ((entry.durationMinutes / 60) * Number(entry.hourlyRate)).toFixed(2);
              return (
                <div key={entry.id} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 group">
                  <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${entry.invoiceId ? 'bg-green-50' : entry.isBillable ? 'bg-[#EEF1FB]' : 'bg-gray-100'}`}>
                    <Clock size={15} className={entry.invoiceId ? 'text-green-600' : entry.isBillable ? 'text-[#3B4ECC]' : 'text-gray-400'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{entry.description}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {entry.case?.internalRef ? `${entry.case.internalRef} · ` : ''}
                      {entry.user.firstName} {entry.user.lastName} · {fmtDate(entry.date)}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      {!entry.isBillable && (
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Non-billable</span>
                      )}
                      {entry.invoiceId && (
                        <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full">Invoiced</span>
                      )}
                      {entry.isBillable && !entry.invoiceId && (
                        <span className="text-xs text-[#3B4ECC] bg-[#EEF1FB] px-2 py-0.5 rounded-full">Unbilled</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-gray-900">{fmt(Number(total))}</p>
                    <p className="text-xs text-gray-400">{hrs}h @ ${entry.hourlyRate}/hr</p>
                  </div>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    disabled={deleting === entry.id}
                    className="opacity-0 group-hover:opacity-100 ml-1 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showLog && (
        <LogTimePanel
          cases={cases}
          onSaved={() => { setShowLog(false); refetch(); }}
          onClose={() => setShowLog(false)}
        />
      )}
    </div>
  );
}
