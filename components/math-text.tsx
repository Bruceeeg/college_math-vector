import type { ReactNode } from "react";

import { VECTOR_COLOR } from "@/lib/colors";

const COLORS: Record<string, string> = {
  u: VECTOR_COLOR.u,
  v: VECTOR_COLOR.v,
  n: VECTOR_COLOR.n,
  s: VECTOR_COLOR.s,
};

export function MathText({ text }: { text: string }) {
  const pattern = /(n\u0302|s\u0302)|(?<![A-Za-z\u0302])([uvns])(?![A-Za-z\u0302])/gu;
  const nodes: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > last) nodes.push(text.slice(last, index));
    const token = match[0];
    const key = token.startsWith("n") ? "n" : token.startsWith("s") ? "s" : token;
    nodes.push(
      <span key={`${index}-${token}`} style={{ color: COLORS[key] }}>
        {token}
      </span>,
    );
    last = index + token.length;
  }
  if (last === 0) return text;
  if (last < text.length) nodes.push(text.slice(last));
  return <>{nodes}</>;
}
