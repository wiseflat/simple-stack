"use client";

import { useEffect, useMemo, useState } from "react";

type TocItem = {
  id: string;
  title: string;
  level: 2 | 3;
};

type DocsTocNavProps = {
  contentRootId: string;
  mobileOnly?: boolean;
  desktopOnly?: boolean;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function DocsTocNav({ contentRootId, mobileOnly = false, desktopOnly = false }: DocsTocNavProps) {
  const [items, setItems] = useState<TocItem[]>([]);

  useEffect(() => {
    const root = document.getElementById(contentRootId);
    if (!root) return;

    const headings = Array.from(root.querySelectorAll("h2, h3")) as HTMLHeadingElement[];
    const usedIds = new Set<string>();

    const toc = headings
      .map((heading) => {
        const title = heading.textContent?.trim() ?? "";
        if (!title) return null;

        const level = heading.tagName.toLowerCase() === "h2" ? 2 : 3;
        const id = heading.id || slugify(title);

        if (!id) return null;

        let finalId = id;
        let suffix = 2;
        while (usedIds.has(finalId)) {
          finalId = `${id}-${suffix}`;
          suffix += 1;
        }
        usedIds.add(finalId);

        if (!heading.id) {
          heading.id = finalId;
        }

        return {
          id: finalId,
          title,
          level,
        } as TocItem;
      })
      .filter((item): item is TocItem => item !== null);

    setItems(toc);
  }, [contentRootId]);

  const hasItems = useMemo(() => items.length > 0, [items]);
  if (!hasItems) return null;

  const primaryItems = items.filter((item) => item.level === 2);
  if (primaryItems.length === 0) return null;

  const list = (
    <ul className="space-y-1.5 text-sm text-zinc-600 dark:text-zinc-300">
      {primaryItems.map((item) => (
        <li key={item.id}>
          <a
            href={`#${item.id}`}
            className="block rounded-md px-2 py-1.5 transition-colors hover:bg-zinc-100 hover:text-zinc-950 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
          >
            {item.title}
          </a>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      {!desktopOnly ? (
        <details className="rounded-[1.25rem] border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950 md:hidden">
          <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">
            On this page
          </summary>
          <nav className="mt-3">{list}</nav>
        </details>
      ) : null}

      {!mobileOnly ? (
        <aside className="max-md:hidden">
          <div className="md:sticky md:top-24 w-[220px] max-h-[calc(100vh-7rem)] overflow-auto rounded-[1.25rem] border border-zinc-300 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900/80">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">On this page</p>
            <nav className="mt-3">{list}</nav>
          </div>
        </aside>
      ) : null}
    </>
  );
}
