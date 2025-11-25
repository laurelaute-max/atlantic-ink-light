"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import "./global.css";

export default function Home() {
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowButton(true), 2200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="landing-container">
      
      {/* Oceanic animated gradient */}
      <div className="ocean-bg" />

      {/* Falling drop */}
      <motion.div
        className="drop"
        initial={{ y: -120, opacity: 0 }}
        animate={{ y: -10, opacity: 1 }}
        transition={{ duration: 1.4, ease: "easeOut" }}
      />

      {/* Ripple expanding slowly */}
      <motion.div
        className="ripple"
        initial={{ scale: 0, opacity: 0.5 }}
        animate={{ scale: 14, opacity: 0 }}
        transition={{ duration: 2.8, ease: "easeOut" }}
      />

      {/* Title */}
      <div className="title-block">
        <h1 className="title">L’océan respire</h1>
      </div>

      {/* Button appears slowly after impact */}
      {showButton && (
        <motion.button
          className="enter-button"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          onClick={() => (window.location.href = "/map")}
        >
          Entrer dans l’océan
        </motion.button>
      )}
    </main>
  );
}
