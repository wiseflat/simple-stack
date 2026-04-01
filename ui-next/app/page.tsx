import Link from "next/link";
import { ArrowRight, BookCopy, Boxes, Layers3, Network, Rocket, ShieldCheck, Workflow } from "lucide-react";
import PublicShell from "@/components/marketing/public-shell";

const productSignals = [
  { label: "Single source of truth", value: "Infra + catalogs + operations" },
  { label: "Documentation branch", value: "/docs with markdown workflow" },
  { label: "Runtime model", value: "Public docs, private operations" },
];

const featureCards = [
  {
    title: "Infrastructures",
    description: "Describe projects, providers and execution flows from a single documentation surface.",
    href: "/docs/infrastructures",
    icon: Network,
  },
  {
    title: "Catalogs",
    description: "Document your reusable building blocks, templates and forkable services.",
    href: "/docs/catalogs",
    icon: BookCopy,
  },
  {
    title: "Softwares",
    description: "Explain deployment rules, lifecycle operations and day-two actions for services.",
    href: "/docs/softwares",
    icon: Boxes,
  },
];

const productPillars = [
  {
    title: "Operational clarity",
    description: "Move vocabulary, workflows and safety notes next to the product instead of scattering them across external docs.",
    icon: ShieldCheck,
  },
  {
    title: "Composable stack model",
    description: "Treat infrastructures, catalogs and softwares as connected concepts that can be explained and operated together.",
    icon: Layers3,
  },
  {
    title: "From docs to action",
    description: "Let public documentation guide users toward the authenticated application without duplicating the mental model.",
    icon: Workflow,
  },
];

export default function HomePage() {
  return (
    <PublicShell showSidebar={false}>
      <div className="space-y-14">
        <section className="overflow-hidden rounded-[2rem] border border-zinc-200 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.14),_transparent_32%),linear-gradient(135deg,#ffffff_0%,#f5f5f4_46%,#ecfdf5_100%)] px-8 py-10 shadow-sm dark:border-zinc-800 dark:bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.14),_transparent_32%),linear-gradient(135deg,#09090b_0%,#111827_58%,#052e16_100%)] dark:shadow-none sm:px-10 sm:py-14">
          <div className="max-w-4xl space-y-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-emerald-700 dark:border-emerald-900 dark:bg-zinc-900/80 dark:text-emerald-300">
                <Rocket className="h-3.5 w-3.5" />
                Public product surface
              </div>
              <div className="space-y-4">
                <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl xl:text-6xl dark:text-zinc-50">
                  Run the stack. Explain the stack. Keep both in the same product surface.
                </h1>
                <p className="max-w-3xl text-base leading-8 text-zinc-600 dark:text-zinc-300">
                  Simple Stack now exposes a public-facing landing page and a structured `/docs` branch, so infrastructure knowledge, deployment conventions and operational workflows can live next to the application instead of around it.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/docs"
                  className="inline-flex items-center gap-2 rounded-md bg-zinc-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-300"
                >
                  Browse documentation
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/dashboard"
                  className="rounded-md border border-zinc-300 bg-white px-5 py-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  Open application
                </Link>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {productSignals.map((signal) => (
                  <div key={signal.label} className="rounded-2xl border border-white/70 bg-white/70 px-4 py-4 backdrop-blur dark:border-white/10 dark:bg-zinc-950/40">
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">{signal.label}</p>
                    <p className="mt-2 text-sm font-medium leading-6 text-zinc-950 dark:text-zinc-50">{signal.value}</p>
                  </div>
                ))}
              </div>
            </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {featureCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.title}
                href={card.href}
                className="group rounded-2xl border border-zinc-200 bg-white p-6 transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
              >
                <div className="mb-4 inline-flex rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">{card.title}</h2>
                <p className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-400">{card.description}</p>
                <p className="mt-4 text-sm font-medium text-emerald-700 dark:text-emerald-300">Read section</p>
              </Link>
            );
          })}
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {productPillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div key={pillar.title} className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
                <div className="inline-flex rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="mt-5 text-lg font-semibold text-zinc-950 dark:text-zinc-50">{pillar.title}</h2>
                <p className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-400">{pillar.description}</p>
              </div>
            );
          })}
        </section>

        <section className="rounded-[2rem] border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="grid gap-8 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="space-y-3">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">Workflow</p>
              <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">A simple narrative from discovery to execution.</h2>
              <p className="text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                The public site should explain the model first, then hand users over to the product with the same conceptual structure they already saw in the documentation.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">01</p>
                <h3 className="mt-3 text-base font-semibold">Discover</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">Use the landing page to understand the scope, the vocabulary and the product split.</p>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">02</p>
                <h3 className="mt-3 text-base font-semibold">Learn</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">Move into `/docs` to read structured markdown pages and operational guidance.</p>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">03</p>
                <h3 className="mt-3 text-base font-semibold">Operate</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">Open the authenticated application with the same concepts already established in the docs.</p>
              </div>
            </div>
          </div>
        </section>

      </div>
    </PublicShell>
  );
}
