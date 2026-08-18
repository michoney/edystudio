/*
Particles to image

Particles seek a target to make up an image. 
They get bigger the closer they get to their target.

Controls:
  - Move the mouse to interact.
  - Hold down the mouse button pull particles in.
  - Press any key to change to the next image.
  - Use the on-screen controls to change settings.

Author: Jason Labbe
Site: jasonlabbe3d.com
*/

var imgs = [];
var imgNames = [];
var imgIndex = -1;

var loadPercentage = 0.045;
var closeEnoughTarget = 50;

var allParticles = [];

var mouseSizeSlider;
var particleSizeSlider;
var speedSlider;
var resSlider;
var nextImageButton;

function preload() {
  // 生成3张渐变图代替实际图片
  for (var i = 0; i < 3; i++) {
    var pg = createGraphics(200, 200);
    var c1 = color(random(255), random(255), random(255));
    var c2 = color(random(255), random(255), random(255));
    for (var y = 0; y < 200; y++) {
      var inter = map(y, 0, 200, 0, 1);
      var c = lerpColor(c1, c2, inter);
      pg.stroke(c);
      pg.line(0, y, 200, y);
    }
    // 画一些形状在图上
    pg.noFill();
    pg.stroke(255, 60);
    for (var j = 0; j < 5; j++) {
      pg.circle(random(200), random(200), random(30, 80));
    }
    imgs.push(pg);
  }
}

function setup() {
  createCanvas(windowWidth, windowHeight);

  mouseSizeSlider = new SliderLayout("Mouse size", 50, 200, 100, 1, 100, 100);
  particleSizeSlider = new SliderLayout("Particle size", 1, 20, 8, 1, 100, mouseSizeSlider.slider.position().y + 70);
  speedSlider = new SliderLayout("Speed", 0, 5, 1, 0.5, 100, particleSizeSlider.slider.position().y + 70);
  resSlider = new SliderLayout("Count multiplier", 0.1, 2, 1, 0.1, 100, speedSlider.slider.position().y + 70);

  nextImageButton = createButton("Next image");
  nextImageButton.position(100, resSlider.slider.position().y + 40);
  nextImageButton.mousePressed(nextImage);

  padding_side = 100;
  padding_top = 100;

  nextImage();
}

function draw() {
  background(255);

  for (var i = allParticles.length - 1; i > -1; i--) {
    allParticles[i].move();
    allParticles[i].draw();
    if (allParticles[i].isKilled) {
      if (allParticles[i].isOutOfBounds()) {
        allParticles.splice(i, 1);
      }
    }
  }

  mouseSizeSlider.display();
  particleSizeSlider.display();
  speedSlider.display();
  resSlider.display();
}

function keyPressed() {
  nextImage();
}

// === SliderLayout ===
class SliderLayout {
  constructor(label, min, max, val, step, x, y) {
    this.label = label;
    this.slider = createSlider(min, max, val, step);
    this.slider.position(x, y + 16);
    this.slider.style('width', '160px');
    this.labelY = y;
  }

  display() {
    noStroke();
    fill(0);
    textSize(12);
    textAlign(LEFT);
    text(this.label, this.slider.position().x, this.labelY + 12);
  }
}

// === Particle ===
class Particle {
  constructor(x, y) {
    this.pos = createVector(x || random(width), y || random(height));
    this.target = createVector(random(width), random(height));
    this.vel = createVector(0, 0);
    this.acc = createVector(0, 0);
    this.maxSpeed = 4;
    this.size = 2;
    this.isKilled = false;
  }

  move() {
    var force = p5.Vector.sub(this.target, this.pos);
    var d = force.mag();
    if (d < closeEnoughTarget) {
      if (!this.isKilled) this.isKilled = true;
      this.vel.mult(0.9);
    } else {
      force.setMag(0.1);
      this.acc.add(force);
    }
    this.vel.add(this.acc);
    this.vel.limit(this.maxSpeed);
    this.pos.add(this.vel);
    this.acc.mult(0);
    this.size = map(d, 0, width * 0.5, 1, particleSizeSlider.slider.value());
  }

  draw() {
    noStroke();
    fill(0);
    ellipse(this.pos.x, this.pos.y, this.size, this.size);
  }

  isOutOfBounds() {
    return this.pos.x < -100 || this.pos.x > width + 100 ||
           this.pos.y < -100 || this.pos.y > height + 100;
  }
}

// === nextImage ===
function nextImage() {
  imgIndex = (imgIndex + 1) % imgs.length;
  var img = imgs[imgIndex];

  allParticles = [];
  var count = floor(200 * resSlider.slider.value());
  for (var i = 0; i < count; i++) {
    var p = new Particle(random(width), random(height));
    var x = floor(random(img.width));
    var y = floor(random(img.height));
    var c = img.get(x, y);
    if (brightness(c) < 30) { i--; continue; }
    p.target = createVector(
      map(x, 0, img.width, 100, width - 100),
      map(y, 0, img.height, 100, height - 100)
    );
    p.maxSpeed = speedSlider.slider.value();
    allParticles.push(p);
  }
}
