import { notFound } from "next/navigation";
import { getDocPage } from "@/lib/docs/source";
import DocsArticle from "@/components/marketing/docs-article";

export default async function DocsIndexPage() {
  const page = await getDocPage();
  if (!page) notFound();

  const { entry, Content } = page;

  return (
    <DocsArticle title={entry.title} description={entry.description} Content={Content} />
  );
}
