import * as THREE from "three";
import { Text } from "troika-three-text";

import {
  FILLER_DEPTH,
  FILLER_HALF_WIDTH,
  FIRST_WORD_LAYER,
  FACE_OPACITY,
  FONT_SIZE,
  FONT_URL,
  LETTER_SPACING,
  LINE_HEIGHT,
  MAX_LAYER,
  MIN_LAYER,
  NO_TOP_LAYER,
  SMALL_ROWS,
  SUNK_LAYER_OPACITY,
  WORDS,
  WORD_COLUMN_STEP,
  WORD_LAYER_START,
  WORD_LAYER_STEP,
} from "./constants";
import {
  boxGeometry,
  createEdgeMaterial,
  createPlaneMaterial,
  createTextMaterial,
  planeGeometry,
  type EdgeMaterial,
} from "./materials";

export type LayerConfig = { columnMin: number; columnMax: number; cubesPerColumn: number; shouldHide: boolean };

/**
 * Bottom to top: the 5×5, 3×3 and 1×1 rows, six 11-wide filler slabs three
 * cubes deep, then the 9×9 and 7×7 rows. The conveyor later moves the three
 * small rows to the top, which completes the 165-cube pyramid.
 */
export function layerConfig(layer: number): LayerConfig {
  const smallFirst = MIN_LAYER;
  const smallLast = smallFirst + SMALL_ROWS - 1;
  const bigFirst = MAX_LAYER - SMALL_ROWS + 2;
  if (layer >= smallFirst && layer <= smallLast) {
    const size = 2 * (SMALL_ROWS - 1 - (layer - smallFirst)) + 1;
    const half = (size - 1) / 2;
    return { columnMin: -half, columnMax: half, cubesPerColumn: size, shouldHide: false };
  }
  if (layer >= bigFirst && layer <= MAX_LAYER) {
    const size = 2 * -(smallFirst + (layer - bigFirst)) + 1;
    const half = (size - 1) / 2;
    return { columnMin: -half, columnMax: half, cubesPerColumn: size, shouldHide: false };
  }
  return { columnMin: -FILLER_HALF_WIDTH, columnMax: FILLER_HALF_WIDTH, cubesPerColumn: FILLER_DEPTH, shouldHide: true };
}

/** Each layer sits further back the further it is from layer 0. */
export function layerDepth(layer: number) {
  const d = Math.abs(layer);
  if (d === 0) return 0;
  return -(0.25 * Math.min(d, 1) + 0.5 * Math.min(Math.max(d - 1, 0), 1) + Math.max(d - 2, 0));
}

/** Outer columns bow back like an amphitheatre. */
export function columnDepth(column: number) {
  const c = Math.abs(column);
  let z = 0;
  for (let i = 1; i <= c; i++) z += 0.25 * Math.min(Math.ceil(i / 2), 4);
  return -z;
}

export type LayerMaterials = {
  line: EdgeMaterial;
  planes: THREE.MeshBasicMaterial[];
  texts: THREE.MeshBasicMaterial[];
};

export type LayerRenderables = {
  lineMeshes: THREE.Mesh[];
  planeMeshes: THREE.Mesh[][];
  textMeshesByMaterial: Map<THREE.Material, Text[]>;
};

export type Lattice = {
  group: THREE.Group;
  layers: THREE.Group[];
  layerMaterials: LayerMaterials[];
  layerRenderables: LayerRenderables[];
  /** The opening word and the two behind it, in depth order. */
  openingTexts: Text[];
  openingMidMaterial: THREE.MeshBasicMaterial;
  firstWordMaterial: THREE.MeshBasicMaterial;
  texts: Text[];
  totalCubes: number;
  ready: Promise<void>;
};

const FACES: { position: [number, number, number]; rotation: [number, number, number] }[] = [
  { position: [0, 0, 0.5], rotation: [0, 0, 0] },
  { position: [-0.5, 0, 0], rotation: [0, Math.PI / 2, 0] },
  { position: [0.5, 0, 0], rotation: [0, Math.PI / 2, 0] },
  { position: [0, 0.5, 0], rotation: [-Math.PI / 2, 0, 0] },
];

function setupText(text: Text, value: string) {
  text.text = value;
  text.font = FONT_URL;
  text.fontSize = FONT_SIZE;
  text.lineHeight = FONT_SIZE * LINE_HEIGHT;
  text.letterSpacing = LETTER_SPACING;
  text.anchorX = "center";
  text.anchorY = "middle";
}

export function buildLattice(): Lattice {
  const baseMaterial = createTextMaterial(1);
  const make = (value: string) => {
    const t = new Text();
    t.material = baseMaterial;
    setupText(t, value);
    return t;
  };
  const frontBase = WORDS.front.map(make);
  const sideBase = WORDS.side.map(make);
  const texts: Text[] = [];
  const cloneText = (source: Text, material: THREE.Material) => {
    const t = source.clone();
    t.material = material;
    texts.push(t);
    return t;
  };

  const group = new THREE.Group();
  group.position.set(0, -2, 0.25);

  const layers: THREE.Group[] = [];
  const layerMaterials: LayerMaterials[] = [];
  const layerRenderables: LayerRenderables[] = [];
  const openingTexts: Text[] = [];
  let firstWordMaterial: THREE.MeshBasicMaterial | null = null;
  let openingMidMaterial: THREE.MeshBasicMaterial | null = null;
  let totalCubes = 0;
  let layerCounter = WORD_LAYER_START;

  for (let layer = MIN_LAYER; layer <= MAX_LAYER; layer++) {
    const layerGroup = new THREE.Group();
    group.add(layerGroup);
    layers.push(layerGroup);
    const config = layerConfig(layer);
    const depth = Math.abs(layer);
    const opacity = layer < 0 ? (SUNK_LAYER_OPACITY[depth - 1] ?? 0) : 1;

    const line = createEdgeMaterial(opacity);
    const text = createTextMaterial(opacity);
    const planes = FACE_OPACITY.map((o) => createPlaneMaterial(o * opacity));
    const isOpeningLayer = layer === FIRST_WORD_LAYER;
    const first = isOpeningLayer ? (firstWordMaterial = createTextMaterial(opacity)) : null;
    const mid = isOpeningLayer ? (openingMidMaterial = createTextMaterial(opacity)) : null;
    layerMaterials.push({ line, planes, texts: [text, ...(first ? [first] : []), ...(mid ? [mid] : [])] });

    layerGroup.userData.layerIndex = layer;
    layerGroup.userData.shouldHide = config.shouldHide;
    layerGroup.position.set(0, layer, layerDepth(layer));
    layerGroup.userData.basePosition = layerGroup.position.clone();

    const lineMeshes: THREE.Mesh[] = [];
    const planeMeshes: THREE.Mesh[][] = [[], [], [], []];
    const textMeshesByMaterial = new Map<THREE.Material, Text[]>();
    const register = (mesh: Text, material: THREE.Material) => {
      const list = textMeshesByMaterial.get(material) ?? [];
      if (!textMeshesByMaterial.has(material)) textMeshesByMaterial.set(material, list);
      list.push(mesh);
    };

    let columnCounter = 0;
    for (let column = config.columnMin; column <= config.columnMax; column++) {
      const columnGroup = new THREE.Group();
      layerGroup.add(columnGroup);
      columnGroup.position.set(column, 0, columnDepth(column));
      let wordIndex = layerCounter * WORD_LAYER_STEP + columnCounter * WORD_COLUMN_STEP;

      for (let d = 0; d < config.cubesPerColumn; d++) {
        const cube = new THREE.Group();
        columnGroup.add(cube);
        totalCubes += 1;
        cube.position.set(0, 0, -d);

        const edges = new THREE.Mesh(boxGeometry, line);
        cube.add(edges);
        lineMeshes.push(edges);

        const isFirst = !!(first && column === 0 && d === 0);
        const isMid = !!(mid && column === 0 && d > 0 && d < 3);
        const frontMaterial = isFirst ? first! : isMid ? mid! : text;
        const front = ((wordIndex % WORDS.front.length) + WORDS.front.length) % WORDS.front.length;
        const sideCount = WORDS.side.length;
        const side = (((front + column * 2) % sideCount) + sideCount) % sideCount;

        const frontText = cloneText(frontBase[front]!, frontMaterial);
        frontText.position.z = 0.501;
        register(frontText, frontMaterial);
        cube.add(frontText);
        if (isFirst || isMid) {
          frontText.userData.basePosition = frontText.position.clone();
          openingTexts.push(frontText);
        }

        const sideText = cloneText(sideBase[side]!, text);
        sideText.position.set(-0.501, 0, 0);
        sideText.rotation.y = Math.PI * 0.5;
        register(sideText, text);
        cube.add(sideText);

        FACES.forEach((face, i) => {
          if (layer === NO_TOP_LAYER && i === 3) return;
          const plane = new THREE.Mesh(planeGeometry, planes[i]);
          plane.position.set(...face.position);
          plane.rotation.set(...face.rotation);
          cube.add(plane);
          planeMeshes[i]!.push(plane);
        });

        wordIndex += 1;
      }
      columnCounter += 1;
    }

    layerRenderables.push({ lineMeshes, planeMeshes, textMeshesByMaterial });
    layerCounter += 1;
  }

  const ready = Promise.all(
    texts.map((t) => new Promise<void>((resolve) => t.sync(resolve))),
  ).then(() => {
    frontBase.forEach((t) => t.dispose());
    sideBase.forEach((t) => t.dispose());
  });

  return {
    group,
    layers,
    layerMaterials,
    layerRenderables,
    openingTexts,
    openingMidMaterial: openingMidMaterial!,
    firstWordMaterial: firstWordMaterial!,
    texts,
    totalCubes,
    ready,
  };
}

const VISIBLE = 0.001;

export type VisibilityState = { line: boolean; planes: boolean[]; texts: Map<THREE.Material, boolean> };

export const createVisibilityStates = (renderables: LayerRenderables[]): VisibilityState[] =>
  renderables.map(() => ({ line: true, planes: [true, true, true, true], texts: new Map() }));

/** Hides whole groups of meshes once their shared material is fully transparent, so they cost no draw calls. */
export function syncVisibility(materials: LayerMaterials[], renderables: LayerRenderables[], states: VisibilityState[]) {
  materials.forEach((m, i) => {
    const r = renderables[i];
    const s = states[i];
    if (!r || !s) return;
    const lineVisible = m.line.uniforms.uOpacity.value > VISIBLE;
    if (lineVisible !== s.line) {
      s.line = lineVisible;
      r.lineMeshes.forEach((mesh) => (mesh.visible = lineVisible));
    }
    m.planes.forEach((p, f) => {
      const v = p.opacity > VISIBLE;
      if (v !== s.planes[f]) {
        s.planes[f] = v;
        r.planeMeshes[f]?.forEach((mesh) => (mesh.visible = v));
      }
    });
    m.texts.forEach((t) => {
      const v = t.opacity > VISIBLE;
      const meshes = r.textMeshesByMaterial.get(t);
      if (!meshes?.length) return;
      if (s.texts.get(t) !== v) {
        s.texts.set(t, v);
        meshes.forEach((mesh) => (mesh.visible = v));
      }
    });
  });
}
