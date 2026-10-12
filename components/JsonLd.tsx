import { jsonLdHtml } from "@/lib/site";

/**
 * Structured data for crawlers. Server-rendered as application/ld+json; when
 * React renders it on the client (a client-side navigation) it becomes an
 * inert text/plain block, which keeps React from warning about a <script>.
 * Same switch as InlineScript.
 */
export default function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type={typeof window === "undefined" ? "application/ld+json" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: jsonLdHtml(data) }}
    />
  );
}
