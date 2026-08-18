// =============================================================================
// Cosmic Fireworks: A 3D Particle Simulation
// Original: https://openprocessing.org/sketch/2737919 by @Kazoops
// =============================================================================

let fireworks = [];
let gravity;
let angleX = 0;
let angleY = 0;
let angleZ = 0;

const FIREWORK_TYPES = ['KIKU', 'BOTAN', 'KAMURO', 'SENRIN', 'STAR_MINE'];

function setup() {
  createCanvas(windowWidth, windowHeight);
  gravity = createVector(0, 0.2, 0);
  colorMode(HSB);
  background(0);
}

function draw() {
  background(0);
  angleX += 0.002;
  angleY += 0.003;
  angleZ += 0.001;

  if (random(1) < 0.02) {
    let type = random(FIREWORK_TYPES);
    fireworks.push(new Firework(type));
  }

  for (let i = fireworks.length - 1; i >= 0; i--) {
    fireworks[i].update();
    fireworks[i].show();
    if (fireworks[i].done()) {
      fireworks.splice(i, 1);
    }
  }
}

function getScreenCoords(pos) {
  let x = pos.x;
  let y = pos.y;
  let z = pos.z;

  let cosX = cos(angleX);
  let sinX = sin(angleX);
  let y1 = y * cosX - z * sinX;
  let z1 = y * sinX + z * cosX;
  y = y1;
  z = z1;

  let cosY = cos(angleY);
  let sinY = sin(angleY);
  let x2 = x * cosY + z * sinY;
  let z2 = -x * sinY + z * cosY;
  x = x2;
  z = z2;

  let cosZ = cos(angleZ);
  let sinZ = sin(angleZ);
  let x3 = x * cosZ - y * sinZ;
  let y3 = x * sinZ + y * cosZ;
  x = x3;
  y = y3;

  let translatedZ = z - 400;
  let f = 400;
  if (translatedZ >= 0) {
    return { x: 0, y: 0, scale: 0, visible: false };
  }

  let scale = f / (f - translatedZ);
  let sx = x * scale + width / 2;
  let sy = y * scale + height / 2;

  return { x: sx, y: sy, scale: scale, visible: true };
}

class Firework {
  constructor(type) {
    this.type = type;
    this.hu = (this.type === 'KAMURO') ? 40 : random(255);
    this.exploded = false;
    this.particles = [];

    if (this.type === 'STAR_MINE') {
      this.baseX = random(-width * 0.4, width * 0.4);
      this.baseZ = random(-width * 0.4, width * 0.4);
      this.launchCount = 0;
      this.totalLaunches = random(20, 70);
      this.launchInterval = 5;
      this.timer = this.launchInterval;
      this.rockets = [];
      this.exploded = true;
    } else {
      let x = random(-width / 2, width / 2);
      let z = random(-width / 4, width / 4);
      this.firework = new Particle(x, height / 2, z, this.hu, this.type);
    }
  }

  done() {
    if (this.type === 'STAR_MINE') {
      return this.launchCount >= this.totalLaunches && this.rockets.length === 0 && this.particles.length === 0;
    }
    return this.exploded && this.particles.length === 0;
  }

  update() {
    if (this.type === 'STAR_MINE') {
      this.updateStarMine();
      return;
    }

    if (!this.exploded) {
      this.firework.update();
      if (this.firework.vel.y >= 0) {
        this.exploded = true;
        this.explode();
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update();
      if (this.particles[i].done()) {
        this.particles.splice(i, 1);
      }
    }
  }

  updateStarMine() {
    this.timer--;
    if (this.timer <= 0 && this.launchCount < this.totalLaunches) {
      const vx = random(-4, 4);
      const vy = random(-15, -11);
      const vz = random(-4, 4);
      const rocket = new Particle(this.baseX, height / 2, this.baseZ, this.hu + random(-15, 15), 'STAR_MINE_ROCKET');
      rocket.vel = createVector(vx, vy, vz);
      this.rockets.push(rocket);

      this.launchCount++;
      this.timer = this.launchInterval;
    }

    for (let i = this.rockets.length - 1; i >= 0; i--) {
      this.rockets[i].update();
      if (this.rockets[i].vel.y >= 0) {
        this.explodeParticle(this.rockets[i]);
        this.rockets.splice(i, 1);
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update();
      if (this.particles[i].done()) {
        this.particles.splice(i, 1);
      }
    }
  }

  explodeParticle(rocket) {
    for (let i = 0; i < 40; i++) {
      let p = new Particle(rocket.pos.x, rocket.pos.y, rocket.pos.z, rocket.hu, 'STAR_MINE_CHILD', true);
      p.vel = p5.Vector.random3D().mult(random(1, 6));
      this.particles.push(p);
    }
  }

  explode() {
    const { x, y, z } = this.firework.pos;

    switch (this.type) {
      case 'SENRIN':
        for (let i = 0; i < 30; i++) {
          this.particles.push(new SubFirework(x, y, z, this.hu + random(-20, 20)));
        }
        break;
      case 'KAMURO':
        for (let i = 0; i < 200; i++) {
          let p = new Particle(x, y, z, this.hu, this.type, true);
          p.vel = p5.Vector.random3D().mult(random(1, 9));
          p.lifespan = 510;
          this.particles.push(p);
        }
        break;
      default:
        const numParticles = (this.type === 'BOTAN') ? 80 : 120;
        for (let i = 0; i < numParticles; i++) {
          let p = new Particle(x, y, z, this.hu, this.type, true);
          p.vel = p5.Vector.random3D().mult(random(1, 10));
          this.particles.push(p);
        }
    }
  }

  show() {
    if (this.type === 'STAR_MINE') {
      for (let rocket of this.rockets) { rocket.show(); }
      for (let p of this.particles) { p.show(); }
      return;
    }

    if (!this.exploded) {
      this.firework.show();
    }

    for (let p of this.particles) {
      p.show();
    }
  }
}

class Particle {
  constructor(x, y, z, hu, type, isChild = false) {
    this.pos = createVector(x, y, z);
    this.type = type;
    this.hu = hu;
    this.lifespan = 255;
    this.isChild = isChild;

    if (this.isChild) {
      this.vel = createVector(0, 0, 0);
    } else {
      this.vel = createVector(0, random(-17, -12), 0);
    }
    this.acc = createVector(0, 0, 0);
  }

  applyForce(force) { this.acc.add(force); }

  update() {
    if (this.type === 'KAMURO') { this.applyForce(gravity.copy().mult(0.5)); }

    if (this.isChild) {
      this.vel.mult(0.95);
      this.lifespan -= 2.5;
    }

    if (this.type !== 'STAR_MINE_CHILD') {
      this.applyForce(gravity);
    }

    this.vel.add(this.acc);
    this.pos.add(this.vel);
    this.acc.mult(0);
  }

  show() {
    let screenPos = getScreenCoords(this.pos);
    if (!screenPos.visible) return;

    push();

    let baseWeight = this.isChild ? 3 : 5;
    strokeWeight(baseWeight * screenPos.scale);

    const normalizedLifespan = this.lifespan / 255.0;
    const fadeAlpha = sqrt(normalizedLifespan) * 255;

    stroke(this.hu, 255, 255, fadeAlpha);

    point(screenPos.x, screenPos.y);

    pop();
  }

  done() { return this.lifespan < 0; }
}

class SubFirework extends Particle {
  constructor(x, y, z, hu) {
    super(x, y, z, hu, 'SENRIN_CHILD', false);
    this.vel = p5.Vector.random3D().mult(random(3, 9));
    this.particles = [];
    this.exploded = false;
    this.delay = random(10, 40);
  }

  update() {
    if (!this.exploded) {
      this.vel.mult(0.98);
      this.pos.add(this.vel);
      this.applyForce(gravity);
      this.vel.add(this.acc);
      this.acc.mult(0);

      this.delay--;
      if (this.delay < 0) {
        this.exploded = true;
        for (let i = 0; i < 15; i++) {
          let p = new Particle(this.pos.x, this.pos.y, this.pos.z, this.hu, 'SENRIN_CHILD', true);
          p.vel = p5.Vector.random3D().mult(random(0.7, 3.5));
          this.particles.push(p);
        }
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update();
      if (this.particles[i].done()) { this.particles.splice(i, 1); }
    }
  }

  show() {
    if (!this.exploded) {
      let screenPos = getScreenCoords(this.pos);
      if (screenPos.visible) {
        push();
        strokeWeight(3 * screenPos.scale);
        stroke(this.hu, 255, 255);
        point(screenPos.x, screenPos.y);
        pop();
      }
    }

    for (let p of this.particles) {
      p.show();
    }
  }

  done() { return this.exploded && this.particles.length === 0; }
}
