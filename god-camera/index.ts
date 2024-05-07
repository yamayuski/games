/**
 * @author Masaru Yamagishi <akai_inu@live.jp>
 * @license Apache-2.0
 * @copyright 2024 Masaru Yamagishi
 */

import { AbstractEngine } from "@babylonjs/core/Engines/abstractEngine";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Scene } from "@babylonjs/core/scene";
import main from "../lib";
import { GodCamera } from "./godCamera";

async function createScene(engine: AbstractEngine): Promise<Scene> {
  const scene = new Scene(engine);
  const camera = new GodCamera("ShooterCamera", new Vector3(0, 5, -10), scene);

  camera.setTarget(Vector3.Zero());
  camera.attachControl(true);
  const light = new HemisphericLight("light1", new Vector3(0, 1, 0), scene);
  light.intensity = 0.7;
  const sphere = MeshBuilder.CreateSphere("sphere", { diameter: 2, segments: 32 }, scene);
  sphere.position.y = 1;
  MeshBuilder.CreateGround("ground", { width: 60, height: 60 }, scene);
  return scene;
}

main(createScene);
