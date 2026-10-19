"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";

import { RoofSlice, SunComponents } from "@/components/diagrams";
import { ParameterControl } from "@/components/parameter-control";
import {
  CASE_STUDY,
  formatQuantity,
  matchingPreset,
  PRESETS,
  solvePanel,
  type PanelInput,
  type PresetId,
} from "@/lib/panel";

const PanelScene = dynamic(
  () => import("@/components/panel-scene").then((mod) => mod.PanelScene),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-full min-h-[280px] place-items-center text-sm text-quiet">Loading the roof…</div>
    ),
  },
);

const FIELDS: {
  key: keyof PanelInput;
  label: string;
  symbol: string;
  unit: string;
  min: number;
  max: number;
}[] = [
  { key: "east", label: "eaves length", symbol: "east", unit: "m", min: 1, max: 6 },
  { key: "north", label: "north run", symbol: "north", unit: "m", min: 1, max: 8 },
  { key: "rise", label: "rise", symbol: "rise", unit: "m", min: -4, max: 6 },
  { key: "sunEast", label: "sun east", symbol: "sE", unit: "m", min: -6, max: 6 },
  { key: "sunNorth", label: "sun north", symbol: "sN", unit: "m", min: -6, max: 6 },
  { key: "sunUp", label: "sun up", symbol: "sU", unit: "m", min: 0, max: 8 },
];

const VECTOR_TOGGLES = [
  { id: "u", label: "u eaves", color: "#1e3a5f" },
  { id: "v", label: "v slope", color: "#0f766e" },
  { id: "n", label: "n normal", color: "#a16207" },
  { id: "s", label: "s sun", color: "#c2410c" },
] as const;

export function PanelBench() {
  const [input, setInput] = useState<PanelInput>(CASE_STUDY);
  const [show, setShow] = useState({ u: true, v: true, n: true, s: true });
  const model = useMemo(() => solvePanel(input), [input]);
  const preset = matchingPreset(input);
  const cosText =
    model.cosTheta === null ? "—" : model.isCaseStudy ? "24/25" : formatQuantity(model.cosTheta);
  const stats = [
    { label: "Area |n|", value: formatQuantity(model.area), unit: "m²" },
    { label: "n · s", value: formatQuantity(model.dot), unit: "" },
    { label: "cos θ", value: cosText, unit: "" },
  ];

  return (
    <div className="lab-shell bg-paper text-ink">
      <header className="lab-commandbar border border-line bg-surface">
        <div className="lab-title min-w-0">
          <p className="truncate text-base font-medium text-ink">
            <Link
              href="/"
              className="mr-2 text-[11px] font-normal text-quiet hover:text-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
            >
              Overview
            </Link>
            Solar panel
          </p>
          <p className="font-mono text-[10px] text-quiet">x east · y north · z up</p>
        </div>
        <div className="lab-stats grid min-w-0 grid-cols-3">
          {stats.map((item) => (
            <div key={item.label} className="min-w-0 border-l border-line pl-3">
              <p className="text-[10px] text-quiet">{item.label}</p>
              <p className="truncate font-mono text-base text-ink tabular-nums">
                {item.value} {item.unit ? <span className="text-[10px] text-quiet">{item.unit}</span> : null}
              </p>
            </div>
          ))}
        </div>
        <p
          role="status"
          className={`lab-status min-w-0 text-xs ${
            model.statusKind === "ok" ? "text-emerald-700" : model.statusKind === "warn" ? "text-red-700" : "text-quiet"
          }`}
          title={model.status}
        >
          {model.status}
        </p>
        <div className="lab-actions flex justify-end">
          <button
            type="button"
            onClick={() => setInput(CASE_STUDY)}
            className="h-8 cursor-pointer bg-navy px-3 text-[13px] font-medium text-white hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
          >
            Case study
          </button>
        </div>
      </header>

      <main className="lab-workspace">
        <aside className="lab-parameters border border-line bg-surface">
          <div className="border-b border-line px-2.5 py-2">
            <h2 className="text-sm font-medium text-ink">Panel and sun</h2>
            <p className="mt-0.5 text-[11px] leading-4 text-quiet">
              The sun components are a direction, not a distance. Metres keep every vector in one unit.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-1 px-2 py-2" role="group" aria-label="Examples">
            {(Object.keys(PRESETS) as PresetId[]).map((id) => {
              const selected = preset === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setInput(PRESETS[id].input)}
                  className={`h-12 cursor-pointer border px-1.5 text-left text-[11px] leading-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy ${
                    selected ? "border-navy bg-navy text-white" : "border-line bg-surface text-ink hover:border-navy"
                  }`}
                >
                  <span className="block font-medium">{PRESETS[id].label}</span>
                  <span className={selected ? "text-white/80" : "text-quiet"}>{PRESETS[id].detail}</span>
                </button>
              );
            })}
          </div>
          <div className="space-y-1 px-1.5">
            {FIELDS.map((field) => (
              <ParameterControl
                key={field.key}
                id={field.key}
                label={field.label}
                symbol={field.symbol}
                unit={field.unit}
                value={input[field.key]}
                min={field.min}
                max={field.max}
                step={1}
                onChange={(value) => setInput((current) => ({ ...current, [field.key]: value }))}
              />
            ))}
          </div>
          <div className="px-2 py-2">
            <h2 className="text-[13px] font-medium text-ink">Vectors drawn</h2>
            <div className="mt-1 grid grid-cols-2 gap-1">
              {VECTOR_TOGGLES.map((item) => {
                const selected = show[item.id];
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setShow((current) => ({ ...current, [item.id]: !current[item.id] }))}
                    className={`h-8 cursor-pointer border px-2 text-left text-[12px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy ${
                      selected ? "border-navy bg-surface text-ink" : "border-line bg-muted text-quiet"
                    }`}
                  >
                    <span className="mr-1.5 inline-block h-2 w-2" style={{ background: item.color }} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
          <section className="mx-2 border-t border-line pt-2 pb-3">
            <h2 className="text-[13px] font-medium text-ink">Current values</h2>
            <div className="mt-1 space-y-1 font-mono text-[11px] leading-5">
              {model.formula.map((line) => (
                <p key={line} className="m-0 break-words text-ink">
                  {line}
                </p>
              ))}
            </div>
          </section>
        </aside>

        <section className="lab-scene min-h-0 border border-line bg-surface">
          <div className="flex h-8 items-center justify-between gap-3 border-b border-line px-2.5">
            <h2 className="text-xs font-medium text-ink">Roof frame</h2>
            <p className="truncate font-mono text-[10px] text-quiet">Drag to turn. n and s arrows are scaled to fit.</p>
          </div>
          <div className="lab-scene-viewport relative min-h-[280px] flex-1">
            <div className="absolute inset-0 h-full w-full">
              <PanelScene model={model} show={show} />
            </div>
          </div>
          <dl className="grid h-12 grid-cols-4 border-t border-line font-mono text-[11px] tabular-nums">
            <Readout label="|n|" value={formatQuantity(model.nMag)} />
            <Readout label="θ" value={model.thetaDeg === null ? "—" : formatQuantity(model.thetaDeg)} unit="°" />
            <Readout label="front share" value={model.frontShare === null ? "—" : formatQuantity(model.frontShare)} />
            <Readout
              label="vs flat"
              value={model.gain === null ? "—" : formatQuantity(model.gain)}
              unit={model.gain === null ? "" : "×"}
            />
          </dl>
        </section>

        <aside className="lab-solution border border-line bg-surface">
          <div className="border-b border-line px-3 py-2">
            <h2 className="text-sm font-medium text-ink">Worked calculation</h2>
            <p className="mt-0.5 text-[11px] text-quiet">
              {model.isCaseStudy ? "Case study, with exact fractions." : "Same steps, with the numbers now on the sliders."}
            </p>
          </div>
          <div className="px-3">
            <ol className="step-list">
              {model.steps.map((step) => (
                <li key={step.id}>
                  <h3>{step.title}</h3>
                  {step.lines.map((line) => (
                    <p key={line} className="step-math">
                      {line}
                    </p>
                  ))}
                  <p className="step-note">{step.note}</p>
                </li>
              ))}
            </ol>
            <section className="border-b border-line py-3">
              <h3 className="text-[13px] font-medium text-ink">North–up slice</h3>
              <div className="mt-2 border border-line">
                <RoofSlice model={model} idPrefix="bench" />
              </div>
            </section>
            <section className="py-3 pb-4">
              <h3 className="text-[13px] font-medium text-ink">Sun as a vector sum</h3>
              <div className="mt-2">
                <SunComponents model={model} />
              </div>
            </section>
          </div>
        </aside>
      </main>
    </div>
  );
}

function Readout({ label, value, unit = "" }: { label: string; value: string; unit?: string }) {
  return (
    <div className="border-r border-line px-2 py-1 last:border-r-0">
      <dt className="text-quiet">{label}</dt>
      <dd className="truncate text-ink">
        {value}
        {unit ? ` ${unit}` : ""}
      </dd>
    </div>
  );
}
