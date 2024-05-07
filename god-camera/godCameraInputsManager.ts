/**
 * @author Masaru Yamagishi <akai_inu@live.jp>
 * @license Apache-2.0
 * @copyright 2024 Masaru Yamagishi
 */

import { CameraInputsManager } from "@babylonjs/core/Cameras/cameraInputsManager";
import { serialize } from "@babylonjs/core/Misc/decorators";
import type { Nullable } from "@babylonjs/core/types";
import type { GodCamera } from "./godCamera";
import { GodCameraMoveInput } from "./godCameraMoveInput";
import { GodCameraMoveInputKeyBindings } from "./godCameraMoveInputKeyBindings";
import { GodCameraMoveInputParameters } from "./godCameraMoveInputParameters";

/**
 * Default Inputs manager for the GodCamera.
 * It groups all the default supported inputs for ease of use.
 * @see https://doc.babylonjs.com/features/featuresDeepDive/cameras/customizingCameraInputs
 */
export class GodCameraInputsManager extends CameraInputsManager<GodCamera> {
  @serialize()
  private keyboard: Nullable<GodCameraMoveInput> = null;
  // /**
  //  * @internal
  //  */
  // public _mouseInput: Nullable<GodCameraMouseInput> = null;
  // /**
  //  * @internal
  //  */
  // public _mouseWheelInput: Nullable<GodCameraMouseWheelInput> = null;

  /**
   * Add keyboard input support to the input manager.
   * @returns the current input manager
   */
  public addKeyboard(
    keyBindings = new GodCameraMoveInputKeyBindings(),
    parameters = new GodCameraMoveInputParameters()
  ): GodCameraInputsManager {
    if (!this.keyboard) {
      this.keyboard = new GodCameraMoveInput(keyBindings, parameters);
      this.add(this.keyboard);
    }
    return this;
  }

  /**
   * {@inheritdoc}
   */
  public getClassName(): string {
    return "GodCameraInputsManager";
  }

  // /**
  //  * Add mouse input support to the input manager.
  //  * @param touchEnabled if the GodCameraMouseInput should support touch (default: true)
  //  * @returns the current input manager
  //  */
  // addMouse(touchEnabled = true): GodCameraInputsManager {
  //   if (!this._mouseInput) {
  //     this._mouseInput = new GodCameraMouseInput(touchEnabled);
  //     this.add(this._mouseInput);
  //   }
  //   return this;
  // }

  // /**
  //  * Removes the mouse input support from the manager
  //  * @returns the current input manager
  //  */
  // removeMouse(): GodCameraInputsManager {
  //   if (this._mouseInput) {
  //     this.remove(this._mouseInput);
  //   }
  //   return this;
  // }

  // /**
  //  * Add mouse wheel input support to the input manager.
  //  * @returns the current input manager
  //  */
  // addMouseWheel(): GodCameraInputsManager {
  //   if (!this._mouseWheelInput) {
  //     this._mouseWheelInput = new GodCameraMouseWheelInput();
  //     this.add(this._mouseWheelInput);
  //   }
  //   return this;
  // }

  // /**
  //  * Removes the mouse wheel input support from the manager
  //  * @returns the current input manager
  //  */
  // removeMouseWheel(): GodCameraInputsManager {
  //   if (this._mouseWheelInput) {
  //     this.remove(this._mouseWheelInput);
  //   }
  //   return this;
  // }

  /**
   * Remove all attached input methods from a camera
   */
  public override clear(): void {
    super.clear();
    this.keyboard = null;
  }
}
