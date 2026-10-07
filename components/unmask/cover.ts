/**
 * The same `background-size: cover; background-position: X% Y%` maths the
 * prototype relied on, so JS (reticle, reactor, intro pulse) and the shader
 * agree on where a point of the photo lands on screen.
 */

export const IMAGE = { w: 1152, h: 1536 };
/** Points in the photo, as fractions of the image (both layers are pixel-aligned). */
export const FACE = { u: 0.517, v: 0.3 };
export const REACTOR = { u: 0.503, v: 0.674 };

export function coverScale(width: number, height: number) {
  return Math.max(width / IMAGE.w, height / IMAGE.h);
}

/** Image fraction → stage pixels. */
export function imageToStage(u: number, v: number, width: number, height: number, posX = 0.5, posY = 0.15) {
  const s = coverScale(width, height);
  const dw = IMAGE.w * s;
  const dh = IMAGE.h * s;
  return { x: (width - dw) * posX + u * dw, y: (height - dh) * posY + v * dh, scale: s };
}
