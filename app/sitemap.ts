import type { MetadataRoute } from "next";
import { PROJECTS } from "@/lib/content";
import { PORTFOLIO, workHref } from "@/lib/routes";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}${PORTFOLIO}`, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}${PORTFOLIO}/cv`, changeFrequency: "monthly", priority: 0.7 },
    ...PROJECTS.map((p) => ({ url: `${SITE_URL}${workHref(p.id)}`, changeFrequency: "yearly" as const, priority: p.flagship ? 0.8 : 0.5 })),
  ];
}
