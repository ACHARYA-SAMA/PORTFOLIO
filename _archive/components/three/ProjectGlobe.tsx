"use client";
import { useRef, useMemo, useEffect } from "react";
import { useFrame, ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { create } from "zustand";
import { useIsMobile } from "@/hooks/useMediaQuery";

gsap.registerPlugin(ScrollTrigger);

/* ── Zustand store — shared with ProjectsSection ──── */
interface ProjectStore {
  activeProject: number | null;
  setActive: (i: number | null) => void;
}

export const useProjectStore = create<ProjectStore>((set) => ({
  activeProject: null,
  setActive: (i) => set({ activeProject: i }),
}));

/* ── Lat/Long → cartesian ────────────────────────── */
function latLng(lat: number, lng: number, R = 2.5): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -R * Math.sin(phi) * Math.cos(theta),
    R * Math.cos(phi),
    R * Math.sin(phi) * Math.sin(theta)
  );
}

/* ── Pin positions — all Indian cities ────────────── */
const PIN_POSITIONS = [
  latLng(28.6, 77.2),  // UrbanFlow AI — New Delhi
  latLng(17.4, 78.5),  // Micro-Sort Cobot — Hyderabad
  latLng(19.1, 72.9),  // IoT Traffic — Mumbai
  latLng(12.9, 77.6),  // Civil Aviation — Bangalore
  latLng(13.1, 80.3),  // Flow Minds — Chennai
];

const PROJECT_COUNT = PIN_POSITIONS.length;

export default function ProjectGlobe() {
  const groupRef = useRef<THREE.Group>(null);
  const mouse = useRef({ x: 0, y: 0 });
  const lerped = useRef({ x: 0, y: 0 });
  const scrollY = useRef({ posY: -15 });
  const { setActive } = useProjectStore();
  const pinRefs = useRef<(THREE.Mesh | null)[]>([]);
  const pinScales = useRef<number[]>([1, 1, 1, 1, 1]);
  const isMobile = useIsMobile();

  /* ── Geometries ─────────────────────────────────── */
  // Outer wireframe sphere
  const wireGeo = useMemo(() => new THREE.SphereGeometry(2.5, 48, 48), []);
  const wireMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#7B2FBE",
        metalness: 0.1,
        roughness: 0.9,
        wireframe: true,
        transparent: true,
        opacity: 0.12,
      }),
    []
  );

  // Inner solid sphere (skeuomorphic depth)
  const innerGeo = useMemo(() => new THREE.SphereGeometry(2.47, 48, 48), []);
  const innerMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#050005",
        metalness: 0.9,
        roughness: 0.1,
        transparent: true,
        opacity: 0.95,
      }),
    []
  );

  // Pin geometry + material
  const pinGeo = useMemo(() => new THREE.SphereGeometry(0.07, 16, 16), []);
  const pinMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#C084FC",
        emissive: new THREE.Color("#C084FC"),
        emissiveIntensity: 1.2,
      }),
    []
  );

  // Atmosphere ring
  const atmosGeo = useMemo(() => new THREE.TorusGeometry(2.6, 0.04, 8, 80), []);
  const atmosMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#7B2FBE",
        transparent: true,
        opacity: 0.08,
      }),
    []
  );

  /* ── Mouse tracking ─────────────────────────────── */
  useEffect(() => {
    const onMouse = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.current.y = -(e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("mousemove", onMouse);
    return () => window.removeEventListener("mousemove", onMouse);
  }, []);

  /* ── Globe scroll-in: fly from y:-15 → 0 ─────────── */
  useEffect(() => {
    const st = ScrollTrigger.create({
      trigger: "#projects",
      start: "top bottom",
      end: "30% center",
      scrub: 2,
      onUpdate(self) {
        scrollY.current.posY = -15 + self.progress * 15;
      },
    });
    return () => st.kill();
  }, []);

  /* ── Mobile: cycle projects on scroll ────────────── */
  useEffect(() => {
    if (!isMobile) return;
    const st = ScrollTrigger.create({
      trigger: "#projects",
      start: "30% top",
      end: "90% top",
      scrub: 1,
      onUpdate(self) {
        const idx = Math.min(
          Math.floor(self.progress * PROJECT_COUNT),
          PROJECT_COUNT - 1
        );
        setActive(idx);
      },
      onLeaveBack() {
        setActive(null);
      },
    });
    return () => st.kill();
  }, [isMobile, setActive]);

  /* ── Cleanup ────────────────────────────────────── */
  useEffect(
    () => () => {
      wireGeo.dispose();
      wireMat.dispose();
      innerGeo.dispose();
      innerMat.dispose();
      pinGeo.dispose();
      pinMat.dispose();
      atmosGeo.dispose();
      atmosMat.dispose();
    },
    [wireGeo, wireMat, innerGeo, innerMat, pinGeo, pinMat, atmosGeo, atmosMat]
  );

  /* ── Frame loop ─────────────────────────────────── */
  useFrame(() => {
    lerped.current.x += (mouse.current.x - lerped.current.x) * 0.02;
    lerped.current.y += (mouse.current.y - lerped.current.y) * 0.02;

    const g = groupRef.current;
    if (!g) return;

    // Auto-rotate + mouse tilt
    g.rotation.y += 0.001;
    g.rotation.x = lerped.current.y * 0.05;
    g.position.y = scrollY.current.posY;

    // Pin pulse animation
    pinRefs.current.forEach((pin, i) => {
      if (!pin) return;
      pinScales.current[i] += (1 - pinScales.current[i]) * 0.1;
      const pulse = 1 + Math.sin(Date.now() * 0.002 + i * 1.2) * 0.2;
      pin.scale.setScalar(pinScales.current[i] * pulse);
    });
  });

  return (
    <group ref={groupRef} position={[0, -15, 0]}>
      {/* Inner solid sphere — skeuomorphic depth */}
      <mesh geometry={innerGeo} material={innerMat} />

      {/* Outer wireframe — violet grid */}
      <mesh geometry={wireGeo} material={wireMat} />

      {/* Atmosphere ring */}
      <mesh geometry={atmosGeo} material={atmosMat} rotation={[Math.PI / 2, 0, 0]} />

      {/* Project pins */}
      {PIN_POSITIONS.map((pos, i) => (
        <mesh
          key={i}
          ref={(el) => {
            pinRefs.current[i] = el;
          }}
          geometry={pinGeo}
          material={pinMat}
          position={pos}
          onClick={
            isMobile
              ? undefined
              : (e: ThreeEvent<MouseEvent>) => {
                  e.stopPropagation();
                  setActive(i);
                }
          }
          onPointerEnter={
            isMobile
              ? undefined
              : () => {
                  pinScales.current[i] = 2.0;
                  pinMat.emissiveIntensity = 2.0;
                }
          }
          onPointerLeave={
            isMobile
              ? undefined
              : () => {
                  pinScales.current[i] = 1;
                  pinMat.emissiveIntensity = 0.8;
                }
          }
        />
      ))}
    </group>
  );
}
