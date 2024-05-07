/**
 * @author Masaru Yamagishi <akai_inu@live.jp>
 * @license Apache-2.0
 * @copyright 2024 Masaru Yamagishi
 */

import { serialize } from "@babylonjs/core/Misc/decorators";

export class GodCameraMoveInputKeyBindings {
  @serialize()
  public keysForward = [87]; // W

  @serialize()
  public keysBackward = [83]; // S

  @serialize()
  public keysLeft = [65]; // A

  @serialize()
  public keysRight = [68]; // D

  @serialize()
  public keysUpward = [81]; // Q

  @serialize()
  public keysDownward = [69]; // E

  @serialize()
  public keysSprint = [16]; // Shift

  @serialize()
  public keysUpRotation = [38]; // ArrowUp

  @serialize()
  public keysDownRotation = [40]; // ArrowDown

  @serialize()
  public keysLeftRotation = [37]; // ArrowLeft

  @serialize()
  public keysRightRotation = [39]; // ArrowRight

  /**
   * {@inheritdoc}
   */
  public getClassName(): string {
    return "GodCameraMoveInputKeyBindings";
  }
}
