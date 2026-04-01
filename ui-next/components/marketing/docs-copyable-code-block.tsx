"use client";

import { Check, Copy } from "lucide-react";
import {
  isValidElement,
  useMemo,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";

type CopyableCodeBlockProps = ComponentPropsWithoutRef<"pre">;

function extractText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(extractText).join("");
  }

  if (isValidElement(node)) {
    return extractText((node.props as { children?: ReactNode }).children);
  }

  return "";
}

export default function DocsCopyableCodeBlock({
  children,
  className,
  ...props
}: CopyableCodeBlockProps) {
  const [isCopied, setIsCopied] = useState(false);

  const codeText = useMemo(() => extractText(children).replace(/\n$/, ""), [children]);

  async function handleCopy() {
    if (!codeText) return;

    try {
      await navigator.clipboard.writeText(codeText);
      setIsCopied(true);
      window.setTimeout(() => setIsCopied(false), 1200);
    } catch {
      setIsCopied(false);
    }
  }

  return (
    <div className="relative my-5 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-950 text-zinc-100 dark:border-zinc-700">
      <button
        type="button"
        onClick={handleCopy}
        className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-md border border-zinc-600 bg-zinc-900 px-2.5 py-1 text-xs font-medium text-zinc-100 transition hover:bg-zinc-800"
        aria-label={isCopied ? "Code copied" : "Copy code"}
        title={isCopied ? "Code copied" : "Copy code"}
      >
        {isCopied ? <Check size={14} /> : <Copy size={14} />}
        {isCopied ? "Copied" : "Copy"}
      </button>
      <pre {...props} className={["overflow-x-auto p-4 pt-12 text-sm leading-6", className].filter(Boolean).join(" ")}>
        {children}
      </pre>
    </div>
  );
}
