// #WCCChallenge — "radioactivity"
// p5.js sketch with audio-reactive particle system

let particles = [];

function setup() {
	createCanvas(windowWidth, windowHeight);
	background(20);
	ns = new p5.Noise('white');
	filt = new p5.BandPass();
	distort = new p5.Distortion(1, '2x');
	ns.disconnect();
	filt.process(ns);
	filt.connect(distort);
	ns.start();
	ns.amp(0.01);
	filt.amp(0.2);
}

function draw() {
	let filtfreq = map(sin(frameCount / 120), -1, 1, 200, 2000);
	let filtwidth = map(sin(frameCount / 120), -1, 1, 0, 50);
	filt.set(filtfreq, filtwidth);
	fill(20, 15 + 15 * sin(frameCount / 120));
	noStroke();
	translate(width / 2, height / 2);
	ellipse(0, 0, height);
	if (frameCount % 10 == 0) {
		let p = new Particle();
		particles.push(p);
	}
	particles = particles.filter(p => p.alive);
	for (let p of particles) {
		p.show();
	}
}

class Particle {
	constructor() {
		this.pos = p5.Vector.random2D().mult(random(height / 3));
		this.pvel = createVector(0, 0);
		this.lpos = createVector(this.pos.x, this.pos.y);
		this.counter = floor(random(300));
		this.ang = random(TAU);
		this.sw = 1;
		this.alive = true;
	}
	show() {
		this.counter += 1;
		stroke(255, 80);
		for (let i = 0; i < 20; i++) {
			this.sw = map(this.pos.mag(), 0, height, 6, 0.3);
			strokeWeight(this.sw);
			this.pos.add(this.pvel.mult(1.5 * sin(frameCount / 120)));
			line(this.lpos.x, this.lpos.y, this.pos.x, this.pos.y);
			this.lpos.x = this.pos.x;
			this.lpos.y = this.pos.y;
			this.ang += (0.5 - noise(this.counter / 30)) / 5;
			this.pvel.x = cos(this.ang);
			this.pvel.y = sin(this.ang);
			let inward = createVector(cos(this.pos.heading()), sin(this.pos.heading()));
			if (this.pos.mag() > height / 2.25) this.pvel.sub(inward);
			push();
			translate(this.pos);
			rotate(random(TAU));
			point(random(30), 0);
			pop();
		}
		if (this.counter > 600 || this.pos.mag() > height) this.alive = false;
	}
}
