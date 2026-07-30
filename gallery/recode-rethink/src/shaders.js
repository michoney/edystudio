// 2048×2048 WebGL2 particle shader by ZRNOF
// Inspired by Etienne Jacob

const vert = `#version 100
precision highp float;
attribute vec2 aPosition;
attribute vec2 aTexCoord;
uniform vec2 uRandomVec2;
uniform float uTime;
varying vec2 vTexCoord;

void main() {
  vec2 pos = aPosition;
  // 基于时间的扭曲
  float t = uTime * 0.1;
  float dist = length(pos);
  float angle = atan(pos.y, pos.x);
  angle += sin(dist * 3.0 + t) * 0.3;
  pos = vec2(cos(angle), sin(angle)) * dist;
  // 涟漪
  pos += sin(pos * 10.0 + t * 2.0) * 0.02;
  gl_Position = vec4(pos, 0.0, 1.0);
  gl_PointSize = 2.0;
  vTexCoord = aTexCoord;
}`;

const frag = `#version 100
precision highp float;
varying vec2 vTexCoord;
uniform float uTime;

void main() {
  float t = uTime * 0.05;
  vec2 uv = gl_PointCoord;
  float d = length(uv - 0.5);
  float alpha = 1.0 - smoothstep(0.0, 0.5, d);
  vec3 col = 0.5 + 0.5 * cos(t + uv.xyx + vec3(0, 2, 4));
  gl_FragColor = vec4(col, alpha * 0.6);
}`;

function setShader(gl, program, vertSrc, fragSrc) {
  function compile(src, type) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(s));
    }
    gl.attachShader(program, s);
  }
  compile(vertSrc, gl.VERTEX_SHADER);
  compile(fragSrc, gl.FRAGMENT_SHADER);
}

function resizeCanvas(canvas, gl, w, h) {
  canvas.width = w;
  canvas.height = h;
  gl.viewport(0, 0, w, h);
}

function random(min, max) {
  if (max === undefined) { max = min; min = 0; }
  return Math.random() * (max - min) + min;
}

function setAttributeVec2(gl, program, name, data) {
  var loc = gl.getAttribLocation(program, name);
  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
}

function drawImage(srcCanvas, dstCanvas) {
  var ctx = dstCanvas.getContext('2d');
  ctx.drawImage(srcCanvas, 0, 0);
}
