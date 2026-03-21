'use client';

import { useState } from 'react';
import { Bell, CheckCircle, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

interface NotifGroup {
  label: string;
  items: { key: string; label: string; desc: string }[];
}

const NOTIF_GROUPS: NotifGroup[] = [
  {
    label: 'Cases',
    items: [
      { key: 'case_assigned', label: 'Case assigned to me', desc: 'When a case is assigned to you by a colleague.' },
      { key: 'case_status', label: 'Case status changes', desc: 'When a case status is updated.' },
      { key: 'deadline_due', label: 'Upcoming deadlines', desc: '24 hours before a deadline or court date.' },
    ],
  },
  {
    label: 'Billing',
    items: [
      { key: 'invoice_paid', label: 'Invoice paid', desc: 'When a client pays an invoice via Stripe or PayPal.' },
      { key: 'invoice_overdue', label: 'Invoice overdue', desc: 'When an invoice passes its due date unpaid.' },
    ],
  },
  {
    label: 'Client Portal',
    items: [
      { key: 'portal_message', label: 'New client message', desc: 'When a client sends you a message in the portal.' },
      { key: 'portal_document', label: 'Client document uploaded', desc: 'When a client uploads a requested document.' },
      { key: 'meeting_request', label: 'Meeting request', desc: 'When a client requests a meeting.' },
    ],
  },
  {
    label: 'eCourts',
    items: [
      { key: 'ecourts_new', label: 'New eCourts notification', desc: 'When a new notification is fetched from NY eCourts.' },
      { key: 'ecourts_hearing', label: 'Upcoming court hearing', desc: '48 hours before a court hearing from eCourts.' },
    ],
  },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-[#3B4ECC]' : 'bg-gray-200'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  );
}

export default function NotificationsPage() {
  const [saved, setSaved] = useState(false);
  const [prefs, setPrefs] = useState<Record<string, boolean>>(() => {
    // Default all to true
    const defaults: Record<string, boolean> = {};
    NOTIF_GROUPS.forEach((g) => g.items.forEach((i) => { defaults[i.key] = true; }));
    return defaults;
  });

  function toggle(key: string) {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
  }

  function handleSave() {
    // In production this would call PATCH /users/me/notifications
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/settings" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500">Choose what alerts you receive by email.</p>
        </div>
      </div>

      {saved && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl p-3.5 text-sm text-green-700">
          <CheckCircle className="w-4 h-4 flex-shrink-0" /> Notification preferences saved.
        </div>
      )}

      {NOTIF_GROUPS.map((group) => (
        <div key={group.label} className="bg-white border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-gray-50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <Bell className="w-3.5 h-3.5" /> {group.label}
            </p>
          </div>
          <div className="divide-y divide-border">
            {group.items.map((item) => (
              <div key={item.key} className="flex items-center justify-between px-5 py-4 gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{item.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                </div>
                <Toggle checked={prefs[item.key] ?? true} onChange={(v) => toggle(item.key)} />
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            const allOff: Record<string, boolean> = {};
            NOTIF_GROUPS.forEach((g) => g.items.forEach((i) => { allOff[i.key] = false; }));
            setPrefs(allOff);
          }}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Turn off all
        </button>
        <button onClick={handleSave}
          className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-[#3B4ECC] rounded-lg hover:bg-[#2d3faa] transition-colors">
          Save Preferences
        </button>
      </div>
    </div>
  );
}
