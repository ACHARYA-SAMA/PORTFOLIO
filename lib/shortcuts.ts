/** Every keyboard shortcut, one list for the `?` sheet on both the site and the world. */

export type PadGlyph = "south" | "east" | "west" | "north" | "lt" | "rt" | "lb" | "rb" | "lstick" | "rstick" | "start" | "select" | "dpad";

export type Shortcut = { keys: string[]; action: string; pad?: PadGlyph[]; touch?: string };

export const SITE_SHORTCUTS: Shortcut[] = [
  { keys: ["Ctrl / ⌘", "K"], action: "Command palette: jump anywhere" },
  { keys: ["?"], action: "This sheet" },
  { keys: ["←", "↑", "→", "↓"], action: "Portrait focused: move the reveal" },
  { keys: ["Space"], action: "Portrait focused: lock the reveal open" },
  { keys: ["←", "↑", "→", "↓"], action: "Sticker focused: nudge it" },
  { keys: ["Esc"], action: "Close menu, palette or overlay" },
];

export const WORLD_SHORTCUTS: Shortcut[] = [
  { keys: ["W A S D", "↑ ← ↓ →"], action: "Drive and steer", pad: ["lstick", "rt", "lt"], touch: "Left stick" },
  { keys: ["Space"], action: "Handbrake (drift)", pad: ["east"], touch: "DRIFT" },
  { keys: ["Shift"], action: "Boost", pad: ["south"], touch: "BOOST" },
  { keys: ["E"], action: "Open or close a zone panel", pad: ["west"], touch: "E" },
  { keys: ["R"], action: "Respawn at the last checkpoint", pad: ["north"] },
  { keys: ["B"], action: "Rebuild the world", pad: ["select"] },
  { keys: ["C"], action: "Camera: chase, far, top-down", pad: ["rb"] },
  { keys: ["F"], action: "Free look (drag to orbit)", pad: ["rstick"] },
  { keys: ["N"], action: "Day, dusk, night" },
  { keys: ["M"], action: "Mute" },
  { keys: ["H"], action: "Horn", pad: ["lb"] },
  { keys: ["K"], action: "Photo mode (saves a PNG)" },
  { keys: ["P"], action: "Visit portfolio" },
  { keys: ["?"], action: "This sheet" },
  { keys: ["Esc"], action: "Pause menu", pad: ["start"] },
];
