import type { MDXComponents } from "mdx/types";
import DocsCopyableCodeBlock from "@/components/marketing/docs-copyable-code-block";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    pre: (props) => <DocsCopyableCodeBlock {...props} />,
  };
}
