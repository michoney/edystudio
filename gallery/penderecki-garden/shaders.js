// Penderecki's Garden — Particle System
// Shaders extracted from https://pendereckisgarden.pl/en/the-studio

// ─── Vertex Shader ─────────────────────────────────────────
export const VERTEX_SHADER = `
attribute float size;
attribute float alpha;
attribute vec3 amplitude;
attribute vec3 audio;
attribute float pole;

uniform float uTime;
uniform float uScale;
uniform float uSize;
uniform float uSizeRandom;
uniform float uPositionRandom;
uniform float uDepth;
uniform float uFlat;
uniform float uAlpha;
uniform float uAlphaMin;
uniform float uAlphaMax;
uniform float uMobile;
uniform vec3 uMove;
uniform float uAudioStrength;
uniform float uAudioLow;
uniform float uAudioMid;
uniform float uAudioHigh;
uniform float uTempo;

varying vec3 vColor;
varying float vAlpha;

const float PI = 3.1415926535897932384626433832795;

vec3 mod289_1_0(vec3 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec2 mod289_1_0(vec2 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec3 permute_1_1(vec3 x) {
  return mod289_1_0(((x*34.0)+1.0)*x);
}

float snoise_1_2(vec2 v) {
  const vec4 C = vec4(0.211324865405187,
                      0.366025403784439,
                     -0.577350269189626,
                      0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289_1_0(i);
  vec3 p = permute_1_1( permute_1_1( i.y + vec3(0.0, i1.y, 1.0 ))
    + i.x + vec3(0.0, i1.x, 1.0 ));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m ;
  m = m*m ;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

void main() {
    vColor = color;
    vColor.r += uAudioStrength / 500.0;
    vColor.g += uAudioStrength / 500.0;
    vColor.b += uAudioStrength / 500.0;
    vColor.r += pole * 12.0;
    vColor.g += pole * 12.0;
    vColor.b += pole * 0.05;

    vAlpha = uAlphaMin + (uAlphaMax - uAlphaMin) * alpha;

    vec3 displaced = position;

    displaced.x += amplitude.x * snoise_1_2(vec2(amplitude.x * 10.0 + uAudioStrength / 100.0, uTime * 0.1 + uAudioStrength / 200.0)) * uMove.x * uPositionRandom * uDepth * (1.0 + uAudioStrength * 0.75 * cos(uTime / uTempo * PI));
    displaced.y += amplitude.y * snoise_1_2(vec2(amplitude.y * 10.0 + uAudioStrength / 100.0, uTime * 0.1 + uAudioStrength / 200.0)) * uMove.y * uPositionRandom * uDepth * (1.0 + uAudioStrength * 0.5 * cos(uTime / uTempo * PI));
    displaced.z += amplitude.z * snoise_1_2(vec2(amplitude.z * 10.0 + uAudioStrength / 100.0, uTime * 0.1 + uAudioStrength / 200.0)) * uMove.z * uPositionRandom * uDepth * (1.0 + uAudioStrength * 0.4 * sin(uTime / uTempo * PI));

    displaced.z += pole * abs(snoise_1_2(vec2(pole * 10.0, uTime * 0.2)));
    displaced.z *= (1.0 - uFlat);

    displaced.x *= (1.0 + uAudioStrength / 500.0);
    displaced.y *= (1.0 + uAudioStrength / 500.0);
    displaced.z *= (1.0 + uAudioStrength / 500.0);
    displaced.z += amplitude.z * uAudioHigh / 50.0;

    vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    gl_PointSize = 1.0;
    gl_PointSize += (uSizeRandom * size);
    gl_PointSize *= uScale / length(mvPosition.xyz);
    gl_PointSize *= (uSize * 0.025);
    gl_PointSize *= (1.0 + uAudioLow / 40.0);

    if (uMobile < 1.0) {
      gl_PointSize += (uAudioLow / 10.0 * size);
    }
}
`;

// ─── Fragment Shader ───────────────────────────────────────
export const FRAGMENT_SHADER = `
uniform sampler2D pointTexture;

varying vec3 vColor;
varying float vAlpha;

void main() {
    gl_FragColor = vec4(vColor, vAlpha);
    gl_FragColor = gl_FragColor * texture2D(pointTexture, gl_PointCoord);
}
`;
