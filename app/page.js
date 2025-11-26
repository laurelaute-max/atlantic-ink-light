"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export default function Home() {
  const [showButton, setShowButton] = useState(false);

  // Bouton après tout (goutte + onde + flux d'encre)
  useEffect(() => {
    const timer = setTimeout(() => setShowButton(true), 12000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="landing">

      {/* Fonds */}
      <div className="bg-layer bg-image" />
      <div className="bg-layer bg-tint" />
      <div className="bg-layer ink-layer-1" />
      <div className="bg-layer ink-layer-2" />
      <div className="bg-layer ink-layer-3" />
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

        {/* Impact = goutte + onde */}
        <div className="impact-zone">

          {/* Goutte lente */}
          <motion.div
            className="drop"
            initial={{ y: -220, opacity: 1 }}
            animate={{ y: 0, opacity: 0 }}
            transition={{
              delay: 0.5,
              duration: 10,
              ease: "easeOut",
            }}
          />

          {/* Onde parfaitement centrée */}
          <motion.div
            className="ripple ripple-main"
            initial={{ scale: 0, opacity: 0.7 }}
            animate={{ scale: 6.5, opacity: 0 }}
            transition={{
              delay: 8.6,
              duration: 2.2,
              ease: "easeOut",
            }}
          />

          <motion.div
            className="ripple ripple-secondary"
            initial={{ scale: 0, opacity: 0.5 }}
            animate={{ scale: 9, opacity: 0 }}
            transition={{
              delay: 8.75,
              duration: 2.7,
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

