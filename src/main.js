// src/main.js
import {createRippleSystem as createScene} from './ripple.js';
import {initDrop} from './drop.js';

let app = {};

document.addEventListener('DOMContentLoaded', async () => {
  app = createScene({
    container: document.body,
  });

  // Initialisation goutte (ne démarre pas automatiquement)
  const dropController = initDrop(app);

  // Affiche le titre au chargement progressif
  import('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js').then(({gsap})=>{
    gsap.to('.title', {opacity:1, y:0, duration:1.1, ease: "power2.out", delay: 0.3});
  });

  // Play audio + trigger drop on first user interaction (gesture required by browsers)
  const startOnce = async () => {
    document.removeEventListener('pointerdown', startOnce);
    dropController.launch(); // launch simulated drop once
  };
  document.addEventListener('pointerdown', startOnce);

  // Enter button behaviour: reveal real button when ripple threshold reached or allow manual click
  const enterBtn = document.getElementById('enterButton');
  enterBtn.addEventListener('click', () => {
    enterBtn.blur();
    // small animation and redirect or action
    window.location.href = '#'; // remplacer par ce que tu veux
  });

  // Show button when shader signals ripple reached threshold
  app.onRippleReveal = () => {
    import('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js').then(({gsap})=>{
      gsap.to('#enterButton', {opacity:1, y:0, duration:0.9, pointerEvents: 'auto', ease: "power2.out"});
    });
  };
});
