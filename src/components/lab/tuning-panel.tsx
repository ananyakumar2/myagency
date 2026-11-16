"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import "@/lib/interaction/config";
import { getTuning, type Control, type Params, type TuningSet } from "@/lib/interaction/tuning";

/**
 * Sliders for one or more tuning sets. Changes apply live, persist in this
 * browser and carry across the whole site, so a value tuned here can be seen
 * in place. "Copy" puts the changed values on the clipboard as JSON to send
 * back as the new defaults.
 */
export function TuningPanel({ sets }: { sets: string[] }) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(true);
  useEffect(() => {
    // Values come from localStorage, so the panel only renders after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);
  if (!mounted) return null;
  const found = sets.map((n) => getTuning(n)).filter((s): s is TuningSet<Params> => !!s);
  return (
    <aside
      data-cursor="hover"
      className="fixed top-20 right-4 bottom-4 z-(--z-panel) flex w-[19rem] flex-col overflow-hidden rounded-lg border border-line bg-paper/95 text-ink shadow-[0_20px_60px_-30px_rgb(20_17_14/0.5)] backdrop-blur-md"
      style={{ maxHeight: open ? undefined : "2.75rem" }}
    >
      <button type="button" onClick={() => setOpen(!open)} className="flex items-center justify-between px-4 py-3 text-left font-mono text-[0.6875rem] tracking-wide uppercase">
        Tuning <span>{open ? "–" : "+"}</span>
      </button>
      {open && (
        <div className="flex-1 overflow-y-auto px-4 pb-4" data-lenis-prevent="">
          {found.map((s) => (
            <SetControls key={s.name} set={s} />
          ))}
        </div>
      )}
    </aside>
  );
}

function SetControls({ set }: { set: TuningSet<Params> }) {
  useSyncExternalStore(set.subscribe, set.version, set.version);
  const [copied, setCopied] = useState(false);
  const diff = Object.fromEntries(Object.entries(set.params).filter(([k, v]) => v !== set.defaults[k]));
  const copy = async () => {
    await navigator.clipboard?.writeText(JSON.stringify({ [set.name]: diff }, null, 2)).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };
  return (
    <section className="border-t border-line pt-3 pb-4 first:border-t-0">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-medium">{set.title}</h2>
        <div className="flex gap-2 font-mono text-[0.625rem] tracking-wide uppercase">
          <button type="button" onClick={copy} className="text-ink-2 hover:text-ink">
            {copied ? "Copied" : "Copy"}
          </button>
          <button type="button" onClick={() => set.reset()} className="text-ink-2 hover:text-ink">
            Reset
          </button>
        </div>
      </div>
      <div className="space-y-2.5">
        {Object.entries(set.schema).map(([key, control]) => (
          <Field key={key} name={key} control={control} value={set.params[key]} changed={set.params[key] !== set.defaults[key]} onChange={(v) => set.set(key, v)} />
        ))}
      </div>
    </section>
  );
}

function Field({ name, control, value, changed, onChange }: { name: string; control: Control; value: Params[string]; changed: boolean; onChange: (v: Params[string]) => void }) {
  const label = control.label ?? name;
  const mark = changed ? "text-ink" : "text-ink-2";
  if (control.type === "boolean")
    return (
      <label className={`flex items-center justify-between text-xs ${mark}`}>
        {label}
        <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
      </label>
    );
  if (control.type === "select")
    return (
      <label className={`flex items-center justify-between gap-2 text-xs ${mark}`}>
        {label}
        <select value={String(value)} onChange={(e) => onChange(e.target.value)} className="rounded border border-line bg-paper px-1 py-0.5">
          {control.options.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      </label>
    );
  if (control.type === "color")
    return (
      <label className={`flex items-center justify-between text-xs ${mark}`}>
        {label}
        <input type="color" value={String(value)} onChange={(e) => onChange(e.target.value)} />
      </label>
    );
  const n = Number(value);
  return (
    <label className={`block text-xs ${mark}`}>
      <span className="flex justify-between">
        <span>{label}</span>
        <span className="font-mono tabular-nums">
          {Number.isInteger(control.step ?? 1) ? n : n.toFixed(Math.min(3, String(control.step ?? 0.01).split(".")[1]?.length ?? 2))}
          {control.unit ? ` ${control.unit}` : ""}
        </span>
      </span>
      <input
        type="range"
        min={control.min}
        max={control.max}
        step={control.step ?? (control.max - control.min) / 100}
        value={n}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-[var(--color-signature-deep)]"
      />
    </label>
  );
}
