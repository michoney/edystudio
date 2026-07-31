/*
 * A fork of tp5_250806_StaircaseWaterway
 * All credits to はぅ君.
 * I just extended the code for clarity.
 *
 * Original shorthand code:
 * t=0;$=[];draw=_=>{background(0,t?9:!createCanvas(W=720,W)+W)
 * filter(BLUR);stroke(W);for(i=9;i--;)$[t++%(W*9)]={x:t*99%W,y:0,g:0,s:3}
 * $.map(p=>strokeWeight(p.s*=.997)+point(p.x+=(N=noise(p.x/W,p.y/9,t/W))>.4?0:(N%.1>.05?1:-1)+(p.g=0),p.y+=N>.4?p.g+=.5:.5))}
 * #つぶやきProcessing
 */

let particles = [];
let time = 0;

function setup() {
	createCanvas(windowWidth, windowHeight);
}

function draw() {
	// Background with slight fading and blur,
	// so trails remain visible and look like flowing water.
	background(0, 9);
	filter(BLUR);
	stroke(255);

	/* ---- particle creation loop ----
	 * Instead of spawning just one particle per frame,
	 * we generate several at once (here 9), to simulate
	 * the "dense rainfall" effect.
	 */
	let i = 9;
	while (i > 0) {
		i--;

		// The particle index depends on time,
		// so older particles get replaced cyclically.
		let index = time % (width * 9);

		// x-position drifts horizontally over time
		// (like raindrops entering at different stair positions).
		let px = (time * 99) % width;

		// Each particle starts at the top (y=0),
		// with no vertical velocity yet.
		let obj = {
			x: px,
			y: 0,
			g: 0, // vertical acceleration ("gravity")
			s: 3 // size of the droplet
		};

		// Store in particles array
		particles[index] = obj;
		time = time + 1;
	}

	/* ---- particle update & render loop ----
	 * This is where each particle is instructed how to "flow"
	 * down the stairs. Motion is guided by Perlin noise
	 * instead of fixed gravity, so the drops sometimes
	 * fall straight, sometimes hesitate and slide sideways,
	 * mimicking the way water splits and searches for channels.
	 */
	for (let idx = 0; idx < particles.length; idx++) {
		let p = particles[idx];

		// Slowly shrink the droplet as it moves down,
		// like water dispersing into the surface.
		p.s = p.s * 0.997;
		strokeWeight(p.s);

		// Perlin noise is used as a "terrain map"
		// that tells particles when to fall vs. when to slide.
		let Noise = noise(p.x / width, p.y / 9, time / width);

		/* --- horizontal motion ---
		 * If noise is high, the drop sticks to its vertical path.
		 * If noise is lower, we make the drop jitter sideways,
		 * producing the staircase-like zig-zag motion.
		 */
		if (Noise > 0.4) {
			// Stay in the same x (straight fall).
			p.x += 0;
		} else {
			// Random small shift left/right,
			// giving the "stepping" sideways effect.
			if (Noise % 0.1 > 0.05) {
				p.x += 1;
			} else {
				p.x += -1;
			}
			// Reset gravity when sliding.
			p.g = 0;
		}

		/* --- vertical motion ---
		 * Two modes of falling:
		 * - If noise is high: accelerate downward
		 *   (like a free fall when no stairs are in the way).
		 * - If noise is low: descend slowly,
		 *   like water crawling along the stair edge.
		 */
		if (Noise > 0.4) {
			p.g += 0.5; // acceleration
			p.y += p.g; // faster fall
		} else {
			p.y += 0.5; // slow descent
		}

		// Finally, draw the particle at its position.
		point(p.x, p.y);
	}
}
