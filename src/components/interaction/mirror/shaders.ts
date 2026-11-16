/**
 * Draws one mirrored element (block colour or texture) into the scene buffer.
 * Placement is a homography from the unit square to CSS px: a plain box for
 * most items, the projected corners for items inside CSS 3D. A per-item bend
 * bows two edges (BowImage's vertex bend) before placement; the rounded-box
 * mask is computed on the unbent square so a bowed edge stays rounded.
 */
export const ITEM_VERT = /* glsl */ `#version 300 es
precision highp float;
layout(location = 0) in vec2 aPos;
uniform vec2 uRes;     // CSS px
uniform mat3 uMat;     // unit square (y down) -> CSS px, homogeneous
uniform vec2 uSize;    // the element's own size in CSS px, for the mask
uniform float uBend;   // fraction of the element's size
uniform float uAxis;   // 0: vertical edges bow sideways, 1: horizontal edges bow up/down
out vec2 vLocal;
out vec2 vUv;
out vec2 vWorld;
const float PI = 3.14159265359;
void main() {
  vec2 q = aPos;
  q.x += (1.0 - uAxis) * uBend * sin(PI * aPos.y);
  q.y += uAxis * uBend * sin(PI * aPos.x);
  vec3 h = uMat * vec3(q, 1.0);
  vWorld = h.xy / h.z;
  vLocal = aPos * uSize;
  vUv = aPos;
  vec2 clip = (h.xy / uRes) * 2.0 - h.z;
  gl_Position = vec4(clip.x, -clip.y, 0.0, h.z);
}`;

export const ITEM_FRAG = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform int uMode;       // 0 colour, 1 texture
uniform vec4 uColor;     // straight alpha
uniform vec4 uUvRect;    // texture crop: u0, v0, u1, v1
uniform vec2 uSize;
uniform float uRadius;
uniform vec4 uClip;      // clip rect in CSS px (x, y, w, h); w < 0 disables
uniform float uClipRadius;
uniform float uOpacity;
uniform float uRatio;    // device px per CSS px, for 1-device-px antialiasing
in vec2 vLocal;
in vec2 vUv;
in vec2 vWorld;
out vec4 outColor;

float roundedBox(vec2 p, vec2 halfSize, float r) {
  vec2 q = abs(p) - halfSize + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  vec2 half = uSize * 0.5;
  float aa = 0.75 / uRatio;
  float d = roundedBox(vLocal - half, half, min(uRadius, min(half.x, half.y)));
  float mask = 1.0 - smoothstep(-aa, aa, d);
  if (uClip.z >= 0.0) {
    vec2 ch = uClip.zw * 0.5;
    float dc = roundedBox(vWorld - (uClip.xy + ch), ch, min(uClipRadius, min(ch.x, ch.y)));
    mask *= 1.0 - smoothstep(-aa, aa, dc);
  }
  vec4 c;
  if (uMode == 1) {
    vec2 uv = mix(uUvRect.xy, uUvRect.zw, vUv);
    c = texture(uTex, uv);            // premultiplied on upload
  } else {
    c = vec4(uColor.rgb * uColor.a, uColor.a);
  }
  outColor = c * mask * uOpacity;
}`;

export const POST_VERT = /* glsl */ `#version 300 es
precision highp float;
layout(location = 0) in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos;
  gl_Position = vec4(aPos * 2.0 - 1.0, 0.0, 1.0);
}`;

/**
 * source = screen - bow - lens - shockwave (Auge's composition).
 * The bow pins the screen edges; the lens pulls samples toward the pointer
 * (a bulge), with the three channels pulled by slightly different amounts so
 * edges under the lens split into a faint prism.
 */
export const POST_FRAG = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D uScene;
uniform vec2 uRes;
uniform float uCurve;
uniform float uCurveX;
uniform float uFeather;
uniform vec2 uLensPos;
uniform float uLensR;
uniform float uLensK;
uniform float uPrism;
uniform vec4 uShock[4];   // x, y, radius, amplitude (CSS px)
uniform float uShockW;
in vec2 vUv;
out vec4 outColor;

const float PI = 3.14159265359;

vec2 toUv(vec2 p) { return clamp(vec2(p.x / uRes.x, 1.0 - p.y / uRes.y), vec2(0.0), vec2(1.0)); }

void main() {
  vec2 p = vec2(vUv.x, 1.0 - vUv.y) * uRes;

  float ey = smoothstep(0.0, uFeather, p.y) * smoothstep(0.0, uFeather, uRes.y - p.y);
  float ex = smoothstep(0.0, uFeather, p.x) * smoothstep(0.0, uFeather, uRes.x - p.x);
  vec2 bow = vec2(
    uCurveX * sin(PI * p.y / uRes.y) * ex,
    uCurve * sin(PI * p.x / uRes.x) * ey
  );

  vec2 shock = vec2(0.0);
  for (int i = 0; i < 4; i++) {
    vec4 s = uShock[i];
    if (s.w == 0.0) continue;
    vec2 dd = p - s.xy;
    float dist = length(dd);
    float x = (dist - s.z) / uShockW;
    float ring = exp(-x * x) * sin(x * 2.2);
    shock += (dist > 0.001 ? dd / dist : vec2(0.0)) * ring * s.w;
  }

  vec2 base = p - bow - shock;
  vec2 d = base - uLensPos;
  float spot = exp(-2.0 * dot(d, d) / (uLensR * uLensR));
  vec2 lens = d * spot * uLensK;

  float split = uPrism + length(shock) * 0.004;
  vec4 g = texture(uScene, toUv(base - lens));
  float r = texture(uScene, toUv(base - lens * (1.0 + split) - shock * split * 0.5)).r;
  float b = texture(uScene, toUv(base - lens * (1.0 - split) + shock * split * 0.5)).b;
  outColor = vec4(r, g.g, b, 1.0);
}`;
