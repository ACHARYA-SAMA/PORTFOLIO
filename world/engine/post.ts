import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

/** Radial RGB split, used only while boosting (and never with reduced motion). */
const CA = {
  uniforms: { tDiffuse: { value: null as THREE.Texture | null }, uAmount: { value: 0 } },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uAmount;
    varying vec2 vUv;
    void main() {
      vec2 o = (vUv - 0.5) * uAmount;
      vec4 c = texture2D(tDiffuse, vUv);
      c.r = texture2D(tDiffuse, vUv + o).r;
      c.b = texture2D(tDiffuse, vUv - o).b;
      gl_FragColor = c;
    }`,
};

/**
 * High tier only: a light bloom so emissive signs and pads glow, and the
 * boost aberration. Lower tiers render straight to the screen.
 */
export class Post {
  readonly composer: EffectComposer;
  private bloom: UnrealBloomPass;
  private ca: ShaderPass;
  private amount = 0;

  constructor(gl: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, w: number, h: number) {
    this.composer = new EffectComposer(gl);
    this.composer.addPass(new RenderPass(scene, camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.42, 0.55, 0.9);
    // Bloom from a half-resolution base: soft glow costs a quarter of the fill.
    const fullSize = this.bloom.setSize.bind(this.bloom);
    this.bloom.setSize = (bw: number, bh: number) => fullSize(Math.max(1, Math.round(bw / 2)), Math.max(1, Math.round(bh / 2)));
    this.composer.addPass(this.bloom);
    this.ca = new ShaderPass(CA);
    this.composer.addPass(this.ca);
    this.composer.addPass(new OutputPass());
    this.setSize(w, h, gl.getPixelRatio());
  }

  setSize(w: number, h: number, dpr: number) {
    this.composer.setPixelRatio(dpr);
    this.composer.setSize(w, h);
  }

  render(dt: number, boosting: boolean, reduced: boolean) {
    const target = boosting && !reduced ? 0.012 : 0;
    this.amount += (target - this.amount) * Math.min(1, dt * 8);
    this.ca.uniforms.uAmount.value = this.amount;
    this.ca.enabled = this.amount > 0.0005;
    this.composer.render(dt);
  }

  dispose() {
    this.bloom.dispose();
    this.composer.dispose();
  }
}
