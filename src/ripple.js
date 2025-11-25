// src/ripple.js
import {fragmentShader, vertexShader, createUniforms} from './shaders.js';

export function createScene({container}) {
  const THREE = window.THREE;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  const renderer = new THREE.WebGLRenderer({antialias:true, alpha:false});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  // Uniforms (incl. ripple state, time, resolution)
  const uniforms = createUniforms();
  const material = new THREE.ShaderMaterial({
    fragmentShader,
    vertexShader,
    uniforms,
  });

    // ensure uniforms for six ripples exist on the material
  const maxRipples = 6;
  function syncRipplesToMaterial(){
    // prepare plain arrays
    const ripArr = uniforms.u_ripples.value || [];
    for(let i=0;i<maxRipples;i++){
      const r = ripArr[i] || new THREE.Vector4(0,0,-10,0);
      // flatten into shader uniforms named u_ripple0..u_ripple5
      material.uniforms['u_ripple' + i] = { value: r };
    }
  }
  syncRipplesToMaterial();

  // override addRippleAt to update material uniforms when pushed
  const originalAddRippleAt = app && app.addRippleAt;
  // We'll replace the local addRippleAt defined earlier with a version that updates shader uniforms:
  function addRippleAt(ndcX, ndcY, strength=1.0) {
    const uvx = 0.5 + ndcX * 0.5;
    const uvy = 0.5 + ndcY * 0.5;
    uniforms.u_ripples.value.push(new THREE.Vector4(uvx, uvy, 0.02 * 2.0, strength));
    if (uniforms.u_ripples.value.length > maxRipples) uniforms.u_ripples.value.shift();
    // update shader uniforms
    for(let i=0;i<maxRipples;i++){
      const v = uniforms.u_ripples.value[i] || new THREE.Vector4(0,0,-10,0);
      material.uniforms['u_ripple' + i].value = v;
    }
    uniforms._lastRippleTime = performance.now() * 0.001;
  }

  // replace exported addRippleAt in returned API
  api.addRippleAt = addRippleAt;


  const plane = new THREE.Mesh(new THREE.PlaneGeometry(2,2), material);
  scene.add(plane);

  // audio handling (simple)
  let audioCtx, bgGain, hydroGain, bgAudioEl, hydroAudioEl;
  async function setupAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    bgAudioEl = document.getElementById('bg-audio');
    hydroAudioEl = document.getElementById('hydrophone-audio');

    // create media elements and connect to audio context
    const bgSrc = audioCtx.createMediaElementSource(bgAudioEl);
    const hydroSrc = audioCtx.createMediaElementSource(hydroAudioEl);

    bgGain = audioCtx.createGain();
    hydroGain = audioCtx.createGain();

    // subtle mix
    bgGain.gain.value = 0.7;
    hydroGain.gain.value = 0.3;

    bgSrc.connect(bgGain).connect(audioCtx.destination);
    hydroSrc.connect(hydroGain).connect(audioCtx.destination);

    // resume context & play
    await audioCtx.resume();
    await bgAudioEl.play().catch(()=>{});
    await hydroAudioEl.play().catch(()=>{});
  }

  // Function to resume/play audio from outside
  async function playAudio() {
    await setupAudio();
  }

  // animation loop
  let start = performance.now();
  function render(time) {
    const t = (time - start) * 0.001;
    uniforms.u_time.value = t;
    renderer.render(scene, camera);
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);

  // resize handling
  function onResize(){
    renderer.setSize(window.innerWidth, window.innerHeight);
    uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', onResize, {passive:true});
  onResize();

  // ripple trigger API: push an impact at normalized device coords [-1..1]
  function addRippleAt(ndcX, ndcY, strength=1.0) {
    // convert NDC to uv [0..1]
    const uvx = 0.5 + ndcX * 0.5;
    const uvy = 0.5 + ndcY * 0.5;
    uniforms.u_ripples.value.push(new THREE.Vector4(uvx, uvy, 0.0, strength));
    // limit array length
    if (uniforms.u_ripples.value.length > 8) uniforms.u_ripples.value.shift();
    // update a lastRippleTime to detect reveal
    uniforms._lastRippleTime = performance.now() * 0.001;
  }

  // Expose API
  const api = {
    renderer, scene, camera, material, uniforms,
    playAudio,
    addRippleAt,
    onRippleReveal: null,
  };

  // watch for ripple radius in shader by polling a uniform value
  // We'll approximate reveal by timing: when a ripple was triggered, reveal after 1.0s
  setInterval(()=>{
    if (uniforms._lastRippleTime) {
      const elapsed = performance.now() * 0.001 - uniforms._lastRippleTime;
      if (elapsed > 0.9 && api.onRippleReveal) {
        api.onRippleReveal();
        api.onRippleReveal = null; // call once
      }
    }
  }, 200);

  return api;
}
