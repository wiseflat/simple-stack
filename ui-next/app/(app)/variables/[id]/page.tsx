type Props = { params: Promise<{ id: string }> };

export default async function VariableDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <section className="space-y-2">
      <h2 className="text-2xl font-semibold">Variable detail</h2>
      <p className="text-sm text-zinc-500">Editing view for variable ID: {id}</p>
    </section>
  );
}
