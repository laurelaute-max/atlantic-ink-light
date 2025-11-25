"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export default function Home() {
  const [showButton, setShowButton] = useState(false);

  // Le bouton apparaît après l'impact de la goutte
  useEffect(() => {
    const timer = setTimeout(() => setShowButton(true), 1900);
    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="landing">
      {/* Fond image + volutes */}
      <div className="bg-layer bg-image" />
      <div className="bg-layer bg-tint" />
      <div className="bg-layer bg-glow" />

      <section className="hero">
        <div className="hero-text">
          <p className="hero-top">ATLANTIC PULSE</p>

          <h1 className="hero-title">
            L’océan
            <br />
            respire
          </h1>
        </div>

        {/* Zone goutte + onde */}
        <div className="drop-zone">
          {/* Goutte qui tombe */}
          <motion.div
            className="drop"
            initial={{ y: -90, opacity: 1 }}
            animate={{ y: 0, opacity: 0 }}
            transition={{
              delay: 0.6,
              duration: 1.3,
              ease: "easeOut",
              }}
          />

          {/* Onde principale */}
          <motion.div
            className="ripple ripple-main"
            initial={{ scale: 0, opacity: 0.6 }}
            animate={{ scale: 5, opacity: 0 }}
            transition={{ delay: 1.0, duration: 1.6, ease: "easeOut" }}
          />

          {/* Onde secondaire, pour un effet plus riche */}
          <motion.div
            className="ripple ripple-secondary"
            initial={{ scale: 0, opacity: 0.4 }}
            animate={{ scale: 7, opacity: 0 }}
            transition={{ delay: 1.2, duration: 2.0, ease: "easeOut" }}
          />
        </div>

        {/* Bouton qui n'apparaît qu'après l'onde */}
        {showButton && (
          <motion.button
            className="cta-btn"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            onClick={() => {
              // TODO : remplacer par ta vraie première page (ex: /map)
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
