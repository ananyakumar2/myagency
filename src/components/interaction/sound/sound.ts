"use client";

import { soundTuning } from "@/lib/interaction/config";

/*
 * Decisions 19-20, after Auge's system: off by default behind a visible
 * toggle; WebAudio with 0.6 master gain; leading silence trimmed at a 0.0025
 * threshold so each sound lands on its event; hover variants shuffled with no
 * immediate repeat; the context sleeps after 30 s without sound.
 */

export type SoundName = "hover" | "click" | "whoosh" | "scramble" | "step" | "toggle";

const FILES: Record<SoundName, string[]> = {
  hover: [1, 2, 3, 4].map((i) => `/sounds/hover-${i}.mp3`),
  click: ["/sounds/click.mp3"],
  whoosh: ["/sounds/whoosh.mp3"],
  scramble: ["/sounds/scramble.mp3"],
  step: [1, 2, 3, 4, 5, 6].map((i) => `/sounds/step-${i}.mp3`),
  toggle: ["/sounds/toggle.mp3"],
};

const KEY = "sound:on";
let enabled = false;
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
const buffers = new Map<string, AudioBuffer>();
const loading = new Map<string, Promise<AudioBuffer | null>>();
const listeners = new Set<() => void>();
let lastHover = -1;
let lastHoverAt = 0;
let sleepTimer: ReturnType<typeof setTimeout> | null = null;

if (typeof window !== "undefined") {
  try {
    enabled = localStorage.getItem(KEY) === "1";
  } catch {
    enabled = false;
  }
}

export const isSoundEnabled = () => enabled;

export function subscribeSound(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function trimLeadingSilence(context: AudioContext, buf: AudioBuffer) {
  const data = buf.getChannelData(0);
  let start = 0;
  while (start < data.length && Math.abs(data[start]) < 0.0025) start++;
  if (start === 0 || start >= data.length) return buf;
  const out = context.createBuffer(buf.numberOfChannels, buf.length - start, buf.sampleRate);
  for (let c = 0; c < buf.numberOfChannels; c++) out.copyToChannel(buf.getChannelData(c).subarray(start), c);
  return out;
}

function load(url: string) {
  if (!ctx) return Promise.resolve(null);
  const existing = loading.get(url);
  if (existing) return existing;
  const context = ctx;
  const p = fetch(url)
    .then((r) => r.arrayBuffer())
    .then((b) => context.decodeAudioData(b))
    .then((buf) => {
      const trimmed = trimLeadingSilence(context, buf);
      buffers.set(url, trimmed);
      return trimmed;
    })
    .catch(() => null);
  loading.set(url, p);
  return p;
}

function ensureContext() {
  if (ctx) return ctx;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = soundTuning.params.gain;
  master.connect(ctx.destination);
  for (const list of Object.values(FILES)) list.forEach(load);
  return ctx;
}

function scheduleSleep() {
  if (sleepTimer) clearTimeout(sleepTimer);
  sleepTimer = setTimeout(() => void ctx?.suspend(), soundTuning.params.sleepAfter * 1000);
}

/** Must be called from a user gesture (the toggle) the first time. */
export function setSoundEnabled(on: boolean) {
  enabled = on;
  try {
    localStorage.setItem(KEY, on ? "1" : "0");
  } catch {
    /* storage blocked */
  }
  if (on) {
    const c = ensureContext();
    void c?.resume();
    void load(FILES.toggle[0]).then(() => playSound("toggle"));
  }
  listeners.forEach((fn) => fn());
}

export function playSound(name: SoundName, index?: number) {
  if (!enabled) return;
  const c = ensureContext();
  if (!c || !master) return;
  if (c.state === "suspended") void c.resume();
  const files = FILES[name];
  let i = 0;
  if (name === "hover") {
    const now = performance.now();
    if (now - lastHoverAt < soundTuning.params.hoverThrottle * 1000) return;
    lastHoverAt = now;
    do i = (Math.random() * files.length) | 0;
    while (files.length > 1 && i === lastHover);
    lastHover = i;
  } else if (name === "step") {
    i = Math.max(0, Math.min(files.length - 1, index ?? 0));
  }
  const buf = buffers.get(files[i]);
  if (!buf) {
    void load(files[i]);
    return;
  }
  master.gain.value = soundTuning.params.gain;
  const src = c.createBufferSource();
  src.buffer = buf;
  src.connect(master);
  src.start();
  scheduleSleep();
}

/** Re-read enabled state after hydration (the server always renders "off"). */
export function hydrateSound() {
  listeners.forEach((fn) => fn());
}
