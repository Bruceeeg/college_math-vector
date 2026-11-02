"use client";

import { useEffect, useRef, useState } from "react";

function precisionFor(step: number) {
  const text = String(step);
  return text.includes(".") ? text.length - text.indexOf(".") - 1 : 0;
}

function snapToStep(value: number, step: number) {
  const stepped = Math.round(value / step) * step;
  return Number(stepped.toFixed(precisionFor(step)));
}

function displayValue(value: number, step: number) {
  return value.toFixed(Math.max(precisionFor(step), 0));
}

export function ParameterControl({
  id,
  label,
  hint,
  unit,
  value,
  min,
  max,
  step,
  showRange,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  step: number;
  showRange: boolean;
  onChange: (value: number) => void;
}) {
  const [editing, setEditing] = useState<{ id: string; draft: string } | null>(null);
  const cancelBlur = useRef(false);
  const committed = useRef(value);
  const draft = editing?.id === id ? editing.draft : displayValue(value, step);
  const rangeId = `${id}-range`;

  useEffect(() => {
    if (value === committed.current) return;
    committed.current = value;
    setEditing((current) => (current?.id === id ? null : current));
  }, [id, value]);

  const publish = (next: number) => {
    committed.current = next;
    onChange(next);
  };

  const commit = () => {
    if (cancelBlur.current) {
      cancelBlur.current = false;
      setEditing(null);
      return;
    }
    const parsed = Number(draft);
    if (!Number.isFinite(parsed)) {
      setEditing(null);
      return;
    }
    setEditing(null);
    publish(Math.min(max, Math.max(min, snapToStep(parsed, step))));
  };

  return (
    <div className="param-row py-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 pt-0.5">
          <label htmlFor={`${id}-number`} className="block text-[13px] font-medium leading-5 text-ink">
            {label}
          </label>
          <p className="mt-0.5 text-[11px] leading-4 text-quiet">{hint}</p>
        </div>
        <div className="flex shrink-0 items-baseline gap-1.5">
          <input
            id={`${id}-number`}
            className="param-number h-10 w-[4.75rem] bg-white px-2 text-right font-mono text-lg text-ink tabular-nums outline-none focus:ring-1 focus:ring-navy"
            type="number"
            inputMode="decimal"
            step={step}
            min={min}
            max={max}
            value={draft}
            onFocus={() => {
              cancelBlur.current = false;
              setEditing({ id, draft: displayValue(value, step) });
            }}
            onChange={(event) => {
              const nextDraft = event.target.value;
              setEditing({ id, draft: nextDraft });
              if (nextDraft.trim() === "" || nextDraft === "-" || nextDraft === ".") return;
              const parsed = Number(nextDraft);
              if (Number.isFinite(parsed)) publish(Math.min(max, Math.max(min, snapToStep(parsed, step))));
            }}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
              if (event.key === "Escape") {
                cancelBlur.current = true;
                setEditing(null);
                event.currentTarget.blur();
              }
            }}
          />
          <span className="w-4 font-mono text-[11px] text-quiet">{unit}</span>
        </div>
      </div>
      <input
        id={rangeId}
        className="param-slider mt-2 block w-full"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={`${label} slider`}
        onChange={(event) => publish(Number(event.target.value))}
      />
      <p className={`param-meta ${showRange ? "is-visible" : ""}`}>
        {min} to {max} {unit} · step {step}
      </p>
    </div>
  );
}
