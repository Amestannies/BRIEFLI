export default function CaseDocumentsPage({ params }: { params: { id: string } }) {
  return (
    <div className="bg-white rounded-xl border p-8 text-center text-gray-400">
      Document vault for case {params.id} — TODO: DocumentVault component
    </div>
  );
}
