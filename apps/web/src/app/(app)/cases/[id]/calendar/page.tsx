export default function CaseCalendarPage({ params }: { params: { id: string } }) {
  return (
    <div className="bg-white rounded-xl border p-8 text-center text-gray-400">
      Calendar for case {params.id} — TODO: CalendarView component
    </div>
  );
}
