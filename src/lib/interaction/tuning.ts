"use client";

/**
 * Live, mutable parameter sets for every effect. Effects read `params.x` on
 * each frame, so a lab panel can change values without re-rendering React.
 * Values tuned on a lab page persist in localStorage (per browser) and apply
 * site-wide, so Ananya can tune in the lab and then see the result in place.
 */

export type NumberControl = { type?: "number"; min: number; max: number; step?: number; label?: string; unit?: string };
export type BooleanControl = { type: "boolean"; label?: string };
export type SelectControl = { type: "select"; options: readonly string[]; label?: string };
export type ColorControl = { type: "color"; label?: string };
export type Control = NumberControl | BooleanControl | SelectControl | ColorControl;

type Value = number | boolean | string;
export type Params = Record<string, Value>;
export type Schema<P extends Params> = { [K in keyof P]: Control };

export type TuningSet<P extends Params> = {
  name: string;
  title: string;
  params: P;
  defaults: Readonly<P>;
  schema: Schema<P>;
  set: <K extends keyof P>(key: K, value: P[K]) => void;
  reset: () => void;
  subscribe: (fn: () => void) => () => void;
  version: () => number;
};

const registry = new Map<string, TuningSet<Params>>();
const STORAGE_PREFIX = "tune:";

export function defineTuning<P extends Params>(name: string, title: string, defaults: P, schema: Schema<P>): TuningSet<P> {
  const existing = registry.get(name);
  if (existing) return existing as unknown as TuningSet<P>;

  const params = { ...defaults };
  const listeners = new Set<() => void>();
  let rev = 0;

  if (typeof window !== "undefined") {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_PREFIX + name) ?? "null") as Partial<P> | null;
      if (saved) {
        for (const key of Object.keys(defaults) as (keyof P)[]) {
          if (key in saved && typeof saved[key] === typeof defaults[key]) params[key] = saved[key] as P[keyof P];
        }
      }
    } catch {
      /* corrupt or blocked storage: keep defaults */
    }
  }

  const persist = () => {
    try {
      const diff: Partial<P> = {};
      for (const key of Object.keys(defaults) as (keyof P)[]) {
        if (params[key] !== defaults[key]) diff[key] = params[key];
      }
      if (Object.keys(diff).length) localStorage.setItem(STORAGE_PREFIX + name, JSON.stringify(diff));
      else localStorage.removeItem(STORAGE_PREFIX + name);
    } catch {
      /* storage blocked */
    }
  };

  const notify = () => {
    rev++;
    listeners.forEach((fn) => fn());
  };

  const set: TuningSet<P> = {
    name,
    title,
    params,
    defaults: Object.freeze({ ...defaults }),
    schema,
    set(key, value) {
      params[key] = value;
      persist();
      notify();
    },
    reset() {
      Object.assign(params, defaults);
      persist();
      notify();
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    version: () => rev,
  };
  registry.set(name, set as unknown as TuningSet<Params>);
  return set;
}

export function getTuning(name: string) {
  return registry.get(name);
}
