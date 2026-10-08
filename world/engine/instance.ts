import type { Game } from "./game";

/** The running game, for HUD actions that need more than a command (teleport, car colour). */
let current: Game | null = null;
export const setGame = (g: Game | null) => {
  current = g;
};
export const getGame = () => current;
