"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export default function Home() {
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowButton(true), 12000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="landing">

      {/* --- BACKGROUND LAYERS --- */}
      <div className="bg-layer bg-image" />
      <div className="bg-layer bg-tint" />
      <div className="bg-layer ink-layer-1" />
      <div className="bg-layer ink-layer-2" />
      <div className="bg-layer ink-layer-3" />
      <div className="bg-layer bg-glow" />

      {/* --- TEXT + IMPACT --- */}
      <section className="hero">

        <div className="hero-text">
          <p className="hero-top">ATLANTIC PULSE</p>

          <h1 className="hero-title">
            L’océan
            <br />
            respire
          </h1>
        </div>

        {/* IMPACT ZONE */}
        <div className="impact-zone">

          {/* Falling drop */}
          <motion.div
            className="drop"
            initial={{ y: -220, opacity: 1 }}
            animate={{ y: 0, opacity: 0 }}
            transition={{
              delay: 0.4,
              duration: 10,
              ease: "easeOut",
            }}
          />

          {/* Centered ripple (Option 3) */}
          <motion.div
            className="ripple ripple-main"
            initial={{ scale: 0, opacity: 0.75 }}
            animate={{ scale: 6.5, opacity: 0 }}
            transition={{
              delay: 8.5,
              duration: 2.4,
              ease: "easeOut",
            }}
          />

          <motion.div
            className="ripple ripple-secondary"
            initial={{ scale: 0, opacity: 0.5 }}
            animate={{ scale: 9, opacity: 0 }}
            transition={{
              delay: 8.7,
              duration: 2.7,
              ease: "easeOut",
            }}
          />

        </div>

        {/* CTA BUTTON */}
        {showButton && (
          <motion.button
            className="cta-btn"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            onClick={() => (window.location.href = "/map")}
          >
            Entrer dans l’océan
          </motion.button>
        )}
      </section>
    </main>
  );
}

