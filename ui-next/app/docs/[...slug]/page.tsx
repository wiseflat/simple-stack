import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { docs, getDocPage } from "@/lib/docs/source";
import DocsArticle from "@/components/marketing/docs-article";

type DocsPageProps = {
  params: Promise<{ slug?: string[] }>;
};

export async function generateStaticParams() {
  return docs.map((doc) => ({ slug: [doc.slug] }));
}

export async function generateMetadata({ params }: DocsPageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await getDocPage(slug);

  if (!page) {
    return {
      title: "Documentation",
    };
  }

  return {
    title: `${page.entry.title} | Simple Stack Docs`,
    description: page.entry.description,
  };
}

export default async function DocsCatchAllPage({ params }: DocsPageProps) {
  const { slug } = await params;
  const page = await getDocPage(slug);

  if (!page) notFound();

  const { entry, Content } = page;

  return (
    <DocsArticle title={entry.title} description={entry.description} Content={Content} />
  );
}
