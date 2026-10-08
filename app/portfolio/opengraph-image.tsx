import { odometerImage, OG_CONTENT_TYPE, OG_SIZE } from "@/components/og/OgImage";
import { UNMASK } from "@/lib/content";
import { HERO_CAPTION } from "@/lib/og";

export const alt = "ARMAN on the odometer drums";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return odometerImage({ drums: "ARMAN", kicker: UNMASK.subline, caption: HERO_CAPTION });
}
