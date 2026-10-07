"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { Flip } from "gsap/Flip";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText, Flip);
  gsap.defaults({ ease: "power3.out", duration: 0.8 });
}

export { gsap, ScrollTrigger, SplitText, Flip };
