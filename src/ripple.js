// src/ripple.js
import {fragmentShader, vertexShader, createUniforms} from './shaders.js';

import * as THREE from "three";

export function createRippleSystem(api = {}) {

  /*------------------------------------------------------
   * CONFIG
   *-----------------------------------------------------*/
  const maxRipples = 6;        // Number of ripples handled by shader
  const defaultDecay = 0.5;
  const defaultRadius = 0.04;
  const rippleZones = [];

  /*------------------------------------------------------
   * INTERNAL UNIFORMS
   *-----------------------------------------------------*/
  const uniforms = {
    u_ripples:   { value: [] },
    u_rippleDecay: { value: defaultDecay },
    u_rippleRadius: { value: defaultRadius },
    u_time: { value: 0 },

    // Shader expects these 6 slots:
    u_ripple0: { value: new THREE.Vector4(0,0,-10,0) },
    u_ripple1: { value: new THREE.Vector4(0,0,-10,0) },
    u_ripple2: { value: new THREE.Vector4(0,0,-10,0) },
    u_ripple3: { value: new THREE.Vector4(0,0,-10,0) },
    u_ripple4: { value: new THREE.Vector4(0,0,-10,0) },
    u_ripple5: { value: new THREE.Vector4(0,0,-10,0) },
  };

  /*------------------------------------------------------
   * MATERIAL (shader)
   *-----------------------------------------------------*/
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */`
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      }
    `,
    fragmentShader: /* glsl */`
      uniform float u_time;
      uniform float u_rippleDecay;
      uniform float u_rippleRadius;

      uniform vec4 u_ripple0;
      uniform vec4 u_ripple1;
      uniform vec4 u_ripple2;
      uniform vec4 u_ripple3;
      uniform vec4 u_ripple4;
      uniform vec4 u_ripple5;

      varying vec2 vUv;

      float ripple(vec2 uv, vec4 r) {
        if (r.z < 0.0) return 0.0;
        float d = distance(uv, r.xy);
        float amp = sin( (d - r.z) * 40.0 ) * r.w;
        amp *= exp(-d / u_rippleDecay);
        return amp;
      }

      void main() {
        float f = 0.0;
        f += ripple(vUv, u_ripple0);
        f += ripple(vUv, u_ripple1);
        f += ripple(vUv, u_ripple2);
        f += ripple(vUv, u_ripple3);
        f += ripple(vUv, u_ripple4);
        f += ripple(vUv, u_ripple5);

        vec3 c = vec3(0.03 + f * 0.2);
        gl_FragColor = vec4(c,1.0);
      }
    `,
  });

  /*------------------------------------------------------
   * RIPPLE CREATION (FINAL UNIFIED VERSION)
   *-----------------------------------------------------*/
  function addRippleAt(ndcX, ndcY, strength = 1.0) {
    const uvx = 0.5 + ndcX * 0.5;
    const uvy = 0.5 + ndcY * 0.5;

    // store ripple in list
    uniforms.u_ripples.value.push(
      new THREE.Vector4(uvx, uvy, 0.0, strength)
    );

    if (uniforms.u_ripples.value.length > maxRipples) {
      uniforms.u_ripples.value.shift();
    }

    // push to shader slots
    for (let i = 0; i < maxRipples; i++) {
      const r = uniforms.u_ripples.value[i] || new THREE.Vector4(0,0,-10,0);
      material.uniforms[`u_ripple${i}`].value = r;
    }
  }

  /*------------------------------------------------------
   * EXTERNAL TRIGGER HELPERS
   *-----------------------------------------------------*/
  function addRippleZone(x1, y1, x2, y2) {
    rippleZones.push({ x1, y1, x2, y2 });
  }

  function addRippleRandomInZones(strength = 1.0) {
    if (rippleZones.length === 0) return;
    const z = rippleZones[Math.floor(Math.random() * rippleZones.length)];

    const x = Math.random() * (z.x2 - z.x1) + z.x1;
    const y = Math.random() * (z.y2 - z.y1) + z.y1;

    addRippleAt(x, y, strength);
  }

  /*------------------------------------------------------
   * MAIN API
   *-----------------------------------------------------*/
  api.material = material;
  api.uniforms = uniforms;
  api.addRippleAt = addRippleAt;
  api.addRippleZone = addRippleZone;
  api.addRippleRandomInZones = addRippleRandomInZones;

  return api;
}