// src/drop.js
// Controls a virtual drop and triggers the ripple shader uniforms
export function initDrop(app) {
  const THREE = window.THREE || window.THREE;
  // drop params
  const drop = {
    x: 0, // NDC coords (-1..1)
    y: 0.8,
    z: 0,
    speed: 1.8,
    falling: false,
  };

  // simple launch sequence: animate drop position -> impact -> trigger ripple
  function launch() {
    if (drop.falling) return;
    drop.falling = true;

    const startY = 1.2;
    const endY = 0.0;
    drop.y = startY;

    // animate using requestAnimationFrame for deterministic timing
    const startTime = performance.now();
    const duration = 900; // ms

    function step(now) {
      const t = Math.min((now - startTime) / duration, 1.0);
      // easeOutQuad
      const eased = 1 - (1 - t) * (1 - t);
      drop.y = startY + (endY - startY) * eased;
      // visual: we can translate drop pos to shader ripple when impact
      if (t >= 1.0) {
        // compute normalized UV coordinates (center = 0,0)
        const ndcX = 0; // center drop, but you can randomize
        const ndcY = 0; // surface center
        app.addRippleAt(ndcX, ndcY, 1.0);
        // small secondary ripples
        setTimeout(()=>app.addRippleAt(0,0,0.6), 160);
        setTimeout(()=>app.addRippleAt(0,0,0.35), 360);
        drop.falling = false;
      } else {
        requestAnimationFrame(step);
      }
    }
    requestAnimationFrame(step);
  }

  // Expose controller
  return {
    launch,
  };
}
