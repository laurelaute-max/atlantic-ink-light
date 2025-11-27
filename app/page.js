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

    // rotation pour flux diagonal bas-gauche -> haut-droit
    float angle = radians(-30.0);
    vec2 pr = rotate(p, angle);

    // temps et vitesse globale (flux plus lent)
    float t = u_time * 0.2;

    // légère oscillation du champ (veines qui serpentent)
    vec2 prOsc = pr;
    prOsc.y += 0.05 * sin(pr.x * 2.3 + t * 0.8);
    prOsc.y += 0.03 * sin(pr.x * 4.1 - t * 0.6);
    prOsc.x += 0.02 * sin(pr.y * 3.0 + t * 0.7);

    // centre de l'impact en coordonnées pr (approximé un peu sous le centre)
    vec2 center = vec2(0.0, -0.05);
    float rippleStart = 9.0;           // moment où l'onde commence (s)
    float rippleT = max(u_time - rippleStart, 0.0);

    float rippleField = 0.0;
    vec2 prDeformed = prOsc;

    if (rippleT > 0.0) {
      // distance au centre dans le repère du flux
      float r = length(prOsc - center);
      float waveFront = rippleT * 0.6;
      float envelope = exp(-2.0 * rippleT) * exp(-4.0 * abs(r - waveFront));
      float phase = 14.0 * (r - waveFront);
      float w = sin(phase) * envelope;

      rippleField = w;

      // déplacement radial pour "étaler" le flux en cercle
      vec2 dir = normalize(prOsc - center + 1e-4);
      float strength = 0.4;
      prDeformed += dir * w * strength;
    }

    // Coordonnées pour les filaments
    float x = prDeformed.x * 4.0 - t;  // compression + advection
    float y = prDeformed.y * 3.0;

    // couleur de base (bleu nuit)
    vec3 col = vec3(0.0, 0.02, 0.07);

    // ---- FILAMENTS SINUSOÏDAUX (densité élevée C, luminosité moyenne L2) ----

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

    // accumulation des filaments
    col += c1 * f1;
    col += c2 * f2;
    col += c3 * f3;
    col += c4 * f4 * 0.8;
    col += c5 * f5 * 0.8;
    col += c6 * f6 * 0.7;

    // renforcement global au centre du ruban
    float bandMask = smoothstep(0.5, 0.0, abs(prDeformed.y));
    col *= bandMask * 1.4;

    // vignette douce
    float d = length(p);
    col *= smoothstep(0.9, 0.3, d);

    // modulation par l'onde : éclaircissement + contraste local
    if (rippleT > 0.0) {
      vec3 rippleTint = vec3(0.15, 0.30, 0.55);
      col += rippleTint * rippleField;
      col *= 1.0 + 0.7 * rippleField;
    }

    // clamp pour ne pas saturer
    col = clamp(col, 0.0, 1.0);

    // alpha partiel pour voir le fond
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
            L’océan
            <br />
            respire
          </h1>
        </div>

        {/* Zone goutte + onde */}
        <div className="impact-zone">
          {/* Goutte : chute depuis tout en haut + forme réaliste */}
          <motion.div
            className="drop"
            initial={{ top: -120, opacity: 1 }}
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
                <radialGradient id="dropGradient" cx="30%" cy="15%" r="80%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="40%" stopColor="#e0f4ff" />
                  <stop offset="100%" stopColor="#7fc9ff" />
                </radialGradient>
              </defs>
              <path
                d="M16 0 C24 10 30 20 30 28 C30 38 24 46 16 48 C8 46 2 38 2 28 C2 20 8 10 16 0 Z"
                fill="url(#dropGradient)"
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
            Entrer dans l’océan
          </motion.button>
        )}
      </section>
    </main>
  );
}



