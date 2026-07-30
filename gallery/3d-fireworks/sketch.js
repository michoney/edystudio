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
  let x = pos.x, y = pos.y, z = pos.z;

  let cosX = cos(angleX), sinX = sin(angleX);
  let y1 = y * cosX - z * sinX, z1 = y * sinX + z * cosX;
  y = y1; z = z1;

  let cosY = cos(angleY), sinY = sin(angleY);
  let x2 = x * cosY + z * sinY, z2 = -x * sinY + z * cosY;
  x = x2; z = z2;

  let cosZ = cos(angleZ), sinZ = sin(angleZ);
  let x3 = x * cosZ - y * sinZ, y3 = x * sinZ + y * cosZ;
  x = x3; y = y3;

  let translatedZ = z - 400;
  if (translatedZ >= 0) return { x: 0, y: 0, scale: 0, visible: false };

  let scale = 400 / (400 - translatedZ);
  return { x: x * scale + width / 2, y: y * scale + height / 2, scale, visible: true };
}

class Firework {
  constructor(type) {
    this.type = type;
    this.hu = (type === 'KAMURO') ? 40 : random(255);
    this.exploded = false;
    this.particles = [];

    if (type === 'STAR_MINE') {
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
      this.firework = new Particle(x, height / 2, z, this.hu, type);
    }
  }

  done() {
    if (this.type === 'STAR_MINE') return this.launchCount >= this.totalLaunches && this.rockets.length === 0 && this.particles.length === 0;
    return this.exploded && this.particles.length === 0;
  }

  update() {
    if (this.type === 'STAR_MINE') { this.updateStarMine(); return; }
    if (!this.exploded) {
      this.firework.update();
      if (this.firework.vel.y >= 0) { this.exploded = true; this.explode(); }
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update();
      if (this.particles[i].done()) this.particles.splice(i, 1);
    }
  }

  updateStarMine() {
    this.timer--;
    if (this.timer <= 0 && this.launchCount < this.totalLaunches) {
      let r = new Particle(this.baseX, height/2, this.baseZ, this.hu+random(-15,15), 'STAR_MINE_ROCKET');
      r.vel = createVector(random(-4,4), random(-15,-11), random(-4,4));
      this.rockets.push(r);
      this.launchCount++; this.timer = this.launchInterval;
    }
    for (let i = this.rockets.length-1; i>=0; i--) {
      this.rockets[i].update();
      if (this.rockets[i].vel.y >= 0) {
        for (let j=0; j<40; j++) {
          let p = new Particle(this.rockets[i].pos.x, this.rockets[i].pos.y, this.rockets[i].pos.z, this.rockets[i].hu, 'STAR_MINE_CHILD', true);
          p.vel = p5.Vector.random3D().mult(random(1,6));
          this.particles.push(p);
        }
        this.rockets.splice(i,1);
      }
    }
    for (let i = this.particles.length-1; i>=0; i--) {
      this.particles[i].update();
      if (this.particles[i].done()) this.particles.splice(i,1);
    }
  }

  explode() {
    const {x, y, z} = this.firework.pos;
    if (this.type === 'SENRIN') {
      for (let i=0; i<30; i++) this.particles.push(new SubFirework(x, y, z, this.hu+random(-20,20)));
    } else if (this.type === 'KAMURO') {
      for (let i=0; i<200; i++) {
        let p = new Particle(x, y, z, this.hu, this.type, true);
        p.vel = p5.Vector.random3D().mult(random(1,9)); p.lifespan = 510;
        this.particles.push(p);
      }
    } else {
      let n = this.type === 'BOTAN' ? 80 : 120;
      for (let i=0; i<n; i++) {
        let p = new Particle(x, y, z, this.hu, this.type, true);
        p.vel = p5.Vector.random3D().mult(random(1,10));
        this.particles.push(p);
      }
    }
  }

  show() {
    if (this.type === 'STAR_MINE') {
      for (let r of this.rockets) r.show();
      for (let p of this.particles) p.show();
      return;
    }
    if (!this.exploded) this.firework.show();
    for (let p of this.particles) p.show();
  }
}

class Particle {
  constructor(x, y, z, hu, type, isChild = false) {
    this.pos = createVector(x, y, z);
    this.type = type;
    this.hu = hu;
    this.lifespan = 255;
    this.isChild = isChild;
    this.vel = isChild ? createVector(0,0,0) : createVector(0, random(-17,-12), 0);
    this.acc = createVector(0,0,0);
  }

  applyForce(f) { this.acc.add(f); }

  update() {
    if (this.type === 'KAMURO') this.applyForce(gravity.copy().mult(0.5));
    if (this.isChild) this.vel.mult(0.95);
    if (this.type !== 'STAR_MINE_CHILD') this.applyForce(gravity);
    if (this.isChild) this.lifespan -= 2.5;
    this.vel.add(this.acc);
    this.pos.add(this.vel);
    this.acc.mult(0);
  }

  show() {
    let s = getScreenCoords(this.pos);
    if (!s.visible) return;
    push();
    strokeWeight((this.isChild ? 3 : 5) * s.scale);
    stroke(this.hu, 255, 255, sqrt(this.lifespan/255)*255);
    point(s.x, s.y);
    pop();
  }

  done() { return this.lifespan < 0; }
}

class SubFirework extends Particle {
  constructor(x, y, z, hu) {
    super(x, y, z, hu, 'SENRIN_CHILD', false);
    this.vel = p5.Vector.random3D().mult(random(3,9));
    this.particles = [];
    this.exploded = false;
    this.delay = random(10,40);
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
        for (let i=0; i<15; i++) {
          let p = new Particle(this.pos.x, this.pos.y, this.pos.z, this.hu, 'SENRIN_CHILD', true);
          p.vel = p5.Vector.random3D().mult(random(0.7, 3.5));
          this.particles.push(p);
        }
      }
    }
    for (let i = this.particles.length-1; i>=0; i--) {
      this.particles[i].update();
      if (this.particles[i].done()) this.particles.splice(i,1);
    }
  }

  show() {
    if (!this.exploded) {
      let s = getScreenCoords(this.pos);
      if (s.visible) { push(); strokeWeight(3*s.scale); stroke(this.hu,255,255); point(s.x, s.y); pop(); }
    }
    for (let p of this.particles) p.show();
  }

  done() { return this.exploded && this.particles.length === 0; }
}
