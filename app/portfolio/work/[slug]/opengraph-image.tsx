import { odometerImage, OG_CONTENT_TYPE, OG_SIZE } from "@/components/og/OgImage";
import { PROJECTS } from "@/lib/content";
import { pad } from "@/lib/format";

export const alt = "Project name on the odometer drums";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return PROJECTS.map((p) => ({ slug: p.id }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const index = Math.max(0, PROJECTS.findIndex((p) => p.id === slug));
  const project = PROJECTS[index];
  return odometerImage({
    drums: project.title,
    kicker: `Case file · ${pad(index + 1)} / ${pad(PROJECTS.length)}`,
    caption: project.line ?? project.title,
  });
}
