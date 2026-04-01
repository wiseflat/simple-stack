import type { ComponentType } from "react";
import type * as PageTree from "fumadocs-core/page-tree";

type DocModule = {
  default: ComponentType<Record<string, never>>;
};

export type DocGroup = "Documentation" | "Core domains" | "Platform";

export type DocEntry = {
  slug: string;
  title: string;
  description: string;
  group: DocGroup;
  badge?: string;
  load: () => Promise<DocModule>;
};

export const docs: DocEntry[] = [
  {
    slug: "intro",
    title: "Getting started",
    description: "Platform overview, goals and the shape of the product.",
    group: "Documentation",
    badge: "Start",
    load: () => import("@/content/docs/intro.mdx"),
  },
  {
    slug: "installation",
    title: "Installation",
    description: "Local setup with Docker Compose, first infrastructure, and initial deployments.",
    group: "Documentation",
    badge: "Setup",
    load: () => import("@/content/docs/installation.mdx"),
  },
  {
    slug: "infrastructures",
    title: "Infrastructures",
    description: "Model infrastructure resources, execution, lifecycle and inventory concepts.",
    group: "Core domains",
    badge: "Ops",
    load: () => import("@/content/docs/infrastructures.mdx"),
  },
  {
    slug: "catalogs",
    title: "Catalogs",
    description: "Describe reusable catalog items, origins, forks and service templates.",
    group: "Core domains",
    badge: "Model",
    load: () => import("@/content/docs/catalogs.mdx"),
  },
  {
    slug: "softwares",
    title: "Softwares",
    description: "Document service deployments, settings, secrets and operational actions.",
    group: "Core domains",
    badge: "Deploy",
    load: () => import("@/content/docs/softwares.mdx"),
  },
  {
    slug: "profile",
    title: "Profile",
    description: "Manage your personal account settings, identity, language and authentication preferences.",
    group: "Platform",
    badge: "Me",
    load: () => import("@/content/docs/profile.mdx"),
  },
  {
    slug: "users",
    title: "Users",
    description: "Create and manage team member accounts, permissions, and access control.",
    group: "Platform",
    badge: "Team",
    load: () => import("@/content/docs/users.mdx"),
  },
  {
    slug: "api-interne",
    title: "API interne",
    description: "Reference internal endpoints, contracts, auth scopes and expected payloads.",
    group: "Platform",
    badge: "API",
    load: () => import("@/content/docs/api-interne.mdx"),
  },
  {
    slug: "events",
    title: "Events",
    description: "Track system events, execution timelines and integration hooks.",
    group: "Platform",
    badge: "Stream",
    load: () => import("@/content/docs/events.mdx"),
  },
  {
    slug: "settings",
    title: "Settings",
    description: "Centralize global configuration, providers, defaults and guardrails.",
    group: "Platform",
    badge: "Admin",
    load: () => import("@/content/docs/settings.mdx"),
  },
];

export const groupedDocs = ["Documentation", "Core domains", "Platform"].map((group) => ({
  group: group as DocGroup,
  items: docs.filter((doc) => doc.group === group),
}));

export const docsTree: PageTree.Root = {
  name: "",
  children: groupedDocs.map((section) => ({
    type: "folder",
    name: section.group,
    defaultOpen: true,
    children: section.items.map((doc) => ({
      type: "page",
      name: doc.title,
      url: `/docs/${doc.slug}`,
      description: doc.description,
    })),
  })),
};

export async function getDocPage(slugParts?: string[]) {
  const slug = slugParts?.length ? slugParts.join("/") : "intro";
  if (slugParts && slugParts.length > 1) return null;

  const entry = docs.find((doc) => doc.slug === slug);
  if (!entry) return null;

  const loadedDoc = await entry.load();

  return {
    entry,
    Content: loadedDoc.default,
  };
}
