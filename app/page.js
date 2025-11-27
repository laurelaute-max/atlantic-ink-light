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

    // temps (flux plutôt lent)
    float t = u_time * 0.2;

    // centre de l'impact dans le repère du flux
    vec2 center = vec2(0.0, -0.05);
    float rippleStart = 9.0;             // moment où la goutte impacte (approx)
    float rippleT = max(u_time - rippleStart, 0.0);

    // oscillations (veines qui serpentent) de base
    vec2 prOsc = pr;
    prOsc.y += 0.05 * sin(pr.x * 2.3 + t * 0.8);
    prOsc.y += 0.03 * sin(pr.x * 4.1 - t * 0.6);
    prOsc.x += 0.02 * sin(pr.y * 3.0 + t * 0.7);

    // ---------------- SWIRL SANS CASSURE : DIAGONAL -> VORTEX ----------------

    vec2 prFlow = prOsc;

    if (rippleT > 0.0) {
      vec2 v = prOsc - center;
      float r = length(v) + 1e-4;

      // direction tangentielle (tourne autour du centre)
      vec2 tangent = normalize(vec2(-v.y, v.x));

      // masque radial : fort près du centre, s'atténue vers l'extérieur
      float radialMask = exp(-3.0 * r * r);

      // phase temporelle (transition lente B3)
      float swirlPhase = smoothstep(rippleStart, rippleStart + 5.0, u_time);

      // intensité du vortex (B4 = vortex lumineux, bien marqué mais pas agressif)
      float swirlStrength = 1.6 * swirlPhase * radialMask;

      // offset tangentiel (tourbillonnement)
      vec2 swirlOffset = tangent * swirlStrength;

      // léger gonflement radial pour donner l'impression que tout "s'ouvre"
      vec2 radialDir = normalize(v);
      vec2 radialOffset = radialDir * 0.35 * swirlPhase * radialMask;

      prFlow += swirlOffset + radialOffset;
    }

    // Coordonnées finales pour dessiner les filaments
    float x = prFlow.x * 4.0 - t;
    float y = prFlow.y * 3.0;

    // couleur de base (fond océan très sombre)
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

    col += c1 * f1;
    col += c2 * f2;
    col += c3 * f3;
    col += c4 * f4 * 0.8;
    col += c5 * f5 * 0.8;
    col += c6 * f6 * 0.7;

    // renforcement au centre du ruban de base
    float bandMask = smoothstep(0.5, 0.0, abs(prOsc.y));
    col *= bandMask * 1.4;

    // vignette douce
    float d = length(p);
    col *= smoothstep(0.9, 0.3, d);

    // ---------------- GLOW DE VORTEX LUMINEUX (B4) ----------------
    if (rippleT > 0.0) {
      vec2 v = prFlow - center;
      float rGlow = length(v);
      float glowCore = exp(-16.0 * rGlow * rGlow);   // centre très lumineux
      float glowRing = exp(-8.0 * pow(rGlow - 0.18, 2.0)); // anneau léger

      float swirlPhase = smoothstep(rippleStart + 0.3, rippleStart + 2.8, u_time);

      vec3 glowColorCore = vec3(0.45, 0.85, 1.0);
      vec3 glowColorRing = vec3(0.30, 0.60, 1.0);

      col += glowColorCore * glowCore * 1.6 * swirlPhase;
      col += glowColorRing * glowRing * 0.9 * swirlPhase;
    }

    // clamp
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
          {/* Goutte plus petite, encre brillante, avec léger stretch vertical */}
          <motion.div
            className="drop"
            initial={{ top: -70, opacity: 1, scaleY: 1.1 }}
            animate={{ top: 40, opacity: 0, scaleY: 0.95 }}
            transition={{
              delay: 0.5,
              duration: 5.0,
              ease: "easeOut",
            }}
          >
            <svg
              className="drop-svg"
              viewBox="0 0 32 48"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                {/* Corps encre brillante */}
                <radialGradient id="dropInk" cx="30%" cy="20%" r="80%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                  <stop offset="30%" stopColor="#d6f0ff" stopOpacity="0.98" />
                  <stop offset="100%" stopColor="#2b7bdc" stopOpacity="0.95" />
                </radialGradient>
                {/* Reflet spéculaire */}
                <radialGradient id="dropSpec" cx="20%" cy="18%" r="40%">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.98)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0.0)" />
                </radialGradient>
                {/* Liseré plus sombre pour le volume */}
                <linearGradient id="dropEdge" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#174070" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#0b1b33" stopOpacity="0.9" />
                </linearGradient>
              </defs>

              {/* bord sombre très fin (volume) */}
              <path
                d="M16 1 C23 11 29 20 29 27 C29 36 23 43 16 45 C9 43 3 36 3 27 C3 20 9 11 16 1 Z"
                fill="url(#dropEdge)"
              />

              {/* corps principal encre brillante, légèrement plus petit */}
              <path
                d="M16 3 C22 12 27 20 27 26.5 C27 34 22 40 16 42 C10 40 5 34 5 26.5 C5 20 10 12 16 3 Z"
                fill="url(#dropInk)"
              />

              {/* ombre interne douce */}
              <path
                d="M16 7 C20.8 14 24 19.5 24 25.5 C24 31 20.8 35.5 16 37.2 C11.2 35.5 8 31 8 25.5 C8 19.5 11.2 14 16 7 Z"
                fill="rgba(0, 20, 60, 0.22)"
              />

              {/* reflet spéculaire en haut-gauche */}
              <ellipse
                cx="11"
                cy="11"
                rx="3.8"
                ry="2.6"
                fill="url(#dropSpec)"
              />
            </svg>
          </motion.div>

          {/* Ondes centrées sur le point d’impact (dépend de la taille de la goutte) */}
          <motion.div
            className="ripple ripple-main"
            initial={{ scale: 0, opacity: 0.8 }}
            animate={{ scale: 4, opacity: 0 }}
            transition={{
              delay: 7.0,
              duration: 3.6,
              ease: "easeOut",
            }}
          />
          <motion.div
            className="ripple ripple-secondary"
            initial={{ scale: 0, opacity: 0.6 }}
            animate={{ scale: 5.5, opacity: 0 }}
            transition={{
              delay: 7.2,
              duration: 4.2,
              ease: "easeOut",
            }}
          />

          <motion.div
          className="ripple ripple-third"
          initial={{ scale: 0, opacity: 0.4}}
          animate={{scale: 7.2, opacity: 0}}
          transition={{
            delay: 7.4,
            duration: 4.7,
            ease: "easeOut"
          }}
        />

        <motion.div
          className="ripple ripple-fourth"
          initial={{ scale: 0, opacity: 0.3}}
          animate={{scale: 9.5, opacity: 0}}
          transition={{
            delay: 7.6,
            duration: 5.4,
            ease: "easeOut"
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


