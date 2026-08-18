// Update vertex shader — Transform Feedback
export const UPDATE_VERT = `#version 300 es
precision highp float;

in vec2 aPosition;
in float aAge;
in float aLife;
in vec2 aVel;
in vec2 aForce;
in float aType;
in vec3 aColor;

out vec2 vPosition;
out float vAge;
out float vLife;
out vec2 vVel;
out vec2 vForce;
out float vType;
out vec3 vColor;

uniform float uTimeDelta;
uniform float uTime;
uniform vec2 uMouse;
uniform float uMouseActive;
uniform sampler2D uImage;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  float age = aAge + uTimeDelta;
  float life = aLife;
  vec2 pos = aPosition;
  vec2 vel = aVel;
  vec3 col = aColor;

  if (age > life) {
    age = 0.0;
    life = 0.8 + hash(vec2(float(gl_VertexID), uTime)) * 1.2;
    float tx = hash(vec2(float(gl_VertexID), 0.0));
    float ty = hash(vec2(float(gl_VertexID), 1.0));
    vec4 texel = texture(uImage, vec2(tx, ty));
    pos = (texel.rg - 0.5) * 1.8;
    vel = vec2(0.0);
    col = texel.rgb;
  }

  vel *= 0.98;
  pos += vel * uTimeDelta * 0.3;

  if (uMouseActive > 0.5) {
    vec2 d = uMouse - pos;
    float dist = length(d);
    if (dist > 0.01) vel += normalize(d) * 0.08 / (dist + 0.01);
  }

  if (abs(pos.x) > 1.0) { pos.x = sign(pos.x) * 1.0; vel.x *= -0.5; }
  if (abs(pos.y) > 1.0) { pos.y = sign(pos.y) * 1.0; vel.y *= -0.5; }

  vPosition = pos;
  vAge = age;
  vLife = life;
  vVel = vel;
  vForce = vec2(0.0);
  vType = aType;
  vColor = col;
}
`;

export const UPDATE_FRAG = `#version 300 es
precision highp float;
out vec4 fragColor;
void main() {
  fragColor = vec4(0.0);
}
`;

export const RENDER_VERT = `#version 300 es
precision highp float;

in vec2 vPosition;
in float vAge;
in float vLife;
in vec2 vVel;
in vec2 vForce;
in float vType;
in vec3 vColor;

out vec3 fColor;
out float fAlpha;

void main() {
  gl_Position = vec4(vPosition, 0.0, 1.0);
  gl_PointSize = 2.5;
  fColor = vColor;
  fAlpha = 1.0 - (vAge / vLife);
}
`;

export const RENDER_FRAG = `#version 300 es
precision highp float;

in vec3 fColor;
in float fAlpha;
out vec4 fragColor;

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  float a = smoothstep(0.5, 0.0, d);
  fragColor = vec4(fColor, a * fAlpha * 0.6);
}
`;
