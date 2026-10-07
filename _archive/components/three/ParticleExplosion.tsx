"use client";
import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useIsMobile } from "@/hooks/useMediaQuery";

gsap.registerPlugin(ScrollTrigger);

interface Particle {
  origin: THREE.Vector3;
  target: THREE.Vector3;
  rotSpd: THREE.Vector3;
  color: THREE.Color;
}

export default function ParticleExplosion() {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const isMobile = useIsMobile();

  // Particle count: 3000 on desktop, 600 on mobile
  const COUNT = isMobile ? 600 : 3000;

  const geo = useMemo(() => new THREE.TetrahedronGeometry(0.04, 0), []);
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#7B2FBE",
        emissive: new THREE.Color("#7B2FBE"),
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0,
        metalness: 0.6,
        roughness: 0.3,
      }),
    []
  );

  const particles = useMemo<Particle[]>(() => {
    const arr: Particle[] = [];
    const colors = ["#7B2FBE", "#9333EA", "#C084FC", "#A855F7", "#ffffff"];
    for (let i = 0; i < COUNT; i++) {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / COUNT);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const r = 0.4 + Math.random() * 0.1;
      const origin = new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta)
      );
      const dist = 3 + Math.random() * 5;
      const spread = new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 3
      );
      const target = origin
        .clone()
        .normalize()
        .multiplyScalar(dist)
        .add(spread);
      arr.push({
        origin,
        target,
        rotSpd: new THREE.Vector3(
          (Math.random() - 0.5) * 4,
          (Math.random() - 0.5) * 4,
          (Math.random() - 0.5) * 4
        ),
        color: new THREE.Color(colors[i % colors.length]),
      });
    }
    return arr;
  }, [COUNT]);

  const rotations = useMemo(
    () =>
      particles.map(() => ({
        x: Math.random() * Math.PI * 2,
        y: Math.random() * Math.PI * 2,
        z: Math.random() * Math.PI * 2,
      })),
    [particles]
  );

  const state = useRef({ progress: 0, opacity: 0 });

  // Initialize matrices
  useEffect(() => {
    if (!meshRef.current) return;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    for (let i = 0; i < COUNT; i++) {
      dummy.position.copy(particles[i].origin);
      dummy.rotation.set(rotations[i].x, rotations[i].y, rotations[i].z);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
      meshRef.current.setColorAt(i, color.copy(particles[i].color));
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [particles, rotations, COUNT]);

  // GSAP ScrollTrigger on #sphere
  useEffect(() => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: "#sphere",
        start: "top 80%",
        end: "bottom 20%",
        scrub: 2,
      },
    });
    tl.to(state.current, { opacity: 1, duration: 0.3 });
    tl.to(state.current, { progress: 1, duration: 2, ease: "power4.out" });
    tl.to(state.current, { opacity: 0, duration: 0.5 });
    return () => {
      tl.scrollTrigger?.kill();
    };
  }, []);

  // Cleanup
  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat]
  );

  const colorA = useMemo(() => new THREE.Color("#7B2FBE"), []);
  const colorB = useMemo(() => new THREE.Color("#C084FC"), []);
  const colorC = useMemo(() => new THREE.Color("#ffffff"), []);
  const tempColor = useMemo(() => new THREE.Color(), []);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const p = state.current.progress;
    const smooth = p * p * (3 - 2 * p);
    const dummy = new THREE.Object3D();
    const time = performance.now() * 0.001;

    for (let i = 0; i < COUNT; i++) {
      // Position: lerp from origin to target
      dummy.position.lerpVectors(
        particles[i].origin,
        particles[i].target,
        smooth
      );

      // Breathing phase (0–20%): scale oscillation
      if (p < 0.2) {
        const breathFactor = 1 + Math.sin(time * 2 + i * 0.01) * 0.15;
        dummy.position.multiplyScalar(breathFactor);
      }

      // Drift phase (60–100%): slow random drift
      if (p > 0.6) {
        const driftAmount = (p - 0.6) / 0.4;
        dummy.position.x += Math.sin(time * 0.5 + i) * 0.02 * driftAmount;
        dummy.position.y += Math.cos(time * 0.3 + i * 0.5) * 0.02 * driftAmount;
      }

      // Rotation speed increases with explosion progress
      rotations[i].x += particles[i].rotSpd.x * delta * (0.5 + p * 2);
      rotations[i].y += particles[i].rotSpd.y * delta * (0.5 + p * 2);
      rotations[i].z += particles[i].rotSpd.z * delta * (0.5 + p * 2);
      dummy.rotation.set(rotations[i].x, rotations[i].y, rotations[i].z);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      // Color interpolation: violet → lavender → white
      if (mesh.instanceColor) {
        if (p < 0.5) {
          tempColor.copy(colorA).lerp(colorB, p * 2);
        } else {
          tempColor.copy(colorB).lerp(colorC, (p - 0.5) * 2);
        }
        mesh.setColorAt(i, tempColor);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    (mesh.material as THREE.MeshStandardMaterial).opacity = state.current.opacity;
  });

  return (
    <group position={[0, 0, -2]}>
      <instancedMesh
        ref={meshRef}
        args={[geo, mat, COUNT]}
        frustumCulled={false}
      />
    </group>
  );
}
