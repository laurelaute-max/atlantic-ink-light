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

  vec2 rotate2D(vec2 p, float a) {
    float s = sin(a);
    float c = cos(a);
    return vec2(c * p.x - s * p.y, s * p.x + c * p.y);
  }

  void main() {
    vec2 uv = vUv;
    vec2 p = uv - 0.5;

    // orientation diagonale de base
    float baseAngle = radians(-30.0);
    vec2 pr = rotate2D(p, baseAngle);

    float t = u_time * 0.2;

    // centre de l'impact dans le repère du flux
    vec2 center = vec2(0.0, -0.05);
    float rippleStart = 9.0;
    float rippleT = max(u_time - rippleStart, 0.0);

    // petites oscillations "veines" sur le flux diagonal
    vec2 prOsc = pr;
    prOsc.y += 0.05 * sin(pr.x * 2.3 + t * 0.8);
    prOsc.y += 0.03 * sin(pr.x * 4.1 - t * 0.6);
    prOsc.x += 0.02 * sin(pr.y * 3.0 + t * 0.7);

    vec2 base = prOsc;

    // ---------------- TRANSITION DIAGONALE -> VORTEX LUMINEUX ----------------

    float tPhaseStart = rippleStart + 0.2;
    float tPhaseEnd   = tPhaseStart + 2.5;  // transition lente (≈ B3)
    float rawPhase = (u_time - tPhaseStart) / (tPhaseEnd - tPhaseStart);
    float phase = clamp(smoothstep(0.0, 1.0, rawPhase), 0.0, 1.0);

    // champ final utilisé pour tracer les filaments
    vec2 prFlow = base;

    // distance au centre (utile pour vortex + onde)
    float rCenter = length(base - center);

    if (phase > 0.0) {
      vec2 fromCenter = base - center;
      float r = length(fromCenter) + 1e-4;

      // masque radial : fort au centre, décroissant vers l'extérieur
      float radialMask = exp(-2.5 * r);

      // swirl moyen mais bien visible, style galaxie d'encre
      float swirlStrength = 3.5;
      float swirl = swirlStrength * phase * radialMask;

      float s = sin(swirl);
      float c = cos(swirl);

      vec2 swirled = vec2(
        c * fromCenter.x - s * fromCenter.y,
        s * fromCenter.x + c * fromCenter.y
      );

      // léger "gonflement" radial pour l'effet sphérique
      float expand = 0.45;
      swirled *= 1.0 + expand * phase * radialMask;

      prFlow = center + swirled;
    }

    // coordonnées finales pour les filaments
    float x = prFlow.x * 4.2 - t;
    float y = prFlow.y * 3.2;

    // fond très sombre, légèrement bleuté
    vec3 col = vec3(0.0, 0.015, 0.05);

    // ---- FILAMENTS LUMINEUX (C + style 4 "galaxie d'encre") ----

    float f1 = smoothstep(0.12, 0.0, abs(y - 0.32 * sin(x * 1.1 + 0.3)));
    vec3  c1 = vec3(0.05, 0.18, 0.45);

    float f2 = smoothstep(0.10, 0.0, abs(y + 0.27 * sin(x * 1.3 + 1.2)));
    vec3  c2 = vec3(0.10, 0.35, 0.75);

    float f3 = smoothstep(0.09, 0.0, abs(y - 0.22 * sin(x * 1.7 + 2.0)));
    vec3  c3 = vec3(0.25, 0.70, 1.00);

    float f4 = smoothstep(0.08, 0.0, abs(y + 0.18 * sin(x * 2.1 + 3.0)));
    vec3  c4 = vec3(0.55, 0.90, 1.00);

    float f5 = smoothstep(0.06, 0.0, abs(y - 0.14 * sin(x * 2.4 + 4.0)));
    vec3  c5 = vec3(0.98, 0.99, 1.00);

    float f6 = smoothstep(0.07, 0.0, abs(y + 0.20 * sin(x * 2.8 + 5.1)));
    vec3  c6 = vec3(0.70, 0.88, 1.00);

    col += c1 * f1;
    col += c2 * f2;
    col += c3 * f3;
    col += c4 * f4 * 0.9;
    col += c5 * f5 * 1.0;
    col += c6 * f6 * 0.85;

    // "épaisseur" du ruban, renforcement central (en fonction du flux de base)
    float bandMask = smoothstep(0.7, 0.0, abs(base.y));
    col *= bandMask * (1.5 + 0.5 * phase);

    // vignette douce
    float d = length(p);
    col *= smoothstep(0.95, 0.35, d);

    // ---------------- GLOW LUMINEUX DE L'ONDE ----------------

    if (rippleT > 0.0) {
      float waveFront = rippleT * 0.6;
      float envelope = exp(-4.0 * abs(rCenter - waveFront));
      float phaseWave = 16.0 * (rCenter - waveFront);
      float w = sin(phaseWave) * envelope;

      // halo bleu-cyan très lumineux
      vec3 rippleGlow = vec3(0.35, 0.65, 1.0);
      col += rippleGlow * w * 0.9;
      col *= 1.0 + 0.4 * w;
    }

    // clamp pour éviter les saturations bizarres
    col = clamp(col, 0.0, 1.0);

    gl_FragColor = vec4(col, 0.85);
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
          {/* Goutte : plus petite, plus 3D, lumineuse, chute depuis le haut */}
          <motion.div
            className="drop"
            initial={{ top: -150, opacity: 1 }}
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
                {/* corps lumineux bleu-blanc */}
                <radialGradient id="dropGradient" cx="30%" cy="20%" r="80%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="35%" stopColor="#ecf7ff" />
                  <stop offset="100%" stopColor="#68c4ff" />
                </radialGradient>
                {/* highlight très marqué */}
                <radialGradient id="dropHighlight" cx="22%" cy="18%" r="45%">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0.0)" />
                </radialGradient>
                {/* liseré externe très léger */}
                <radialGradient id="dropRim" cx="50%" cy="60%" r="80%">
                  <stop offset="70%" stopColor="rgba(120,190,255,0.0)" />
                  <stop offset="100%" stopColor="rgba(120,190,255,0.6)" />
                </radialGradient>
              </defs>

              {/* halo externe léger */}
              <ellipse
                cx="16"
                cy="30"
                rx="11"
                ry="15"
                fill="url(#dropRim)"
                opacity="0.65"
              />

              {/* corps principal */}
              <path
                d="M16 1 C23 11 29 20 29 27 C29 36 23 43 16 45 C9 43 3 36 3 27 C3 20 9 11 16 1 Z"
                fill="url(#dropGradient)"
              />

              {/* ombre interne subtile */}
              <path
                d="M16 7 C21 15 25 21 25 27 C25 33 21 38 16 40 C11 38 7 33 7 27 C7 21 11 15 16 7 Z"
                fill="rgba(0,18,60,0.22)"
              />

              {/* highlight spéculaire fort */}
              <ellipse
                cx="11"
                cy="12"
                rx="4"
                ry="3"
                fill="url(#dropHighlight)"
              />
            </svg>
          </motion.div>

          {/* Ondes centrées sur le point d’impact (≈ centre de la goutte) */}
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
