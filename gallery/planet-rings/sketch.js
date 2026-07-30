/*

  Inspired from https://www.dwitter.net/d/10534
  by tomxor

  And from https://openprocessing.org/sketch/2763432
  by Noel
  
  Juan Carlos Ponce Campuzano
  24/Jan/2026
  https://www.patreon.com/jcponce
  
*/

let counter = 100;

function setup() {
  createCanvas(windowWidth, windowHeight);
  background(0);
  stroke(255);
  noFill();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  background(0);
}

function draw() {
  background(0, 40); // trails
  counter += 0.015;

  const cx = width / 2;
  const cy = height / 2;

  // draw planet first (even)
  for (let i = 3000; i >= 2; i -= 2) {
    drawPoints(i, 0, cx, cy);
  }

  // draw ring on top (odd)
  for (let i = 1999; i > 1; i -= 2) {
    drawPoints(i, 1, cx, cy);
  }
}

function drawPoints(i, parity, cx, cy) {
  // original distance logic (kept)
  let r =
    counter / cos(counter / i) +
    parity * (counter / 2 + (i % counter));

  let a = counter / 9 + i * i;

  // ---- RING GEOMETRY CONTROL ----
  let ringFlatten = parity ? 0.28 : 1.0;  // thin disk
  let ringTilt = parity ? 2.1 : 1.0;      // tilt illusion

  let x =
    cx +
    r * sin(a) * cos(!parity * i / counter);

  let y =
    cy +
    r * cos(a + parity * 2) * ringFlatten * ringTilt;

  // ---- LIGHTING ----
  let size = 1 - cos(a);

  // depth shading for ring
  if (parity) {
    let depth = sin(a + 2);
    size *= map(depth, -1, 1, 0.4, 1.3);
  }

  strokeWeight(size);

  // warmer planet, cooler rings
  if (parity === 0) {
    stroke(220, 200, 170, 180);
  } else {
    stroke(200, 220, 255, 160);
  }

  point(x, y);
}
