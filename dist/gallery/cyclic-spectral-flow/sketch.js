/**
 * Cyclic Spectral Flow
 * 
 * This generative artwork visualizes a rotating 3D particle system projected onto a 2D canvas.
 * The simulation follows a life cycle: it builds a complex web of trails for 20 seconds,
 * then rapidly dissolves into darkness before resetting to begin the cycle anew.
 */

const NOISE_SCALE = 400;
const SPEED = 20;
const TRAIL_ALPHA = 10;
const PARTICLE_DENSITY = 0.01;
const BOX_SIZE = 1500;

const DRAW_DURATION = 20000;
const FADE_DURATION = 3000;
let startTime;

let particles = [];
let zOff = 0;

let angX = 0, angY = 0, angZ = 0;
let rot = { cX: 1, sX: 0, cY: 1, sY: 0, cZ: 1, sZ: 0 };

function setup() {
  createCanvas(windowWidth, windowHeight);
  resetSketch();
}

function draw() {
  let elapsed = millis() - startTime;

  if (elapsed < DRAW_DURATION) {
    let cx = width / 2;
    let cy = height / 2;

    rot.cX = cos(angX); rot.sX = sin(angX);
    rot.cY = cos(angY); rot.sY = sin(angY);
    rot.cZ = cos(angZ); rot.sZ = sin(angZ);

    for (let p of particles) {
      p.moveAndDraw(cx, cy);
    }

    zOff += 0.01;
    angX += 0.025;
    angY += 0.04;
    angZ += 0.015;

  } else if (elapsed < DRAW_DURATION + FADE_DURATION) {
    noStroke();
    fill(0, 40);
    rect(0, 0, width, height);
    stroke(255, TRAIL_ALPHA);
  } else {
    resetSketch();
  }
}

function resetSketch() {
  startTime = millis();
  background(0);
  zOff = 0;
  angX = 0; angY = 0; angZ = 0;
  strokeWeight(1.2);
  stroke(255, TRAIL_ALPHA);
  initParticles();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  resetSketch();
}

function initParticles() {
  particles = [];
  let particleCount = floor(width * height * PARTICLE_DENSITY);
  if (particleCount > 10000) particleCount = 10000;
  for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
  }
}

class Particle {
  constructor() {
    this.x = random(-BOX_SIZE/2, BOX_SIZE/2);
    this.y = random(-BOX_SIZE/2, BOX_SIZE/2);
    this.z = random(-BOX_SIZE/2, BOX_SIZE/2);
  }

  moveAndDraw(cx, cy) {
    let oldX = this.x;
    let oldY = this.y;
    let oldZ = this.z;

    let n = noise(oldX/NOISE_SCALE, oldY/NOISE_SCALE, oldZ/NOISE_SCALE + zOff);
    let theta = n * TWO_PI * 4;
    let phi = (n * PI) - (PI/2);

    this.x += cos(theta) * SPEED;
    this.y += sin(theta) * SPEED;
    this.z += sin(phi) * SPEED;

    const half = BOX_SIZE / 2;
    if (this.x > half) this.x = -half; else if (this.x < -half) this.x = half;
    if (this.y > half) this.y = -half; else if (this.y < -half) this.y = half;
    if (this.z > half) this.z = -half; else if (this.z < -half) this.z = half;

    let dx = this.x - oldX;
    let dy = this.y - oldY;
    let dz = this.z - oldZ;
    let distSq = dx*dx + dy*dy + dz*dz;
    let maxDistSq = (SPEED * 2) ** 2;

    if (distSq < maxDistSq) {
      // Rotate old position
      let y1 = oldY * rot.cX - oldZ * rot.sX;
      let z1 = oldY * rot.sX + oldZ * rot.cX;
      let x2 = oldX * rot.cY + z1 * rot.sY;
      let z2 = -oldX * rot.sY + z1 * rot.cY;
      let x3 = x2 * rot.cZ - y1 * rot.sZ;
      let y3 = x2 * rot.sZ + y1 * rot.cZ;
      let scale1 = 800 / (800 + z2 + 1000);
      let sx1 = x3 * scale1 + cx;
      let sy1 = y3 * scale1 + cy;

      // Rotate new position
      y1 = this.y * rot.cX - this.z * rot.sX;
      z1 = this.y * rot.sX + this.z * rot.cX;
      x2 = this.x * rot.cY + z1 * rot.sY;
      z2 = -this.x * rot.sY + z1 * rot.cY;
      x3 = x2 * rot.cZ - y1 * rot.sZ;
      y3 = x2 * rot.sZ + y1 * rot.cZ;
      let scale2 = 800 / (800 + z2 + 1000);
      let sx2 = x3 * scale2 + cx;
      let sy2 = y3 * scale2 + cy;

      line(sx1, sy1, sx2, sy2);
    }
  }
}
