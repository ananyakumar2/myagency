import * as THREE from "three";
import { CustomEase } from "gsap/CustomEase";

import { gsap, ScrollTrigger } from "@/lib/motion/gsap";

import {
  CAMERA,
  CONVEYOR_STEPS,
  DIVE,
  EASE_IN,
  EASE_IN_CURVE,
  EASE_OUT,
  EASE_OUT_CURVE,
  FLATTEN_DURATION,
  FONT_SIZE,
  LINE_HEIGHT,
  MAX_PIXEL_RATIO,
  PYRAMID_LENGTH,
  SECTION_TAIL,
  SENTENCE_MOBILE_FIRST_X,
  SENTENCE_X,
  SENTENCE_Y_NUDGE,
  START_OFFSET,
  STEP,
} from "./constants";
import { buildLattice, createVisibilityStates, layerConfig, syncVisibility, type Lattice, type VisibilityState } from "./structure";
import { applyTilt, createPointerTilt, createTiltWeight } from "./pointer-tilt";

let easesRegistered = false;
function registerEases() {
  if (easesRegistered) return;
  CustomEase.create(EASE_IN, EASE_IN_CURVE);
  CustomEase.create(EASE_OUT, EASE_OUT_CURVE);
  easesRegistered = true;
}

export type CubeSceneElements = {
  /** The tall section that scroll is measured against. */
  section: HTMLElement;
  /** Sticky full-viewport host the canvas is appended to. */
  target: HTMLElement;
  /** Full-viewport layer that fades in during the dive. */
  windowWrap?: HTMLElement | null;
  /** Centred element sized to a cube's top face every frame. */
  windowInner?: HTMLElement | null;
};

export type CubeSceneOptions = {
  /** Opening sentence size in CSS px, standing in for the hero line the scene grows out of. */
  sentenceFontSize?: () => number;
  onReady?: () => void;
};

const TOP_FACE = [
  new THREE.Vector3(-0.5, 0.5, -0.5),
  new THREE.Vector3(0.5, 0.5, -0.5),
  new THREE.Vector3(0.5, 0.5, 0.5),
  new THREE.Vector3(-0.5, 0.5, 0.5),
];

export class CubeScene {
  private els: CubeSceneElements;
  private options: CubeSceneOptions;
  private sizes = { width: 0, height: 0 };
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private viewCamera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private lattice: Lattice;
  private visibility: VisibilityState[];
  private pointerTilt = createPointerTilt();
  private tiltWeight = createTiltWeight();
  private cameraTarget = new THREE.Vector3(0, 0, 0);
  private arc = {
    startPos: new THREE.Vector3(),
    endPos: new THREE.Vector3(),
    startTarget: new THREE.Vector3(),
    endTarget: new THREE.Vector3(),
    upStart: new THREE.Vector3(),
    upEnd: new THREE.Vector3(),
  };
  private scratch = new THREE.Vector3();
  private worldPos = new THREE.Vector3();
  private timeline: gsap.core.Timeline | null = null;
  private animations: gsap.core.Animation[] = [];
  private running = false;
  private inView = false;
  private disposed = false;
  private observer: IntersectionObserver | null = null;
  private windowState = { opacity: 0 };

  hoverAllowed = true;

  constructor(els: CubeSceneElements, options: CubeSceneOptions = {}) {
    registerEases();
    this.els = els;
    this.options = options;
    this.updateSizes();

    this.camera = new THREE.PerspectiveCamera(75, this.aspect, CAMERA.near, CAMERA.far);
    this.camera.position.set(0, 0, CAMERA.radius);
    this.camera.lookAt(this.cameraTarget);
    this.applyCameraZoom(1);
    this.viewCamera = this.camera.clone();
    this.setupArcPoints();

    this.renderer = new THREE.WebGLRenderer({ alpha: true });
    this.applyRendererSize();

    this.lattice = buildLattice();
    this.visibility = createVisibilityStates(this.lattice.layerRenderables);
    this.scene.add(this.lattice.group);

    this.buildTimeline();
    this.layoutOpeningSentence();

    els.target.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.display = "block";
    this.renderer.domElement.style.width = "100%";
    this.renderer.domElement.style.height = "100%";

    this.lattice.ready.then(() => {
      if (this.disposed) return;
      this.layoutOpeningSentence();
      this.draw();
      this.options.onReady?.();
    });

    this.observer = new IntersectionObserver(([entry]) => {
      this.inView = !!entry?.isIntersecting;
      this.syncLoop();
    });
    this.observer.observe(els.section);
    window.addEventListener("resize", this.handleResize);
  }

  get totalCubes() {
    return this.lattice.totalCubes;
  }

  private get aspect() {
    return (this.sizes.width || 1) / (this.sizes.height || 1);
  }

  private updateSizes() {
    this.sizes.width = this.els.target.clientWidth || window.innerWidth;
    this.sizes.height = this.els.target.clientHeight || window.innerHeight;
  }

  private applyRendererSize() {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
    this.renderer.setSize(this.sizes.width, this.sizes.height, false);
  }

  private handleResize = () => {
    this.updateSizes();
    this.camera.aspect = this.aspect;
    this.camera.updateProjectionMatrix();
    this.applyRendererSize();
    this.layoutOpeningSentence();
    if (!this.running) this.draw();
  };

  private setupArcPoints() {
    const endZ = -PYRAMID_LENGTH * 0.5;
    const a = this.arc;
    a.startPos.set(0, 0, CAMERA.radius);
    a.startTarget.set(0, 0, 0);
    a.upStart.set(0, 1, 0);
    a.endTarget.set(0, 4, endZ);
    a.endPos.set(0, CAMERA.elevation, endZ);
    const endRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, Math.PI, "XYZ"));
    a.upEnd.set(0, 1, 0).applyQuaternion(endRotation);
  }

  /** Half-circle in x/z from the start to the end position, while rising and tipping the camera's up over. */
  private applyArcPhase(v: number) {
    const a = this.arc;
    const cx = (a.startPos.x + a.endPos.x) * 0.5;
    const cz = (a.startPos.z + a.endPos.z) * 0.5;
    const ox = a.startPos.x - cx;
    const oz = a.startPos.z - cz;
    const angle = Math.PI * v * CAMERA.arcDirection;
    const c = this.camera;
    c.position.x = cx + ox * Math.cos(angle) - oz * Math.sin(angle);
    c.position.z = cz + ox * Math.sin(angle) + oz * Math.cos(angle);
    c.position.y = THREE.MathUtils.lerp(a.startPos.y, a.endPos.y, v);
    this.cameraTarget.lerpVectors(a.startTarget, a.endTarget, v);
    c.up.lerpVectors(a.upStart, a.upEnd, v).normalize();
    c.lookAt(this.cameraTarget);
  }

  /** Dolly-zoom: the frame height at the target stays 2 / zoom cubes whatever the distance. */
  private applyCameraZoom(zoom: number) {
    const c = this.camera;
    const distance = Math.max(c.position.distanceTo(this.cameraTarget), CAMERA.radius * 0.25);
    c.fov = THREE.MathUtils.radToDeg(2 * Math.atan(CAMERA.halfHeight / (zoom * distance)));
    c.updateProjectionMatrix();
  }

  private visibleHeightAt(point: THREE.Vector3) {
    const c = this.camera;
    return 2 * Math.max(c.position.distanceTo(point), 0.001) * Math.tan(THREE.MathUtils.degToRad(c.fov) / 2);
  }

  /**
   * Before the conveyor starts, the opening word and the two behind it stand
   * as a three-line sentence at a set screen size, then shrink onto their
   * cube faces (timeline 0.2 to 0.75).
   */
  private layoutOpeningSentence() {
    const texts = this.lattice.openingTexts;
    const fontPx = this.options.sentenceFontSize?.() ?? 0;
    if (!texts.length || !this.sizes.height || !fontPx) return;
    this.lattice.group.updateMatrixWorld(true);
    const lineStep = FONT_SIZE * LINE_HEIGHT;
    const desktop = window.innerWidth >= 1024;
    const base0 = texts[0]!.userData.basePosition.x as number;
    const xs = desktop ? [base0, ...SENTENCE_X.desktop] : [base0 + SENTENCE_MOBILE_FIRST_X, ...SENTENCE_X.mobile];
    // Only while the words have not started moving onto their faces.
    if ((this.timeline?.time() ?? 0) > 0.2) return;
    texts.forEach((t, i) => {
      t.getWorldPosition(this.worldPos);
      const scale = (fontPx * this.visibleHeightAt(this.worldPos)) / (FONT_SIZE * this.sizes.height);
      t.scale.setScalar(scale);
      t.position.x = (xs[i] ?? 0) * scale;
      t.position.y = (lineStep * (1 - i) + SENTENCE_Y_NUDGE) * scale;
    });
  }

  private get visibleLayers() {
    return this.lattice.layers.filter((l) => !l.userData.shouldHide);
  }

  private materialsWhere(hidden: boolean) {
    return this.lattice.layerMaterials.filter((_, i) => !!this.lattice.layers[i]?.userData.shouldHide === hidden);
  }

  private setupInitialOpacity() {
    const m = this.lattice.layerMaterials;
    gsap.set(m.map((x) => x.line.uniforms.uOpacity), { value: 0 });
    gsap.set([...m.flatMap((x) => x.texts), ...m.flatMap((x) => x.planes)], { opacity: 0 });
    gsap.set(this.lattice.firstWordMaterial, { opacity: 1 });
  }

  /** 0 to 0.75: the sentence settles onto its cubes while the lattice fades in around it. */
  private revealTimeline() {
    const tl = gsap.timeline();
    const m = this.lattice.layerMaterials;
    tl.to(this.lattice.openingMidMaterial, { opacity: 1, ease: EASE_OUT, duration: 0.25 }, 0);
    this.lattice.openingTexts.forEach((t) => {
      tl.to(t.position, { x: t.userData.basePosition.x, y: 0, ease: "none", duration: 0.5 }, 0.2).to(
        t.scale,
        { x: 1, y: 1, z: 1, ease: "none", duration: 0.5 },
        0.25,
      );
    });
    tl.to(
      m.map((x) => x.texts[0]!),
      { opacity: (_: number, target: THREE.Material) => target.userData.baseOpacity ?? 1, ease: EASE_IN, duration: 0.5 },
      0.25,
    );
    tl.to(
      m.map((x) => x.line.uniforms.uOpacity),
      { value: (i: number) => m[i]!.line.userData.baseOpacity, ease: EASE_OUT, duration: 0.5 },
      0.25,
    );
    tl.to(
      m.flatMap((x) => x.planes),
      { opacity: (_: number, target: THREE.Material) => target.userData.baseOpacity, ease: EASE_OUT, duration: 0.5 },
      0.25,
    );
    return tl;
  }

  /**
   * 0.75 to 2.25: three steps. Every layer slides down one level (and to that
   * level's depth), taking on that level's opacity; the bottom layer jumps
   * straight to the top.
   */
  private conveyorTimeline() {
    const tl = gsap.timeline();
    const { layers, layerMaterials } = this.lattice;
    const count = layers.length;
    for (let step = 0; step < CONVEYOR_STEPS; step++) {
      const shift = step + 1;
      const stepTl = gsap.timeline();
      tl.add(stepTl);
      layers.forEach((layer, a) => {
        const slot = (((a - shift) % count) + count) % count;
        const dest = layers[slot]!.userData.basePosition as THREE.Vector3;
        const destMaterials = layerMaterials[slot]!;
        const own = layerMaterials[a]!;
        const wraps = slot === count - 1;
        const add = (target: gsap.TweenTarget, vars: gsap.TweenVars) =>
          wraps ? stepTl.set(target, vars, 0) : stepTl.to(target, { duration: STEP, ...vars }, 0);
        add(layer.position, { x: dest.x, y: dest.y, z: dest.z, ease: "none" });
        add(own.planes, { opacity: (i: number) => destMaterials.planes[i]!.userData.baseOpacity, ease: EASE_IN });
        add(own.line.uniforms.uOpacity, { value: destMaterials.line.userData.baseOpacity, ease: EASE_IN });
        add(own.texts, { opacity: destMaterials.texts[0]!.userData.baseOpacity, ease: EASE_IN });
      });
    }
    return tl;
  }

  /** 2.25 to 5.25: the filler slabs fade, top diagonals fade, and the bowed pyramid rows straighten. */
  private flattenTimeline() {
    const tl = gsap.timeline({ defaults: { duration: FLATTEN_DURATION } });
    const hidden = this.materialsWhere(true);
    const shown = this.materialsWhere(false);
    tl.to(hidden.map((m) => m.line.uniforms.uOpacity), { value: 0, ease: EASE_OUT });
    tl.to(hidden.flatMap((m) => m.texts), { opacity: 0, ease: EASE_OUT }, "<");
    tl.to(hidden.flatMap((m) => m.planes), { opacity: 0, ease: EASE_OUT }, "<");
    tl.to(shown.map((m) => m.line.uniforms.uDiagonalOpacity), { value: 0, ease: EASE_OUT }, "<");
    this.visibleLayers.forEach((layer) => {
      layer.children.forEach((column) => {
        tl.to(column.position, { z: 0, ease: EASE_IN }, "<");
      });
    });
    return tl;
  }

  private cameraTween(duration: number) {
    const state = { value: 0, zoom: 1 };
    return gsap.to(state, {
      value: 1,
      zoom: CAMERA.unzoomTo,
      ease: "none",
      duration,
      onUpdate: () => {
        this.applyArcPhase(state.value);
        this.applyCameraZoom(state.zoom);
        const tilting = state.value < 0.999;
        this.tiltWeight.setEnabled(tilting);
        this.hoverAllowed = tilting;
      },
    });
  }

  /** From 5.25: the camera drops straight down onto the apex while the lens widens; a window grows from a cube's top face. */
  private diveTimeline() {
    const tl = gsap.timeline();
    const c = this.camera;
    const look = () => c.lookAt(this.cameraTarget);
    const shown = this.materialsWhere(false);
    tl.to(c.position, { y: 0, duration: DIVE.duration, ease: "none" }, 0);
    tl.to(this.cameraTarget, { y: DIVE.targetY, duration: DIVE.duration, ease: "none", onUpdate: look }, "<");
    tl.to(c, { fov: DIVE.fov, duration: DIVE.duration, ease: "none", onUpdate: () => c.updateProjectionMatrix() }, "<");
    tl.to(this.windowState, { opacity: 1, duration: DIVE.windowFadeDuration, ease: "none", onUpdate: this.applyWindowOpacity }, DIVE.windowFadeAt);
    tl.to(shown.map((m) => m.line.uniforms.uOpacity), { value: 0, ease: EASE_OUT, duration: STEP }, DIVE.cubesFadeAt);
    tl.to(shown.flatMap((m) => m.texts), { opacity: 0, ease: EASE_OUT, duration: STEP }, "<");
    tl.to(shown.flatMap((m) => m.planes), { opacity: 0, ease: EASE_OUT, duration: STEP }, "<");
    tl.to({}, { duration: DIVE.windowGrowDuration }, DIVE.windowFadeAt);
    return tl;
  }

  private applyWindowOpacity = () => {
    if (this.els.windowWrap) this.els.windowWrap.style.opacity = String(this.windowState.opacity);
  };

  private buildTimeline() {
    this.setupInitialOpacity();
    syncVisibility(this.lattice.layerMaterials, this.lattice.layerRenderables, this.visibility);
    const first = gsap.timeline().add(this.revealTimeline()).add(this.conveyorTimeline());
    const second = this.flattenTimeline();
    const cameraDuration = second.totalDuration() + first.totalDuration() - CAMERA.startDelay;
    const camera = this.cameraTween(cameraDuration);
    const dive = this.diveTimeline();

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: this.els.section,
        start: START_OFFSET,
        end: "bottom bottom",
        scrub: true,
      },
    });
    tl.add(first, 0).add(second).add(camera, CAMERA.startDelay).add(dive);
    this.timeline = tl;
    this.animations.push(tl);
    this.els.section.style.setProperty("--cube-section-height", `${(tl.totalDuration() + SECTION_TAIL) * 100}lvh`);
    ScrollTrigger.refresh();
  }

  /** The window is sized from the middle cube of the reference layer, like the reference site's video. */
  private referenceCube() {
    const layer = this.lattice.layers.find((l) => l.userData.layerIndex === DIVE.referenceLayer);
    if (!layer) return null;
    const { columnMin, cubesPerColumn } = layerConfig(DIVE.referenceLayer);
    return layer.children[-columnMin]?.children[Math.floor((cubesPerColumn - 1) / 2)] ?? null;
  }

  private updateWindowSize() {
    const inner = this.els.windowInner;
    const cube = this.referenceCube();
    if (!inner || !cube || this.windowState.opacity <= 0) return;
    const w = this.sizes.width;
    const h = this.sizes.height;
    this.camera.updateMatrixWorld();
    this.lattice.group.updateMatrixWorld(true);
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const corner of TOP_FACE) {
      this.scratch.copy(corner).applyMatrix4(cube.matrixWorld).project(this.camera);
      const x = (this.scratch.x * 0.5 + 0.5) * w;
      const y = (-this.scratch.y * 0.5 + 0.5) * h;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    inner.style.width = `${Math.min(maxX - minX, w)}px`;
    inner.style.height = `${Math.min(maxY - minY, h)}px`;
  }

  private syncLoop() {
    const shouldRun = this.inView && !this.disposed;
    if (shouldRun === this.running) return;
    this.running = shouldRun;
    this.renderer.setAnimationLoop(shouldRun ? this.draw : null);
  }

  private draw = () => {
    syncVisibility(this.lattice.layerMaterials, this.lattice.layerRenderables, this.visibility);
    const tilt = this.pointerTilt.update(performance.now());
    const weight = this.tiltWeight.value;
    this.viewCamera.copy(this.camera);
    this.viewCamera.updateProjectionMatrix();
    applyTilt(this.viewCamera, this.cameraTarget, tilt.x * weight, tilt.y * weight);
    this.updateWindowSize();
    this.renderer.render(this.scene, this.viewCamera);
  };

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.renderer.setAnimationLoop(null);
    this.observer?.disconnect();
    window.removeEventListener("resize", this.handleResize);
    this.pointerTilt.dispose();
    this.tiltWeight.dispose();
    this.timeline?.scrollTrigger?.kill();
    this.animations.forEach((a) => a.kill());
    this.animations = [];
    this.lattice.texts.forEach((t) => t.dispose());
    this.lattice.layerMaterials.forEach((m) => {
      m.line.dispose();
      m.planes.forEach((p) => p.dispose());
      m.texts.forEach((t) => t.dispose());
    });
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}