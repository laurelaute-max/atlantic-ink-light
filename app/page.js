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

    // rotation pour avoir un flux diagonal bas-gauche -> haut-droit
    float angle = radians(-30.0);
    vec2 pr = rotate(p, angle);

    // temps et échelle
    float t = u_time * 0.5; // vitesse du flux
    float x = pr.x * 4.0 - t;   // compression + flux vers la droite
    float y = pr.y * 3.0;

    // couleur de base (bleu nuit)
    vec3 col = vec3(0.0, 0.02, 0.07);

    // ---- FILAMENTS SINUSOÏDAUX (densité C, luminosité L2) ----

    // filament 1 (bleu profond)
    float f1 = smoothstep(0.10, 0.0, abs(y - 0.30 * sin(x * 1.2 + 0.3)));
    vec3 c1 = vec3(0.03, 0.15, 0.40);

    // filament 2 (bleu moyen)
    float f2 = smoothstep(0.09, 0.0, abs(y + 0.25 * sin(x * 1.1 + 1.2)));
    vec3 c2 = vec3(0.06, 0.30, 0.65);

    // filament 3 (bleu clair)
    float f3 = smoothstep(0.08, 0.0, abs(y - 0.20 * sin(x * 1.6 + 2.0)));
    vec3 c3 = vec3(0.15, 0.55, 0.90);

    // filament 4 (cyan lumineux)
    float f4 = smoothstep(0.07, 0.0, abs(y + 0.15 * sin(x * 1.9 + 3.0)));
    vec3 c4 = vec3(0.35, 0.80, 1.0);

    // filament 5 (blanc doux)
    float f5 = smoothstep(0.05, 0.0, abs(y - 0.12 * sin(x * 2.2 + 4.0)));
    vec3 c5 = vec3(0.85, 0.93, 1.0);

    // accumulation des filaments
    col += c1 * f1;
    col += c2 * f2;
    col += c3 * f3;
    col += c4 * f4 * 0.8;
    col += c5 * f5 * 0.9;

    // renforcement global central du ruban
    float bandMask = smoothstep(0.5, 0.0, abs(pr.y));
    col *= bandMask * 1.4;

    // vignette douce pour fondre sur les bords
    float d = length(p);
    col *= smoothstep(0.9, 0.3, d);

    // ---- ONDE QUI PERTURBE LE FLUX ----

    // centre de l'impact en coordonnées écran
    // ~ milieu horizontal, légèrement sous le centre (adapter si besoin)
    vec2 center = vec2(0.0, -0.05);
    float rippleStart = 9.0;      // en s, approx. moment où l'onde apparaît
    float rippleT = max(u_time - rippleStart, 0.0);

    if (rippleT > 0.0) {
      float r = length(pr - center);  // distance au centre dans le repère du flux
      float waveFront = rippleT * 0.65;
      float width = 0.08;

      // onde radiale type sin, amortie dans le temps et l'espace
      float w = sin(12.0 * (r - waveFront)) *
                exp(-10.0 * abs(r - waveFront)) *
                exp(-0.8 * rippleT);

      // modulation de la couleur (éclaircissement local)
      col += vec3(0.2, 0.3, 0.5) * w;

      // léger renforcement de contraste local pour simuler la déformation
      col *= 1.0 + 0.6 * w;
    }

    // clamp pour rester propre
    col = clamp(col, 0.0, 1.0);

    // alpha partiel pour laisser voir le fond
    gl_FragColor = vec4(col, 0.8);
  }
`;

/* ---------------- COMPONENT BACKGROUND INK FLOW ---------------- */

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
      {/* Fonds “fixes” */}
      <div className="bg-layer bg-image" />
      <div className="bg-layer bg-tint" />
      {/* Flux d'encre WebGL */}
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
          {/* Goutte : chute lente + fondu */}
          <motion.div
            className="drop"
            initial={{ top: -80, opacity: 1 }}
            animate={{ top: 40, opacity: 0 }}
            transition={{
              delay: 0.5,
              duration: 10.0,
              ease: "easeOut",
            }}
          />

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


