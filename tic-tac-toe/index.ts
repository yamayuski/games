/**
 * @author Masaru Yamagishi <akai_inu@live.jp>
 * @license Apache-2.0
 * @copyright 2022 Masaru Yamagishi
 */

import {
  ActionManager,
  ArcRotateCamera,
  Color3,
  Color4,
  DirectionalLight,
  Engine,
  ExecuteCodeAction,
  MeshBuilder,
  Quaternion,
  Scene,
  StandardMaterial,
  Vector3,
} from "@babylonjs/core";

import main from "../lib";

async function createScene(engine: Engine): Promise<Scene> {
  let gameState = GameState.INIT;
  let turn = 0;
  const data = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];

  const scene = new Scene(engine);
  scene.clearColor = new Color4(1, 1, 1, 1);
  new ArcRotateCamera("mainCamera", 0, 0, 6, Vector3.Zero(), scene);
  new DirectionalLight("mainLight", new Vector3(0.1, -1, 0.1), scene);

  createTableLine(scene);
  createBackground(scene);

  function is1P() {
    return turn % 2 + 1 === 1;
  }
  function onPicked() {
    for (let x = 0; x < 3; x++) {
      for (let y = 0; y < 3; y++) {
        if (data[x][y] !== 0) {
          continue;
        }
        const mesh = scene.getMeshByName(`ground${x}${y}`);
        if (mesh && mesh.actionManager) {
          mesh.actionManager.dispose();
          mesh.actionManager = null;
        }
        if (gameState === GameState.OVER || !mesh) {
          continue;
        }
        const actionManager = new ActionManager(scene);
        actionManager.registerAction(new ExecuteCodeAction(
          ActionManager.OnPickTrigger,
          () => {
            if (data[x][y] !== 0 || gameState === GameState.OVER) {
              return;
            }
            data[x][y] = turn % 2 + 1;
            if (is1P()) {
              createCircle(mesh.position, scene);
            } else {
              createCross(mesh.position, scene);
            }
            if (wasOver() === -1) {
              setTimeout(() => {
                alert("DRAW");
                gameState = GameState.OVER;
              }, 10);
              return;
            } else if (wasOver() !== 0) {
              setTimeout(() => {
                alert(`${wasOver()}P WIN!`);
                gameState = GameState.OVER;
              }, 10);
              return;
            }
            turn++;
          },
        ));
        mesh.actionManager = actionManager;
      }
    }
  }
  function wasOver() {
    for (let p = 1; p <= 2; p++) {
      if (
        (data[0][0] === p && data[0][1] === p && data[0][2] === p) ||
        (data[1][0] === p && data[1][1] === p && data[1][2] === p) ||
        (data[2][0] === p && data[2][1] === p && data[2][2] === p) ||
        (data[0][0] === p && data[1][0] === p && data[2][0] === p) ||
        (data[0][1] === p && data[1][1] === p && data[2][1] === p) ||
        (data[0][2] === p && data[1][2] === p && data[2][2] === p) ||
        (data[0][0] === p && data[1][1] === p && data[2][2] === p) ||
        (data[2][0] === p && data[1][1] === p && data[0][2] === p)
      ) {
        return p;
      }
    }
    let fulfilled = true;
    for (let x = 0; x < 3; x++) {
      for (let y = 0; y < 3; y++) {
        if (data[x][y] === 0) {
          fulfilled = false;
        }
      }
    }
    if (fulfilled) {
      return -1;
    }
    return 0;
  }
  onPicked();
  gameState = GameState.RUNNING;

  return scene;
}

enum GameState {
  INIT,
  RUNNING,
  OVER,
}

function createBackground(scene: Scene): void {
  for (let x = 0; x < 3; x++) {
    for (let y = 0; y < 3; y++) {
      const mesh = MeshBuilder.CreateGround(`ground${x}${y}`, { width: 2, height: 2 }, scene);
      mesh.position = new Vector3(-2 + 2 * x, 0, -2 + 2 * y);
      const gmat = new StandardMaterial(`groundMat${x}${y}`, scene);
      mesh.material = gmat;
    }
  }
}

function createTableLine(scene: Scene): void {
  const lineMat = new StandardMaterial("mat", scene);
  lineMat.diffuseColor = Color3.Black();
  const line1 = MeshBuilder.CreateBox("line1", { width: 10, height: 0.5, size: 0.1 }, scene);
  line1.material = lineMat;
  line1.position = new Vector3(1, 0, 1);
  const line2 = line1.clone("line2");
  line2.position = new Vector3(1, 0, -1);
  const line3 = line2.clone("line3");
  line3.rotationQuaternion = Quaternion.RotationYawPitchRoll(Math.PI / 2, 0, 0);
  const line4 = line3.clone("line4");
  line4.position = new Vector3(-1, 0, 1);
}

function createCircle(position: Vector3, scene: Scene): void {
  const mat = new StandardMaterial("mat", scene);
  mat.diffuseColor = Color3.Red();
  mat.specularPower = 30.0;
  const circle = MeshBuilder.CreateTorus("disk1", { thickness: 0.2, tessellation: 32 }, scene);
  circle.material = mat;
  circle.position = new Vector3(position.x, 0.1, position.z);
}

function createCross(position: Vector3, scene: Scene): void {
  const mat = new StandardMaterial("mat", scene);
  mat.diffuseColor = Color3.Blue();
  mat.specularPower = 30.0;
  const cross = MeshBuilder.CreateCapsule("cross1", { tessellation: 32 }, scene);
  cross.scaling = new Vector3(0.5, 1, 0.5);
  cross.rotationQuaternion = Quaternion.RotationYawPitchRoll(Math.PI / 4, Math.PI / 2, 0);
  cross.material = mat;
  cross.position = new Vector3(position.x, 0.1, position.z);
  const cross2 = MeshBuilder.CreateCapsule("cross2", { tessellation: 32 }, scene);
  cross2.scaling = new Vector3(0.5, 1, 0.5);
  cross2.rotationQuaternion = Quaternion.RotationYawPitchRoll(-Math.PI / 4, Math.PI / 2, 0);
  cross2.material = mat;
  cross2.position = new Vector3(position.x, 0.1, position.z);
}

main(createScene);
