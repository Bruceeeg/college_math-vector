import type { Metadata } from "next";
import Link from "next/link";

import { RoofSlice } from "@/components/diagrams";
import { SiteHeader } from "@/components/site-header";
import { CASE_STUDY, formatQuantity, solvePanel } from "@/lib/panel";

export const metadata: Metadata = {
  title: "Overview",
  description: "A rooftop solar panel used as a vector calculation: edges, normal, area and sunlight.",
};

const OPERATIONS = [
  { name: "Subtraction", use: "B − A and D − A are the two edges lying in the glass." },
  { name: "Dot product", use: "u · v checks the right angle. n · s measures how directly the sun meets the panel." },
  { name: "Cross product", use: "u × v is the outward normal, and its length is the area." },
  { name: "Scalar multiplication", use: "Dividing the normal by its length gives a unit direction for the angle." },
  { name: "Addition", use: "The sun vector is the sum of its east, north and upward components." },
];

export default function HomePage() {
  const model = solvePanel(CASE_STUDY);

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl px-5 pt-8 pb-16 md:px-6 md:pt-10">
        <p className="font-mono text-[11px] tracking-wide text-navy">
          Introduction to College Math · Project 1 · Option 2
        </p>
        <h1 className="mt-2 text-4xl font-medium tracking-tight text-ink md:text-5xl">Vector Bench</h1>
        <p className="mt-4 max-w-3xl text-[15px] leading-7 text-quiet">
          A solar installer has to know which way a panel faces, and how much of the sunlight is actually
          perpendicular to the glass. Coordinates, a cross product and a dot product answer both questions
          for one simplified roof.
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <section className="border border-line bg-surface p-4">
            <h2 className="text-sm font-medium text-ink">Why vectors</h2>
            <p className="mt-2 text-sm leading-6 text-quiet">
              A single tilt angle cannot tell south from east. Two edge vectors fix the rectangle in space.
              Their cross product is the direction the glass faces, and the dot product with the sun says
              whether that face is looking at the light.
            </p>
          </section>
          <section className="border border-line bg-surface p-4">
            <h2 className="text-sm font-medium text-ink">Operations in the model</h2>
            <ul className="mt-2 space-y-2 text-sm leading-6 text-quiet">
              {OPERATIONS.map((item) => (
                <li key={item.name}>
                  <span className="font-medium text-ink">{item.name}. </span>
                  {item.use}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="mt-6 border border-line bg-surface">
          <div className="grid gap-0 md:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
            <div className="border-b border-line p-4 md:border-r md:border-b-0">
              <h2 className="text-sm font-medium text-ink">Case study</h2>
              <p className="mt-2 text-sm leading-6 text-quiet">
                Eaves of 3 m run east. The other edge runs 4 m north and rises 3 m, so it is 5 m long and the
                panel is a 3 by 5 rectangle. The sun points south and up, s = ⟨0, −4, 3⟩.
              </p>
              <dl className="mt-4 grid grid-cols-2 gap-3 font-mono text-[13px] sm:grid-cols-4">
                <div>
                  <dt className="text-[11px] text-quiet">n = u × v</dt>
                  <dd>⟨0, −9, 12⟩</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-quiet">Area</dt>
                  <dd>{formatQuantity(model.area)} m²</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-quiet">cos θ</dt>
                  <dd>24/25</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-quiet">θ</dt>
                  <dd>{model.thetaDeg === null ? "—" : `${formatQuantity(model.thetaDeg)}°`}</dd>
                </div>
              </dl>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/bench"
                  className="inline-flex h-9 items-center bg-navy px-4 text-sm font-medium text-white hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
                >
                  Open the bench
                </Link>
                <Link
                  href="/instruction"
                  className="inline-flex h-9 items-center border border-line bg-surface px-4 text-sm text-ink hover:border-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
                >
                  Written instruction
                </Link>
              </div>
            </div>
            <div className="p-4">
              <RoofSlice model={model} idPrefix="home" />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
