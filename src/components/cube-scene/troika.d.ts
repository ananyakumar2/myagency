declare module "troika-three-text" {
  import type { Material, Mesh } from "three";

  export class Text extends Mesh {
    text: string;
    font: string | null;
    fontSize: number;
    lineHeight: number | "normal";
    letterSpacing: number;
    anchorX: number | string;
    anchorY: number | string;
    material: Material;
    sync(callback?: () => void): void;
    dispose(): void;
    clone(): this;
  }

  export function preloadFont(
    options: { font?: string; characters?: string | string[] },
    callback: () => void,
  ): void;
}
