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

  vec2 rotate(vec2 p, float a) {
    float s = sin(a);
    float c = cos(a);
    return vec2(c * p.x - s * p.y, s * p.x + c * p.y);
  }

  void main() {
    vec2 uv = vUv;
    vec2 p = uv - 0.5;

    float angle = radians(-30.0);
    vec2 pr = rotate(p, angle);

    float t = u_time * 0.2;

    vec2 center = vec2(0.0, -0.05);

    // --- IMPORTANT : moment où l'onde commence (sec) ---
    // On synchronise pour que ça démarre après la disparition complète de la goutte
    float rippleStart = 8.8;
    float rippleT = max(u_time - rippleStart, 0.0);

    // OSCILLATIONS DU RUBAN
    vec2 prOsc = pr;
    prOsc.y += 0.05 * sin(pr.x * 2.3 + t * 0.8);
    prOsc.y += 0.03 * sin(pr.x * 4.1 - t * 0.6);
    prOsc.x += 0.02 * sin(pr.y * 3.0 + t * 0.7);

    // TRANSITION VERS VORTEX ÉTHÉRÉ
    vec2 v = prOsc - center;
    float r = length(v) + 1e-4;
    vec2 vNorm = v / r;

    float baseX = prOsc.x * 4.0 - t;
    float baseY = prOsc.y * 3.0;

    vec2 tangent = normalize(vec2(-vNorm.y, vNorm.x));

    float tPhaseStart = rippleStart + 0.2;
    float tPhaseEnd   = tPhaseStart + 2.5;
    float swirlStrengthTime = clamp(smoothstep(tPhaseStart, tPhaseEnd, u_time), 0.0, 1.0);

    float inner = smoothstep(0.0, 0.4, r);
    float outer = 1.0 - smoothstep(0.9, 1.4, r);
    float swirlRadial = inner * outer;

    float swirlStrength = swirlStrengthTime * swirlRadial;

    float swirlMag = 1.5;
    vec2 swirlOffset = tangent * swirlStrength * swirlMag;

    float x = baseX + swirlOffset.x * 3.0;
    float y = baseY + swirlOffset.y * 3.0;

    // COULEURS — RUBAN FILAMENTEUX (ÉTHÉRÉ)
    vec3 col = vec3(0.0, 0.02, 0.06);

    float f1 = smoothstep(0.10, 0.0, abs(y - 0.30 * sin(x * 1.2 + 0.3)));
    vec3 c1 = vec3(0.02, 0.13, 0.38);

    float f2 = smoothstep(0.09, 0.0, abs(y + 0.25 * sin(x * 1.1 + 1.2)));
    vec3 c2 = vec3(0.05, 0.28, 0.60);

    float f3 = smoothstep(0.08, 0.0, abs(y - 0.20 * sin(x * 1.6 + 2.0)));
    vec3 c3 = vec3(0.14, 0.52, 0.88);

    float f4 = smoothstep(0.07, 0.0, abs(y + 0.15 * sin(x * 1.9 + 3.0)));
    vec3 c4 = vec3(0.30, 0.78, 1.0);

    float f5 = smoothstep(0.05, 0.0, abs(y - 0.12 * sin(x * 2.2 + 4.0)));
    vec3 c5 = vec3(0.85, 0.93, 1.0);

    float f6 = smoothstep(0.06, 0.0, abs(y + 0.18 * sin(x * 2.6 + 5.1)));
    vec3 c6 = vec3(0.18, 0.45, 0.85);

    col += c1 * f1;
    col += c2 * f2;
    col += c3 * f3;
    col += c4 * f4 * 0.8;
    col += c5 * f5 * 0.7;
    col += c6 * f6 * 0.7;

    float bandDiag = smoothstep(0.5, 0.0, abs(prOsc.y));
    float bandRadial = smoothstep(0.8, 0.0, r);
    float bandMix = swirlStrengthTime;
    float bandMask = mix(bandDiag, bandRadial, bandMix);

    col *= bandMask * 1.4;

    float d = length(p);
    col *= smoothstep(0.9, 0.3, d);

    // ---------------- MULTI-ONDES + LÉGER EFFET CHROMATIQUE ----------------
    if (rippleT > 0.0) {
        float rLocal = length(prOsc - center);

        float w1 = sin(12.0 * (rLocal - rippleT * 0.55)) * exp(-3.0 * abs(rLocal - rippleT * 0.55));
        float w2 = sin(16.0 * (rLocal - rippleT * 0.40)) * exp(-3.5 * abs(rLocal - rippleT * 0.40));
        float w3 = sin(22.0 * (rLocal - rippleT * 0.30)) * exp(-5.0 * abs(rLocal - rippleT * 0.30));
        float w4 = sin(32.0 * (rLocal - rippleT * 0.22)) * exp(-7.0 * abs(rLocal - rippleT * 0.22));

        float w = w1 * 1.0 + w2 * 0.7 + w3 * 0.4 + w4 * 0.2;

        vec3 rippleTint = vec3(0.25, 0.45, 0.80);
        col += rippleTint * w * 0.45;
        col *= 1.0 + 0.35 * w;

        // --- léger halo chromatique autour des vaguelettes ---
        float edge = smoothstep(0.0, 0.4, abs(w));
        // on pousse un peu le rouge côté intérieur, le bleu à l'extérieur
        col.r += 0.08 * w * edge;
        col.b += 0.10 * (-w) * edge;
    }

    col = clamp(col, 0.0, 1.0);

    gl_FragColor = vec4(col, 0.8);
  }
`;

/* ---------------- BACKGROUND SHADER COMPONENT ---------------- */

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
    // on laisse un peu de temps après les ondes
    const timer = setTimeout(() => setShowButton(true), 13000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="landing">
      {/* Fonds */}
      <div className="bg-layer bg-image" />
      <div className="bg-layer bg-tint" />
      <InkFlowBackground />
      <div className="bg-layer bg-glow" />

      <section className="hero">
        <div className="hero-text">
          <p className="hero-top">ATLANTIC PULSE</p>
          <h1 className="hero-title">
            Ink & Light 
          </h1>
        </div>

        {/* Impact zone */}
        <div className="impact-zone">
          {/* Goutte : chute plus rapide + dilution ensuite */}
          <motion.div
            className="drop"
            initial={{ top: -80, scaleY: 1.15, scaleX: 0.85, opacity: 1 }}
            animate={[
              // 1 — chute (plus rapide qu'avant)
              { top: 40, scaleY: 1.0, scaleX: 1.0, opacity: 1, transition: { duration: 3.5, ease: "easeOut" } },
              // 2 — splat léger
              { scaleX: 1.25, scaleY: 0.75, transition: { duration: 0.6, ease: "easeOut" }},
              // 3 — début de dilution
              { scaleX: 1.4, scaleY: 0.9, opacity: 0.6, transition: { duration: 1.7, ease: "easeOut" }},
              // 4 — dissolution finale (jusqu'à disparition)
              { scaleX: 1.6, scaleY: 1.1, opacity: 0.0, transition: { duration: 3.0, ease: "easeInOut" }},
            ]}
          >
            <svg
              className="drop-svg"
              viewBox="0 0 32 48"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <radialGradient id="dropInkMain" cx="35%" cy="20%" r="80%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                  <stop offset="35%" stopColor="#e0f3ff" stopOpacity="0.98" />
                  <stop offset="100%" stopColor="#4ca0ff" stopOpacity="0.95" />
                </radialGradient>
                <radialGradient id="dropInkHighlight" cx="22%" cy="18%" r="32%">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0.0)" />
                </radialGradient>
                <radialGradient id="dropInkShadow" cx="60%" cy="70%" r="60%">
                  <stop offset="0%" stopColor="rgba(0,15,50,0.6)" />
                  <stop offset="100%" stopColor="rgba(0,0,0,0.0)" />
                </radialGradient>
              </defs>

              {/* forme goutte améliorée */}
              <path
                d="M16 1 C23 11 28 20 28 28 C28 37 22 44 15.5 46 C9 44 4 37 4 28 C4 20 9 11 16 1 Z"
                fill="url(#dropInkMain)"
              />
              <path
                d="M16 7 C21 15 25 21 25 27 C25 33 21 38 16 40 C11 38 7 33 7 27 C7 21 11 15 16 7 Z"
                fill="url(#dropInkShadow)"
              />
              <ellipse
                cx="11"
                cy="12"
                rx="3.6"
                ry="2.6"
                fill="url(#dropInkHighlight)"
              />
            </svg>
          </motion.div>

          {/* Ondes principales — démarrent APRÈS la disparition de la goutte */}
          <motion.div
            className="ripple ripple-main"
            initial={{ scale: 0, opacity: 0.7 }}
            animate={{ scale: 6, opacity: 0 }}
            transition={{
              delay: 4,1,      // aligné avec rippleStart du shader
              duration: 4.2,
              ease: "easeOut",
            }}
          />
          <motion.div
            className="ripple ripple-secondary"
            initial={{ scale: 0, opacity: 0.5 }}
            animate={{ scale: 8.2, opacity: 0 }}
            transition={{
              delay: 9.0,
              duration: 5.4,
              ease: "easeOut",
            }}
          />

          {/* Vaguelettes concentriques supplémentaires */}
          <motion.div
            className="ripple ripple-small"
            initial={{ scale: 0, opacity: 0.6 }}
            animate={{ scale: 3, opacity: 0 }}
            transition={{
              delay: 8.9,
              duration: 2.8,
              ease: "easeOut"
            }}
          />
          <motion.div
            className="ripple ripple-small"
            initial={{ scale: 0, opacity: 0.45 }}
            animate={{ scale: 4.5, opacity: 0 }}
            transition={{
              delay: 9.0,
              duration: 3.6,
              ease: "easeOut"
            }}
          />
          <motion.div
            className="ripple ripple-small"
            initial={{ scale: 0, opacity: 0.35 }}
            animate={{ scale: 6.5, opacity: 0 }}
            transition={{
              delay: 9.1,
              duration: 4.5,
              ease: "easeOut"
            }}
          />
          <motion.div
            className="ripple ripple-small"
            initial={{ scale: 0, opacity: 0.28 }}
            animate={{ scale: 9, opacity: 0 }}
            transition={{
              delay: 9.3,
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

