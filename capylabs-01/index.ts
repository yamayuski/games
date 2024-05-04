/**
 * @author Masaru Yamagishi <akai_inu@live.jp>
 * @license Apache-2.0
 * @copyright Masaru Yamagishi 2022
 */

import {
  AbstractMesh,
  AssetContainer,
  BoneIKController,
  Camera,
  CascadedShadowGenerator,
  DirectionalLight,
  Engine,
  Mesh,
  MeshBuilder,
  PointerEventTypes,
  PointerInfo,
  Scene,
  SceneLoader,
  ShadowGenerator,
  Sound,
  SSAORenderingPipeline,
  StandardMaterial,
  Texture,
  UniversalCamera,
  Vector3,
} from "@babylonjs/core";
import { AdvancedDynamicTexture, Button, Control, TextBlock } from "@babylonjs/gui";
import "@babylonjs/loaders/glTF/2.0";
import main from "../lib";

main(createScene);

async function createScene(engine: Engine, canvas: HTMLCanvasElement): Promise<Scene> {
  canvas.oncontextmenu = (e) => {
    // disable contextmenu(mouse right click)
    e.preventDefault();
    return false;
  };
  const scene = new Scene(engine);
  scene.gravity = new Vector3(0, -0.15, 0);
  scene.collisionsEnabled = true;

  const camera = new UniversalCamera("camera1", new Vector3(4, 20, -5), scene);
  camera.setTarget(new Vector3(0, 1.7, 0));
  camera.minZ = 2;
  camera.maxZ = 30;
  camera.fovMode = Camera.FOVMODE_HORIZONTAL_FIXED;
  scene.onBeforeRenderObservable.add(() => {
    const t = performance.now();
    camera.position.x = Math.sin(t / 50000) * 10;
    camera.position.z = Math.cos(t / 50000) * 10;
    camera.setTarget(new Vector3(0, 1.7, 0));
  });

  const light = new DirectionalLight("light", new Vector3(0, -15, 7), scene);
  light.intensity = 0.7;

  // Add shadow & SSAO
  // @link https://doc.babylonjs.com/divingDeeper/lights/shadows
  const shadowGenerator = new CascadedShadowGenerator(1024, light);
  new SSAORenderingPipeline("SSAO", scene, 1.0, [camera]);

  // loading assets
  engine.displayLoadingUI();

  createGround(scene);
  const playerModel = await createPlayer(scene, shadowGenerator);
  const enemyAssets = await createEnemyBase(scene, shadowGenerator);
  const shootSound = await loadShootSound(scene);
  const explodeSound = await loadExplodeSound(scene);
  const shootParticle = await loadShootParticle(scene);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const switchScene = (sceneName: SceneState, context?: any): any => {
    switch (sceneName) {
      case SceneState.TITLE:
        return new TitleScene(scene, switchScene);
      case SceneState.IN_GAME:
        return new InGameScene(scene, {
          playerModel,
          enemyAssets,
          shadowGenerator,
          camera,
          shootSound,
          explodeSound,
          shootParticle,
          switchScene,
        });
      case SceneState.GAMEOVER:
        return new GameoverScene(scene, {
          switchScene,
          score: context.score,
        });
    }
  };

  switchScene(SceneState.TITLE);

  engine.hideLoadingUI();

  return scene;
}

enum SceneState {
  TITLE = "TITLE",
  IN_GAME = "IN_GAME",
  GAMEOVER = "GAMEOVER",
}

/**
* dispose objects
*/
type Disposable = () => void;

/**
* trigger to switch to next scene
*/
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SwitchSceneState = (sceneName: SceneState, context?: any) => void;

class TitleScene {
  public constructor(
    scene: Scene,
    switchScene: SwitchSceneState,
  ) {
    const advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("UI", true, scene);

    const text1 = new TextBlock();
    text1.top = -100;
    text1.text = "CapyLabs 01";
    text1.color = "#ffffff";
    text1.fontSize = 60;
    text1.shadowBlur = 3;
    text1.shadowOffsetX = 1;
    text1.shadowOffsetY = 1;
    text1.shadowColor = "#111";
    text1.fontFamily = "Impact, fantasy";
    advancedTexture.addControl(text1);

    const text2 = new TextBlock();
    text2.top = 100;
    text2.text = "Click to start";
    text2.color = "#ffffff";
    text2.fontSize = 30;
    text2.shadowBlur = 3;
    text2.shadowOffsetX = 1;
    text2.shadowOffsetY = 1;
    text2.shadowColor = "#000000";
    text2.fontFamily = "Impact, fantasy";
    advancedTexture.addControl(text2);

    setTimeout(() => {
      const clickToStart = scene.onPointerObservable.add((event) => {
        if (event.type !== PointerEventTypes.POINTERDOWN || event.event.button !== 0) {
          return;
        }
        scene.onPointerObservable.remove(clickToStart);
        advancedTexture.dispose();
        switchScene(SceneState.IN_GAME);
      });
    }, 10);
  }
}

class InGameScene {
  private readonly spawnTimeList = [
    0,
    150,
    800,
    1500,
    2100,
    2500,
    3500,
    3900,
    4600,
    4700,
    5500,
    6000,
    6200,
    6300,
  ];

  private readonly clearTime = 13000;

  private readonly shootSpeed = 0.03;

  private disposables: Disposable[] = [];
  private scoreText?: TextBlock;
  private score = 0;

  public constructor(
    private readonly scene: Scene,
    private readonly opts: {
      playerModel: Mesh,
      enemyAssets: AssetContainer,
      shadowGenerator: ShadowGenerator,
      camera: UniversalCamera,
      shootSound: Sound,
      explodeSound: Sound,
      shootParticle: Mesh,
      switchScene: SwitchSceneState,
    },
  ) {
    setTimeout(() => {
      this.disposables.push(this.addUI());
      this.disposables.push(this.spawnEnemy());
      this.disposables.push(this.observeMouse());
      this.disposables.push(this.observeShoot());
      this.disposables.push(this.observeClear());
    }, 10);
  }

  private addUI(): Disposable {
    const advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("InGameUI", true, this.scene);
    const text1 = new TextBlock();
    text1.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    text1.top = "10px";
    text1.height = "60px";
    text1.text = "Score: 0";
    text1.color = "#ffffff";
    text1.fontSize = 60;
    text1.shadowBlur = 3;
    text1.shadowOffsetX = 1;
    text1.shadowOffsetY = 1;
    text1.shadowColor = "#111";
    text1.fontFamily = "Impact, fantasy";
    advancedTexture.addControl(text1);
    this.scoreText = text1;

    return () => {
      text1.dispose();
      advancedTexture.dispose();
    };
  }

  private addScore(count: number): void {
    this.score += Math.round(count);
    if (this.scoreText) {
      this.scoreText.text = `Score: ${this.score}`;
    }
  }

  private spawnEnemy(): Disposable {
    const timeouts: number[] = [];

    for (const time of this.spawnTimeList) {
      timeouts.push(setTimeout(() => {
        this.disposables.push(this.instanciateEnemy());
      }, time) as unknown as number);
    }

    return () => {
      for (const timeout of timeouts) {
        clearTimeout(timeout);
      }
    };
  }

  private observeMouse(): Disposable {
    const look = () => {
      const p = this.scene.pick(
        this.scene.pointerX,
        this.scene.pointerY,
        (mesh) => mesh.name === "ground",
        true,
        this.opts.camera,
      );
      if (!p.hit || !p.pickedPoint) {
        return;
      }
      this.opts.playerModel.lookAt(new Vector3(p.pickedPoint.x, 2, p.pickedPoint.z));

      // disable pitch rotation
      this.opts.playerModel.rotation.x = 0;
    };

    const lookObserver = this.scene.onBeforeRenderObservable.add(look);

    return () => {
      this.scene.onBeforeRenderObservable.remove(lookObserver);
    };
  }

  private observeShoot(): Disposable {
    const onPointer = (event: PointerInfo) => {
      if (event.type !== PointerEventTypes.POINTERDOWN || event.event.button !== 0) {
        return;
      }
      this.shoot(this.opts.playerModel.forward.clone());
    };

    const observer = this.scene.onPointerObservable.add(onPointer);

    return () => {
      this.scene.onPointerObservable.remove(observer);
    };
  }

  private observeClear(): Disposable {
    const timeout = setTimeout(() => {
      this.disposables.forEach((d) => d());
      this.disposables = [];
      this.opts.switchScene(SceneState.GAMEOVER, { score: this.score });
    }, this.clearTime);

    return () => {
      clearTimeout(timeout);
    };
  }

  private shoot(pos: Vector3): void {
    const mesh = MeshBuilder.CreateSphere(`bullet-${Date.now()}`, {}, this.scene);
    mesh.scaling = new Vector3(0.3, 0.3, 0.3);
    mesh.position = pos.clone();
    mesh.position.y = 1.7;
    mesh.checkCollisions = true;

    this.opts.shootSound.setPlaybackRate((Math.random() * 0.3) + 0.85);
    this.opts.shootSound.play();
    showShootParticle(this.opts.shootParticle, new Vector3(pos.x, 1.7, pos.z), 50);

    const shouldDisappear = (pos: Vector3): boolean => {
      const amount = 100.0;
      return Vector3.Distance(Vector3.Zero(), pos) > amount;
    }

    const dispose = () => {
      mesh.dispose();
      this.scene.onBeforeRenderObservable.removeCallback(move);
      mesh.onCollideObservable.removeCallback(onCollide);
    };

    const onCollide = (at: AbstractMesh) => {
      if (at.name.startsWith("enemy-")) {
        dispose();
        at.dispose();
      }
    };

    const move = () => {
      const speed = this.shootSpeed * this.scene.getEngine().getDeltaTime();
      mesh.moveWithCollisions(pos.normalize().multiplyByFloats(speed, speed, speed));
      if (shouldDisappear(mesh.position)) {
        dispose();
      }
    };

    this.scene.onBeforeRenderObservable.add(move);
    mesh.onCollideObservable.add(onCollide);
  }

  private instanciateEnemy(): Disposable {
    const HEIGHT = 1.2;
    const entries = this.opts.enemyAssets.instantiateModelsToScene(() => `enemy-${Date.now()}`, true);
    const mesh = entries.rootNodes[0] as Mesh;
    mesh.position = new Vector3(0, 1000, 0);
    mesh.rotate(Vector3.Up(), Math.random() * Math.PI * 2);
    mesh.translate(mesh.forward, 4);
    mesh.position.y = HEIGHT;
    mesh.lookAt(new Vector3(0, HEIGHT, 0));
    mesh.isVisible = true;
    mesh.checkCollisions = true;

    entries.animationGroups[0].start(true);
    this.opts.shadowGenerator.addShadowCaster(mesh);

    const shouldDisappear = (pos: Vector3): boolean => {
      const amount = 2.0;
      return Vector3.DistanceSquared(Vector3.Zero(), pos) < amount;
    }

    const dispose = (): void => {
      mesh.onCollideObservable.removeCallback(onCollide);
      this.scene.onBeforeRenderObservable.removeCallback(move);
      mesh.dispose();
    }

    const onCollide = (at: AbstractMesh): void => {
      if (at.name.startsWith("bullet-")) {
        console.log("hit with bullet");
        dispose();
        at.dispose();
        this.opts.explodeSound.setPlaybackRate((Math.random() * 0.3) + 0.85);
        this.opts.explodeSound.play();
        this.addScore(Vector3.DistanceSquared(Vector3.Zero(), at.position));
      }
    };

    const move = () => {
      mesh.lookAt(new Vector3(0, HEIGHT, 0));
      const speed = 0.004 * this.scene.getEngine().getDeltaTime();
      mesh.moveWithCollisions(mesh.forward.normalize().multiplyByFloats(speed, speed, speed));
      if (shouldDisappear(mesh.position)) {
        // hit to player
        console.log("hit to player!");
        dispose();
        this.disposables.forEach((d) => d());
        this.disposables = [];
        this.opts.switchScene(SceneState.GAMEOVER, { score: this.score });
      }
    };

    this.scene.onBeforeRenderObservable.add(move);
    mesh.onCollideObservable.add(onCollide);

    return dispose;
  }
}

class GameoverScene {
  public constructor(scene: Scene, opts: {
    switchScene: SwitchSceneState,
    score: number,
  }) {
    const advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("GameoverUI", true, scene);

    const text1 = new TextBlock();
    text1.top = -150;
    text1.text = "Gameover!";
    text1.color = "black";
    text1.fontSize = 60;
    text1.shadowBlur = 3;
    text1.shadowOffsetX = 1;
    text1.shadowOffsetY = 1;
    text1.shadowColor = "white";
    text1.fontFamily = "Impact, fantasy";
    advancedTexture.addControl(text1);

    const textScore = new TextBlock();
    textScore.top = -100;
    textScore.text = `Score: ${opts.score}`;
    textScore.color = "black";
    textScore.fontSize = 60;
    textScore.shadowBlur = 3;
    textScore.shadowOffsetX = 1;
    textScore.shadowOffsetY = 1;
    textScore.shadowColor = "white";
    textScore.fontFamily = "Impact, fantasy";
    advancedTexture.addControl(textScore);

    const text2 = new TextBlock();
    text2.top = 100;
    text2.text = "Right Click to restart";
    text2.color = "#ffffff";
    text2.fontSize = 30;
    text2.shadowBlur = 3;
    text2.shadowOffsetX = 1;
    text2.shadowOffsetY = 1;
    text2.shadowColor = "#000000";
    text2.fontFamily = "Impact, fantasy";
    advancedTexture.addControl(text2);

    const btn = Button.CreateSimpleButton(`tweet`, `ツイートする`);
    btn.top = -50;
    btn.onPointerClickObservable.add(() => {
      const url = [
        `https://twitter.com/intent/tweet?`,
        `text=${encodeURIComponent(`CapyLabs01 でスコア ${opts.score} 獲得！`)}`,
        `&url=${encodeURIComponent("https://playground.babylonjs.com/#ZHRWSL#49")}`,
        `&hashtags=CapyLabs01`,
      ].join("");
      window.open(url, "_blank");
    });
    btn.background = "#1C9BF2";
    btn.color = "#FDFFFC";
    btn.width = 0.2;
    btn.height = "40px";
    advancedTexture.addControl(btn);

    setTimeout(() => {
      const clickToRestart = scene.onPointerObservable.add((event) => {
        if (event.type !== PointerEventTypes.POINTERDOWN || event.event.button !== 2) {
          return;
        }
        btn.dispose();
        scene.onPointerObservable.remove(clickToRestart);
        advancedTexture.dispose();
        opts.switchScene(SceneState.TITLE);
      });
    }, 10);
  }
}

async function loadShootParticle(scene: Scene): Promise<Mesh> {
  return new Promise((resolve) => {
    const name = Date.now();
    const particleTex = new Texture("https://assets.babylonjs.com/textures/sparkStretched.png", scene);
    particleTex.hasAlpha = true;
    const particleMat = new StandardMaterial(`particle-${name}`, scene);
    particleMat.diffuseTexture = particleTex;
    particleMat.useAlphaFromDiffuseTexture = true;
    const particleMesh = MeshBuilder.CreatePlane(`particle-mesh-${name}`, {}, scene);
    particleMesh.material = particleMat;
    particleMesh.position.y = 1.7;
    particleMesh.billboardMode = Mesh.BILLBOARDMODE_ALL;
    particleMesh.isVisible = false;
    resolve(particleMesh);
  });
}

function showShootParticle(baseMesh: Mesh, pos: Vector3, time: number): void {
  const mesh = baseMesh.clone();
  mesh.position = pos.clone();
  mesh.position.y = 1.7;
  mesh.isVisible = true;
  setTimeout(() => {
    mesh.dispose();
  }, time);
}

/**
* @link https://doc.babylonjs.com/divingDeeper/audio/playingSoundsMusic
*/
async function loadShootSound(scene: Scene): Promise<Sound> {
  return new Promise((resolve) => {
    const sound: Sound = new Sound(
      "gunshot",
      "https://playground.babylonjs.com/sounds/gunshot.wav",
      scene,
      () => resolve(sound),
      { loop: false, autoplay: false },
    );
  });
}

async function loadExplodeSound(scene: Scene): Promise<Sound> {
  return new Promise((resolve) => {
    const sound: Sound = new Sound(
      "gunshot",
      "https://assets.babylonjs.com/sound/cannonBlast.mp3",
      scene,
      () => resolve(sound),
      { loop: false, autoplay: false },
    );
  });
}

function createPlayer(scene: Scene, shadowGenerator: ShadowGenerator): Promise<Mesh> {
  return new Promise((resolve) => {
    SceneLoader.LoadAssetContainer("https://playground.babylonjs.com/scenes/Dude/", "Dude.babylon", scene, function (assets) {
      assets.addAllToScene();
      const him = assets.meshes[0];
      him.scaling = new Vector3(0.03, 0.03, 0.03);

      // Right hand IK Controller
      const targetMeshR = MeshBuilder.CreateSphere("targetMeshR", {}, scene);
      targetMeshR.isVisible = false;
      targetMeshR.parent = him;
      targetMeshR.position.x = 3;
      targetMeshR.position.y = 60;
      targetMeshR.position.z = 12;
      const poleTargetMeshR = MeshBuilder.CreateSphere("poleTargetMeshR", {}, scene);
      poleTargetMeshR.isVisible = false;
      poleTargetMeshR.parent = him;
      poleTargetMeshR.position.x = -100;
      poleTargetMeshR.position.y = 200;
      const rightIKControl = new BoneIKController(him, assets.skeletons[0].bones[14], { targetMesh: targetMeshR, poleTargetMesh: poleTargetMeshR, poleAngle: Math.PI });

      // Left hand IK Controller
      const targetMeshL = MeshBuilder.CreateSphere("targetMeshL", {}, scene);
      targetMeshL.isVisible = false;
      targetMeshL.parent = him;
      targetMeshL.position.x = -4;
      targetMeshL.position.y = 60;
      targetMeshL.position.z = 20;
      const poleTargetMeshL = MeshBuilder.CreateSphere("poleTargetMeshL", {}, scene);
      poleTargetMeshL.isVisible = false;
      poleTargetMeshL.parent = him;
      poleTargetMeshL.position.x = 0;
      poleTargetMeshL.position.y = 100;
      const leftIKControl = new BoneIKController(him, assets.skeletons[0].bones[33], { targetMesh: targetMeshL, poleTargetMesh: poleTargetMeshL, poleAngle: Math.PI });
      assets.skeletons[0].bones[16].rotation = new Vector3()

      const gun = MeshBuilder.CreateBox("gun", { width: 4, height: 3, size: 20 }, scene);
      gun.parent = him;
      gun.position.y = 65;
      gun.position.z = 20;
      const gunHolder = MeshBuilder.CreateBox("gunHolder", { width: 3, height: 2, size: 6 }, scene);
      gunHolder.parent = him;
      gunHolder.position.y = 62;
      gunHolder.position.z = 13;

      shadowGenerator.addShadowCaster(him, true);

      scene.registerBeforeRender(() => {
        rightIKControl.update();
        leftIKControl.update();
      });

      resolve(assets.meshes[0] as Mesh);
    });
  });
}

function createEnemyBase(scene: Scene, shadowGenerator: ShadowGenerator): Promise<AssetContainer> {
  return new Promise((resolve) => {
    SceneLoader.LoadAssetContainer("https://models.babylonjs.com/", "aerobatic_plane.glb", scene, function (assets) {
      const mesh = assets.meshes[0];
      mesh.isVisible = false;
      mesh.position = new Vector3(1000, 1000, 1000);
      mesh.scaling = new Vector3(5, 5, 5);
      shadowGenerator.addShadowCaster(mesh, true);

      resolve(assets);
    });
  });
}

function createGround(scene: Scene): void {
  const ground = MeshBuilder.CreateGround("ground", { width: 50, height: 50 }, scene);
  ground.checkCollisions = true;

  // Add ground textures
  const scale = 15;
  const texture = new Texture("https://assets.babylonjs.com/textures/ParallaxDiffuse.png", scene);
  texture.uScale = scale;
  texture.vScale = scale;
  const textureBump = new Texture("https://assets.babylonjs.com/textures/ParallaxNormal.png", scene);
  textureBump.uScale = scale;
  textureBump.vScale = scale;
  const material = new StandardMaterial("mat1", scene);
  material.diffuseTexture = texture;
  material.bumpTexture = textureBump;
  material.useParallax = true;
  material.useParallaxOcclusion = true;
  material.parallaxScaleBias = 0.05;
  ground.material = material;
  ground.receiveShadows = true;
}
