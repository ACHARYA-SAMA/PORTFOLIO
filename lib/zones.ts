import type { ChapterId } from "./content";

/** The world's content zones. `section` is the matching chapter on /portfolio. */
export const ZONES = [
  { id: "pit", label: "Pit Garage", section: "about" },
  { id: "race-log", label: "Race Log", section: "race-log" },
  { id: "garage", label: "The Garage", section: "garage" },
  { id: "telemetry", label: "Telemetry", section: "telemetry" },
  { id: "dojo", label: "The Dojo", section: "race-log" },
  { id: "radio", label: "Team Radio", section: "radio" },
  { id: "off-track", label: "Off the Track", section: "off-track" },
  { id: "pit-exit", label: "Pit Exit", section: "contact" },
] as const satisfies ReadonlyArray<{ id: string; label: string; section: ChapterId }>;

export type ZoneId = (typeof ZONES)[number]["id"];
