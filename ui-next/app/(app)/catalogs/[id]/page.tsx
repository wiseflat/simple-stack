type Props = { params: Promise<{ id: string }> };

export default async function CatalogDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <section className="space-y-2">
      <h2 className="text-2xl font-semibold">Catalog detail</h2>
      <p className="text-sm text-zinc-500">Editing view for catalog ID: {id}</p>
    </section>
  );
}
