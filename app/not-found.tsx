import type { Metadata } from "next";
import NotFoundScene from "@/components/notfound/NotFoundScene";

export const metadata: Metadata = {
  title: "404: road not found · Arman Acharya",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <main>
      <NotFoundScene />
    </main>
  );
}
