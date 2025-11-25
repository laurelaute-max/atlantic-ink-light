"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import "./global.css";

export default function Home() {
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowButton(true), 1800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="landing-container">

      {/* Animated oceanic gradient */}
      <div className="ocean-bg" />

      {/* Falling drop */}
      <motion.div
        className="drop"
        initial={{ y: -200, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      />

      {/* Ripple after impact */}
      <motion.div
        className="ripple"
        initial={{ scale: 0, opacity: 0.6 }}
        animate={{ scale: 6, opacity: 0 }}
        transition={{ duration: 1.6, ease: "easeOut" }}
      />

      {/* Title */}
      <div className="title-block">
        <h1 className="title">L’océan respire</h1>
      </div>

      {/* Button appearing after impact */}
      {showButton && (
        <motion.button
          className="enter-button"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          onClick={() => (window.location.href = "/map")}
        >
          Entrer dans l’océan
        </motion.button>
      )}
    </main>
  );
}