import { redirect } from "next/navigation";
import { PORTFOLIO } from "@/lib/routes";

// Placeholder until the world lands on `/`.
export default function Home() {
  redirect(PORTFOLIO);
}
