"use client";

import { motion } from "framer-motion";
import { useEffect } from "react";

export default function Home() {
  
  // Lecture du son d'ambiance
  useEffect(() => {
    const audio = new Audio("/assets/mixkit-wind-cold-interior-1172.wav");
    audio.volume = 0.15;
    audio.loop = true;
    audio.play().catch(() => {});
    
    return () => {
      audio.pause();
    };
  }, []);

  return (
    <main
      style={{
        width: "100vw",
        height: "100vh",
        position: "relative",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column"
      }}
    >
      
      {/* Ligne ondulée */}
      <div className="wavy-line">
        <svg viewBox="0 0 1440 320">
          <motion.path
            className="glow"
            d="M0,160 C480,240 960,80 1440,160"
            stroke="#4cc9ff"
            strokeWidth="3"
            fill="none"
            animate={{
              d: [
                "M0,160 C480,240 960,80 1440,160",
                "M0,140 C480,200 960,120 1440,140",
                "M0,160 C480,240 960,80 1440,160"
              ]
            }}
            transition={{
              duration: 6,
              ease: "easeInOut",
              repeat: Infinity
            }}
          />
        </svg>
      </div>

      {/* Texte intro */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2 }}
        style={{ textAlign: "center", marginBottom: "40px" }}
      >
        <h1 style={{ fontSize: "2rem", fontWeight: 300, color: "#dce7ff" }}>
          L’océan Atlantique respire.
        </h1>
        <p style={{ marginTop: "10px", fontSize: "1.2rem", opacity: 0.8 }}>
          Entrez.
        </p>
      </motion.div>

      {/* Bouton */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 1 }}
        style={{
          padding: "14px 28px",
          background: "transparent",
          border: "1px solid #4cc9ff",
          color: "#4cc9ff",
          fontSize: "1rem",
          borderRadius: "6px",
          cursor: "pointer",
          backdropFilter: "blur(6px)",
        }}
        whileHover={{
          backgroundColor: "rgba(76,201,255,0.1)",
          boxShadow: "0 0 10px #4cc9ff"
        }}
        onClick={() => {
          window.location.href = "/map"; // futur page carte
        }}
      >
        Commencer l’exploration
      </motion.button>

    </main>
  );
}
