type Props = { params: Promise<{ id: string }> };

export default async function UserDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <section className="space-y-2">
      <h2 className="text-2xl font-semibold">User detail</h2>
      <p className="text-sm text-zinc-500">Editing view for user ID: {id}</p>
    </section>
  );
}
