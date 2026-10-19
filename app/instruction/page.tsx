import type { Metadata } from "next";

import { SiteHeader } from "@/components/site-header";
import { INSTRUCTION_PARAGRAPHS, instructionWordCount, SOURCES } from "@/lib/instruction";

export const metadata: Metadata = {
  title: "Written instruction",
  description: "Short written instruction for the solar-panel vector bench, with sources and model limits.",
};

export default function InstructionPage() {
  const words = instructionWordCount();

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl px-5 pt-8 pb-16 md:px-6 md:pt-10">
        <p className="font-mono text-[11px] tracking-wide text-navy">Option 2 · written instruction</p>
        <h1 className="mt-2 text-3xl font-medium tracking-tight text-ink">Orienting a rooftop solar panel</h1>
        <p className="mt-2 font-mono text-[12px] text-quiet">{words} words</p>
        <article className="mt-6 space-y-4 text-[15px] leading-7 text-ink">
          {INSTRUCTION_PARAGRAPHS.map((paragraph) => (
            <p key={paragraph.slice(0, 24)} className="m-0">
              {paragraph}
            </p>
          ))}
        </article>
        <section className="mt-8 border-t border-line pt-5">
          <h2 className="text-sm font-medium text-ink">Sources</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-quiet">
            {SOURCES.map((source) => (
              <li key={source.id}>
                {source.text}{" "}
                <a
                  href={source.href}
                  className="text-navy underline decoration-line underline-offset-2 hover:text-ink"
                >
                  {source.href}
                </a>
              </li>
            ))}
          </ol>
        </section>
      </main>
    </div>
  );
}
