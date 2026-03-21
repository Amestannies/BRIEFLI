import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Billing Reports — Briefli' };

export default function BillingReportsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Billing Reports</h1>
      <div className="bg-white rounded-xl border p-8 text-center text-gray-400">Reports will load here</div>
    </div>
  );
}
