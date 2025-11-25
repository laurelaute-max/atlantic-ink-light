"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export default function Home() {
  const [showButton, setShowButton] = useState(false);

  // Affichage du bouton après impact
  useEffect(() => {
    const timer = setTimeout(() => setShowButton(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="landing">
      {/* --- FONDS ANIMÉS --- */}
      <div className="bg-layer bg-image" />
      <div className="bg-layer bg-tint" />
      <div className="bg-layer bg-glow" />

      {/* --- CONTENU --- */}
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

        {/* Goutte + onde centrée sur la page */}
        <div className="impact-zone">

          {/* Goutte */}
          <motion.div
            className="drop"
            initial={{ y: -120, opacity: 1 }}
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
            animate={{ scale: 6, opacity: 0 }}
            transition={{
              delay: 1.0,
              duration: 1.8,
              ease: "easeOut",
            }}
          />

          {/* Onde secondaire (douce) */}
          <motion.div
            className="ripple ripple-secondary"
            initial={{ scale: 0, opacity: 0.4 }}
            animate={{ scale: 8, opacity: 0 }}
            transition={{
              delay: 1.2,
              duration: 2.2,
              ease: "easeOut",
            }}
          />

        </div>

        {/* Bouton */}
        {showButton && (
          <motion.button
            className="cta-btn"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
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
