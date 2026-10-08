import { SCENES } from "./content";
import { pad } from "./format";

/** What the drums show for a scene: its word, or today's date as DD.MM.YY. Shared by the hero and the world. */
export function sceneText(index: number) {
  const drums = SCENES[index].drums;
  if (drums !== "DATE") return drums;
  const d = new Date();
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${String(d.getFullYear()).slice(2)}`;
}
