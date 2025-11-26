"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export default function Home() {
  const [showButton, setShowButton] = useState(false);

  // Affichage du bouton après la séquence (goutte + onde + encre)
  useEffect(() => {
    const timer = setTimeout(() => setShowButton(true), 12000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="landing">
      {/* Fonds animés */}
      <div className="bg-layer bg-image" />
      <div className="bg-layer bg-tint" />
      <div className="bg-layer bg-ink" />
      <div className="bg-layer bg-ink2" />
      <div className="bg-layer bg-ink-filament" />
      <div className="bg-layer bg-glow" />

      <section className="hero">
        {/* Texte d’en-tête */}
        <div className="hero-text">
          <p className="hero-top">ATLANTIC PULSE</p>

          <h1 className="hero-title">
            L’océan
            <br />
            respire
          </h1>
        </div>

        {/* Zone d’impact : goutte + onde */}
        <div className="impact-zone">

          {/* Goutte lente (10s) + disparition en fondu */}
          <motion.div
            className="drop"
            initial={{ y: -220, opacity: 1 }}
            animate={{ y: 0, opacity: 0 }}
            transition={{
              delay: 0.4,
              duration: 10.0,
              ease: "easeOut",
            }}
          />

          {/* Onde principale parfaitement centrée */}
          <motion.div
            className="ripple ripple-main"
            initial={{ scale: 0, opacity: 0.7 }}
            animate={{ scale: 6.2, opacity: 0 }}
            transition={{
              delay: 8.2,
              duration: 2.5,
              ease: "easeOut",
            }}
          />

          {/* Onde secondaire */}
          <motion.div
            className="ripple ripple-secondary"
            initial={{ scale: 0, opacity: 0.45 }}
            animate={{ scale: 8.5, opacity: 0 }}
            transition={{
              delay: 8.3,
              duration: 3.0,
              ease: "easeOut",
            }}
          />
        </div>

        {/* Bouton final */}
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

