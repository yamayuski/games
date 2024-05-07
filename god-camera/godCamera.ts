/**
 * @author Masaru Yamagishi <akai_inu@live.jp>
 * @license Apache-2.0
 * @copyright 2024 Masaru Yamagishi
 */

import { TargetCamera } from "@babylonjs/core/Cameras/targetCamera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Tools } from "@babylonjs/core/Misc/tools";
import { Scene } from "@babylonjs/core/scene";
import { GodCameraInputsManager } from "./godCameraInputsManager";

export class GodCamera extends TargetCamera {
  /**
   * {@inheritdoc}
   */
  public constructor(name: string, position: Vector3, scene?: Scene, setActiveOnSceneIfNoneActive?: boolean) {
    super(name, position, scene, setActiveOnSceneIfNoneActive);
    const inputs = new GodCameraInputsManager(this);
    inputs.addKeyboard();
    this.inputs = inputs;
  }

  /**
   * Attach the input controls to a specific dom element to get the input from.
   * @param noPreventDefault Defines whether event caught by the controls should call preventdefault() (https://developer.mozilla.org/en-US/docs/Web/API/Event/preventDefault)
   */
  public override attachControl(noPreventDefault?: boolean): void;
  /**
   * Attach the input controls to a specific dom element to get the input from.
   * @param ignored defines an ignored parameter kept for backward compatibility.
   * @param noPreventDefault Defines whether event caught by the controls should call preventdefault() (https://developer.mozilla.org/en-US/docs/Web/API/Event/preventDefault)
   * BACK COMPAT SIGNATURE ONLY.
   */
  public override attachControl(ignored: any, noPreventDefault?: boolean): void;
  /**
   * Attached controls to the current camera.
   * @param ignored defines an ignored parameter kept for backward compatibility.
   * @param noPreventDefault Defines whether event caught by the controls should call preventdefault() (https://developer.mozilla.org/en-US/docs/Web/API/Event/preventDefault)
   */
  public override attachControl(ignored?: any, noPreventDefault?: boolean): void {
    // eslint-disable-next-line prefer-rest-params
    noPreventDefault = Tools.BackCompatCameraNoPreventDefault(arguments);
    this.inputs.attachElement(noPreventDefault);
  }

  /**
   * Detach the current controls from the specified dom element.
   */
  public override detachControl(): void {
    this.inputs.detachElement();
  }

  /** @internal */
  public override _checkInputs(): void {
    this.inputs.checkInputs();

    super._checkInputs();
  }
}
