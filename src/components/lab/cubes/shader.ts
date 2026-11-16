import { CUBE, HALF } from "./config";

export const COMETS = 5;

/*
 * One quad per visible cube face. The per-cube motion repeats motion.ts line
 * for line; keep the two in step.
 */
export const vertexShader = /* glsl */ `
uniform float uIntro;
uniform float uSlide;
uniform float uFlatten;

attribute vec4 aCube;   // i, j, level, column height
attribute vec4 aMeta;   // ring, hash, face, word (-1 none)
attribute vec3 aBase;
attribute vec3 aDeep;
attribute vec3 aInk;
attribute float aUni;
attribute float aId;

varying vec2 vUv;
varying vec3 vN;
varying vec3 vBase;
varying vec3 vDeep;
varying vec3 vInk;
varying float vWord;
varying float vUni;
varying float vAo;
varying float vId;

float cubicOut(float t) { float u = 1.0 - t; return 1.0 - u * u * u; }

void main() {
  float i = aCube.x, j = aCube.y, k = aCube.z, colH = aCube.w;
  float ring = aMeta.x, h = aMeta.y;
  int face = int(aMeta.z + 0.5);

  float delay = ring * 0.09 + k * 0.05 + h * 0.12;
  float scale = cubicOut(clamp((uIntro * 1.7 - delay) / 0.75, 0.0, 1.0));
  float levelT = cubicOut(clamp(uSlide * 1.6 - k * 0.15, 0.0, 1.0));
  float dir = mod(k, 2.0) < 0.5 ? 1.0 : -1.0;
  float slideX = k < 0.5 ? 0.0 : dir * 1.2 * (1.0 - levelT);
  float flatT = smoothstep(0.0, 1.0, clamp(uFlatten * 1.5 - (4.0 - ring) * 0.1, 0.0, 1.0));
  float sink = (colH - 1.0) * flatT;
  float rise = (1.0 - scale) * -0.6;
  vec3 c = vec3(i - ${HALF.toFixed(1)} + slideX, k + 0.5 - sink + rise, j - ${HALF.toFixed(1)});

  vec3 R, U, N;
  if (face == 0)      { R = vec3(0.0, 0.0, -1.0); U = vec3(-1.0, 0.0, 0.0); N = vec3(0.0, 1.0, 0.0); }
  else if (face == 1) { R = vec3(0.0, 0.0, -1.0); U = vec3(0.0, 1.0, 0.0);  N = vec3(1.0, 0.0, 0.0); }
  else if (face == 2) { R = vec3(0.0, 0.0, 1.0);  U = vec3(0.0, 1.0, 0.0);  N = vec3(-1.0, 0.0, 0.0); }
  else if (face == 3) { R = vec3(1.0, 0.0, 0.0);  U = vec3(0.0, 1.0, 0.0);  N = vec3(0.0, 0.0, 1.0); }
  else                { R = vec3(-1.0, 0.0, 0.0); U = vec3(0.0, 1.0, 0.0);  N = vec3(0.0, 0.0, -1.0); }

  float size = ${CUBE.toFixed(2)} * scale;
  vec3 p = c + (R * position.x + U * position.y) * size + N * size * 0.5;

  vUv = uv;
  vN = N;
  vBase = aBase;
  vDeep = aDeep;
  vInk = aInk;
  vWord = aMeta.w;
  vUni = aUni;
  vAo = mix(mix(0.84, 1.0, clamp(c.y / 4.5, 0.0, 1.0)), 1.0, flatT);
  vId = aId;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}
`;

export const fragmentShader = /* glsl */ `
uniform sampler2D uAtlas;
uniform vec3 uInkLine;
uniform vec3 uGlow;
uniform vec3 uCore;
uniform float uTime;
uniform float uUniverse;
uniform vec4 uComets[${COMETS}]; // face id, start, duration, strength

layout(location = 0) out highp vec4 outColor;

varying vec2 vUv;
varying vec3 vN;
varying vec3 vBase;
varying vec3 vDeep;
varying vec3 vInk;
varying float vWord;
varying float vUni;
varying float vAo;
varying float vId;

const vec3 L = normalize(vec3(0.45, 1.0, 0.3));

void main() {
  float ndl = clamp(dot(vN, L), 0.0, 1.0);
  vec3 col = mix(mix(vBase, vDeep, 0.3), vBase, ndl) * vAo;

  if (vWord > -0.5) {
    float w = floor(vWord + 0.5);
    vec2 cell = vec2(mod(w, 4.0), floor(w / 4.0));
    vec2 auv = vec2((cell.x + vUv.x) / 4.0, 1.0 - (cell.y + 1.0 - vUv.y) / 4.0);
    float a = texture2D(uAtlas, auv).a;
    col = mix(col, vInk, a);
  }

  vec2 d2 = min(vUv, 1.0 - vUv);
  float d = min(d2.x, d2.y);
  float fw = fwidth(d);
  float edge = 1.0 - smoothstep(0.006, 0.006 + fw * 1.5, d);
  col = mix(col, uInkLine, edge * 0.5);

  float s;
  if (d == vUv.y) s = vUv.x;
  else if (d == 1.0 - vUv.x) s = 1.0 + vUv.y;
  else if (d == 1.0 - vUv.y) s = 3.0 - vUv.x;
  else s = 4.0 - vUv.y;

  float glow = 0.0;
  float core = 0.0;
  for (int n = 0; n < ${COMETS}; n++) {
    vec4 cm = uComets[n];
    if (abs(cm.x - vId) > 0.5 || cm.w <= 0.0) continue;
    float head = (uTime - cm.y) / cm.z * 4.0;
    float dt = head - s;
    const float tail = 1.6;
    if (dt > 0.0 && dt < tail) {
      float k = 1.0 - dt / tail;
      k *= k;
      glow = max(glow, exp(-d * 9.0) * k * cm.w);
      core = max(core, (1.0 - smoothstep(0.035, 0.035 + fw * 1.5, d)) * k * cm.w);
    }
  }
  col = mix(col, uGlow, clamp(glow * 1.6, 0.0, 1.0));
  col = mix(col, uCore, clamp(core, 0.0, 1.0));

  float alpha = mix(1.0, max(edge * 0.85, max(glow, core)), uUniverse * vUni);
  outColor = vec4(col * alpha, alpha);
}
`;
