// A glowing neural waterfall built from particles, mist, and emergent geometric connections.
// click to create splash-like bursts

let streams = [];
let mist = [];
let nodes = [];

const STREAM_COUNT = 120;
const MIST_COUNT = 180;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  colorMode(HSB, 360, 100, 100, 100);
  background(220, 55, 7);

  for (let i = 0; i < STREAM_COUNT; i++) {
    streams.push(new WaterNeuron());
  }

  for (let i = 0; i < MIST_COUNT; i++) {
    mist.push(new MistParticle());
  }
}

function draw() {
  background(220, 55, 7, 18);

  drawCaveGlow();
  drawMist();

  for (let s of streams) {
    s.update();
    s.display();
  }

  drawNeuralGeometry();
  drawFallsCore();
}

class WaterNeuron {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = random(width * 0.35, width * 0.65);
    this.y = random(-height * 0.2, 0);
    this.prevX = this.x;
    this.prevY = this.y;
    this.vx = random(-0.4, 0.4);
    this.vy = random(1, 3);
    this.life = random(120, 260);
    this.age = 0;
    this.size = random(1, 2.8);
    this.hue = random(185, 205);
  }

  update() {
    this.prevX = this.x;
    this.prevY = this.y;

    let n = noise(this.x * 0.004, this.y * 0.004, frameCount * 0.006);
    let angle = map(n, 0, 1, -PI, PI);

    let centerPull = (width / 2 - this.x) * 0.0008;
    let gravity = 0.055;

    this.vx += cos(angle) * 0.08 + centerPull;
    this.vy += sin(angle) * 0.025 + gravity;

    this.vx *= 0.96;
    this.vy *= 0.985;

    this.x += this.vx;
    this.y += this.vy;

    this.age++;

    nodes.push({
      x: this.x,
      y: this.y,
      life: 80,
      hue: this.hue
    });

    if (nodes.length > 700) {
      nodes.shift();
    }

    if (
      this.y > height + 30 ||
      this.x < -60 ||
      this.x > width + 60 ||
      this.age > this.life
    ) {
      this.reset();
    }
  }

  display() {
    stroke(this.hue, 70, 95, 38);
    strokeWeight(this.size);
    line(this.prevX, this.prevY, this.x, this.y);

    noStroke();
    fill(this.hue, 60, 100, 65);
    circle(this.x, this.y, this.size * 2.2);
  }
}

class MistParticle {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = random(width * 0.15, width * 0.85);
    this.y = random(height * 0.55, height);
    this.r = random(1, 5);
    this.vx = random(-0.35, 0.35);
    this.vy = random(-0.6, -0.05);
    this.alpha = random(8, 24);
  }

  update() {
    this.x += this.vx + sin(frameCount * 0.01 + this.y * 0.01) * 0.2;
    this.y += this.vy;

    if (this.y < height * 0.35 || this.x < -20 || this.x > width + 20) {
      this.reset();
    }
  }

  display() {
    noStroke();
    fill(190, 20, 100, this.alpha);
    circle(this.x, this.y, this.r);
  }
}

function drawMist() {
  for (let m of mist) {
    m.update();
    m.display();
  }
}

function drawNeuralGeometry() {
  for (let n of nodes) {
    n.life -= 1;
  }

  nodes = nodes.filter(n => n.life > 0);

  for (let i = 0; i < nodes.length; i += 3) {
    let a = nodes[i];

    for (let j = i + 1; j < nodes.length; j += 9) {
      let b = nodes[j];
      let d = dist(a.x, a.y, b.x, b.y);

      if (d < 55) {
        let alpha = map(d, 0, 55, 32, 0);

        stroke(188, 55, 95, alpha);
        strokeWeight(0.6);
        line(a.x, a.y, b.x, b.y);

        if (d < 28 && random() < 0.015) {
          noStroke();
          fill(165, 70, 100, 40);
          circle((a.x + b.x) / 2, (a.y + b.y) / 2, 4);
        }
      }
    }
  }
}

function drawFallsCore() {
  noFill();

  for (let i = 0; i < 9; i++) {
    let x = width / 2 + sin(frameCount * 0.015 + i) * 35;
    let w = map(i, 0, 8, 30, 220);

    stroke(195, 45, 100, 5);
    strokeWeight(18 - i * 1.5);
    bezier(
      x - w * 0.12,
      -40,
      x + sin(i) * 40,
      height * 0.25,
      x - sin(i * 2) * 70,
      height * 0.65,
      x + w * 0.08,
      height + 40
    );
  }
}

function drawCaveGlow() {
  noStroke();

  for (let r = width * 0.9; r > 0; r -= 40) {
    fill(205, 45, 18, 1.5);
    ellipse(width / 2, height * 0.55, r * 0.7, r);
  }

  fill(220, 70, 3, 35);
  rect(0, 0, width, height);
}

function mousePressed() {
  for (let i = 0; i < 25; i++) {
    let s = new WaterNeuron();
    s.x = mouseX + random(-20, 20);
    s.y = mouseY + random(-20, 20);
    s.vx = random(-2, 2);
    s.vy = random(-1, 2);
    streams.push(s);
  }
}

function keyPressed() {
  if (key === "s" || key === "S") {
    saveCanvas("neural-falls", "png");
  }
  if (key === "r" || key === "R") {
    streams = [];
    mist = [];
    nodes = [];
    for (let i = 0; i < STREAM_COUNT; i++) { streams.push(new WaterNeuron()); }
    for (let i = 0; i < MIST_COUNT; i++) { mist.push(new MistParticle()); }
    background(220, 55, 7);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
