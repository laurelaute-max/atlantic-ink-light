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

    // centre de l'impact dans le repère du flux
    vec2 center = vec2(0.0, -0.05);
    float rippleStart = 9.0;           // moment où la perturbation commence (sec)
    float rippleT = max(u_time - rippleStart, 0.0);

    // oscillations (veines qui serpentent) AVANT morphing
    vec2 prOsc = pr;
    prOsc.y += 0.05 * sin(pr.x * 2.3 + t * 0.8);
    prOsc.y += 0.03 * sin(pr.x * 4.1 - t * 0.6);
    prOsc.x += 0.02 * sin(pr.y * 3.0 + t * 0.7);

    // ---------------- TRANSITION DIAGONAL -> VORTEX ----------------

    // Coord diag (flux initial)
    float xDiag = prOsc.x * 4.0 - t;
    float yDiag = prOsc.y * 3.0;
    vec2 coordDiag = vec2(xDiag, yDiag);

    // Coord vortex (flux final circulaire)
    vec2 v = prOsc - center;
    float r = length(v) + 1e-4;
    float theta = atan(v.y, v.x);

    float swirlScale = 1.8;      // densité des tours
    float omega = 0.8;           // vitesse de rotation angulaire

    float xVortex = theta * swirlScale - u_time * omega;
    float yVortex = (r - 0.15) * 4.0;   // variation radiale pour les filaments
    vec2 coordVortex = vec2(xVortex, yVortex);

    // Phase de morphing (B3 : vortex moyen + transition lente)
    float tPhaseStart = rippleStart + 0.2;
    float tPhaseEnd   = tPhaseStart + 2.5;    // ~2.5 s de transition douce
    float phase = clamp(smoothstep(tPhaseStart, tPhaseEnd, u_time), 0.0, 1.0);

    // Coord finale utilisées pour dessiner les filaments
    vec2 coord = mix(coordDiag, coordVortex, phase);
    float x = coord.x;
    float y = coord.y;

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
    vec3 c5 = vec3(0.85, 0.93, 1.0);

    float f6 = smoothstep(0.06, 0.0, abs(y + 0.18 * sin(x * 2.6 + 5.1)));
    vec3 c6 = vec3(0.18, 0.45, 0.85);

    // accumulation filaments
    col += c1 * f1;
    col += c2 * f2;
    col += c3 * f3;
    col += c4 * f4 * 0.8;
    col += c5 * f5 * 0.8;
    col += c6 * f6 * 0.7;

    // renforcement global au centre du ruban (dans prOsc.y)
    float bandMask = smoothstep(0.5, 0.0, abs(prOsc.y));
    col *= bandMask * 1.4;

    // vignette douce
    float d = length(p);
    col *= smoothstep(0.9, 0.3, d);

    // ---------------- PERTURBATION PAR L'ONDE (colorimétrique) ----------------

    if (rippleT > 0.0) {
      float rLocal = length(prOsc - center);
      float waveFront = rippleT * 0.6;
      float envelope = exp(-4.0 * abs(rLocal - waveFront)); // reste visible
      float phaseWave = 14.0 * (rLocal - waveFront);
      float w = sin(phaseWave) * envelope;

      vec3 rippleTint = vec3(0.15, 0.30, 0.55);
      col += rippleTint * w * 0.7;
      col *= 1.0 + 0.5 * w;
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
          {/* Goutte : plus petite, 3D, chute depuis tout en haut */}
          <motion.div
            className="drop"
            initial={{ top: -140, opacity: 1 }}
            animate={{ top: 40, opacity: 0 }}
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
                <radialGradient id="dropGradient" cx="30%" cy="20%" r="80%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="35%" stopColor="#e5f5ff" />
                  <stop offset="100%" stopColor="#5fb7ff" />
                </radialGradient>
                <radialGradient id="dropHighlight" cx="20%" cy="15%" r="40%">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.9)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0.0)" />
                </radialGradient>
              </defs>

              {/* corps principal */}
              <path
                d="M16 1 C23 11 29 20 29 27 C29 36 23 43 16 45 C9 43 3 36 3 27 C3 20 9 11 16 1 Z"
                fill="url(#dropGradient)"
              />
              {/* ombre interne */}
              <path
                d="M16 6 C21 14 25 20 25 26 C25 32 21 37 16 39 C11 37 7 32 7 26 C7 20 11 14 16 6 Z"
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



