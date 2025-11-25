"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export default function Home() {
  const [showButton, setShowButton] = useState(false);

  // Affichage du bouton après la chute, l'onde et le mouvement d'encre
  useEffect(() => {
    const timer = setTimeout(() => setShowButton(true), 12000); // ~12 s
    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="landing">
      {/* Fonds animés */}
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
          {/* Goutte — chute très lente + disparition en fondu */}
          <motion.div
            className="drop"
            initial={{ y: -200, opacity: 1 }}
            animate={{ y: 0, opacity: 0 }}
            transition={{
              delay: 0.5,
              duration: 10.0, // chute lente (~10 s)
              ease: "easeOut",
            }}
          />

          {/* Ondes circulaires, centrées sur le point d'impact */}
          <motion.div
            className="ripple ripple-main"
            initial={{ scale: 0, opacity: 0.7 }}
            animate={{ scale: 6, opacity: 0 }}
            transition={{
              delay: 8.5, // commence vers la fin de la chute
              duration: 2.5,
              ease: "easeOut",
            }}
          />

          <motion.div
            className="ripple ripple-secondary"
            initial={{ scale: 0, opacity: 0.5 }}
            animate={{ scale: 8.5, opacity: 0 }}
            transition={{
              delay: 8.7,
              duration: 3.0,
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

