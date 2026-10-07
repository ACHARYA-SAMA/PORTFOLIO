"use client";
import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useIsMobile } from "@/hooks/useMediaQuery";

gsap.registerPlugin(ScrollTrigger);

export default function HeroSphere() {
  const groupRef = useRef<THREE.Group>(null);
  const mouse = useRef({ x: 0, y: 0 });
  const lerpedMouse = useRef({ x: 0, y: 0 });
  const isMobile = useIsMobile();

  // GSAP-driven scroll state
  const scrollState = useRef({ scale: 1, posY: 0, opacity: 1 });

  // Particle count: 3000 desktop, 800 mobile
  const particleCount = isMobile ? 800 : 3000;

  /* ── Geometries ────────────────────────────────────── */
  const sphereGeo = useMemo(() => new THREE.IcosahedronGeometry(2.0, 20), []);
  
  // Primary ring — thin elegant
  const ring1Geo = useMemo(
    () => new THREE.TorusGeometry(2.8, 0.018, 16, 120),
    []
  );
  // Secondary ring — thinner, wider orbit
  const ring2Geo = useMemo(
    () => new THREE.TorusGeometry(3.3, 0.01, 16, 120),
    []
  );

  const particleGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const r = 3.0 + Math.random() * 2.5; // radius 3.0–5.5
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [particleCount]);

  /* ── Materials ─────────────────────────────────────── */
  const sphereMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#7B2FBE",
        metalness: 0.95,
        roughness: 0.05,
        envMapIntensity: 1.5,
        transparent: true,
      }),
    []
  );

  const ring1Mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#C084FC",
        metalness: 1.0,
        roughness: 0.0,
        emissive: new THREE.Color("#C084FC"),
        emissiveIntensity: 0.4,
        transparent: true,
      }),
    []
  );

  const ring2Mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#7B2FBE",
        metalness: 0.8,
        roughness: 0.2,
        emissive: new THREE.Color("#7B2FBE"),
        emissiveIntensity: 0.2,
        transparent: true,
        opacity: 0.5,
      }),
    []
  );

  const particleMat = useMemo(
    () =>
      new THREE.PointsMaterial({
        size: 0.012,
        color: "#C084FC",
        transparent: true,
        opacity: 0.7,
        sizeAttenuation: true,
      }),
    []
  );

  /* ── Mouse tracking ────────────────────────────────── */
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.current.y = -(e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("mousemove", onMouseMove);
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, []);

  /* ── GSAP ScrollTrigger ────────────────────────────── */
  useEffect(() => {
    // 0–40%: scale down, stay right
    const st1 = ScrollTrigger.create({
      trigger: "#hero",
      start: "top top",
      end: "40% top",
      scrub: 1.5,
      onUpdate(self) {
        scrollState.current.scale = 1 - self.progress * 0.3;
      },
    });
    // 40–70%: drift up and fade
    const st2 = ScrollTrigger.create({
      trigger: "#hero",
      start: "40% top",
      end: "70% top",
      scrub: 1.5,
      onUpdate(self) {
        scrollState.current.posY = self.progress * 4;
        scrollState.current.opacity = 1 - self.progress;
      },
    });
    return () => {
      st1.kill();
      st2.kill();
    };
  }, []);

  /* ── Cleanup ───────────────────────────────────────── */
  useEffect(() => {
    return () => {
      sphereGeo.dispose();
      ring1Geo.dispose();
      ring2Geo.dispose();
      particleGeo.dispose();
      sphereMat.dispose();
      ring1Mat.dispose();
      ring2Mat.dispose();
      particleMat.dispose();
    };
  }, [sphereGeo, ring1Geo, ring2Geo, particleGeo, sphereMat, ring1Mat, ring2Mat, particleMat]);

  /* ── Frame loop ────────────────────────────────────── */
  useFrame(() => {
    // Lerp mouse
    lerpedMouse.current.x +=
      (mouse.current.x - lerpedMouse.current.x) * 0.04;
    lerpedMouse.current.y +=
      (mouse.current.y - lerpedMouse.current.y) * 0.04;

    const g = groupRef.current;
    if (!g) return;

    // Ambient float — subtle Y oscillation (4s period)
    const floatY = Math.sin(performance.now() * 0.0015) * 0.15;

    // Mouse tilt (max ±0.15 rad) + slow idle rotation
    g.rotation.y =
      Math.max(-0.15, Math.min(0.15, lerpedMouse.current.x * 0.08)) +
      performance.now() * 0.00005;
    g.rotation.x = Math.max(
      -0.15,
      Math.min(0.15, lerpedMouse.current.y * 0.08)
    );

    // Scroll state
    const s = scrollState.current;
    g.scale.setScalar(s.scale);
    g.position.y = s.posY + floatY;

    // Ring 1 rotation
    const r1 = g.children[1] as THREE.Mesh | undefined;
    if (r1) r1.rotation.y += 0.002;

    // Ring 2 counter-rotation
    const r2 = g.children[2] as THREE.Mesh | undefined;
    if (r2) r2.rotation.y -= 0.0015;

    // Slow particle rotation
    const particles = g.children[3] as THREE.Points | undefined;
    if (particles) {
      particles.rotation.y += 0.0002;
      particles.rotation.x += 0.00005;
    }

    // Opacity via material
    sphereMat.opacity = s.opacity;
    ring1Mat.opacity = s.opacity;
    ring2Mat.opacity = s.opacity * 0.5;
    particleMat.opacity = s.opacity * 0.7;
  });

  return (
    <>
      {/* Position group to the right — hero text is left-aligned */}
      <group ref={groupRef} position={[2.5, 0, 0]}>
        {/* Main sphere */}
        <mesh geometry={sphereGeo} material={sphereMat} />

        {/* Primary ring — lavender, tilted */}
        <mesh
          geometry={ring1Geo}
          material={ring1Mat}
          rotation={[0.4, 0, 0.2]}
        />

        {/* Secondary ring — violet, counter-tilted */}
        <mesh
          geometry={ring2Geo}
          material={ring2Mat}
          rotation={[-0.6, 0, 0.8]}
        />

        {/* Particle halo */}
        <points geometry={particleGeo} material={particleMat} />
      </group>

      <EffectComposer>
        <Bloom
          intensity={2.2}
          luminanceThreshold={0.15}
          luminanceSmoothing={0.9}
          radius={0.8}
          mipmapBlur
        />
      </EffectComposer>
    </>
  );
}
