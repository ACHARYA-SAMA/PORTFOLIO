"use client";

import { Suspense } from "react";
import Scene from "@/components/Scene";
import NeuralKineticsNavbar from "@/sections/NeuralKineticsNavbar";
import HeroSection from "@/sections/HeroSection";
import CanvasShowcase from "@/components/CanvasShowcase";
import AboutSection from "@/sections/AboutSection";
import SphereSection from "@/sections/SphereSection";
import ProjectsSection from "@/sections/ProjectsSection";
import AwardsSection from "@/sections/AwardsSection";
import FaceReveal from "@/components/FaceReveal";
import ContactSection from "@/sections/ContactSection";
import LuminaFooter from "@/sections/LuminaFooter";

export default function Home() {
  return (
    <main className="relative bg-black text-white overflow-x-hidden min-h-screen">
      {/* GLOBAL 3D CANVAS — fixed behind everything */}
      <Suspense fallback={null}>
        <Scene />
      </Suspense>

      {/* 1. LANDING — user sees name first */}
      <div className="relative z-10">
        <NeuralKineticsNavbar />
        <HeroSection />
      </div>

      {/* 2. CANVAS SCROLL SEQUENCE — pins & scrubs through 158 frames */}
      <div className="relative z-10">
        <CanvasShowcase />
      </div>

      {/* 3. ABOUT */}
      <div className="relative z-10">
        <AboutSection />
      </div>

      {/* 4. PARTICLE EXPLOSION */}
      <div className="relative z-10">
        <SphereSection />
      </div>

      {/* 5. PROJECTS GLOBE */}
      <div className="relative z-10">
        <ProjectsSection />
      </div>

      {/* 6. AWARDS */}
      <div className="relative z-10">
        <AwardsSection />
      </div>

      {/* 7. THE ARCHITECT — identity reveal */}
      <div className="relative z-10">
        <FaceReveal />
      </div>

      {/* 8. CONTACT */}
      <div className="relative z-10">
        <ContactSection />
      </div>

      {/* 9. LUMINA FOOTER */}
      <div className="relative z-10 px-6 md:px-12 pb-12">
        <LuminaFooter />
      </div>
    </main>
  );
}
