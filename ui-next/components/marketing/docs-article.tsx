import type { ComponentType } from "react";
import DocsTocNav from "@/components/marketing/docs-toc-nav";

type DocsArticleProps = {
  title: string;
  description: string;
  Content: ComponentType<Record<string, never>>;
};

export default function DocsArticle({ title, description, Content }: DocsArticleProps) {
  const layoutClass = "w-full space-y-6 md:grid md:grid-cols-[minmax(0,1fr)_220px] md:items-stretch md:gap-8 md:space-y-0";

  return (
    <div className={layoutClass}>
      <DocsTocNav contentRootId="docs-content-root" mobileOnly />

      <article id="docs-content-root" className="min-w-0 w-full flex-1 rounded-[1.75rem] border border-zinc-200 bg-white px-6 py-8 dark:border-zinc-800 dark:bg-zinc-950 sm:px-8 sm:py-10">
        <header className="mb-8 border-b border-zinc-200 pb-6 dark:border-zinc-800">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">{title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-600 dark:text-zinc-400">{description}</p>
        </header>

        <div className="prose prose-zinc max-w-none dark:prose-invert prose-headings:tracking-tight prose-headings:text-zinc-900 dark:prose-headings:text-zinc-100 prose-p:text-zinc-700 dark:prose-p:text-zinc-300 prose-li:text-zinc-700 dark:prose-li:text-zinc-300">
          <Content />
        </div>
      </article>

      <DocsTocNav contentRootId="docs-content-root" desktopOnly />
    </div>
  );
}
