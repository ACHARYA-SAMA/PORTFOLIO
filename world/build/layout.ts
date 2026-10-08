import type { ZoneId } from "@/lib/zones";

/**
 * The island, as data. x east, z south, y up; the car's yaw 0 faces +z.
 * Roads: a rounded ring, a north–south spine, a west arm, a roundabout
 * around the Demolition Rush arena, and the Race Log oval in the east.
 * Every zone is within ~20 s of the pit garage at a gentle 60 km/h.
 */

export const RING = { half: 100, radius: 34, width: 13 };
export const ROUNDABOUT = { r: 30, width: 12 };
export const ARENA = { half: 18 };
export const OVAL = { x: 70, z: 0, hx: 17, hz: 32, width: 11 };

export type Road = { from: [number, number]; to: [number, number]; width: number };
export const ROADS: Road[] = [
  { from: [0, -RING.half], to: [0, -ROUNDABOUT.r], width: 12 },
  { from: [0, ROUNDABOUT.r], to: [0, RING.half], width: 12 },
  { from: [-RING.half, 0], to: [-ROUNDABOUT.r, 0], width: 12 },
  { from: [ROUNDABOUT.r, 0], to: [OVAL.x - OVAL.hx, 0], width: 11 },
];

export type ZoneLayout = {
  id: ZoneId;
  /** Content pad. */
  pad: { x: number; z: number; r: number };
  /** Region: entering it shows the banner. */
  center: { x: number; z: number; r: number };
};

export const ZONE_LAYOUT: ZoneLayout[] = [
  { id: "pit", pad: { x: -15, z: 64, r: 4.2 }, center: { x: 0, z: 70, r: 26 } },
  { id: "race-log", pad: { x: 46, z: 10, r: 4 }, center: { x: OVAL.x, z: OVAL.z, r: 36 } },
  { id: "garage", pad: { x: 36, z: -42, r: 4 }, center: { x: 54, z: -60, r: 28 } },
  { id: "telemetry", pad: { x: -36, z: -40, r: 4 }, center: { x: -56, z: -56, r: 28 } },
  { id: "dojo", pad: { x: -50, z: 18, r: 4 }, center: { x: -68, z: 22, r: 20 } },
  { id: "radio", pad: { x: 0, z: -66, r: 4 }, center: { x: 0, z: -82, r: 22 } },
  { id: "off-track", pad: { x: -40, z: 56, r: 4 }, center: { x: -60, z: 66, r: 26 } },
  { id: "pit-exit", pad: { x: 40, z: 58, r: 4 }, center: { x: 60, z: 70, r: 26 } },
];

export const SPAWN = { x: 0, z: 92, yaw: Math.PI };
export const GARAGE = { x: 0, z: 92, door: 84 };
export const LANDMARK = { x: 0, z: 46 };
// Faces the pit plaza, so a car leaving the garage can turn its headlights onto it.
export const BILLBOARD = { x: -27, z: 52, yaw: 0.98 };
export const REBUILD_PAD = { x: 15, z: 64, r: 3.6 };
export const RUSH_PAD = { x: 0, z: 22, r: 3.6 };

/** Kicker ramps and the raised deck. [x, z, yaw, length, width, height] */
export const RAMPS: Array<[number, number, number, number, number, number]> = [
  [-100, -12, Math.PI, 9, 8, 2.2], // west ring, heading north
  [62, -100, Math.PI / 2, 9, 8, 2.2], // north ring, heading east
  [-30, 82, -Math.PI / 2, 8, 7, 1.8], // off-track approach
];

export const DECK = { x: 82, z: 66, hx: 6, hz: 16, h: 3.6, rampLen: 14 };

export type Bolt = [number, number];
/** 40 hex bolts: along roads, on ramps' landings, tucked behind buildings. */
export const BOLTS: Bolt[] = [
  [0, 70], [0, 40], [0, -40], [0, -55], [-60, 0], [-80, 0], [40, 0], [52, 0],
  [-100, 30], [-100, -40], [-100, -70], [100, 30], [100, -40], [100, 70], [30, 100], [-30, 100],
  [-60, 100], [60, 100], [40, -100], [-40, -100], [-80, -100], [86, -100], [-100, 70], [100, -80],
  [OVAL.x - OVAL.hx, -20], [OVAL.x + OVAL.hx, 20], [OVAL.x, -OVAL.hz], [OVAL.x, OVAL.hz],
  [-22, 0], [22, 0], [0, -22], [0, 22],
  [-30, 70], [82, 64], [82, 72], [-68, 36], [66, -76], [-70, -76], [-108, 0], [116, 116],
];

/** Hidden spots (easter eggs). */
export const SECRETS = {
  raj: { x: -118, z: -118 }, // the island's far corner
  donut: { x: 0, z: 0 }, // a full lap of the roundabout
};
