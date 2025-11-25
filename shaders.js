// src/shaders.js

export function createUniforms() {
  const THREE = window.THREE;
  return {
    u_time: { value: 0.0 },
    u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    u_ripples: { value: [] }, // Array of Vector4(x, y, radius, strength) - pushed from JS
    u_baseColor: { value: new THREE.Color(0x031027) }, // very dark indigo
    u_inkColor: { value: new THREE.Color(0x1e78c7) }, // blue volute tint
    // internal (not sent to shader as array of objects due to limitations — we will flatten in material on update)
    _lastRippleTime: 0.0,
  };
}

// Vertex shader (full screen quad)
export const vertexShader = `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

// Fragment shader (noise + ripple)
export const fragmentShader = `#ifdef GL_ES
precision highp float;
#endif

varying vec2 vUv;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec3 u_baseColor;
uniform vec3 u_inkColor;

// We'll accept up to 6 ripples from JS. (x, y, radius, strength) each.
uniform vec4 u_ripple0;
uniform vec4 u_ripple1;
uniform vec4 u_ripple2;
uniform vec4 u_ripple3;
uniform vec4 u_ripple4;
uniform vec4 u_ripple5;

// ------- compact noise (iq) ---------------------------------
vec3 mod289(vec3 x){return x - floor(x * (1.0 / 289.0)) * 289.0;}
vec2 mod289(vec2 x){return x - floor(x * (1.0 / 289.0)) * 289.0;}
vec3 permute(vec3 x){return mod289(((x*34.0)+1.0)*x);}
float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187,0.366025403784439, -0.577350269189626,0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0,0.0) : vec2(0.0,1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute( permute(i.y + vec3(0.0, i1.y, 1.0))
      + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m; m = m*m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
  vec3 g;
  g.x  = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
float fbm(vec2 p){
  float f = 0.0;
  float w = 0.5;
  for(int i=0;i<5;i++){
    f += w * snoise(p);
    p *= 2.0;
    w *= 0.5;
  }
  return f;
}
// ------------------------------------------------------------

float rippleEffect(vec2 uv, vec4 ripple){
  // ripple: x,y (uv), radius, strength
  vec2 center = ripple.xy;
  float d = distance(uv, center);
  float radius = ripple.z;
  float strength = ripple.w;
  // make a ring with a sin falloff
  float wave = 0.0;
  float band = radius;
  // soft ring: using Gaussian-like envelope
  float sigma = 0.04 * (1.0 + strength*0.6);
  float gauss = exp(-pow((d - band)/sigma, 2.0));
  wave = sin((d - band) * 60.0) * gauss * strength;
  return wave;
}

void main(){
  vec2 uv = vUv;
  // aspect correct coordinates (optional)
  // base noise (slow evolving)
  float n = fbm(uv * 2.5 - vec2(0.0, u_time*0.02));
  // curl-like layering
  float n2 = fbm(vec2(uv.x*1.2 - u_time*0.01, uv.y*1.4 + u_time*0.02)*3.0);
  float ink = mix(n, n2, 0.5);

  // combine ripples (max of contributions)
  float totalRipple = 0.0;
  totalRipple += rippleEffect(uv, u_ripple0);
  totalRipple += rippleEffect(uv, u_ripple1);
  totalRipple += rippleEffect(uv, u_ripple2);
  totalRipple += rippleEffect(uv, u_ripple3);
  totalRipple += rippleEffect(uv, u_ripple4);
  totalRipple += rippleEffect(uv, u_ripple5);

  // displace the ink pattern by ripple for an organic deformation
  float displaced = fbm(uv * (1.6 + totalRipple*0.25) * 2.0 - vec2(0.0, u_time*0.02));

  // color mixing
  vec3 base = u_baseColor;
  vec3 inkColor = u_inkColor;

  // combine base and ink using ink mask
  float mask = smoothstep(0.05, 0.6, displaced + 0.2);
  vec3 col = mix(base, inkColor, mask * 0.9);

  // add luminous ring where ripple is strongest
  float glow = clamp(abs(totalRipple) * 1.6, 0.0, 1.0);
  col += vec3(0.8,0.9,1.0) * glow * 0.12;

  // final tone mapping + vignette
  float vig = smoothstep(0.0, 0.9, length(uv - 0.5));
  col *= mix(1.0, 0.65, vig*0.9);

  gl_FragColor = vec4(col, 1.0);
}
`;
