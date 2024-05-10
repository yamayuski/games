/**
 * @author Masaru Yamagishi <akai_inu@live.jp>
 * @license Apache-2.0
 * @copyright 2024 Masaru Yamagishi
 */

import type { ICameraInput } from "@babylonjs/core/Cameras/cameraInputsManager";
import { DeviceType } from "@babylonjs/core/DeviceInput/InputDevices/deviceEnums";
import { DeviceSourceManager } from "@babylonjs/core/DeviceInput/InputDevices/deviceSourceManager";
import { DeviceSourceType } from "@babylonjs/core/DeviceInput/internalDeviceSourceManager";
import type { AbstractEngine } from "@babylonjs/core/Engines/abstractEngine";
import type { IKeyboardEvent } from "@babylonjs/core/Events/deviceInputEvents";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { serialize } from "@babylonjs/core/Misc/decorators";
import type { Observer } from "@babylonjs/core/Misc/observable";
import type { Nullable } from "@babylonjs/core/types";
import { GodCamera } from "./godCamera";
import { GodCameraMoveInputKeyBindings } from "./godCameraMoveInputKeyBindings";
import { GodCameraMoveInputParameters } from "./godCameraMoveInputParameters";

/**
 * Keyboard WASD move input for GodCamera
 */
export class GodCameraMoveInput implements ICameraInput<GodCamera> {
  /** @internal */
  public camera: GodCamera;

  @serialize()
  public readonly keyBindings: GodCameraMoveInputKeyBindings;

  @serialize()
  public readonly parameters: GodCameraMoveInputParameters;

  /** on canvas blurred, it will clear all input */
  private _onCanvasBlurObserver: Nullable<Observer<AbstractEngine>> = null;
  /**
   * @see https://doc.babylonjs.com/features/featuresDeepDive/input/deviceSourceManager
   */
  private _deviceSourceManager: Nullable<DeviceSourceManager> = null;
  private _onDeviceConnectedObserver: Nullable<Observer<DeviceSourceType>> = null;
  private _onDeviceDisconnectedObserver: Nullable<Observer<DeviceSourceType>> = null;
  private _onInputChangedObserverMap: Map<number, Observer<IKeyboardEvent>> = new Map();
  private _pressedKeys: Set<number> = new Set();

  public constructor(
    keyBindings: GodCameraMoveInputKeyBindings,
    parameters: GodCameraMoveInputParameters,
  ) {
    this.keyBindings = keyBindings;
    this.parameters = parameters;
  }

  /**
   * {@inheritdoc}
   */
  public getClassName(): string {
    return "GodCameraMoveInput";
  }

  /**
   * {@inheritdoc}
   */
  public getSimpleName(): string {
    return "keyboard";
  }

  /**
   * {@inheritdoc}
   */
  public attachControl(noPreventDefault?: boolean): void {
    const scene = this.camera.getScene();
    if (!scene || this._onCanvasBlurObserver || this._deviceSourceManager) {
      // Already attached
      return;
    }

    this._onCanvasBlurObserver = scene.getEngine().onCanvasBlurObservable.add(() => this.onLostFocus());
    this._deviceSourceManager = new DeviceSourceManager(scene.getEngine());
    // TODO: Other InputType support
    this._deviceSourceManager.getDeviceSources(DeviceType.Keyboard).forEach((keyboard) => {
      this._onInputChangedObserverMap.set(keyboard.deviceSlot, keyboard.onInputChangedObservable.add(this.getOnInputChangedCallback(noPreventDefault)));
    });
    this._onDeviceConnectedObserver = this._deviceSourceManager.onDeviceConnectedObservable.add((device) => {
      if (device.deviceType === DeviceType.Keyboard) {
        this._onInputChangedObserverMap.set(device.deviceSlot, device.onInputChangedObservable.add(this.getOnInputChangedCallback(noPreventDefault)));
      }
    });
    this._onDeviceDisconnectedObserver = this._deviceSourceManager.onDeviceDisconnectedObservable.add((device) => {
      if (this._onInputChangedObserverMap.has(device.deviceSlot)) {
        device.onInputChangedObservable.remove(this._onInputChangedObserverMap.get(device.deviceSlot));
        this._onInputChangedObserverMap.delete(device.deviceSlot);
      }
    });
  }

  private getOnInputChangedCallback(noPreventDefault?: boolean): (input: IKeyboardEvent) => void {
    return (input: IKeyboardEvent) => {
      if (input.metaKey) {
        // Ignore meta key like Windows key, Command key
        return;
      }

      if (input.type === 'keydown') {
        // Keys is pressed
        this._pressedKeys.add(input.inputIndex);
        if (!noPreventDefault) {
          input.preventDefault();
        }
      } else {
        // Keys was released
        this._pressedKeys.delete(input.inputIndex);
        if (!noPreventDefault) {
          input.preventDefault();
        }
      }
    };
  };

  /**
   * {@inheritdoc}
   */
  public detachControl(): void {
    const scene = this.camera.getScene();
    if (!scene) {
      return;
    }

    if (this._onCanvasBlurObserver) {
      scene.getEngine().onCanvasBlurObservable.remove(this._onCanvasBlurObserver);
      this._onCanvasBlurObserver = null;
    }

    if (this._deviceSourceManager) {
      if (this._onDeviceConnectedObserver) {
        this._deviceSourceManager.onDeviceConnectedObservable.remove(this._onDeviceConnectedObserver);
        this._onDeviceConnectedObserver = null;
      }
      if (this._onDeviceDisconnectedObserver) {
        this._deviceSourceManager.onDeviceDisconnectedObservable.remove(this._onDeviceDisconnectedObserver);
        this._onDeviceDisconnectedObserver = null;
      }
      this._onInputChangedObserverMap.clear();
      this._deviceSourceManager.dispose();
      this._deviceSourceManager = null;
    }

    this._pressedKeys.clear();
  }

  /** @internal */
  public onLostFocus(): void {
    // Free all keys
    this._pressedKeys.clear();
  }

  /**
   * {@inheritdoc}
   * @see https://github.com/BabylonJS/Babylon.js/blob/master/packages/dev/core/src/Cameras/Inputs/freeCameraKeyboardMoveInput.ts#L186
   */
  public readonly checkInputs: () => void = () => {
    if (!this.camera.getScene() || this._onInputChangedObserverMap.size === 0) {
      // No keyboards
      return;
    }

    // We will not use functions for speed reasons
    const pressedKeys = Array.from(this._pressedKeys.keys());
    const camera = this.camera;
    let rotateX = 0;
    let rotateY = 0;
    let moveForward = 0;
    let moveUp = 0;
    let moveRight = 0;
    for (let index = 0; index < pressedKeys.length; index++) {
      const inputIndex = pressedKeys[index];

      // Camera rotation
      if (this.keyBindings.keysUpRotation.indexOf(inputIndex) !== -1) {
        rotateX -= 1;
      }
      if (this.keyBindings.keysDownRotation.indexOf(inputIndex) !== -1) {
        rotateX += 1;
      }
      if (this.keyBindings.keysLeftRotation.indexOf(inputIndex) !== -1) {
        rotateY -= 1;
      }
      if (this.keyBindings.keysRightRotation.indexOf(inputIndex) !== -1) {
        rotateY += 1;
      }

      // Camera move
      if (this.keyBindings.keysForward.indexOf(inputIndex) !== -1) {
        moveForward += 1;
      }
      if (this.keyBindings.keysBackward.indexOf(inputIndex) !== -1) {
        moveForward -= 1;
      }
      if (this.keyBindings.keysUpward.indexOf(inputIndex) !== -1) {
        moveUp += 1;
      }
      if (this.keyBindings.keysDownward.indexOf(inputIndex) !== -1) {
        moveUp -= 1;
      }
      if (this.keyBindings.keysRight.indexOf(inputIndex) !== -1) {
        moveRight += 1;
      }
      if (this.keyBindings.keysLeft.indexOf(inputIndex) !== -1) {
        moveRight -= 1;
      }
    }

    if (rotateX !== 0 || rotateY !== 0) {
      // Actually rotate
      if (rotateX !== 0 && rotateY !== 0) {
        // Diagonal rotation
        rotateX *= Math.SQRT1_2;
        rotateY *= Math.SQRT1_2;
      }
      const rotationSpeedByFrame = ((this.parameters.rotationSpeed * camera.getScene().getEngine().getDeltaTime()) / 1000) * camera._calculateHandednessMultiplier();
      camera.cameraRotation.x += rotateX * rotationSpeedByFrame;
      camera.cameraRotation.y += rotateY * rotationSpeedByFrame;
    }

    if (moveForward !== 0 || moveUp !== 0 || moveRight !== 0) {
      // Actually move
      if (moveForward !== 0 && moveRight !== 0) {
        // Diagonal move
        moveForward *= Math.SQRT1_2;
        moveRight *= Math.SQRT1_2;
      }

      const baseSpeed = this.camera._computeLocalCameraSpeed() * this.parameters.baseSpeedFactor;
      const forward = camera.getDirection(Vector3.Forward());
      camera.position.addInPlace(forward.scale(moveForward * baseSpeed));
      const right = camera.getDirection(Vector3.Right());
      camera.position.addInPlace(right.scale(moveRight * baseSpeed));
      camera.position.y += moveUp * baseSpeed;
    }
  };
}
