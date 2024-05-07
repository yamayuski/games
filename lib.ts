/**
 * @author Masaru Yamagishi <akai_inu@live.jp>
 * @license Apache-2.0
 * @copyright 2022 Masaru Yamagishi
 */

import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import "@babylonjs/core/Loading/loadingScreen";
import "@babylonjs/core/Materials/standardMaterial";

import "./lib.css";

export default async function main(createScene: (engine: Engine, canvas: HTMLCanvasElement) => Promise<Scene>): Promise<void> {
  const $canvas = document.getElementById("app") as HTMLCanvasElement | null;
  if (!$canvas) {
    throw new Error("canvas#app not found");
  }
  const engine = new Engine($canvas);
  engine.displayLoadingUI();
  const scene = await createScene(engine, $canvas);
  engine.hideLoadingUI();

  engine.runRenderLoop(() => {
    scene.render();
  });
  window.addEventListener("resize", () => engine.resize());
}
