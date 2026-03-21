export default function CaseTimelinePage({ params }: { params: { id: string } }) {
  return (
    <div className="bg-white rounded-xl border p-8 text-center text-gray-400">
      Timeline for case {params.id} — TODO: ActivityTimeline component
    </div>
  );
}
