"use client";
import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useRef } from "react";
import * as THREE from "three";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const HeroSphere = dynamic(() => import("./three/HeroSphere"), { ssr: false });
const ParticleExplosionThree = dynamic(
  () => import("./three/ParticleExplosion"),
  { ssr: false }
);
const ProjectGlobe = dynamic(() => import("./three/ProjectGlobe"), {
  ssr: false,
});

export default function Scene() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Toggle pointer events for the 3D canvas wrapper when #projects is in view
    const st = ScrollTrigger.create({
      trigger: "#projects",
      start: "top center",
      end: "bottom center",
      onEnter: () => {
        if (containerRef.current) containerRef.current.style.pointerEvents = "auto";
      },
      onLeave: () => {
        if (containerRef.current) containerRef.current.style.pointerEvents = "none";
      },
      onEnterBack: () => {
        if (containerRef.current) containerRef.current.style.pointerEvents = "auto";
      },
      onLeaveBack: () => {
        if (containerRef.current) containerRef.current.style.pointerEvents = "none";
      },
    });

    return () => {
      st.kill();
    };
  }, []);

  return (
    <div ref={containerRef} className="fixed inset-0 w-full h-screen z-0 pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 75 }}
        dpr={[1, 2]}
        shadows
        style={{ pointerEvents: "inherit" }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1,
        }}
      >
        <ambientLight intensity={0.2} />
        <pointLight position={[5, 5, 5]} color="#7B2FBE" intensity={2.5} />
        <pointLight position={[-5, -5, 5]} color="#C084FC" intensity={1.5} />
        <spotLight position={[0, 10, 0]} intensity={0.8} castShadow />
        <Suspense fallback={null}>
          <HeroSphere />
          <ParticleExplosionThree />
          <ProjectGlobe />
        </Suspense>
      </Canvas>
    </div>
  );
}
