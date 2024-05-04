/**
 * @author Masaru Yamagishi <akai_inu@live.jp>
 * @license Apache-2.0
 * @copyright 2022 Masaru Yamagishi
 */

import {
  CascadedShadowGenerator,
  Color3,
  DirectionalLight,
  Engine,
  FreeCamera,
  Mesh,
  MeshBuilder,
  Ray,
  Scene,
  SceneLoader,
  ShadowGenerator,
  StandardMaterial,
  Texture,
  Vector3,
} from "@babylonjs/core";
import { SkyMaterial } from "@babylonjs/materials";
import "@babylonjs/loaders/glTF/2.0";

import main from "../lib";

async function createScene(engine: Engine): Promise<Scene> {
  const scene = new Scene(engine);
  const camera = new FreeCamera("mainCamera", Vector3.One(), scene);
  camera.position = new Vector3(2, 20, 20);
  camera.setTarget(new Vector3(2, 20, 19));
  camera.attachControl(true);
  const light = new DirectionalLight("mainLight", new Vector3(100.0, -500.0, 0.0), scene);
  light.autoCalcShadowZBounds = true;

  const shadow = new CascadedShadowGenerator(1024, light);
  shadow.autoCalcDepthBounds = true;
  createGround(scene);
  createSky(scene);
  await createTrees(scene, shadow);
  return scene;
}

function createGround(scene: Scene): void {
  const scale = 50;
  const tex = new Texture("https://assets.babylonjs.com/textures/grass.png", scene);
  tex.uScale = scale;
  tex.vScale = scale;
  const texN = new Texture("https://assets.babylonjs.com/textures/grassn.png", scene);
  texN.uScale = scale;
  texN.vScale = scale;
  const mat = new StandardMaterial("groundMat", scene);
  mat.diffuseTexture = tex;
  mat.bumpTexture = texN;
  mat.specularColor = Color3.Black();
  const ground = MeshBuilder.CreateGroundFromHeightMap(
    "ground",
    "https://assets.babylonjs.com/textures/heightMap.png",
    {
      width: scale * 10,
      height: scale * 10,
      subdivisions: 50,
      maxHeight: 20,
      updatable: false,
    },
    scene,
  );
  ground.material = mat;
  ground.receiveShadows = true;
  ground.checkCollisions = true;
}

function createSky(scene: Scene): void {
  const mat = new SkyMaterial("sky", scene);
  mat.azimuth = 0.25;
  mat.inclination = 0.15;
  mat.luminance = 0.8;
  mat.mieCoefficient = 0.015;
  mat.mieDirectionalG = 0.9;
  mat.rayleigh = 1.2;
  mat.turbidity = 7;
  mat.cullBackFaces = false;

  const mesh = MeshBuilder.CreateBox("skybox", { size: 1000 }, scene);
  mesh.infiniteDistance = true;
  mesh.material = mat;
}

async function createTrees(scene: Scene, shadow: ShadowGenerator): Promise<void> {
  for (let i = 1; i <= 4; i++) {
    const url = `https://assets.babylonjs.com/meshes/villagePack/tree${i}/`;
    const name = `tree${i}.glb`;

    SceneLoader.ImportMeshAsync("", url, name, scene)
      .then(async (result) => {
        placeTree(scene, 100, 500, result.meshes[1] as Mesh, shadow);
      });
  }
}

function placeTree(scene: Scene, count: number, size: number, mesh: Mesh, shadow: ShadowGenerator): void {
  mesh.setParent(null);
  mesh.setEnabled(false);
  mesh.checkCollisions = true;

  for (let i = 0; i < count; i++) {
    const instance = mesh.createInstance(`${mesh.name}_${i}`);
    instance.position = new Vector3(Math.random() * size - (size / 2), 0, Math.random() * size - (size / 2));
    instance.rotation = new Vector3(0, Math.random(), Math.PI);
    instance.scaling = new Vector3(Math.random() + 0.5, Math.random() - 1.7, Math.random() + 0.5);
    instance.setEnabled(true);
    instance.checkCollisions = true;
    shadow.addShadowCaster(instance);
    const ray = Ray.CreateNewFromTo(
      new Vector3(instance.position.x, 30, instance.position.z),
      new Vector3(instance.position.x, -1, instance.position.z),
    );
    const pickInfo = scene.pickWithRay(ray, (mesh) => mesh.name === "ground", true);
    if (pickInfo && pickInfo.pickedPoint) {
      instance.position.y = pickInfo.pickedPoint.y;
    }
  }
}

main(createScene);
