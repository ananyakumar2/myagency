import * as THREE from "three";

import { COLORS, LINE_OPACITY } from "./constants";

const edgeVertex = /* glsl */ `
varying vec3 vLocalPosition;

void main() {
  vLocalPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

// Edges of a unit box drawn 1 px wide on screen at any distance, plus one
// diagonal across the top face.
const edgeFragment = /* glsl */ `
precision highp float;

uniform vec3 uColor;
uniform float uOpacity;
uniform float uDiagonalOpacity;

varying vec3 vLocalPosition;

const float LINE_HALF_WIDTH_PX = 0.5;

void main() {
  vec3 p = vLocalPosition;
  vec3 ap = abs(p);

  vec2 faceUv;
  if (ap.x >= ap.y && ap.x >= ap.z) {
    faceUv = p.yz;
  } else if (ap.y >= ap.x && ap.y >= ap.z) {
    faceUv = p.xz;
  } else {
    faceUv = p.xy;
  }

  vec2 faceEdgeDist = 0.5 - abs(faceUv);
  vec2 faceDeriv = max(fwidth(faceUv), vec2(1e-4));
  vec2 faceDistPx = faceEdgeDist / faceDeriv;
  float edgeDistPx = min(faceDistPx.x, faceDistPx.y);
  float edgesAlpha = 1.0 - step(LINE_HALF_WIDTH_PX, edgeDistPx);

  float topFaceMask = 1.0 - step(0.001, abs(vLocalPosition.y - 0.5));
  float diagonalDistance = abs(vLocalPosition.x + vLocalPosition.z);
  float diagonalDeriv = max(fwidth(vLocalPosition.x + vLocalPosition.z), 1e-4);
  float diagonalDistPx = diagonalDistance / diagonalDeriv;
  float diagonalAlpha = (1.0 - step(LINE_HALF_WIDTH_PX, diagonalDistPx)) * topFaceMask;

  float alpha = max(edgesAlpha, diagonalAlpha * uDiagonalOpacity) * uOpacity;

  if (alpha <= 0.0) {
    discard;
  }

  gl_FragColor = vec4(uColor, alpha);
}`;

export const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
export const planeGeometry = new THREE.PlaneGeometry(1, 1);

export type EdgeMaterial = THREE.ShaderMaterial & {
  uniforms: {
    uColor: { value: THREE.Color };
    uOpacity: { value: number };
    uDiagonalOpacity: { value: number };
  };
};

export function createEdgeMaterial(layerOpacity: number): EdgeMaterial {
  const material = new THREE.ShaderMaterial({
    vertexShader: edgeVertex,
    fragmentShader: edgeFragment,
    uniforms: {
      uColor: { value: new THREE.Color(COLORS.line) },
      uOpacity: { value: LINE_OPACITY * layerOpacity },
      uDiagonalOpacity: { value: 1 },
    },
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
  }) as EdgeMaterial;
  material.userData.baseOpacity = LINE_OPACITY * layerOpacity;
  return material;
}

export function createPlaneMaterial(opacity: number) {
  const material = new THREE.MeshBasicMaterial({
    color: COLORS.plane,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    opacity,
  });
  material.userData.baseOpacity = opacity;
  return material;
}

export function createTextMaterial(opacity: number) {
  const material = new THREE.MeshBasicMaterial({
    color: COLORS.text,
    transparent: true,
    side: THREE.DoubleSide,
    opacity,
  });
  material.userData.baseOpacity = opacity;
  return material;
}
