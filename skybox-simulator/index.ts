/**
 * @author Masaru Yamagishi <akai_inu@live.jp>
 * @license Apache-2.0
 * @copyright 2022 Masaru Yamagishi
 * @link https://playground.babylonjs.com/#F3P4BS#6
 */

import {
  ArcRotateCamera,
  CubeTexture,
  DirectionalLight,
  Engine,
  MeshBuilder,
  PBRMaterial,
  ReflectionProbe,
  Scene,
  SceneLoader,
  StandardMaterial,
  Texture,
  Vector3,
} from "@babylonjs/core";
import {
  AdvancedDynamicTexture,
  Button,
  Control,
  Slider,
  StackPanel,
  TextBlock,
} from "@babylonjs/gui";
import { SkyMaterial } from "@babylonjs/materials";
import main from "../lib";

import "@babylonjs/loaders/glTF/2.0";

async function createScene(engine: Engine): Promise<Scene> {
  const scene = new Scene(engine);
  const camera = new ArcRotateCamera("mainCamera", 0, Math.PI / 4, 10, Vector3.Zero(), scene);
  camera.attachControl(true);
  new DirectionalLight("mainLight", new Vector3(0.1, -1, 0.1), scene);

  // Environment reflection sphere
  const sphereMat = new PBRMaterial("sphere_mat", scene);
  const sphere = MeshBuilder.CreateSphere("sphere", { diameter: 2, segments: 32 }, scene);
  sphere.material = sphereMat;
  sphere.position.y = 1;

  // BoomBox
  const result = await SceneLoader.ImportMeshAsync("", "https://playground.babylonjs.com/scenes/", "BoomBox.glb", scene);
  result.meshes[1].scaling = new Vector3(100, 100, 100);
  result.meshes[1].position = new Vector3(0, 1, 3);
  result.meshes[1].rotation = new Vector3(0, Math.PI / 2, 0);

  MeshBuilder.CreateBox("ground", { width: 3, height: 0.1, depth: 9 }, scene);

  // Skybox mesh
  const skybox = MeshBuilder.CreateBox("skybox", { size: 1000 }, scene);
  skybox.infiniteDistance = true;

  // ReflectionProbe
  const reflectionProbe = new ReflectionProbe("reflection_probe", 256, scene, false);
  reflectionProbe.renderList?.push(skybox);
  scene.environmentTexture = reflectionProbe.cubeTexture;

  const gui = AdvancedDynamicTexture.CreateFullscreenUI("gui", true, scene);

  // static textures
  const textures = [
    {
      name: "skybox",
      path: "https://assets.babylonjs.com/skyboxes/skybox/skybox_py.jpg",
    },
    {
      name: "skybox2",
      path: "https://assets.babylonjs.com/skyboxes/skybox2/skybox2_py.jpg",
    },
    {
      name: "skybox3",
      path: "https://assets.babylonjs.com/skyboxes/skybox3/skybox3_py.jpg",
    },
    {
      name: "skybox4",
      path: "https://assets.babylonjs.com/skyboxes/skybox4/skybox4_py.jpg",
    },
    {
      name: "toySky",
      path: "https://assets.babylonjs.com/skyboxes/toySky/toySky_py.jpg",
    },
    {
      name: "TropicalSunnyDay",
      path: "https://assets.babylonjs.com/skyboxes/TropicalSunnyDay/TropicalSunnyDay_py.jpg",
    },
  ];

  textures.forEach((t, index) => {
    const btn = Button.CreateImageButton(`skybox-${t.name}`, t.name, t.path);
    btn.width = 0.2;
    btn.height = "40px";
    btn.color = "white";
    btn.background = "black";
    btn.top = index * 40;
    btn.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    btn.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    btn.onPointerClickObservable.add(() => {
      // apply the material
      skybox.material = createSkyboxMaterial(scene, t.path);
    });
    gui.addControl(btn);
  });

  prepareSkyMaterial(scene, gui);

  return scene;
}

function createSkyboxMaterial(scene: Scene, pyJpg: string): StandardMaterial {
  const tex = CubeTexture.CreateFromImages([
    pyJpg.replace("_py.", "_px."),
    pyJpg.replace("_py.", "_py."),
    pyJpg.replace("_py.", "_pz."),
    pyJpg.replace("_py.", "_nx."),
    pyJpg.replace("_py.", "_ny."),
    pyJpg.replace("_py.", "_nz."),
  ], scene);
  const mat = new StandardMaterial(`skybox_mat_${pyJpg}`, scene);
  mat.reflectionTexture = tex;
  mat.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
  mat.disableLighting = true;
  mat.backFaceCulling = false;
  return mat;
}

function prepareSkyMaterial(scene: Scene, gui: AdvancedDynamicTexture): void {
  const mat = new SkyMaterial("sky_mat", scene);
  mat.backFaceCulling = false;

  const panel = new StackPanel("sky_mat_panel");
  panel.width = 0.2;
  panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  gui.addControl(panel);

  const button = Button.CreateSimpleButton("enable_sky", "ENABLE SkyMaterial");
  button.height = "40px";
  button.color = "white";
  button.background = "black";
  button.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  button.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  button.onPointerClickObservable.add(() => {
    const skyboxMesh = scene.getMeshByName("skybox")!;
    skyboxMesh.material = mat;
  });
  panel.addControl(button);

  const controls = [
    {
      property: "azimuth",
      minimum: 0.0,
      maximum: 1.0,
      step: 0.01,
      default: 0.25,
    },
    {
      property: "inclination",
      minimum: -0.5,
      maximum: 0.5,
      step: 0.05,
      default: 0.49,
    },
    {
      property: "luminance",
      minimum: 0.001,
      maximum: 0.999,
      step: 0.05,
      default: 1.0,
    },
    {
      property: "mieCoefficient",
      minimum: 0.001,
      maximum: 0.1,
      step: 0.001,
      default: 0.005,
    },
    {
      property: "mieDirectionalG",
      minimum: 0.0,
      maximum: 1.0,
      step: 0.05,
      default: 0.8,
    },
    {
      property: "rayleigh",
      minimum: 0.0,
      maximum: 10.0,
      step: 0.1,
      default: 2.0,
    },
    {
      property: "turbidity",
      minimum: 0.0,
      maximum: 100.0,
      step: 1,
      default: 10.0,
    },
  ];

  for (const index in controls) {
    const control = controls[index];
    const header = new TextBlock();
    header.text = `${control.property}:${control.default}`;
    header.height = "30px";
    header.color = "white";
    panel.addControl(header);

    const slider = new Slider();
    slider.height = "20px";
    slider.minimum = control.minimum;
    slider.maximum = control.maximum;
    slider.value = control.default;
    slider.step = control.step;
    slider.onValueChangedObservable.add((value) => {
      header.text = `${control.property}:${value}`;
      (mat as any)[control.property] = value;
    });
    panel.addControl(slider);
  }
}

main(createScene);
