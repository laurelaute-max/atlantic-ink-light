"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export default function Home() {
  const [showButton, setShowButton] = useState(false);

  // Affichage du bouton après l'onde + déformation des filaments
  useEffect(() => {
    const timer = setTimeout(() => setShowButton(true), 4300);
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

        {/* Impact zone (goutte + onde + filaments) */}
        <div className="impact-zone">
          
          {/* Goutte — chute très lente + disparition en fondu */}
          <motion.div
            className="drop"
            initial={{ y: -180, opacity: 1 }}
            animate={{ y: 0, opacity: 0 }}
            transition={{
              delay: 0.4,
              duration: 4.0,
              ease: "easeOut",
            }}
          />

          {/* Ondes circulaires, centrées sous la goutte */}
          <motion.div
            className="ripple ripple-main"
            initial={{ scale: 0, opacity: 0.7 }}
            animate={{ scale: 5.8, opacity: 0 }}
            transition={{
              delay: 2.2,
              duration: 2.1,
              ease: "easeOut",
            }}
          />

          <motion.div
            className="ripple ripple-secondary"
            initial={{ scale: 0, opacity: 0.5 }}
            animate={{ scale: 8, opacity: 0 }}
            transition={{
              delay: 2.3,
              duration: 2.5,
              ease: "easeOut",
            }}
          />

          {/* Filaments inclinés visibles dès le début */}
          <div className="filaments">
            
            {/* Filament principal */}
            <motion.div
              className="filament filament-1"
              initial={{ scaleX: 1, opacity: 0.5 }}
              animate={{
                scaleX: [1, 0.75, 1.15, 1],
                opacity: [0.5, 0.7, 0.4, 0.5],
              }}
              transition={{
                delay: 2.25,
                duration: 2.4,
                ease: "easeInOut",
              }}
            />

            {/* Filament secondaire */}
            <motion.div
              className="filament filament-2"
              initial={{ scaleX: 1, opacity: 0.4 }}
              animate={{
                scaleX: [1, 0.65, 1.2, 1],
                opacity: [0.4, 0.6, 0.35, 0.4],
              }}
              transition={{
                delay: 2.35,
                duration: 2.7,
                ease: "easeInOut",
              }}
            />
          </div>

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

