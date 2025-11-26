"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export default function Home() {
  const [showButton, setShowButton] = useState(false);

  // Bouton après goutte + onde
  useEffect(() => {
    const timer = setTimeout(() => setShowButton(true), 12500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="landing">
      {/* Fonds */}
      <div className="bg-layer bg-image" />
      <div className="bg-layer bg-tint" />
      <div className="bg-layer bg-ink" />
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

        {/* Goutte + onde */}
        <div className="impact-zone">
          {/* Goutte : chute lente (~10 s) + fondu */}
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

          {/* Ondes centrées EXACTEMENT au point d’impact */}
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
              window.location.href = "/map"; // à remplacer plus tard
            }}
          >
            Entrer dans l’océan
          </motion.button>
        )}
      </section>
    </main>
  );
}

