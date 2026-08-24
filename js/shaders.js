window.VERT_SRC = `#version 300 es
layout(location=0) in vec2 aPos;
void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }
`;

window.FRAG_SRC = `#version 300 es
precision highp float;
out vec4 fragColor;

uniform vec2  uRes;
uniform float uTime;
uniform vec3  uCamPos;
uniform vec3  uCamRight;
uniform vec3  uCamUp;
uniform vec3  uCamFwd;
uniform float uFovTan;
uniform int   uMaxSteps;
uniform float uExposure;
uniform float uDiskGain;
uniform float uDiskInner;
uniform float uDiskOuter;
uniform float uStarBright;

#define RS 1.0

float hash12(vec2 p){
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float hash13(vec3 p){
  p = fract(p * 0.1031);
  p += dot(p, p.zyx + 31.32);
  return fract((p.x + p.y) * p.z);
}
float noise2(vec2 p){
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash12(i);
  float b = hash12(i + vec2(1.0, 0.0));
  float c = hash12(i + vec2(0.0, 1.0));
  float d = hash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p){
  float v = 0.0;
  float amp = 0.5;
  for(int i = 0; i < 5; i++){
    v += amp * noise2(p);
    p = p * 2.07 + vec2(19.19, 7.33);
    amp *= 0.55;
  }
  return v;
}

vec3 stars(vec3 rd){
  vec3 col = vec3(0.0);
  for(float layer = 0.0; layer < 3.0; layer += 1.0){
    float scale = 170.0 + layer * 150.0;
    vec3 q = rd * scale;
    vec3 id = floor(q);
    vec3 f = fract(q) - 0.5;
    float h = hash13(id + vec3(layer * 23.7));
    float thr = 0.9965 - layer * 0.0008;
    if(h > thr){
      float d = length(f);
      float br = smoothstep(0.30, 0.0, d);
      float tw = 0.7 + 0.3 * sin(uTime * (1.0 + fract(h * 91.7) * 4.0) + h * 61.0);
      vec3 tint = mix(vec3(0.65, 0.78, 1.0), vec3(1.0, 0.86, 0.68), fract(h * 47.3));
      col += br * tint * tw * (1.3 - layer * 0.3);
    }
  }
  return col * uStarBright;
}

vec3 nebula(vec3 rd){
  float band = abs(dot(rd, normalize(vec3(0.38, 0.82, 0.43))));
  float mask = exp(-band * band * 16.0);
  float n = fbm(rd.xy * 2.6 + vec2(fbm(rd.zy * 2.2) * 1.4));
  n = pow(max(n, 0.0), 2.0);
  return mask * (0.010 + 0.10 * n) * vec3(0.42, 0.40, 0.58) * uStarBright;
}

vec3 background(vec3 rd){
  return stars(rd) + nebula(rd) + vec3(0.0025, 0.004, 0.007);
}

vec3 diskColor(float t){
  vec3 hot  = vec3(1.35, 1.12, 0.98);
  vec3 mid  = vec3(1.25, 0.58, 0.18);
  vec3 cold = vec3(0.50, 0.11, 0.025);
  vec3 c = mix(mid, cold, smoothstep(0.35, 1.0, t));
  return mix(hot, c, smoothstep(0.0, 0.35, t));
}

mat2 rot2(float a){
  float c = cos(a);
  float s = sin(a);
  return mat2(c, -s, s, c);
}

vec4 diskShade(vec3 pos, vec3 dir){
  float r = length(pos.xz);

  // Keplerian differential rotation
  float ang = uTime * 0.55 * inversesqrt(r * r * r);
  vec2 q = rot2(ang) * pos.xz;

  float rings = fbm(vec2(r * 2.3 - uTime * 0.30, 0.0));
  rings = pow(clamp(rings * 1.7, 0.0, 1.0), 1.7);

  float swirl = fbm(q * 1.05);

  float dens = mix(rings, rings * swirl * 2.1, 0.5);

  float prof = smoothstep(uDiskInner, uDiskInner + 0.6, r)
             * (1.0 - smoothstep(uDiskOuter - 3.5, uDiskOuter, r));
  prof *= pow(uDiskInner / r, 2.0);
  dens *= prof;

  float alpha = clamp(dens * 2.4, 0.0, 1.0);

  // Relativistic Doppler beaming + gravitational redshift
  vec3 vel = normalize(vec3(pos.z, 0.0, -pos.x));
  float beta = clamp(sqrt(0.5 / r), 0.0, 0.95);
  float gam = inversesqrt(1.0 - beta * beta);
  float dopp = 1.0 / (gam * (1.0 - beta * dot(vel, -dir)));
  float grav = sqrt(clamp(1.0 - RS / r, 0.0, 1.0));
  float shift = dopp * grav;

  vec3 c = diskColor(clamp((r - uDiskInner) / (uDiskOuter - uDiskInner), 0.0, 1.0));
  c *= vec3(pow(shift, 2.0), pow(shift, 1.35), pow(shift, 0.75));
  vec3 emit = c * dens * uDiskGain * pow(shift, 3.0);

  return vec4(emit, alpha);
}

vec3 acesTonemap(vec3 x){
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;

  vec3 rd = normalize(uCamFwd + (2.0 * uFovTan) * (uv.x * uCamRight + uv.y * uCamUp));

  vec3 p = uCamPos;
  vec3 v = rd;
  vec3 hv = cross(p, v);
  float h2 = dot(hv, hv);

  vec3 col = vec3(0.0);
  float T = 1.0;
  bool escaped = false;

  for(int i = 0; i < 600; i++){
    if(i >= uMaxSteps) break;

    float r2 = dot(p, p);
    float r = sqrt(r2);

    if(r < RS * 1.02) break;
    if(r > 90.0 && dot(p, v) > 0.0){ escaped = true; break; }

    float dt = clamp(0.15 * (r - RS) + 0.012, 0.012, 0.9);
    if(abs(p.y) < 1.4 && r < uDiskOuter + 2.0){
      dt = min(dt, max(0.05, abs(p.y) * 0.7));
    }

    vec3 a = (-1.5 * h2 / (r2 * r2 * r)) * p;
    v += a * dt;
    vec3 pn = p + v * dt;

    if(p.y * pn.y < 0.0){
      float f = p.y / (p.y - pn.y);
      vec3 hit = mix(p, pn, f);
      float hr = length(hit.xz);
      if(hr > uDiskInner && hr < uDiskOuter){
        vec4 d = diskShade(hit, normalize(v));
        col += T * d.rgb;
        T *= (1.0 - d.a);
        if(T < 0.02) break;
      }
    }

    p = pn;
  }

  if(escaped) col += T * background(normalize(v));

  col *= uExposure;
  col = acesTonemap(col);
  col = pow(col, vec3(1.0 / 2.2));

  float vig = smoothstep(1.6, 0.35, dot(uv, uv));
  col *= 0.72 + 0.28 * vig;
  col += vec3((hash12(gl_FragCoord.xy + fract(uTime) * 61.7) - 0.5) * 0.012);

  fragColor = vec4(col, 1.0);
}
`;
