// Kusakari cylinder-growth particle sketch — adapted as page background
// Original: https://twitter.com/kusakarism  (art logic kept verbatim)
// Adaptations for background use: no orbitControl, transparent canvas (clear), windowResized.

function bandHeight() {
  return Math.max(260, Math.floor(windowHeight * 0.45));
}

function bandWidth() {
  const parent = document.getElementById('bg-band');
  return parent ? Math.max(320, parent.clientWidth) : windowWidth;
}

function setup() {
  const c = createCanvas(bandWidth(), bandHeight(), WEBGL);
  const parent = document.getElementById('bg-band');
  if (parent) c.parent(parent);
  colorMode(HSB, 360, 100, 100, 255);
  setObject();
}

let _minW;
let _maxW;
let aryRegionRect = [];

function setObject() {
  _minW = min(width, height) * 1;
  _maxW = max(width, height) * 1;
  ellipseMode(RADIUS);
  rectMode(CENTER);
  strokeWeight(_minW / 800 * pixelDensity() / 2);

  aryRegionRect = [];

  let numRegionRect = 1;
  let regionClearanceRatio = 0.3;
  let minRegionX = -_minW / 2 * (1 - regionClearanceRatio);
  let maxRegionX = _minW / 2 * (1 - regionClearanceRatio);
  let minRegionY = -_minW / 2 * (1 - regionClearanceRatio);
  let maxRegionY = _minW / 2 * (1 - regionClearanceRatio);

  for (let i = 0; i < numRegionRect; i++) {
    aryRegionRect.push(new RegionRect(minRegionX, maxRegionX, minRegionY, maxRegionY));
  }
}

function windowResized() {
  resizeCanvas(bandWidth(), bandHeight());
  setObject();
}

class RegionRect {
  constructor(minRegionX, maxRegionX, minRegionY, maxRegionY) {
    this.minRegionX = minRegionX;
    this.maxRegionX = maxRegionX;
    this.minRegionY = minRegionY;
    this.maxRegionY = maxRegionY;
    this.setPolygon();
  }

  setPolygon() {
    let maxTrial = 100;
    let numPolygon = 300;
    let maxPolygonR = min(this.maxRegionX - this.minRegionX, this.maxRegionY - this.minRegionY) / 3
    let stepR = _minW / 500;
    let shrink = min(this.maxRegionX - this.minRegionX, this.maxRegionY - this.minRegionY) / 400;
    let palette = [];
    this.aryPolygon = [];
    this.aryAryCornerXy = [];
    for (let i = 0; i < numPolygon; i++) {
      let areaXy = setAreaXy(this.minRegionX, this.maxRegionX, this.minRegionY, this.maxRegionY);
      let rotateAng = random(2*PI);
      let numCorner = int(random(3, 9));
      let numInner = int(random(3, 10));
      let hi = random(_minW / 200, _minW / 200 * 10);

      if (i > 0) {
        let isInside = checkInside(this.aryAryCornerXy, areaXy);
        let countTrial = 0;
        while (isInside == true) {
          countTrial++;
          areaXy = setAreaXy(this.minRegionX, this.maxRegionX, this.minRegionY, this.maxRegionY);
          isInside = checkInside(this.aryAryCornerXy, areaXy);
          if (countTrial > maxTrial) { break; }
        }
        if(countTrial > maxTrial) { break; }
      }

      let aryTemp = growPolygon(numCorner, this.aryAryCornerXy, areaXy, rotateAng, maxPolygonR, stepR,
        this.minRegionX, this.maxRegionX, this.minRegionY, this.maxRegionY);
      let aryCornerXy = aryTemp[0];
      let areaR = aryTemp[1];

      if (areaR > 0) {
        this.aryPolygon.push(new AreaPolygon(areaXy, areaR, rotateAng, shrink, palette, numInner, numCorner, hi));
        this.aryAryCornerXy.push(aryCornerXy);
      }
    }
  }

  draw() {
    push();
    for (let i = 0; i < this.aryPolygon.length; i++) {
      this.aryPolygon[i].draw();
    }
    pop();
  }
}

function setAreaXy(minRegionX, maxRegionX, minRegionY, maxRegionY) {
  let areaXy = createVector(random(minRegionX, maxRegionX), random() * (maxRegionY - minRegionY) + minRegionY);
  return areaXy;
}

function growPolygon(numCorner, aryAryXyPolygon, areaXy, rotateAng, maxPolygonR, stepR, minRegionX, maxRegionX, minRegionY, maxRegionY) {
  let areaR = 0;
  let isCross = false;
  let stepAng = 2*PI / numCorner;
  while (isCross == false) {
    areaR += stepR;
    let aryCornerXy = [];
    for (let i = 0; i < numCorner; i++) {
      aryCornerXy[i] = p5.Vector.add(areaXy, createVector(0, -areaR).rotate(stepAng * (i - 0.5)).rotate(rotateAng));
    }
    for (let i = 0; i < aryAryXyPolygon.length; i++) {
      for (let j = 0; j < aryAryXyPolygon[i].length; j++) {
        let next_j = (j + 1) % aryAryXyPolygon[i].length;
        for (let k = 0; k < numCorner; k++) {
          let next_k = (k + 1) % numCorner;
          if (checkCrossLineSegment(aryCornerXy[k], aryCornerXy[next_k], aryAryXyPolygon[i][j], aryAryXyPolygon[i][next_j]) == true) {
            isCross = true;
            break;
          }
        }
        if (isCross == true) { break; }
      }
      if (isCross == true) { break; }
    }

    for (let i = 0; i < numCorner; i++) {
      if (aryCornerXy[i].x < minRegionX || aryCornerXy[i].x > maxRegionX || aryCornerXy[i].y < minRegionY || aryCornerXy[i].y > maxRegionY) {
        isCross = true;
      }
    }

    if (isCross == true) { areaR -= stepR; }

    if (areaR > maxPolygonR) {
      areaR = maxPolygonR;
      break;
    }
  }

  aryCornerXy = [];
  for (let i = 0; i < numCorner; i++) {
    aryCornerXy[i] = p5.Vector.add(areaXy, createVector(0, -areaR).rotate(stepAng * (i - 0.5)).rotate(rotateAng));
  }

  return [aryCornerXy, areaR];
}

function checkCrossLineSegment(xy_a, xy_b, xy_c, xy_d) {
  let isCross = false;

  let vec_a_b = p5.Vector.sub(xy_b, xy_a);
  let vec_a_c = p5.Vector.sub(xy_c, xy_a);
  let vec_a_d = p5.Vector.sub(xy_d, xy_a);
  let vec_c_d = p5.Vector.sub(xy_d, xy_c);
  let vec_c_a = p5.Vector.sub(xy_a, xy_c);
  let vec_c_b = p5.Vector.sub(xy_b, xy_c);
  let cr_ab_ac = p5.Vector.cross(vec_a_b, vec_a_c);
  let cr_ab_ad = p5.Vector.cross(vec_a_b, vec_a_d);
  let cr_cd_ca = p5.Vector.cross(vec_c_d, vec_c_a);
  let cr_cd_cb = p5.Vector.cross(vec_c_d, vec_c_b);
  if (cr_ab_ac.z * cr_ab_ad.z <= 0 && cr_cd_ca.z * cr_cd_cb.z <= 0) {
    isCross = true;
  }

  return isCross;
}

function checkInside(aryAryXy, areaXy) {
  let isInside = false;
  for (let i = 0; i < aryAryXy.length; i++) {
    for (let j = 0; j < aryAryXy[i].length; j++) {
      let next_j = (j + 1) % aryAryXy[i].length;
      let vec_a_b = p5.Vector.sub(aryAryXy[i][next_j], aryAryXy[i][j]);
      let vec_a_c = p5.Vector.sub(areaXy, aryAryXy[i][j]);
      let cr_ab_ac = p5.Vector.cross(vec_a_b, vec_a_c);
      if (cr_ab_ac.z < 0) {
        break;
      } else if (j == aryAryXy[i].length - 1) {
        isInside = true;
      }
    }
    if (isInside == true) { break; }
  }

  return isInside;
}

class AreaPolygon {
  constructor(areaXy, areaR, rotateAng, shrink, palette, numInner, numCorner, hi) {
    this.areaXy = areaXy;
    this.areaR = areaR;
    this.rotateAng = rotateAng;
    this.shrink = shrink;
    this.r = this.areaR - this.shrink;
    this.numCorner = numCorner;
    this.stepAng = 2*PI / this.numCorner;
    this.hi = hi;
    this.hiStep = this.hi / 2;

    this.palette = palette;
    this.numInner = numInner;
    this.setInner();
  }

  setInner() {
    this.aryInnerR = [];
    this.aryInnerAng = [];
    this.aryGrad = [];
    let stepR = this.r / ((this.numInner + 1) * 2 - 1) * 2;
    for (let i = 0; i < this.numInner; i++) {
      this.aryInnerR[i] = this.r - stepR * (i + 1);
      this.aryInnerAng[i] = 2*PI / this.numCorner * int(random(this.numCorner));
    }
  }

  draw() {
    if (this.r > 0) {
      push();
      fill(100);
      translate(this.areaXy.x, this.areaXy.y);
      drawCylinder(this.numCorner, this.r, this.hi, this.rotateAng, 16);
      pop();
      this.drawInner();
    }
  }

  drawInner() {
    for (let i = 0; i < this.numInner; i++) {
      push();
      fill(100);
      translate(this.areaXy.x, this.areaXy.y, this.hi + this.hiStep * i);
      drawCylinder(this.numCorner, this.aryInnerR[i], this.hiStep, this.rotateAng, Math.round(1 + (15 * (1 - 1 / this.numInner * (i + 1))) / 2));
      pop();
    }
  }
}

function drawCylinder(numCorner, r, hi, rotateAng, detailY) {
  push();
  rotateX(PI/2);
  if(numCorner % 2 == 0) { rotateY(-2*PI / numCorner / 2); }
  translate(0, hi / 2);
  rotateY(rotateAng + PI);
  cylinder(r, hi, numCorner + 1, detailY, true, true);
  pop();
}

function draw() {
  clear(); // transparent background: sketch floats on the page
  ortho(-width/2, width/2, -height/2, height/2, 0, width*2);
  translate(0, _minW / 10, 0);
  rotateX(PI/2 - PI/6);
  rotateZ(PI/4);

  rotateZ((frameCount - 1) * 0.003);

  for (let i = 0; i < aryRegionRect.length; i++) {
    aryRegionRect[i].draw();
  }
}
