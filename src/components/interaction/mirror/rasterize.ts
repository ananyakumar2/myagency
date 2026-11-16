/**
 * Redraws an element's text into a canvas at device resolution, word by
 * word at the exact boxes the browser laid out (Range.getClientRects), in the
 * computed font, letter-spacing, colour and text-transform. The result is a
 * pixel match for the DOM at rest, so the GL copy can stand in for it.
 */

export type TextRaster = {
  canvas: HTMLCanvasElement;
  /** Canvas origin relative to the element's border box, CSS px. */
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
  signature: string;
};

const PAD = 0.35; // em of overflow room for descenders, italics and accents

function transformText(text: string, mode: string) {
  if (mode === "uppercase") return text.toUpperCase();
  if (mode === "lowercase") return text.toLowerCase();
  if (mode === "capitalize") return text.replace(/(^|\s)(\p{L})/gu, (_, s, c: string) => s + c.toUpperCase());
  return text;
}

function fontString(style: CSSStyleDeclaration) {
  return `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
}

/** A cheap key that changes whenever the raster would. */
export function textSignature(el: HTMLElement, rect: DOMRect) {
  const style = getComputedStyle(el);
  return `${Math.round(rect.width)}x${Math.round(rect.height)}|${style.color}|${style.font}|${el.textContent}`;
}

export function rasterizeText(el: HTMLElement, ratio: number, reuse?: HTMLCanvasElement): TextRaster | null {
  const rect = el.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) return null;
  const rootStyle = getComputedStyle(el);
  const pad = parseFloat(rootStyle.fontSize) * PAD;
  const width = rect.width + pad * 2;
  const height = rect.height + pad * 2;

  const canvas = reuse ?? document.createElement("canvas");
  canvas.width = Math.ceil(width * ratio);
  canvas.height = Math.ceil(height * ratio);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.textBaseline = "alphabetic";

  const range = document.createRange();
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  const originX = rect.left - pad;
  const originY = rect.top - pad;

  while ((node = walker.nextNode())) {
    const text = node.nodeValue ?? "";
    if (!text.trim()) continue;
    const parent = node.parentElement;
    if (!parent) continue;
    const style = getComputedStyle(parent);
    if (style.visibility === "hidden" || style.display === "none") continue;

    ctx.font = fontString(style);
    ctx.fillStyle = style.color;
    const spacing = style.letterSpacing === "normal" ? "0px" : style.letterSpacing;
    (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = spacing;
    const metrics = ctx.measureText("Hg");
    const ascent = metrics.fontBoundingBoxAscent;
    const descent = metrics.fontBoundingBoxDescent;
    const mode = style.textTransform;

    const re = /\S+/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(text))) {
      range.setStart(node, match.index);
      range.setEnd(node, match.index + match[0].length);
      const rects = range.getClientRects();
      if (!rects.length) continue;
      const word = transformText(match[0], mode);
      if (rects.length === 1) {
        const r = rects[0];
        const baseline = r.top + (r.height - (ascent + descent)) / 2 + ascent;
        ctx.fillText(word, r.left - originX, baseline - originY);
      } else {
        // A word broken across lines (hyphenation, long URLs): draw per character.
        for (let i = 0; i < match[0].length; i++) {
          range.setStart(node, match.index + i);
          range.setEnd(node, match.index + i + 1);
          const cr = range.getClientRects()[0];
          if (!cr) continue;
          const baseline = cr.top + (cr.height - (ascent + descent)) / 2 + ascent;
          ctx.fillText(transformText(match[0][i], mode), cr.left - originX, baseline - originY);
        }
      }
    }
  }
  range.detach?.();

  return { canvas, offsetX: -pad, offsetY: -pad, width, height, signature: textSignature(el, rect) };
}

const colorCanvas = typeof document !== "undefined" ? document.createElement("canvas") : null;
const colorCache = new Map<string, [number, number, number, number]>();

/** Any CSS colour (rgb, oklch, color-mix results) → straight-alpha RGBA 0..1. */
export function parseColor(value: string): [number, number, number, number] {
  const cached = colorCache.get(value);
  if (cached) return cached;
  let out: [number, number, number, number] = [0, 0, 0, 0];
  const m = value.match(/^rgba?\(([^)]+)\)$/);
  if (m) {
    const parts = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat);
    out = [parts[0] / 255, parts[1] / 255, parts[2] / 255, parts.length > 3 ? parts[3] : 1];
  } else if (colorCanvas) {
    colorCanvas.width = colorCanvas.height = 1;
    const ctx = colorCanvas.getContext("2d", { willReadFrequently: true });
    if (ctx) {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = value;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
      out = [r / 255, g / 255, b / 255, a / 255];
    }
  }
  if (colorCache.size > 512) colorCache.clear();
  colorCache.set(value, out);
  return out;
}
