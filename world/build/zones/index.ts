import type { TimeOfDay } from "@/lib/progress";
import type { ZoneId } from "@/lib/zones";
import type { Game } from "../../engine/game";
import { buildAmbient, buildSecrets } from "./ambient";
import { buildArena } from "./arena";
import { buildDojo } from "./dojo";
import { buildGarage } from "./garage";
import { buildOffTrack } from "./offTrack";
import { buildPit } from "./pit";
import { buildPitExit } from "./pitExit";
import { buildRaceLog } from "./raceLog";
import { buildRadio } from "./radio";
import { buildTelemetry } from "./telemetry";

export type ZoneHooks = {
  onEnter?: () => void;
  onStart?: () => void;
  onInteract?: () => void;
  onRebuild?: () => void;
  onTime?: (t: TimeOfDay) => void;
};

/** Build every zone's scenery and gameplay; returns per-zone hooks the game calls. */
export function buildZones(game: Game): Partial<Record<ZoneId, ZoneHooks>> {
  const hooks: Partial<Record<ZoneId, ZoneHooks>> = {
    pit: buildPit(game),
    "race-log": buildRaceLog(game),
    garage: buildGarage(game),
    telemetry: buildTelemetry(game),
    dojo: buildDojo(game),
    radio: buildRadio(game),
    "off-track": buildOffTrack(game),
    "pit-exit": buildPitExit(game),
  };
  buildArena(game);
  buildAmbient(game);
  buildSecrets(game);
  return hooks;
}
