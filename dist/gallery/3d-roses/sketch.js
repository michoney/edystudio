// #RecodeRethink https://openprocessing.org/curation/72108
// Recode: https://openprocessing.org/sketch/2027130
//
// "Not Safe" by ZRNOF
// Inspired by Etienne Jacob (https://bleuje.com/)

// Global configuration parameters for the three rose presets
const PRESETS = {
  wild: { // Single-petaled wild rose parameters
    thetaStart: -0.5 * Math.PI,
    thetaEnd: 1.5 * Math.PI,
    petalFrequency: 5.0,
    rows: 100,
    cols: 15,
    scale: 1.15,
    stamenCount: 65,
    petalOpenness: 1.25
  },
  tea: {
    thetaStart: -2 * Math.PI,
    thetaEnd: 15 * Math.PI,
    petalFrequency: 3.6,
    rows: 350,
    cols: 18,
    scale: 1.0,
    stamenCount: 20,
    petalOpenness: 1.0
  },
  english: {
    thetaStart: -3 * Math.PI,
    thetaEnd: 32 * Math.PI,
    petalFrequency: 4.2,
    rows: 500,
    cols: 20,
    scale: 0.85,
    stamenCount: 4,
    petalOpenness: 0.85
  }
};

let petalModels = { wild: null, tea: null, english: null };
let staticParts = { wild: null, tea: null, english: null };
let particleModels = { wild: null, tea: null, english: null };
let particles = [];
let numParticles = 45;

let orbitAngle = 0;
let spinAngle = 0;

let cWhite, cRed, cYellow, cPink;
let colors = [];
let timeOffsets = { wild: 0.0, tea: 1.33, english: 2.66 };

let dummyTex;
let roseShader;
let roses = [];
let lastResetTime = 0;
let szFactor = 1.0;

const vertShaderSrc = `
  precision mediump float;
  attribute vec3 aPosition;
  attribute vec3 aNormal;
  attribute vec2 aTexCoord;
  uniform mat4 uModelViewMatrix;
  uniform mat4 uProjectionMatrix;
  uniform mat3 uNormalMatrix;
  varying vec3 vNormal;
  varying vec2 vTexCoord;
  void main() {
    vNormal = normalize(uNormalMatrix * aNormal);
    vTexCoord = aTexCoord;
    gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aPosition, 1.0);
  }
`;

const fragShaderSrc = `
  precision mediump float;
  varying vec3 vNormal;
  varying vec2 vTexCoord;
  uniform vec3 uBaseColor;
  uniform float uIsWhite;
  void main() {
    float thetaVal = vTexCoord.x;
    float xVal = vTexCoord.y;
    float brightnessMod = mix(0.50, 1.0, xVal);
    brightnessMod -= thetaVal * 0.18;
    brightnessMod = max(brightnessMod, 0.15);
    vec3 finalColor = uBaseColor * brightnessMod;
    if (uIsWhite > 0.5) {
      vec3 warmTint = vec3(1.0, 0.78, 0.82);
      finalColor = mix(warmTint * 0.5, finalColor, xVal);
    }
    vec3 lightDir1 = normalize(vec3(0.3, 1.0, 0.4));
    vec3 lightDir2 = normalize(vec3(-0.4, -0.2, -0.5));
    float diffuse1 = max(dot(vNormal, lightDir1), 0.0);
    float diffuse2 = max(dot(vNormal, lightDir2), 0.0);
    float ambient = 0.32;
    vec3 litColor = finalColor * (diffuse1 * 0.85 + diffuse2 * 0.35 + ambient);
    gl_FragColor = vec4(litColor, 1.0);
  }
`;

class RoseInstance {
  constructor(vertexIndex, angleOffset) {
    this.vertexIndex = vertexIndex;
    this.angleOffset = angleOffset;
    this.isAlive = false;
    this.spawn();
    this.y = map(vertexIndex, 0, 2, 1800, -200);
  }

  spawn() {
    this.y = 1800;
    this.isAlive = true;
    const types = ['wild', 'tea', 'english'];
    this.type = random(types);
    this.timeOffset = random(0.0, 4.0);
    this.spinAngle = random(TWO_PI);
    this.spinSpeed = random(0.006, 0.02) * (random() > 0.5 ? 1.0 : -1.0);
    this.baseSpeed = random(1.0, 3.2);
    this.speed = this.baseSpeed;
    this.targetSpeed = this.baseSpeed;
    this.lastSpeedChange = millis();
    this.speedChangeInterval = random(1000, 2000);
  }

  update() {
    if (!this.isAlive) return;
    let now = millis();
    if (now - this.lastSpeedChange > this.speedChangeInterval) {
      this.targetSpeed = this.baseSpeed * random(0.7, 1.3);
      this.lastSpeedChange = now;
      this.speedChangeInterval = random(1000, 2000);
    }
    this.speed = lerp(this.speed, this.targetSpeed, 0.03);
    this.y -= this.speed;
    this.spinAngle += this.spinSpeed;
    if (this.y < -650) {
      this.isAlive = false;
      this.spawn();
    }
  }

  display(fadeFactor) {
    if (!this.isAlive) return;
    push();
    rotateY(orbitAngle + this.angleOffset);
    let triRadius = 240 * szFactor;
    translate(triRadius, this.y * szFactor, 0);
    rotateY(this.spinAngle);
    scale(szFactor);
    model(staticParts[this.type]);
    let timeVal = (frameCount * 0.0025 + this.timeOffset) % 4.0;
    let c = getInterpolatedBaseColor(timeVal);
    let r = (c.levels[0] / 255.0) * fadeFactor;
    let g = (c.levels[1] / 255.0) * fadeFactor;
    let b = (c.levels[2] / 255.0) * fadeFactor;
    let isWhiteInt = (saturation(c) < 5) ? 1.0 : 0.0;
    shader(roseShader);
    roseShader.setUniform('uBaseColor', [r, g, b]);
    roseShader.setUniform('uIsWhite', isWhiteInt);
    model(petalModels[this.type]);
    resetShader();
    pop();
  }
}

function setup() {
  const canvas = createCanvas(windowWidth, windowHeight, WEBGL);
  canvas.style('display', 'block');
  document.body.style.margin = '0';
  document.body.style.overflow = 'hidden';
  colorMode(HSB, 360, 100, 100, 100);
  angleMode(RADIANS);
  textureMode(NORMAL);
  dummyTex = createGraphics(1, 1);
  dummyTex.background(255);
  roseShader = createShader(vertShaderSrc, fragShaderSrc);
  cWhite = color(0, 0, 100);
  cRed = color(355, 95, 98);
  cYellow = color(48, 95, 100);
  cPink = color(330, 85, 100);
  colors = [cWhite, cRed, cYellow, cPink];
  staticParts.wild = buildGeometry(() => { drawStem(); drawLeaves(); drawStamen(PRESETS.wild); });
  staticParts.tea = buildGeometry(() => { drawStem(); drawLeaves(); drawStamen(PRESETS.tea); });
  staticParts.english = buildGeometry(() => { drawStem(); drawLeaves(); drawStamen(PRESETS.english); });
  petalModels.wild = buildPetals(PRESETS.wild);
  petalModels.tea = buildPetals(PRESETS.tea);
  petalModels.english = buildPetals(PRESETS.english);
  particleModels.wild = buildSpecificPetalModel('wild');
  particleModels.tea = buildSpecificPetalModel('tea');
  particleModels.english = buildSpecificPetalModel('english');
  roses.push(new RoseInstance(0, 0));
  roses.push(new RoseInstance(1, (2 * PI) / 3));
  roses.push(new RoseInstance(2, (4 * PI) / 3));
  for (let i = 0; i < numParticles; i++) {
    particles.push(new Particle());
  }
}

function draw() {
  szFactor = min(width, height) / 800.0;
  let currentMillis = millis();
  let cycleTime = currentMillis - lastResetTime;
  let fadeInDuration = (lastResetTime === 0) ? 10000 : 3000;
  let showDuration = 60000;
  let fadeOutDuration = 3000;
  let totalDuration = fadeInDuration + showDuration + fadeOutDuration;
  if (cycleTime >= totalDuration) {
    lastResetTime = currentMillis;
    cycleTime = 0;
    for (let r of roses) { r.spawn(); r.y = random(-150, 1400); }
  }
  let fadeFactor = 1.0;
  if (cycleTime < fadeInDuration) {
    fadeFactor = cycleTime / fadeInDuration;
  } else if (cycleTime >= fadeInDuration + showDuration) {
    fadeFactor = 1.0 - (cycleTime - (fadeInDuration + showDuration)) / fadeOutDuration;
  }
  background(260, 40, 13 * fadeFactor, 100);
  ambientLight(345, 40, 24 * fadeFactor);
  directionalLight(0, 0, 100 * fadeFactor, 0.2, 1, -0.2);
  pointLight(350, 90, 120 * fadeFactor, 200, -100, 300);
  pointLight(210, 75, 100 * fadeFactor, -200, 150, 100);
  let roseWorldPositions = [];
  for (let r of roses) {
    if (r.isAlive) {
      let angle = orbitAngle + r.angleOffset;
      let rx = 240 * cos(angle) * szFactor;
      let rz = -240 * sin(angle) * szFactor;
      let ry = r.y * szFactor;
      roseWorldPositions.push({ pos: createVector(rx, ry, rz), type: r.type });
    }
  }
  translate(0, 0, -80 * szFactor);
  rotateX(-0.65);
  orbitAngle += 0.0035;
  for (let pt of particles) { pt.update(roseWorldPositions); pt.display(fadeFactor); }
  for (let r of roses) { r.update(); r.display(fadeFactor); }
}

function drawStem() {
  push();
  translate(0, 140, 0);
  fill(130, 65, 18);
  noStroke();
  cylinder(5, 280);
  pop();
}

function drawLeaves() {
  let leafAngle = 144;
  let startY = 70, gapY = 45;
  for (let i = 0; i < 4; i++) {
    drawLeaf(startY + i * gapY, i * leafAngle);
  }
}

function drawLeaf(yPos, angleDeg) {
  push();
  rotateY(radians(angleDeg));
  translate(4, yPos, 0);
  rotateZ(0.35);
  fill(135, 75, 22);
  noStroke();
  beginShape(TRIANGLE_STRIP);
  for (let i = 0; i <= 10; i++) {
    let t = map(i, 0, 10, 0, PI);
    let lWidth = sin(t) * 16;
    let lLength = map(i, 0, 10, 0, 48);
    let bend = sin(t) * 6;
    vertex(lLength, bend, -lWidth);
    vertex(lLength, bend, lWidth);
  }
  endShape();
  pop();
}

function drawStamen(preset) {
  push();
  translate(0, -48, 0);
  for (let i = 0; i < preset.stamenCount; i++) {
    let theta = i * 2.39996;
    let r = 1.6 * sqrt(i);
    let sx = r * cos(theta);
    let sz = r * sin(theta);
    let sy = sq(r) * 0.08 - 12;
    stroke(55, 80, 50, 90);
    strokeWeight(1.0);
    line(sx * 0.4, sy + 15, sz * 0.4, sx, sy, sz);
    noStroke();
    fill(45, 90, 95);
    push();
    translate(sx, sy, sz);
    sphere(1.5);
    pop();
  }
  pop();
}

function buildGeometry(drawFn) {
  let pg = createGraphics(1, 1, WEBGL);
  pg.colorMode(HSB, 360, 100, 100, 100);
  pg.noStroke();
  pg.textureMode(NORMAL);
  pg.texture(dummyTex);
  pg.push();
  drawFn();
  pg.pop();
  return pg;
}

function buildPetals(preset) {
  return buildGeometry(() => {
    for (let row = 1; row < preset.rows; row++) {
      let theta1 = map(row - 1, 0, preset.rows, preset.thetaStart, preset.thetaEnd);
      let theta2 = map(row, 0, preset.rows, preset.thetaStart, preset.thetaEnd);
      beginShape(TRIANGLE_STRIP);
      for (let col = 0; col <= preset.cols; col++) {
        let x1 = map(col, 0, preset.cols, 0, 1);
        let v1 = getRoseVertex(x1, theta1, preset);
        let v2 = getRoseVertex(x1, theta2, preset);
        let u1 = map(theta1, preset.thetaStart, preset.thetaEnd, 0.0, 1.0);
        let v1_u = x1;
        let u2 = map(theta2, preset.thetaStart, preset.thetaEnd, 0.0, 1.0);
        let v2_u = x1;
        vertex(v1.x, v1.y, v1.z, u1, v1_u);
        vertex(v2.x, v2.y, v2.z, u2, v2_u);
      }
      endShape();
    }
  });
}

function buildSpecificPetalModel(type) {
  return buildGeometry(() => {
    let preset = PRESETS[type];
    let steps = 20;
    beginShape(TRIANGLE_STRIP);
    for (let i = 0; i <= steps; i++) {
      let t = map(i, 0, steps, 0, PI);
      let w, l, bend;
      if (type === 'wild') {
        w = sin(t) * 12;
        l = map(i, 0, steps, -18, 18);
        bend = sin(t) * 6;
      } else if (type === 'tea') {
        w = (sin(t) * 10) + (sin(t * 3) * 0.8);
        l = map(i, 0, steps, -18, 18);
        bend = sin(t) * 6;
      } else {
        w = (sin(t) * 8) + (sin(t * 3) * 1.2);
        l = map(i, 0, steps, -11, 11);
        bend = sin(t) * 4.5;
      }
      vertex(l, bend, -w, 0.0, map(i, 0, steps, 0.0, 1.0));
      vertex(l, bend, w, 1.0, map(i, 0, steps, 0.0, 1.0));
    }
    endShape();
  });
}

function getRoseVertex(x, theta, preset) {
  let phi = (PI / 2) * exp(-theta / (8 * PI)) * preset.petalOpenness;
  let term1 = (preset.petalFrequency * theta) % TWO_PI;
  if (term1 < 0) term1 += TWO_PI;
  let term2 = 1 - term1 / PI;
  let term3 = 1.25 * pow(term2, 2) - 0.25;
  let X = 1.0 - 0.5 * pow(term3, 2);
  let y = 1.95653 * pow(x, 2) * pow(1.27689 * x - 1, 2) * sin(phi);
  let r = X * (x * sin(phi) + y * cos(phi));
  let px = r * sin(theta);
  let pz = r * cos(theta);
  let py = -X * (x * cos(phi) - y * sin(phi));
  return createVector(px * preset.scale * 160, py * preset.scale * 160 - 45, pz * preset.scale * 160);
}

function getInterpolatedBaseColor(timeVal) {
  let idx = floor(timeVal) % 4;
  let nextIdx = (idx + 1) % 4;
  let amt = timeVal % 1.0;
  return lerpColor(colors[idx], colors[nextIdx], amt);
}

class Particle {
  constructor() {
    this.reset();
  }

  reset() {
    // Initialize random particle position and velocity
    this.pos = createVector(random(-500, 500), random(-800, 800), random(-300, 300));
    this.vel = createVector(random(-0.5, 0.5), random(-0.3, -1.2), random(-0.3, 0.3));
    this.size = random(0.5, 1.2);
    this.rot = random(TWO_PI);
    this.rotSpeed = random(-0.03, 0.03);
    this.type = random(['wild', 'tea', 'english']);
  }

  update(roseWorldPositions) {
    this.pos.add(this.vel);
    this.pos.x += sin(frameCount * 0.01 + this.size) * 0.25 * szFactor;
    this.rot += this.rotSpeed;
    for (let rp of roseWorldPositions) {
      let dx = this.pos.x - rp.pos.x;
      let dz = this.pos.z - rp.pos.z;
      let distXZ = sqrt(dx * dx + dz * dz);
      let colRadius = 145 * PRESETS[rp.type].scale * szFactor;
      if (distXZ < colRadius) { // If the petal enters the infinite vertical cylinder of the rose
        let pushAngle = atan2(dz, dx);
        this.vel.x += cos(pushAngle) * 0.3;
        this.vel.z += sin(pushAngle) * 0.3;
        this.vel.y += 0.5;
        // Increase rotational flutter randomness on impact to prevent visual stretching
        this.rotSpeed = random(-0.06, 0.06);
      }
    }
    if (this.pos.y > 450 * szFactor) { // If the particle falls below the scaled viewport limit
      this.reset(); // Recycle and respawn above the screen
    }
  }

  display(fadeFactor) {
    push();
    translate(this.pos.x, this.pos.y, this.pos.z);
    rotateX(this.rot * 0.3);
    rotateY(this.rot);
    rotateZ(this.rot * 0.5);
    // Halved the base scale multiplier to make falling petals half their previous size
    // Scale down dynamically to match shader for other elements
    scale(this.size * 0.225 * PRESETS[this.type].scale * szFactor);
    fill(0, 0, 100 * fadeFactor, 80 * fadeFactor);
    noStroke();
    model(particleModels[this.type]);
    pop();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
} // End of windowResized function
