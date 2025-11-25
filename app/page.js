"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export default function Home() {
  const [showButton, setShowButton] = useState(false);

  // Affichage du bouton après l'impact + propagation
  useEffect(() => {
    const timer = setTimeout(() => setShowButton(true), 2600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="landing">
      {/* Fonds animés */}
      <div className="bg-layer bg-image" />
      <div className="bg-layer bg-tint" />
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

        {/* Goutte + onde + filaments */}
        <div className="impact-zone">
          {/* Goutte qui tombe doucement et se dissout */}
          <motion.div
            className="drop"
            initial={{ y: -140, opacity: 1 }}
            animate={{ y: 0, opacity: 0 }}
            transition={{
              delay: 0.6,
              duration: 1.7, // chute lente + fondu
              ease: "easeOut",
            }}
          />

          {/* Ondes circulaires */}
          <motion.div
            className="ripple ripple-main"
            initial={{ scale: 0, opacity: 0.7 }}
            animate={{ scale: 6, opacity: 0 }}
            transition={{
              delay: 1.2,
              duration: 2.0,
              ease: "easeOut",
            }}
          />

          <motion.div
            className="ripple ripple-secondary"
            initial={{ scale: 0, opacity: 0.5 }}
            animate={{ scale: 8, opacity: 0 }}
            transition={{
              delay: 1.3,
              duration: 2.4,
              ease: "easeOut",
            }}
          />

          {/* Filaments / lignes type encre dans l'eau */}
          <div className="filaments">
            <motion.div
              className="filament filament-1"
              initial={{ scaleX: 0.5, opacity: 0 }}
              animate={{ scaleX: 1.6, opacity: [0.35, 0.2, 0] }}
              transition={{
                delay: 1.25,
                duration: 2.6,
                ease: "easeOut",
              }}
            />
            <motion.div
              className="filament filament-2"
              initial={{ scaleX: 0.6, opacity: 0 }}
              animate={{ scaleX: 1.8, opacity: [0.3, 0.18, 0] }}
              transition={{
                delay: 1.4,
                duration: 3.0,
                ease: "easeOut",
              }}
            />
          </div>
        </div>

        {/* Bouton qui apparaît après l'onde */}
        {showButton && (
          <motion.button
            className="cta-btn"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            onClick={() => {
              // À remplacer plus tard par ta vraie page carte
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
