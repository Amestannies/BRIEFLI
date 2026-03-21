export default function CaseBillingPage({ params }: { params: { id: string } }) {
  return (
    <div className="bg-white rounded-xl border p-8 text-center text-gray-400">
      Billing for case {params.id} — TODO: TimeTracker + InvoiceBuilder
    </div>
  );
}
