/**
 * A line across the road. `test()` reports a crossing (+1 forward along the
 * gate's yaw, −1 backward) when the car passes between the posts.
 */
export class GateSensor {
  private side: number | null = null;
  private readonly tx: number;
  private readonly tz: number;

  constructor(
    readonly x: number,
    readonly z: number,
    readonly yaw: number,
    readonly halfWidth: number,
  ) {
    this.tx = Math.sin(yaw);
    this.tz = Math.cos(yaw);
  }

  test(px: number, pz: number): -1 | 0 | 1 {
    const dx = px - this.x;
    const dz = pz - this.z;
    const along = dx * this.tx + dz * this.tz;
    const lateral = dx * this.tz - dz * this.tx;
    const side = along >= 0 ? 1 : -1;
    const prev = this.side;
    this.side = Math.abs(lateral) < this.halfWidth + 1.5 && Math.abs(along) < 8 ? side : null;
    if (prev === null || this.side === null || prev === side) return 0;
    return Math.abs(lateral) <= this.halfWidth ? (side as -1 | 1) : 0;
  }

  reset() {
    this.side = null;
  }
}
