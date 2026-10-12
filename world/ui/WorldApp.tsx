"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { DEFAULT_PREFS, KEYS, readJSON, type Prefs } from "@/lib/progress";
import { restoreSoundPreference } from "@/lib/sound";
import { soundOn } from "@/lib/store";
import { TIERS, guessTier, type Tier } from "../engine/config";
import { Game } from "../engine/game";
import { Post } from "../engine/post";
import { setGame } from "../engine/instance";
import { loadRapier, type Rapier } from "../engine/physics";
import { resetUI, setCommandHandler, ui } from "../engine/store";
import { loadCanvasFonts } from "../engine/textures";
import Hud from "./Hud";
import s from "./hud.module.css";

function initialTier(): Tier {
  const prefs = readJSON<Partial<Prefs>>(KEYS.prefs, {});
  const q = prefs.quality ?? DEFAULT_PREFS.quality;
  return q === "auto" ? guessTier() : q;
}

/** Lives inside <Canvas>: owns the Game for the canvas's lifetime. */
function GameMount({ R, tier }: { R: Rapier; tier: Tier }) {
  const { gl, scene, camera, setDpr, size, viewport } = useThree();
  const gameRef = useRef<Game | null>(null);
  const postRef = useRef<Post | null>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const game = new Game({ gl, scene, camera: camera as THREE.PerspectiveCamera, R, tier, reduced, setDpr });
    let disposed = false;

    setCommandHandler((cmd, arg) => {
      // Leaving is the entry's job (it owns the shutter); everything else is the game's.
      if (cmd === "portfolio") window.dispatchEvent(new CustomEvent("aa:visit-portfolio"));
      else game.command(cmd, arg);
    });

    game
      .build((p) => ui.set({ loadProgress: 0.3 + p * 0.7 }))
      .then(() => {
        if (disposed) return;
        gameRef.current = game;
        setGame(game);
        // Development handle for QA scripts; never shipped to production.
        if (process.env.NODE_ENV !== "production") (window as unknown as { __game?: Game }).__game = game;
        // Sound follows the site's shared toggle (off by default).
        restoreSoundPreference();
        game.setSound(soundOn.get());
        ui.set({ phase: "title", loadProgress: 1 });
      })
      .catch((err: unknown) => {
        console.error(err);
        ui.set({ phase: "fallback", fallback: "The world failed to start on this device." });
      });

    const onLeave = () => gameRef.current?.leave();
    window.addEventListener("aa:world-leave", onLeave);
    const canvas = gl.domElement;
    const onLost = (e: Event) => {
      e.preventDefault();
      ui.set({ phase: "fallback", fallback: "The graphics context was lost, so the world stopped. The portfolio is right here." });
    };
    canvas.addEventListener("webglcontextlost", onLost);

    return () => {
      disposed = true;
      window.removeEventListener("aa:world-leave", onLeave);
      canvas.removeEventListener("webglcontextlost", onLost);
      setCommandHandler(null);
      setGame(null);
      gameRef.current = null;
      postRef.current?.dispose();
      postRef.current = null;
      game.dispose();
      resetUI();
    };
    // One game per canvas: inputs are fixed for its lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    postRef.current?.setSize(size.width, size.height, viewport.dpr);
  }, [size.width, size.height, viewport.dpr]);

  // Priority 1: this callback owns rendering (bloom on the high tier, plain render otherwise).
  useFrame((_, dt) => {
    // Count the whole frame (every post pass), not just the last render call.
    gl.info.autoReset = false;
    gl.info.reset();
    const game = gameRef.current;
    if (!game) {
      gl.render(scene, camera);
      return;
    }
    game.frame(dt);
    if (TIERS[game.tier].bloom) {
      if (!postRef.current) postRef.current = new Post(gl, scene, camera, size.width, size.height);
      postRef.current.render(dt, game.car.boosting, game.reduced);
    } else gl.render(scene, camera);
  }, 1);
  return null;
}

export default function WorldApp() {
  const [R, setR] = useState<Rapier | null>(null);
  const [tier] = useState<Tier>(() => initialTier());
  const cfg = TIERS[tier];

  useEffect(() => {
    let alive = true;
    // Best first guess at the input device; the first real input corrects it.
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    ui.set({ tier, loadProgress: 0.05, device: coarse ? "touch" : "keyboard" });
    Promise.all([loadRapier(), loadCanvasFonts()])
      .then(([rapier]) => {
        if (!alive) return;
        ui.set({ loadProgress: 0.3 });
        setR(rapier);
      })
      .catch((err: unknown) => {
        console.error(err);
        ui.set({ phase: "fallback", fallback: "The physics engine could not load here." });
      });
    return () => {
      alive = false;
    };
  }, [tier]);

  return (
    <div className={s.app}>
      {R ? (
        <Canvas
          className={s.canvas}
          dpr={Math.min(typeof window === "undefined" ? 1 : window.devicePixelRatio || 1, cfg.dpr)}
          shadows="percentage"
          flat
          gl={{ antialias: cfg.antialias, powerPreference: "high-performance", alpha: false, stencil: false }}
          camera={{ fov: 58, near: 0.1, far: cfg.fogFar + 40, position: [80, 60, 120] }}
          aria-hidden="true"
        >
          <GameMount R={R} tier={tier} />
        </Canvas>
      ) : null}
      <Hud />
    </div>
  );
}
