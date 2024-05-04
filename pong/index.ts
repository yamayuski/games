/**
 * @author Masaru Yamagishi <akai_inu@live.jp>
 * @license Apache-2.0
 * @copyright 2022 Masaru Yamagishi
 */

import {
  ArcRotateCamera,
  Color3,
  Color4,
  CubeTexture,
  Engine,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  Quaternion,
  Scene,
  StandardMaterial,
  Texture,
  Vector3,
  VirtualJoystick,
} from "@babylonjs/core";
import { AdvancedDynamicTexture, Control, TextBlock } from "@babylonjs/gui";
import { GridMaterial } from "@babylonjs/materials";

import main from "../lib";

class Stage {
  public constructor(scene: Scene) {
    const skyboxMat = new StandardMaterial("skyboxMat", scene);
    skyboxMat.reflectionTexture = new CubeTexture("https://www.babylonjs-playground.com/textures/TropicalSunnyDay", scene);
    skyboxMat.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
    skyboxMat.disableLighting = true;
    skyboxMat.backFaceCulling = false;

    const skyboxMesh = MeshBuilder.CreateBox("skybox", { size: 1000 }, scene);
    skyboxMesh.infiniteDistance = true;
    skyboxMesh.material = skyboxMat;

    const groundMat = new GridMaterial("groundMat", scene);

    // Ground
    const ground = MeshBuilder.CreateGround("stageGround", {
      width: 5.65,
      height: 8.6,
    }, scene);
    ground.position.y = -0.5;
    ground.material = groundMat;

    // Wall
    const xm = MeshBuilder.CreateGround("xm", {
      height: 8.6,
    }, scene);
    xm.position.x = -5.65 / 2;
    xm.rotationQuaternion = Quaternion.RotationYawPitchRoll(0, 0, -Math.PI / 2);
    xm.material = groundMat;
    const xp = MeshBuilder.CreateGround("xp", {
      height: 8.6,
    }, scene);
    xp.position.x = 5.65 / 2;
    xp.rotationQuaternion = Quaternion.RotationYawPitchRoll(0, 0, Math.PI / 2);
    xp.material = groundMat;

    const zp = MeshBuilder.CreateGround("zp", {
      width: 5.65,
    }, scene);
    zp.position.z = 8.6 / 2;
    zp.rotationQuaternion = Quaternion.RotationYawPitchRoll(0, -Math.PI / 2, 0);
    zp.material = groundMat;
    const zm = MeshBuilder.CreateGround("zm", {
      width: 5.65,
    }, scene);
    zm.position.z = -8.6 / 2;
    zm.rotationQuaternion = Quaternion.RotationYawPitchRoll(0, Math.PI / 2, 0);
    zm.material = groundMat;
  }
}

class ScoreBoard {
  private readonly score1P: TextBlock;
  private readonly score2P: TextBlock;
  private score1PRaw = 0;
  private score2PRaw = 0;

  public constructor(scene: Scene) {
    const tex = AdvancedDynamicTexture.CreateFullscreenUI("gui", true, scene);
    this.score1P = new TextBlock("1p score", "0");
    this.score1P.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    this.score1P.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    this.score1P.left = "300px";
    this.score1P.top = "10px";
    this.score1P.color = "#FFFFFF";
    this.score1P.outlineColor = "#000000";
    this.score1P.fontSize = "32px";
    tex.addControl(this.score1P);

    this.score2P = new TextBlock("2p score", "0");
    this.score2P.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    this.score2P.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    this.score2P.left = "-300px";
    this.score2P.top = "10px";
    this.score2P.color = "#FFFFFF";
    this.score2P.outlineColor = "#000000";
    this.score2P.fontSize = "32px";
    tex.addControl(this.score2P);

    const scoreBar = new TextBlock("bar", "-");
    scoreBar.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    scoreBar.top = "10px";
    scoreBar.color = "#FFFFFF";
    scoreBar.outlineColor = "#000000";
    scoreBar.fontSize = "32px";
    tex.addControl(scoreBar);
  }

  public incrementScore1P() {
    this.score1PRaw++;
    this.score1P.text = `${this.score1PRaw}`;
  }

  public incrementScore2P() {
    this.score2PRaw++;
    this.score2P.text = `${this.score2PRaw}`;
  }
}

class Player {
  private readonly SPEED = 0.0025;
  private readonly joystick = new VirtualJoystick(false, { limitToContainer: true });
  public constructor(private readonly mesh: Mesh) {
  }

  public update(deltaTime: number): void {
    if (this.joystick.pressed) {
      this.mesh.position.x = Math.max(
        -2.33,
        Math.min(
          2.33,
          this.mesh.position.x - this.joystick.deltaPosition.y * deltaTime * this.SPEED,
        ),
      );
    }
  }
}

class Enemy {
  public constructor(private readonly mesh: Mesh) {
  }

  public update(deltaTime: number): void {
    // TODO
  }
}

class Ball extends EventTarget {
  private readonly SPEED = 0.0025;

  private velocity: Vector3;
  public constructor(private readonly mesh: Mesh) {
    super();
    this.velocity = new Vector3(
      Math.random() * 2 * Math.PI - Math.PI,
      0,
      Math.random() * 2 * Math.PI - Math.PI,
    ).normalize();
  }

  public update(deltaTime: number): void {
    // move
    this.mesh.position.addInPlace(new Vector3(
      deltaTime * this.velocity.x * this.SPEED,
      0,
      deltaTime * this.velocity.z * this.SPEED,
    ));

    // Hit with bar

    // goal
    if (this.mesh.position.z > 3.9) {
      this.dispatchEvent(new GoalEvent(true));
      this.velocity = Vector3.Reflect(this.velocity, new Vector3(0, 0, -1));
    } else if (this.mesh.position.z < -3.9) {
      this.dispatchEvent(new GoalEvent(false));
      this.velocity = Vector3.Reflect(this.velocity, new Vector3(0, 0, 1));
    }

    // reflect upper/lower
    if (this.mesh.position.x > 2.4) {
      this.velocity = Vector3.Reflect(this.velocity, new Vector3(-1, 0, 0));
    } else if (this.mesh.position.x < -2.4) {
      this.velocity = Vector3.Reflect(this.velocity, new Vector3(1, 0, 0));
    }
  }
}

class GoalEvent extends Event {
  public constructor(public readonly is1P: boolean) {
    super("GoalEvent");
  }
}

async function createScene(engine: Engine): Promise<Scene> {
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0, 0, 0, 1);
  const camera = new ArcRotateCamera("mainCamera", 0, 1, 8, Vector3.Zero(), scene);
  camera.useAutoRotationBehavior = true;
  const light = new HemisphericLight("mainLight", new Vector3(1, 1, 0), scene);
  light.groundColor = new Color3(0.5, 0.5, 0.5);

  new Stage(scene);

  const playerMesh = MeshBuilder.CreateBox("player1Mesh", {
    updatable: true,
  }, scene);
  playerMesh.scaling = new Vector3(1, 1, 0.05);
  playerMesh.position = new Vector3(0, 0, 3.5);
  const player = new Player(playerMesh);

  const enemyMesh = MeshBuilder.CreateBox("player1Mesh", {
    updatable: true,
  }, scene);
  enemyMesh.scaling = new Vector3(1, 1, 0.05);
  enemyMesh.position = new Vector3(0, 0, -3.5);
  const enemy = new Enemy(enemyMesh);

  const ballMesh = MeshBuilder.CreateBox("ballMesh", {
    updatable: true,
  }, scene);
  ballMesh.scaling = new Vector3(0.2, 0.2, 0.2);
  const ball = new Ball(ballMesh);

  const board = new ScoreBoard(scene);

  ball.addEventListener("GoalEvent", (evt) => {
    if (evt instanceof GoalEvent) {
      if (evt.is1P) {
        board.incrementScore1P();
      } else {
        board.incrementScore2P();
      }
    }
  });

  scene.registerBeforeRender(() => {
    const deltaTime = engine.getDeltaTime();
    player.update(deltaTime);
    enemy.update(deltaTime);
    ball.update(deltaTime);
  });

  return scene;
}

main(createScene);
