"use client";

/*
 * Decision 16: the loader can't finish until fonts and the first screen's
 * media are in (Auge gates its counter the same way), with a per-item and an
 * overall cap. Components that need more (a frame sequence's first pass, a
 * GLB) register a gate.
 */

const gates = new Map<string, Promise<unknown>>();
const doneListeners = new Set<() => void>();
let loaderDone = false;

export function registerGate(name: string, promise: Promise<unknown>) {
  gates.set(name, promise);
}

const withTimeout = (p: Promise<unknown>, seconds: number) =>
  Promise.race([p.catch(() => undefined), new Promise((r) => setTimeout(r, seconds * 1000))]);

function firstScreenMedia(): Promise<unknown>[] {
  const vh = window.innerHeight;
  const out: Promise<unknown>[] = [];
  document.querySelectorAll<HTMLImageElement | HTMLVideoElement>("img[data-critical], video[data-critical], img[fetchpriority='high']").forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.top > vh * 1.1) return;
    if (el instanceof HTMLImageElement) out.push(el.complete ? el.decode().catch(() => undefined) : new Promise((res) => el.addEventListener("load", res, { once: true })));
    else if (el.readyState < 2) out.push(new Promise((res) => el.addEventListener("loadeddata", res, { once: true })));
  });
  return out;
}

/** Resolves when everything gating the first screen is in, or the caps pass. */
export function waitForReady({ perItem, cap }: { perItem: number; cap: number }) {
  const items: Promise<unknown>[] = [document.fonts?.ready ?? Promise.resolve(), ...firstScreenMedia(), ...gates.values()];
  const all = Promise.all(items.map((p) => withTimeout(p, perItem)));
  return withTimeout(all, cap);
}

export function markLoaderDone() {
  loaderDone = true;
  document.documentElement.dataset.loaded = "1";
  doneListeners.forEach((fn) => fn());
  doneListeners.clear();
  window.dispatchEvent(new Event("loader:complete"));
}

/** Runs `fn` once the loader has handed off (immediately if it already has, or never ran). */
export function onLoaderDone(fn: () => void) {
  const html = document.documentElement;
  if (loaderDone || html.dataset.loaded === "1" || html.dataset.loader === "none" || !document.getElementById("loader")) {
    fn();
    return () => {};
  }
  doneListeners.add(fn);
  return () => doneListeners.delete(fn);
}
