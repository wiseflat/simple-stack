type Props = { params: Promise<{ id: string }> };

export default async function SoftwareDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <section className="space-y-2">
      <h2 className="text-2xl font-semibold">Software detail</h2>
      <p className="text-sm text-zinc-500">Editing view for software ID: {id}</p>
    </section>
  );
}
