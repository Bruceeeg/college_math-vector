"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import { MathText } from "@/components/math-text";
import { RoofSlice, SunComponents } from "@/components/diagrams";
import { ParameterControl } from "@/components/parameter-control";
import type { SceneVisibility } from "@/components/panel-scene";
import { VECTOR_COLOR } from "@/lib/colors";
import {
  CASE_STUDY,
  formatQuantity,
  matchingPreset,
  PRESETS,
  solvePanel,
  type PanelInput,
  type PresetId,
  type StepFocus,
} from "@/lib/panel";

const PanelScene = dynamic(() => import("@/components/panel-scene").then((mod) => mod.PanelScene), {
  ssr: false,
  loading: () => <div className="grid h-full min-h-[280px] place-items-center text-sm text-quiet">Loading the roof…</div>,
});

type Field = {
  key: keyof PanelInput;
  label: string;
  hint: string;
  unit: string;
  min: number;
  max: number;
  step: number;
};

const GEOMETRY: Field[] = [
  { key: "east", label: "East eaves", hint: "Width along east", unit: "m", min: 1, max: 6, step: 1 },
  { key: "north", label: "North run", hint: "Horizontal depth", unit: "m", min: 1, max: 8, step: 1 },
  { key: "rise", label: "Rise", hint: "Vertical height", unit: "m", min: -4, max: 6, step: 1 },
];

const SUN: Field[] = [
  { key: "sunEast", label: "East component", hint: "Toward east is positive", unit: "m", min: -6, max: 6, step: 1 },
  { key: "sunNorth", label: "North component", hint: "Toward north is positive", unit: "m", min: -6, max: 6, step: 1 },
  { key: "sunUp", label: "Up component", hint: "Toward the sky is positive", unit: "m", min: 0, max: 8, step: 1 },
];

const LAYERS: { id: keyof SceneVisibility; label: string; color: string }[] = [
  { id: "vertices", label: "Vertices", color: VECTOR_COLOR.vertex },
  { id: "edges", label: "u · v  edges", color: VECTOR_COLOR.u },
  { id: "normal", label: "n  normal", color: VECTOR_COLOR.n },
  { id: "sun", label: "s  sun", color: VECTOR_COLOR.s },
  { id: "axes", label: "Axes", color: VECTOR_COLOR.axis },
];

const FOCUS_NOTE: Record<StepFocus, string> = {
  panel: "Highlighting the four corners",
  edges: "Highlighting edge vectors u and v",
  normal: "Highlighting the surface normal n",
  incidence: "Highlighting the angle between n and s",
};

const STEP_COLOR: Record<StepFocus, string> = {
  panel: VECTOR_COLOR.vertex,
  edges: VECTOR_COLOR.u,
  normal: VECTOR_COLOR.n,
  incidence: VECTOR_COLOR.s,
};

export function PanelBench() {
  const [input, setInput] = useState<PanelInput>(CASE_STUDY);
  const [baseline, setBaseline] = useState<PresetId>("case");
  const [show, setShow] = useState<SceneVisibility>({
    vertices: true,
    edges: true,
    normal: true,
    sun: true,
    axes: true,
  });
  const [openId, setOpenId] = useState<string | null>(null);
  const [mode, setMode] = useState<"model" | "parameters" | "steps">("model");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [rangesPinned, setRangesPinned] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const model = useMemo(() => solvePanel(input), [input]);
  const preset = matchingPreset(input);
  const emphasis = model.steps.find((step) => step.id === openId)?.focus ?? null;

  useEffect(() => {
    if (!settingsOpen) return;
    const onPointer = (event: PointerEvent) => {
      if (!settingsRef.current?.contains(event.target as Node)) setSettingsOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSettingsOpen(false);
    };
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [settingsOpen]);

  const front =
    model.frontShare === null
      ? { value: "—", hint: "The sun vector has no direction", tone: "text-quiet" }
      : model.frontShare <= 0
        ? {
            value: "0",
            hint: model.cosTheta !== null && model.cosTheta < -0.02 ? "Sun is behind the glass" : "Sun is grazing the glass",
            tone: model.cosTheta !== null && model.cosTheta < -0.02 ? "text-red-700" : "text-quiet",
          }
        : {
            value: model.isCaseStudy ? "24/25" : formatQuantity(model.frontShare),
            hint: "Reaches the front of the glass",
            tone: "text-emerald-700",
          };

  const metrics = [
    { label: "Panel area", value: formatQuantity(model.area), unit: "m²", hint: "Area of the rectangle", tone: "text-quiet" },
    {
      label: "Incidence angle",
      value: model.thetaDeg === null ? "—" : formatQuantity(model.thetaDeg),
      unit: model.thetaDeg === null ? "" : "°",
      hint: "Between the normal and the sun",
      tone: "text-quiet",
    },
    { label: "Front-facing sunlight", value: front.value, unit: "", hint: front.hint, tone: front.tone },
    {
      label: "Relative performance",
      value: model.gain === null ? "—" : formatQuantity(model.gain),
      unit: model.gain === null ? "" : "×",
      hint: model.gain === null ? "Not comparable with a flat roof" : "Compared with a flat roof",
      tone: "text-quiet",
    },
  ];

  const applyPreset = (id: PresetId) => {
    setBaseline(id);
    setInput(PRESETS[id].input);
  };

  const openStep = (id: string) => {
    const closing = openId === id;
    setOpenId(closing ? null : id);
    if (closing) return;
    const step = model.steps.find((item) => item.id === id);
    if (!step) return;
    setShow((current) => ({
      ...current,
      vertices: step.focus === "panel" ? true : current.vertices,
      edges: step.focus === "edges" ? true : current.edges,
      normal: step.focus === "normal" || step.focus === "incidence" ? true : current.normal,
      sun: step.focus === "incidence" ? true : current.sun,
    }));
  };

  return (
    <div className="lab-shell text-ink">
      <header className="lab-header">
        <div className="lab-header-row">
          <div className="min-w-0">
            <p className="text-[11px] text-quiet">
              <Link
                href="/"
                className="hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
              >
                Overview
              </Link>
            </p>
            <h1 className="truncate text-[15px] font-medium leading-6 text-ink">Solar Panel Geometry</h1>
          </div>
          <div className="lab-header-actions">
            <label className="flex min-w-0 items-center gap-2 text-[13px] text-quiet">
              <span className="shrink-0">Scenario</span>
              <select
                className="lab-select"
                aria-label="Scenario"
                value={preset ?? "custom"}
                onChange={(event) => {
                  const next = event.target.value;
                  if (next === "case" || next === "flat" || next === "behind") applyPreset(next);
                }}
              >
                {(Object.keys(PRESETS) as PresetId[]).map((id) => (
                  <option key={id} value={id}>
                    {PRESETS[id].label} · {PRESETS[id].detail}
                  </option>
                ))}
                {preset === null ? <option value="custom">Custom</option> : null}
              </select>
            </label>
            <button
              type="button"
              className="lab-text-button"
              onClick={() => setInput(PRESETS[baseline].input)}
            >
              Reset
            </button>
            <div className="relative" ref={settingsRef}>
              <button
                type="button"
                className="lab-text-button"
                aria-expanded={settingsOpen}
                aria-controls="lab-settings"
                onClick={() => setSettingsOpen((open) => !open)}
              >
                Settings
              </button>
              {settingsOpen ? (
                <div id="lab-settings" className="lab-popover">
                  <p className="text-[13px] leading-5 text-ink">x east, y north, z up. Lengths are metres.</p>
                  <p className="mt-2 text-[12px] leading-5 text-quiet">
                    The sun components are a direction. A longer arrow is the same sun.
                  </p>
                  <label className="mt-3 flex items-center gap-2 text-[13px] text-ink">
                    <input
                      type="checkbox"
                      checked={rangesPinned}
                      onChange={(event) => setRangesPinned(event.target.checked)}
                    />
                    Keep ranges and steps visible
                  </label>
                  <Link href="/instruction" className="mt-3 inline-block text-[13px] text-navy hover:underline">
                    Written instruction
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
        </div>
        <dl className="lab-metrics">
          {metrics.map((item) => (
            <div key={item.label} className="min-w-0">
              <dt className="text-[11px] text-quiet">{item.label}</dt>
              <dd className="mt-1 truncate font-mono text-[22px] font-medium leading-none tracking-tight text-ink tabular-nums">
                {item.value}
                {item.unit ? <span className="ml-1 font-sans text-[12px] font-normal text-quiet">{item.unit}</span> : null}
              </dd>
              <p className={`mt-1 text-[11px] leading-4 ${item.tone}`}>{item.hint}</p>
            </div>
          ))}
        </dl>
        <div className="lab-switch" role="tablist" aria-label="Workspace">
          {(
            [
              ["model", "Model"],
              ["parameters", "Parameters"],
              ["steps", "Calculation"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={mode === id}
              onClick={() => setMode(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <main className="lab-workspace" data-mode={mode}>
        <aside className="lab-parameters">
          <section>
            <p className="text-[11px] font-medium tracking-[0.08em] text-quiet">PANEL GEOMETRY</p>
            <h2 className="mt-1 text-[15px] font-medium text-ink">Roof dimensions</h2>
            <p className="mt-1 text-[13px] leading-5 text-quiet">Define the rectangular panel in 3D space.</p>
            <div className="mt-1">
              {GEOMETRY.map((field) => (
                <ParameterControl
                  key={field.key}
                  id={field.key}
                  label={field.label}
                  hint={field.hint}
                  unit={field.unit}
                  value={input[field.key]}
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  showRange={rangesPinned}
                  onChange={(value) => setInput((current) => ({ ...current, [field.key]: value }))}
                />
              ))}
            </div>
          </section>
          <section className="mt-6">
            <p className="text-[11px] font-medium tracking-[0.08em] text-quiet">SUN DIRECTION</p>
            <h2 className="mt-1 text-[15px] font-medium text-ink">Direction vector</h2>
            <p className="mt-1 text-[13px] leading-5 text-quiet">
              These components point toward the sun. They are not a distance from the roof.
            </p>
            <div className="mt-1">
              {SUN.map((field) => (
                <ParameterControl
                  key={field.key}
                  id={field.key}
                  label={field.label}
                  hint={field.hint}
                  unit={field.unit}
                  value={input[field.key]}
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  showRange={rangesPinned}
                  onChange={(value) => setInput((current) => ({ ...current, [field.key]: value }))}
                />
              ))}
            </div>
          </section>
          <button
            type="button"
            className="mt-4 cursor-pointer text-[13px] text-quiet hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
            aria-expanded={rangesPinned}
            onClick={() => setRangesPinned((pinned) => !pinned)}
          >
            Advanced settings {rangesPinned ? "↑" : "↓"}
          </button>
        </aside>

        <section className="lab-scene" aria-label="3D visualization">
          <div className="px-3 pt-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-[15px] font-medium text-ink">3D visualization</h2>
              <p className="truncate text-[11px] text-quiet">Drag to rotate · Scroll to zoom</p>
            </div>
            <p className="mt-1 text-[12px] leading-5 text-quiet" aria-live="polite">
              {emphasis ? FOCUS_NOTE[emphasis] : "Select a calculation step to highlight it here."}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Shown in the model">
              {LAYERS.map((layer) => {
                const selected = show[layer.id];
                return (
                  <button
                    key={layer.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setShow((current) => ({ ...current, [layer.id]: !current[layer.id] }))}
                    className={`inline-flex h-7 cursor-pointer items-center gap-1.5 px-2 text-[12px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy ${
                      selected ? "bg-[#f3f6f9] text-ink" : "text-quiet"
                    }`}
                  >
                    <span className="inline-flex gap-0.5" aria-hidden="true">
                      <span className="inline-block h-1.5 w-1.5" style={{ background: layer.color }} />
                      {layer.id === "edges" ? (
                        <span className="inline-block h-1.5 w-1.5" style={{ background: VECTOR_COLOR.v }} />
                      ) : null}
                    </span>
                    {layer.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="lab-scene-viewport relative min-h-[280px] flex-1">
            <div className="absolute inset-0">
              <PanelScene model={model} show={show} emphasis={emphasis} />
            </div>
          </div>
        </section>

        <aside className="lab-solution">
          <div className="px-1 pt-3 pb-1">
            <h2 className="text-[15px] font-medium text-ink">Calculation</h2>
            <p className="mt-1 text-[13px] leading-5 text-quiet">
              {model.steps.length} steps. Open one to read the derivation and highlight it on the model.
            </p>
          </div>
          <ol className="step-list">
            {model.steps.map((step, index) => {
              const open = openId === step.id;
              return (
                <li
                  key={step.id}
                  className={open ? "is-open" : undefined}
                  style={{ "--step": STEP_COLOR[step.focus] } as CSSProperties}
                >
                  <button
                    type="button"
                    className="step-button"
                    aria-expanded={open}
                    onClick={() => openStep(step.id)}
                  >
                    <span className="step-index">{String(index + 1).padStart(2, "0")}</span>
                    <span className="step-heading">{step.title}</span>
                    <span className="step-toggle">{open ? "Hide" : "Expand"}</span>
                  </button>
                  <div className="step-summary">
                    {step.summary.map((line) => (
                      <p key={line} className="step-math">
                        <MathText text={line} />
                      </p>
                    ))}
                  </div>
                  {open ? (
                    <div>
                      {step.details.map((detail) => (
                        <section key={detail.id} className="step-detail">
                          <h3 className="text-[13px] font-medium text-ink">{detail.title}</h3>
                          {detail.lines.map((line) => (
                            <p key={line} className="step-math">
                              <MathText text={line} />
                            </p>
                          ))}
                          <p className="step-note">{detail.note}</p>
                        </section>
                      ))}
                      {step.focus === "incidence" ? (
                        <div className="step-detail">
                          <h3 className="text-[13px] font-medium text-ink">North–up slice</h3>
                          <div className="mt-2 bg-paper">
                            <RoofSlice model={model} idPrefix="bench" />
                          </div>
                          <h3 className="mt-4 text-[13px] font-medium text-ink">Sun as a vector sum</h3>
                          <div className="mt-2">
                            <SunComponents model={model} />
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : step.focus === "incidence" ? (
                    <p className="step-aside">The slice diagram and the sun components are inside this step.</p>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </aside>
      </main>
    </div>
  );
}
