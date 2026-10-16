/* =========================================================================
   shaders.js — 微缩水世界

     backdrop  影棚背景 + 接地投影
     solid     岩体 / 沙 / 苔藓（含水下吸收与焦散）
     water     水面（采波动贴图位移 + 折射 + 菲涅尔 + 岸边白沫）
     wall      水体切面：四壁与底，Beer-Lambert 透射当 alpha，
               所以墙后面的卵石是真的被水吃掉了颜色，而不是画上去的
     post      ACES + 暗角 + 颗粒
   ========================================================================= */
(function (global) {
  'use strict';

  const NOISE = /* glsl */`
float hash21(vec2 p){
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float hash31(vec3 p){
  p = fract(p * 0.3183099 + vec3(0.11, 0.17, 0.13));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i), b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0)), d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float vnoise3(vec3 p){
  vec3 i = floor(p), f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);
  float n000 = hash31(i), n100 = hash31(i + vec3(1,0,0));
  float n010 = hash31(i + vec3(0,1,0)), n110 = hash31(i + vec3(1,1,0));
  float n001 = hash31(i + vec3(0,0,1)), n101 = hash31(i + vec3(1,0,1));
  float n011 = hash31(i + vec3(0,1,1)), n111 = hash31(i + vec3(1,1,1));
  return mix(mix(mix(n000,n100,u.x), mix(n010,n110,u.x), u.y),
             mix(mix(n001,n101,u.x), mix(n011,n111,u.x), u.y), u.z);
}
const mat2 FM = mat2(1.62, 1.18, -1.18, 1.62);
float fbm(vec2 p, int oct){
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 6; i++){
    if (i >= oct) break;
    v += a * vnoise(p);
    p = FM * p; a *= 0.5;
  }
  return v;
}
float fbm3(vec3 p, int oct){
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 6; i++){
    if (i >= oct) break;
    v += a * vnoise3(p);
    p *= 2.03; a *= 0.5;
  }
  return v;
}`;

  /* ============================================================ 背景 */
  const BACKDROP_FS = /* glsl */`
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform vec2 uRes;
uniform float uTime;
uniform vec3 uTop;
uniform vec3 uBottom;
uniform vec4 uContact;      // xy = 接地影中心的 uv，zw = 半径（uv）
uniform float uContactA;
${NOISE}
void main(){
  vec2 uv = vUv;
  float g = pow(clamp(uv.y, 0.0, 1.0), 1.25);
  vec3 c = mix(uBottom, uTop, g);

  // 立方体落在「桌面」上的软投影：投影位置由 CPU 把底面四角投到屏幕算好
  vec2 d = (uv - uContact.xy) / max(uContact.zw, vec2(1e-3));
  float r = length(d);
  float a = pow(smoothstep(1.0, 0.10, r), 1.5) * uContactA;
  a += smoothstep(0.62, 0.0, r) * uContactA * 0.5;
  c = mix(c, vec3(0.40, 0.36, 0.32), clamp(a, 0.0, 1.0));

  // 影棚纸的极淡颗粒，避免大色块出现色带
  float n = vnoise(uv * uRes * 0.9) - 0.5;
  c += n * 0.006;
  fragColor = vec4(c, 1.0);
}`;

  /* ============================================================ 实体 */
  function solidVS(instanced) {
    return /* glsl */`
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNrm;
layout(location = 2) in vec3 aCol;
layout(location = 3) in vec4 aMat;
${instanced ? `
layout(location = 4) in mat4 aModel;
layout(location = 8) in vec3 aTint;` : `
uniform mat4 uModel;
uniform mat3 uNrmMat;
uniform vec3 uTint;`}
uniform mat4 uVP;
uniform mat4 uLightVP;

out vec3 vWorld;
out vec3 vNrm;
out vec3 vCol;
out vec4 vMat;
out vec3 vTint;

void main(){
  mat4 M = ${instanced ? 'aModel' : 'uModel'};
  mat3 NM = ${instanced ? 'transpose(inverse(mat3(M)))' : 'uNrmMat'};
  vec4 wp = M * vec4(aPos, 1.0);
  vWorld = wp.xyz;
  vNrm = normalize(NM * aNrm);
  vCol = aCol;
  vMat = aMat;
  vTint = ${instanced ? 'aTint' : 'uTint'};
  gl_Position = uVP * wp;
}`;
  }

  const SOLID_FS = /* glsl */`
precision highp float;
in vec3 vWorld;
in vec3 vNrm;
in vec3 vCol;
in vec4 vMat;
in vec3 vTint;
out vec4 fragColor;

uniform vec3 uCamPos;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uSkyAmb;
uniform vec3 uGroundAmb;
uniform float uFogDensity;
uniform float uReflectionPass;
uniform mat4 uLightVP;
uniform highp sampler2DShadow uShadowMap;
uniform float uShadowTexel;
uniform float uAlpha;
uniform vec3  uShallowTint;
uniform float uSeaLevel;
uniform float uTime;

${NOISE}

float shadowFactor(vec3 wpos, vec3 N, float ndl){
  vec3 wp = wpos + N * (0.01 + 0.04 * (1.0 - clamp(ndl, 0.0, 1.0)));
  vec4 sc = uLightVP * vec4(wp, 1.0);
  vec3 pc = sc.xyz / sc.w * 0.5 + 0.5;
  if (pc.x < 0.002 || pc.x > 0.998 || pc.y < 0.002 || pc.y > 0.998 || pc.z > 1.0) return 1.0;
  float bias = mix(0.0016, 0.0004, ndl);
  float s = 0.0;
  for (int y = -1; y <= 1; y++)
    for (int x = -1; x <= 1; x++)
      s += texture(uShadowMap, vec3(pc.xy + vec2(float(x), float(y)) * uShadowTexel, pc.z - bias));
  s /= 9.0;
  vec2 e = min(pc.xy, 1.0 - pc.xy);
  return mix(1.0, s, smoothstep(0.0, 0.05, min(e.x, e.y)));
}
float distGGX(float ndh, float a){
  float a2 = a * a;
  float d = ndh * ndh * (a2 - 1.0) + 1.0;
  return a2 / (3.14159265 * d * d);
}

/* 焦散：三层干涉环，打在水下那部分岩体和沙上 */
float caustics(vec2 p, float t){
  float acc = 0.0;
  for (int i = 0; i < 3; i++){
    float fi = float(i);
    vec2 r = p * (1.9 + fi * 0.8);
    float a = sin(r.x + t * (0.9 + fi * 0.3) + sin(r.y * 1.3 + t * 0.6));
    float b = sin(r.y * 1.21 - t * (0.8 + fi * 0.25) + sin(r.x * 1.1 - t * 0.5));
    acc += (1.0 - abs(a * b)) * 0.5;
  }
  return pow(clamp(acc / 3.0, 0.0, 1.0), 3.0);
}

void main(){
  if(uReflectionPass>.5&&vWorld.y<.05)discard;
  vec3 N = normalize(vNrm);
  vec3 V = normalize(uCamPos - vWorld);
  if (!gl_FrontFacing) N = -N;

  vec3 albedo = vCol * vTint;
  if (albedo.r > albedo.g * .92) {
    float strata=sin(vWorld.y*3.4 + fbm(vWorld.xz*.14,2)*2.0);
    float band=pow(max(0.,-strata),9.);
    float grit=vnoise3(vWorld*2.8);
    albedo *= .94 + grit*.12 - band*.17*smoothstep(.7,.15,abs(N.y));
  }
  float rough = clamp(vMat.x, 0.06, 1.0);

  vec3 L = normalize(uSunDir);
  float ndl = dot(N, L);
  float sh = shadowFactor(vWorld, N, max(ndl, 0.0));

  // 半球环境
  vec3 amb = mix(uGroundAmb, uSkyAmb, N.y * 0.5 + 0.5);

  vec3 col = albedo * (uSunColor * max(ndl, 0.0) * sh + amb);

  // 一点高光，让石头不至于像纸
  vec3 H = normalize(L + V);
  float ndh = max(dot(N, H), 0.0);
  float a = rough * rough;
  col += uSunColor * distGGX(ndh, a) * 0.12 * (1.0 - rough) * max(ndl, 0.0) * sh;

  // 水下：按 Beer-Lambert 吃掉颜色，再加焦散光网
  float depth = max(0.0, uSeaLevel - vWorld.y);
  if (depth > 0.01){
    float t = 1.0 - exp(-depth * 0.42);
    albedo = mix(albedo, albedo * uShallowTint * 1.35 + uShallowTint * 0.06, t);
    col = mix(col, albedo * (uSunColor * max(ndl, 0.0) * sh + amb) * 0.55, t);
    col += uSunColor * caustics(vWorld.xz * 0.5, uTime) * 0.22 * exp(-depth * 0.35);
  }

  // 距离雾（很轻，只是让远端退一点）
  float dist = length(uCamPos - vWorld);
  float fog = clamp(1.0 - exp(-pow(dist * uFogDensity, 2.0)), 0.0, 1.0);
  col = mix(col, uSkyAmb * 1.4, fog);

  fragColor = vec4(col, uAlpha);
}`;

  /* ============================================================ 阴影 */
  const SHADOW_VS = /* glsl */`
layout(location = 0) in vec3 aPos;
#ifdef INSTANCED
layout(location = 4) in mat4 aModel;
#else
uniform mat4 uModel;
#endif
uniform mat4 uLightVP;
void main(){
#ifdef INSTANCED
  gl_Position = uLightVP * aModel * vec4(aPos, 1.0);
#else
  gl_Position = uLightVP * uModel * vec4(aPos, 1.0);
#endif
}`;
  const SHADOW_FS = /* glsl */`
precision highp float;
void main(){}
`;

  /* ============================================================ 水面 */
  const WATER_VS = /* glsl */`
layout(location = 0) in vec2 aXZ;
uniform mat4 uVP;
uniform sampler2D uWave;        // R,G = 法线 xy（B），B = 高度（A）
uniform float uExtent;
uniform float uWaveScale;
uniform vec2 uSlosh;
uniform float uSeaLevel;
uniform float uTime;
out vec3 vWorld;
out vec2 vLocal;
out vec3 vNrm;
out float vH;

void main(){
  vec2 wp = aXZ;
  vec2 uv = wp / uExtent + 0.5;
  vec4 w = texture(uWave, uv);
  float h = w.a;
  vec3 n = normalize(w.rgb*2.-1.);
  vec3 p = vec3(wp.x, uSeaLevel + h, wp.y);
  vWorld = p;
  vLocal = wp;
  vNrm = n;
  vH = h;
  gl_Position = uVP * vec4(p, 1.0);
}`;

  const WATER_FS = /* glsl */`
precision highp float;
in vec3 vWorld;
in vec2 vLocal;
in vec3 vNrm;
in float vH;
out vec4 fragColor;

uniform vec3 uCamPos;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uSkyTop;
uniform vec3 uSkyBot;
uniform vec3 uSkyAmb;
uniform sampler2D uWave;
uniform sampler2D uMirror;
uniform sampler2D uFluid;
uniform sampler2D uUnder;        // 水下场景（水面折射的来源）
uniform sampler2D uDepthTex;     // 高度图，用来判岸线与水深
uniform vec2 uRes;
uniform float uExtent;
uniform vec3 uShallow;
uniform vec3 uDeep;
uniform float uCaustic;
uniform float uTime;
uniform float uWaveDbg;
uniform float uFlat;

${NOISE}

float fresnelDiel(float cosT, float eta){
  float f0 = (1.0 - eta) / (1.0 + eta); f0 *= f0;
  float m = clamp(1.0 - cosT, 0.0, 1.0), m2 = m * m;
  return f0 + (1.0 - f0) * m2 * m2 * m;
}

void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 wuv = vLocal / uExtent + 0.5;
  if(texture(uFluid,wuv).a<.025)discard;
  float bed = texture(uDepthTex, wuv).r;   // 地表高度（海底 + 岛）
  float depth = max(0.0, vWorld.y-bed);
  if (depth < 0.05) discard;                           // 岛上不画水

  vec3 V = normalize(uCamPos - vWorld);
  vec3 N = normalize(vNrm);

  // 细节涟漪（波动贴图给大形，这里给高频）
  float d = 1.0 - smoothstep(70.0, 460.0, length(uCamPos.xz - vLocal));
  vec2 rp = vLocal * 0.55;
  float n1 = fbm(rp + vec2(uTime * 0.25, uTime * 0.17), 2) - 0.5;
  float n2 = fbm(rp * 1.9 - vec2(uTime * 0.31, -uTime * 0.22), 2) - 0.5;
  N = normalize(N + vec3(n1 * 0.008 + n2 * 0.004, 0.0, n2 * 0.008 - n1 * 0.003) * d);

  vec3 Tv0 = refract(-V, N, 1.0 / 1.333);
  if (dot(Tv0, Tv0) < 0.25) Tv0 = vec3(0.0, -1.0, 0.0);
  float ndv = max(dot(N, V), 1e-3);
  float F = fresnelDiel(ndv, 1.0 / 1.333);

  // 折射：按法线把水下画面推歪
  vec2 roff = N.xz * 0.006 * smoothstep(0.25, 3.0, depth);
  vec3 under = texture(uUnder, clamp(uv + roff, vec2(0.001), vec2(0.999))).rgb;

  // 反射：影棚柔光箱
  vec3 R = reflect(-V, N);
  vec3 refl = mix(uSkyBot, uSkyTop, clamp(R.y * 0.5 + 0.5, 0.0, 1.0));
  float softbox=pow(max(0.,dot(R,normalize(vec3(-.8,1.,.35)))),12.);
  refl += vec3(.8,.86,.88)*softbox*.18;
  vec3 mirror=texture(uMirror,clamp(uv+N.xz*.012,vec2(.001),vec2(.999))).rgb;
  refl=mix(refl,mirror,.82);

  /* 关键：海底画面要沿水柱做 Beer-Lambert 衰减。
     没有这一步，25 米深的海底照样清清楚楚地透上来，整片海就成了浅绿玻璃。 */
  float muV = max(-dot(Tv0, V), 0.25);
  float pathLen = depth / max(abs(Tv0.y),.4);
  vec3 sigma = vec3(0.34, 0.23, 0.18);      // 每米吸收：红光吃得最快
  vec3 trans = exp(-sigma * pathLen);
  vec3 waterColor = mix(vec3(.04,.34,.28), vec3(.006,.045,.08), smoothstep(0., 17., depth));
  vec3 scat = waterColor * (uSunColor*.65+uSkyAmb*.55);
  vec3 body = under * trans + scat*(1.-trans);

  vec3 col = mix(body, refl, F * 1.15);
  vec3 interactionNormal=texture(uWave,wuv).rgb*2.-1.;
  float rippleSlope=length(interactionNormal.xz);

  /* 波坡明暗：深水区透射率已经趋近 0，水色几乎是常数，
     法线变不出颜色 —— 得显式给它一条「迎光亮背光暗」的通道，
     涟漪才读得出来（参考图那圈圈同心波就是这么看见的）。 */
  vec3 Ldir = normalize(uSunDir);
  float slope = 1.0 - clamp(N.y, 0.0, 1.0);
  vec3 nH = vec3(N.x, 0.0, N.z);
  float facing = dot(normalize(nH + vec3(1e-5, 0.0, 0.0)), normalize(Ldir + vec3(1e-5, 0.0, 0.0)));
  col *= 1.0 + slope * (0.20 + 0.28 * max(facing, 0.0)) - slope * 0.10 * max(-facing, 0.0);
  col += uSunColor * slope * 0.07 * (0.25 + 0.75 * max(facing, 0.0));
  // 浪脊：正高度压一道细亮线，涟漪的「圈」就出来了
  float crestLine = smoothstep(0.04, 0.16, vH) * (1.0 - smoothstep(0.20, 0.42, vH));
  col += vec3(0.55, 0.85, 0.92) * crestLine * 0.0 * d;

  // 阳光在涟漪上的碎光：宽一点的瓣 + 一道窄高光，涟漪才读得出来
  vec3 H = normalize(normalize(uSunDir) + V);
  float sp = pow(max(dot(N, H), 0.0), 90.0) * 0.065;
  // Irregular, stretched capillary ripples break the broad periodic swells.
  vec2 wind=vec2(vLocal.x*.50+vLocal.y*.22,vLocal.y*1.30-vLocal.x*.15);
  float phase=fbm(wind*.34+vec2(uTime*.035,0.),3);
  float fil=sin(wind.x*2.5 + phase*14. + uTime*.8);
  float filament=pow(max(0.,1.-abs(fil)),14.) * smoothstep(.35,.74,fbm(wind*.9,2));
  // Capillary detail changes normals, not white paint on the water.
  col += uSunColor * sp * 1.6 * (1.0 - F) * (0.30 + 0.70 * d);

  /* 岸边白沫：沿岛的轮廓铺一圈，被浪推着进退。
     高度纹理在这里当「离岸多远」的距离场用。 */
  float edgeD = 0.10;
  {
    float hx = texture(uDepthTex, wuv + vec2(0.004, 0.0)).r;
    float hz = texture(uDepthTex, wuv + vec2(0.0, 0.004)).r;
    vec2 grad = vec2(hx - bed, hz - bed) / 1.25;       // 地表梯度（差值，不是和！）≈ 离岸方向
    edgeD = depth / max(length(grad), 0.02);            // 沿梯度方向的岸距
  }
  float run = sin(uTime * 0.9 + vLocal.x * 0.10) * 0.25 + sin(uTime * 0.55 + vLocal.y * 0.13) * 0.2;
  float wet = edgeD + run * 0.12;            // 浪推上来的湿痕
  float lace = fbm(vLocal * 1.9 + vec2(uTime * 0.25, uTime * 0.17), 4);
  float lace2 = fbm(vLocal * 5.5 - vec2(uTime * 0.4, 0.0), 3);
  float foam = (1.0 - smoothstep(0.0, 1.8, wet)) * smoothstep(0.30, 0.70, lace * 0.6 + lace2 * 0.4);
  foam += (1.0 - smoothstep(0.0, 0.55, wet)) * 0.80;   // 贴岸那一条最白
  // Elevation itself is not foam: a tilted, smooth surface must stay clear.
  foam = clamp(foam, 0.0, 1.0);
  col = mix(col, vec3(0.97, 0.98, 0.97), foam * 0.85);

  float alpha = 1.0;
  if (uFlat > 0.5) { fragColor = vec4(0.18, 0.45, 0.55, 1.0); return; }
  if (uWaveDbg > 0.5) {
    if (uWaveDbg < 1.5)      fragColor = vec4(vec3(foam), 1.0);              // 白沫
    else if (uWaveDbg < 2.5) fragColor = vec4(vec3(edgeD / 40.0), 1.0);       // 岸距
    else if (uWaveDbg < 3.5) fragColor = vec4(vec3(wet / 4.0), 1.0);          // 湿痕
    else                     fragColor = vec4(vec3(0.5 + vH * 0.9, 0.5 + vNrm.x * 0.9, 0.5 + vNrm.z * 0.9), 1.0);
    return;
  }
  fragColor = vec4(col, alpha);
}`;

  /* ======================================================== 水体切面 */
  const WALL_VS = /* glsl */`
layout(location = 0) in vec3 aPos;     // 局部：x,z 在壁面上，y 是「该点的水柱深度」
uniform mat4 uVP;
uniform mat4 uModel;
uniform sampler2D uWave;
uniform float uExtent;
uniform float uWaveScale;
uniform vec2 uSlosh;
uniform float uSeaLevel;
uniform float uBottomY;
uniform float uTime;
out vec3 vWorld;
out float vDepth;      // 这一点在水柱里离水面多深
out float vTop;        // 顶边离海平面多高（受波影响）
void main(){
  vec4 wp = uModel * vec4(aPos, 1.0);
  vec2 uv = wp.xz / uExtent + 0.5;
  float wh = texture(uWave, uv).a;
  float top = uSeaLevel + wh;
  float bot = uBottomY;                // 壁底（立方体底面）
  float y = mix(top, bot, aPos.y);
  vec3 p = vec3(wp.x, y, wp.z);
  vWorld = p;
  vDepth = max(0.0, top - y);
  vTop = wh;
  gl_Position = uVP * vec4(p, 1.0);
}`;

  const WALL_FS = /* glsl */`
precision highp float;
in vec3 vWorld;
in float vDepth;
in float vTop;
out vec4 fragColor;

uniform vec3 uShallow;
uniform vec3 uDeep;
uniform vec3 uSunColor;
uniform vec3 uSkyAmb;
uniform float uSeaLevel;
uniform float uTime;
${NOISE}

void main(){
  // Beer-Lambert。混合是 out = src.rgb*src.a + dst*(1-src.a)，
  // 所以 alpha 取 1−T（吸收率）、rgb 取体散射色 ——
  // 这样切面后面的卵石是真的被水吃掉颜色，而不是画一层假的水。
  float d = vDepth;
  vec3 T = exp(-uDeep * d * .54);
  float trans = clamp(dot(T, vec3(0.3333)), 0.0, 1.0);

  vec3 scat = uShallow * (uSunColor * 0.55 + uSkyAmb * 1.35);
  scat *= 0.65 + 0.55 * exp(-d * 0.13);          // 越深越暗
  // 顶面下头两米是一条亮青色，下面转成祖母绿
  scat = mix(scat, scat * vec3(0.55, 1.05, 0.85), smoothstep(2.0, 9.0, d));
  scat += uSunColor * smoothstep(0.55, 0.0, d) * 0.45;   // 水面那条亮边

  vec3 c = scat;
  float foam = smoothstep(0.22, 0.0, d) * (0.35 + 0.35 * vnoise(vWorld.xz * 2.0));
  c = mix(c, vec3(0.96, 0.98, 0.97), clamp(foam, 0.0, 1.0));

  fragColor = vec4(c, clamp(1.0 - trans + foam * 0.5, 0.0, 1.0));
}`;

  /* ============================================================ 接地影 */
  const SHADOWQUAD_FS = /* glsl */`
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform float uStrength;
void main(){
  vec2 d = vUv * 2.0 - 1.0;
  float r = length(d * vec2(1.0, 1.15));
  float a = smoothstep(1.0, 0.15, r);
  a = pow(a, 1.6) * uStrength;
  // 中间再压实一点，做出接触感
  a += smoothstep(0.55, 0.0, r) * uStrength * 0.45;
  fragColor = vec4(vec3(0.36, 0.33, 0.30), clamp(a, 0.0, 1.0));
}`;

  /* ============================================================ 后期 */
  const QUAD_VS = /* glsl */`
layout(location = 0) in vec2 aPos;
out vec2 vUv;
void main(){ vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

  const POST_FS = /* glsl */`
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uScene;
uniform float uExposure;
uniform float uVignette;
uniform float uGrain;
uniform float uTime;
uniform vec3 uGain;

vec3 aces(vec3 x){
  const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void main(){
  vec2 uv = vUv;
  vec2 d = uv - 0.5;
  vec3 col = texture(uScene, uv).rgb * uExposure;
  col = aces(col);
  col *= uGain;
  col *= 1.0 - uVignette * smoothstep(0.22, 0.95, dot(d, d) * 1.7);
  col = clamp(col, 0.0, 1.0);
  col = mix(col * 12.92, 1.055 * pow(col, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, col));
  col += (hash(uv * 1024.0 + fract(uTime) * 91.7) - 0.5) * uGrain;
  fragColor = vec4(col, 1.0);
}`;

  global.SHD = {
    NOISE,
    BACKDROP_FS,
    solidVS, SOLID_FS,
    SHADOW_VS, SHADOW_FS,
    WATER_VS, WATER_FS,
    WALL_VS, WALL_FS,
    SHADOWQUAD_FS,
    QUAD_VS, POST_FS,
  };
})(window);
