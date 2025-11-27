"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

/* ---------------- SHADERS POUR LE FLUX D'ENCRE ---------------- */

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const fragmentShader = `
  precision highp float;

  uniform float u_time;
  uniform vec2 u_resolution;

  varying vec2 vUv;

  // rotation 2D
  vec2 rotate(vec2 p, float a) {
    float s = sin(a);
    float c = cos(a);
    return vec2(c * p.x - s * p.y, s * p.x + c * p.y);
  }

  void main() {
    // coord normalisées (0–1)
    vec2 uv = vUv;

    // centrer et passer en repère [-1,1]
    vec2 p = uv - 0.5;

    // flux diagonal bas-gauche -> haut-droit
    float angle = radians(-30.0);
    vec2 pr = rotate(p, angle);

    // temps et vitesse globale (flux plutôt lent)
    float t = u_time * 0.2;

    // centre approximatif de l'impact (repère du flux)
    vec2 center = vec2(0.0, -0.05);

    // oscillations (veines qui serpentent) AVANT swirl
    vec2 prOsc = pr;
    prOsc.y += 0.05 * sin(pr.x * 2.3 + t * 0.8);
    prOsc.y += 0.03 * sin(pr.x * 4.1 - t * 0.6);
    prOsc.x += 0.02 * sin(pr.y * 3.0 + t * 0.7);

    // ---------------- TRANSITION DIAGONAL -> VORTEX DOUX ----------------

    float rippleStart = 9.0;                // début de l'onde en secondes
    float swirlPhaseStart = rippleStart + 0.2;
    float swirlPhaseEnd   = swirlPhaseStart + 2.5; // transition lente (~2.5 s)

    float swirlStrength = 0.0;
    if (u_time > swirlPhaseStart) {
      swirlStrength = clamp(
        (u_time - swirlPhaseStart) / (swirlPhaseEnd - swirlPhaseStart),
        0.0,
        1.0
      );
    }

    // flux final : on part de prOsc et on ajoute un swirl tangentiel
    vec2 prFlow = prOsc;
    if (swirlStrength > 0.0) {
      vec2 v = prOsc - center;
      float r = length(v) + 1e-4;
      vec2 vDir = v / r;
      vec2 tang = vec2(-vDir.y, vDir.x); // tangente (rotation 90°)

      // masque radial : surtout autour d'un anneau, pas trop au centre/loin
      float radialInner = smoothstep(0.0, 0.3, r);
      float radialOuter = smoothstep(1.4, 0.5, r);
      float radialMask = radialInner * radialOuter;

      float swirlAmount = swirlStrength * radialMask * 0.35;
      prFlow += tang * swirlAmount;
    }

    // Coordonnées de filaments basées sur prFlow (diagonal -> vortex)
    float x = prFlow.x * 4.0 - t;
    float y = prFlow.y * 3.0;

    // couleur de base (bleu nuit)
    vec3 col = vec3(0.0, 0.02, 0.07);

    // ---- FILAMENTS SINUSOÏDAUX (densité C, luminosité moyenne L2) ----

    float f1 = smoothstep(0.10, 0.0, abs(y - 0.30 * sin(x * 1.2 + 0.3)));
    vec3 c1 = vec3(0.03, 0.15, 0.40);

    float f2 = smoothstep(0.09, 0.0, abs(y + 0.25 * sin(x * 1.1 + 1.2)));
    vec3 c2 = vec3(0.06, 0.30, 0.65);

    float f3 = smoothstep(0.08, 0.0, abs(y - 0.20 * sin(x * 1.6 + 2.0)));
    vec3 c3 = vec3(0.15, 0.55, 0.90);

    float f4 = smoothstep(0.07, 0.0, abs(y + 0.15 * sin(x * 1.9 + 3.0)));
    vec3 c4 = vec3(0.35, 0.80, 1.0);

    float f5 = smoothstep(0.05, 0.0, abs(y - 0.12 * sin(x * 2.2 + 4.0)));
    vec3 c5 = vec3(0.90, 0.95, 1.0);

    float f6 = smoothstep(0.06, 0.0, abs(y + 0.18 * sin(x * 2.6 + 5.1)));
    vec3 c6 = vec3(0.18, 0.45, 0.85);

    // accumulation filaments
    col += c1 * f1;
    col += c2 * f2;
    col += c3 * f3;
    col += c4 * f4 * 0.8;
    col += c5 * f5 * 0.8;
    col += c6 * f6 * 0.7;

    // renforcement global au centre du ruban (avant swirl : basé sur pr)
    float bandMask = smoothstep(0.5, 0.0, abs(pr.y));
    col *= bandMask * 1.4;

    // vignette douce
    float d = length(p);
    col *= smoothstep(0.9, 0.3, d);

    // ---------------- PERTURBATION PAR L'ONDE (colorimétrique douce) ---------------

    float rippleT = max(u_time - rippleStart, 0.0);
    if (rippleT > 0.0) {
      float rLocal = length(prOsc - center);
      float waveFront = rippleT * 0.6;
      float envelope = exp(-4.0 * abs(rLocal - waveFront)); // reste localement visible
      float phaseWave = 14.0 * (rLocal - waveFront);
      float w = sin(phaseWave) * envelope;

      vec3 rippleTint = vec3(0.15, 0.30, 0.55);
      col += rippleTint * w * 0.6;
      col *= 1.0 + 0.4 * w;
    }

    // clamp pour rester propre
    col = clamp(col, 0.0, 1.0);

    gl_FragColor = vec4(col, 0.8);
  }
`;

/* ---------------- COMPONENT FLUX D'ENCRE ---------------- */

function InkFlowBackground() {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";

    containerRef.current.appendChild(renderer.domElement);

    const uniforms = {
      u_time: { value: 0 },
      u_resolution: {
        value: new THREE.Vector2(window.innerWidth, window.innerHeight),
      },
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    let start = performance.now();
    let animId;

    const onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      uniforms.u_resolution.value.set(w, h);
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", onResize);

    const animate = (now) => {
      uniforms.u_time.value = (now - start) / 1000.0;
      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div className="ink-layer" ref={containerRef} />;
}

/* ---------------- PAGE PRINCIPALE ---------------- */

export default function Home() {
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowButton(true), 12500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="landing">
      {/* Fonds de base */}
      <div className="bg-layer bg-image" />
      <div className="bg-layer bg-tint" />

      {/* Flux d'encre shader */}
      <InkFlowBackground />

      <div className="bg-layer bg-glow" />

      <section className="hero">
        {/* Texte */}
        <div className="hero-text">
          <p className="hero-top">ATLANTIC PULSE</p>

          <h1 className="hero-title">
            Ink & Light
          </h1>
        </div>

        {/* Zone goutte + onde */}
        <div className="impact-zone">
          {/* Goutte : plus petite, eau 3D, chute depuis tout en haut */}
          <motion.div
            className="drop"
            initial={{ top: -140, opacity: 1, scaleY: 1.1, scaleX: 0.9 }}
            animate={{ top: 40, opacity: 0, scaleY: 1.0, scaleX: 1.0 }}
            transition={{
              delay: 0.5,
              duration: 10.0,
              ease: "easeOut",
            }}
          >
            <svg
              className="drop-svg"
              viewBox="0 0 32 48"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                {/* gradient principal translucide */}
                <radialGradient id="dropGradient" cx="35%" cy="20%" r="80%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                  <stop offset="35%" stopColor="#e5f5ff" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#3c7bb7" stopOpacity="0.4" />
                </radialGradient>
                {/* highlight local */}
                <radialGradient id="dropHighlight" cx="25%" cy="18%" r="35%">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0.0)" />
                </radialGradient>
              </defs>

              {/* corps principal (légèrement asymétrique) */}
              <path
                d="M16 1 C23 11 28.5 20 28.5 27 C28.5 36 22.5 43.5 16 45 C9.5 43.5 3.5 36 3.5 27 C3.5 20 9 11 16 1 Z"
                fill="url(#dropGradient)"
              />
              {/* ombre interne douce */}
              <path
                d="M16 7 C21 15 24.5 21 24.5 26.5 C24.5 32 21 37 16 38.5 C11 37 7.5 32 7.5 26.5 C7.5 21 11 15 16 7 Z"
                fill="rgba(0,20,60,0.18)"
              />
              {/* highlight spéculaire */}
              <ellipse
                cx="11"
                cy="11"
                rx="4"
                ry="3"
                fill="url(#dropHighlight)"
              />
              {/* léger halo contour pour le volume */}
              <path
                d="M16 1 C23 11 28.5 20 28.5 27 C28.5 36 22.5 43.5 16 45 C9.5 43.5 3.5 36 3.5 27 C3.5 20 9 11 16 1 Z"
                fill="none"
                stroke="rgba(200,230,255,0.35)"
                strokeWidth="0.6"
              />
            </svg>
          </motion.div>

          {/* Ondes centrées sur le point d’impact */}
          <motion.div
            className="ripple ripple-main"
            initial={{ scale: 0, opacity: 0.7 }}
            animate={{ scale: 6, opacity: 0 }}
            transition={{
              delay: 8.5,
              duration: 2.2,
              ease: "easeOut",
            }}
          />
          <motion.div
            className="ripple ripple-secondary"
            initial={{ scale: 0, opacity: 0.5 }}
            animate={{ scale: 8.2, opacity: 0 }}
            transition={{
              delay: 8.7,
              duration: 2.6,
              ease: "easeOut",
            }}
          />
        </div>

        {/* Bouton */}
        {showButton && (
          <motion.button
            className="cta-btn"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            onClick={() => {
              window.location.href = "/map";
            }}
          >
            Explore ocean
          </motion.button>
        )}
      </section>
    </main>
  );
}

