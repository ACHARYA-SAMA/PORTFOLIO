import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Nav from "@/components/nav/Nav";
import Footer from "@/components/footer/Footer";
import CaseStudy from "@/components/garage/CaseStudy";
import { PROJECTS } from "@/lib/content";
import { workHref } from "@/lib/routes";

export const dynamicParams = false;

export function generateStaticParams() {
  return PROJECTS.map((p) => ({ slug: p.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const project = PROJECTS.find((p) => p.id === slug);
  if (!project) return {};
  const title = `${project.title}: Arman Acharya`;
  const description = project.line ?? `${project.title}, a project by Arman Acharya.`;
  return {
    title,
    description,
    alternates: { canonical: workHref(project.id) },
    openGraph: { type: "article", url: workHref(project.id), siteName: "Arman Acharya", title, description },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function WorkPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const index = PROJECTS.findIndex((p) => p.id === slug);
  if (index < 0) notFound();
  return (
    <>
      <Nav />
      <main>
        <CaseStudy index={index} />
      </main>
      <Footer />
    </>
  );
}
