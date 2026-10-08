import type { Metadata } from "next";
import Nav from "@/components/nav/Nav";
import Footer from "@/components/footer/Footer";
import CvSheet from "@/components/cv/CvSheet";
import { PERSON } from "@/lib/content";

const title = `CV: ${PERSON.name}`;
const description = `${PERSON.name}, ${PERSON.programme}, ${PERSON.institute}. One-page CV, printable to A4.`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/portfolio/cv" },
  openGraph: { type: "profile", url: "/portfolio/cv", siteName: "Arman Acharya", title, description },
};

export default function CvPage() {
  return (
    <>
      <Nav />
      <main>
        <CvSheet />
      </main>
      <Footer />
    </>
  );
}
