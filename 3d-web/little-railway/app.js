import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const $ = id => document.getElementById(id);
const state = { running: true, speeds: [1], switches: [false, false], lane: 0, night: false, orbit: false, follow: false, elapsed: 0, frames: 0, ready: false };
const scene = new THREE.Scene();
scene.background = new THREE.Color('#eee8dc');
const camera = new THREE.OrthographicCamera(-14, 14, 10, -10, .1, 120);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
$('scene').appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = .065;
controls.minZoom = .65;
controls.maxZoom = 2.5;
controls.minPolarAngle = .22;
controls.maxPolarAngle = Math.PI / 2.05;
controls.autoRotateSpeed = .45;
controls.enablePan = true;
const defaultTarget = new THREE.Vector3(-2.4, .5, 1.1);
function resetCamera() {
  state.follow = false;
  $('followBtn').classList.remove('active'); $('followBtn').setAttribute('aria-pressed', 'false');
  camera.position.set(18, 15, 21); camera.zoom = 1; camera.updateProjectionMatrix();
  controls.target.copy(defaultTarget); controls.update();
}
resetCamera();
const world = new THREE.Group(); scene.add(world);
const hemi = new THREE.HemisphereLight('#fff7df', '#899278', 2.1); scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff4d7', 3.1); sun.position.set(-9, 18, 9); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -13; sun.shadow.camera.right = 13;
sun.shadow.camera.top = 12; sun.shadow.camera.bottom = -12; sun.shadow.camera.near = .1; sun.shadow.camera.far = 55;
sun.shadow.normalBias = .035; sun.shadow.bias = -.00015; scene.add(sun);
const fill = new THREE.DirectionalLight('#d4e8ef', .8); fill.position.set(11, 8, -10); scene.add(fill);

const mats = {};
function mat(color, extra = {}) { const key = color + JSON.stringify(extra); return mats[key] ||= new THREE.MeshStandardMaterial({ color, roughness: .83, ...extra }); }
const C = { grass: '#8b9a66', ivory: '#dbd2b7', stone: '#a8a38d', wood: '#795c3b', rail: '#7d8280', ballast: '#aaa796', red: '#ae5543', blue: '#46717a', roof: '#494b40', cream: '#e9ddbd', glass: '#556c6a' };
const windows = [], lampLights = [], pickables = [], rotatingWheels = [], smokeSystems = [];
const boxGeos = new Map();
function box(w, h, d, color, x, y, z, parent = world, extra = {}) {
  const key = `${w},${h},${d}`;
  const geo = boxGeos.get(key) || new THREE.BoxGeometry(w, h, d); boxGeos.set(key, geo);
  const m = new THREE.Mesh(geo, typeof color === 'string' ? mat(color, extra) : color);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
function cyl(r, h, color, x, y, z, parent = world, sides = 10) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, sides), typeof color === 'string' ? mat(color) : color);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
function mesh(geo, material, parent = world) { const m = new THREE.Mesh(geo, material); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; }
function roundedRect(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
}
function slab(shape, depth, material, y) {
  const m = mesh(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: .08, bevelThickness: .055, curveSegments: 12 }), material);
  m.rotation.x = -Math.PI / 2; m.position.y = y; return m;
}
slab(roundedRect(18.5, 12.9, .65), .85, mat(C.ivory), -.35);
slab(roundedRect(18, 12.4, .6), .09, mat(C.grass), .51);
const ground = mesh(new THREE.PlaneGeometry(180, 180), mat('#eee8dc'), scene); ground.rotation.x = -Math.PI / 2; ground.position.y = -.47; ground.castShadow = false;

// A pair of parallel figure-eight tracks. The crossing is a real overpass.
const TAU = Math.PI * 2, groundY = .63, amplitudeX = 7.15, amplitudeZ = 4.57;
function centerPoint(t) {
  const dist = Math.abs(Math.atan2(Math.sin(t), Math.cos(t)));
  const height = 1.78 * Math.exp(-Math.pow(dist / .55, 4));
  return new THREE.Vector3(amplitudeX * Math.sin(t), groundY + .07 + height, amplitudeZ * Math.sin(2 * t));
}
function normalAt(t) { return new THREE.Vector3(2 * amplitudeZ * Math.cos(2 * t), 0, -amplitudeX * Math.cos(t)).normalize(); }
class RailCurve extends THREE.Curve {
  constructor(offset) { super(); this.offset = offset; this.arcLengthDivisions = 1600; }
  getPoint(u, target = new THREE.Vector3()) { const t = u * TAU; return target.copy(centerPoint(t)).addScaledVector(normalAt(t), this.offset); }
}
const curves = [new RailCurve(-.36), new RailCurve(.36)];
const lengths = curves.map(c => c.getLength());
function ribbon(curve, width, below = 0, segments = 700, start = 0, end = 1) {
  const positions = [], indices = [], uvs = [];
  for (let i = 0; i <= segments; i++) {
    const u = start + (end - start) * i / segments;
    const p = curve.getPoint(u), n = normalAt(u * TAU);
    for (let side = -1; side <= 1; side += 2) { positions.push(p.x + n.x * width / 2 * side, p.y - below, p.z + n.z * width / 2 * side); uvs.push(side === -1 ? 0 : 1, i / segments * 45); }
    if (i < segments) { const a = i * 2; indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); geo.setIndex(indices); geo.computeVertexNormals(); return geo;
}
const dummy = new THREE.Object3D();
for (const curve of curves) {
  const bed = mesh(ribbon(curve, .61, .095), mat(C.ballast, { side: THREE.DoubleSide }));
  for (const side of [-1, 1]) {
    const rail = new RailCurve(curve.offset + .155 * side);
    mesh(new THREE.TubeGeometry(rail, 800, .028, 6, true), mat(C.rail, { metalness: .62, roughness: .36 }));
  }
  const count = Math.round(curve.getLength() / .16);
  const sleepers = new THREE.InstancedMesh(new THREE.BoxGeometry(.51, .048, .087), mat('#695b48'), count);
  for (let i = 0; i < count; i++) {
    const u = i / count, p = curve.getPointAt(u), tangent = curve.getTangentAt(u);
    dummy.position.copy(p); dummy.position.y -= .046;
    dummy.rotation.set(0, Math.atan2(tangent.x, tangent.z), 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); sleepers.setMatrixAt(i, dummy.matrix);
  }
  sleepers.receiveShadow = true; world.add(sleepers);
}

// Timber and stone viaduct beneath the raised crossing.
const bridgeCurve = new RailCurve(0);
mesh(ribbon(bridgeCurve, 1.56, .155, 140, -.083, .083), mat('#918270', { side: THREE.DoubleSide }));
for (const side of [-1, 1]) {
  class BridgeSide extends THREE.Curve { getPoint(u, out = new THREE.Vector3()) { const t = (u - .5) * 1.04; return out.copy(centerPoint(t)).addScaledVector(normalAt(t), side * .76).add(new THREE.Vector3(0, -.12, 0)); } }
  mesh(new THREE.TubeGeometry(new BridgeSide(), 90, .063, 6, false), mat('#756755'));
  for (let i = 0; i <= 20; i++) { const t = -.52 + i * .052, p = centerPoint(t).addScaledVector(normalAt(t), side * .73); box(.04, .28, .04, '#8c7b60', p.x, p.y + .09, p.z); }
}
for (const t of [-.36, -.2, .2, .36]) {
  const p = centerPoint(t), h = p.y - .19 - groundY;
  const pier = box(.21, h, .26, C.stone, p.x, groundY + h / 2, p.z); pier.rotation.y = Math.atan2(normalAt(t).z, normalAt(t).x);
  box(.39, .12, .43, '#b0a991', p.x, groundY + .05, p.z);
}

// Low-poly mountain with two genuinely open arch portals.
function mountainHeight(x, z) {
  const r = Math.pow((x + 6.65) / 2.15, 2) + Math.pow(z / 2.75, 2);
  return r < 1 ? 3.65 * Math.pow(1 - r, .82) * (.95 + .045 * Math.sin(x * 5 + z * 4)) : 0;
}
const hillPositions = [], hillColors = [], hillIndices = [], nx = 34, nz = 40;
const rockColor = new THREE.Color('#a6a58e'), mossColor = new THREE.Color('#7f8c5c');
for (let iz = 0; iz <= nz; iz++) for (let ix = 0; ix <= nx; ix++) {
  const x = -8.8 + ix / nx * 4.3, z = -2.75 + iz / nz * 5.5, h = mountainHeight(x, z);
  hillPositions.push(x, groundY + h, z);
  const c = rockColor.clone().lerp(mossColor, Math.max(0, Math.min(1, h * .32 + Math.sin(x * 3 + z * 4) * .2)));
  c.multiplyScalar(.92 + .08 * Math.sin(ix * 8 + iz * 11)); hillColors.push(c.r, c.g, c.b);
  if (ix < nx && iz < nz) {
    const cx=x+4.3/nx/2,cz=z+5.5/nz/2;
    const railX=-amplitudeX*Math.sqrt((1+Math.sqrt(1-Math.min(1,(cz/amplitudeZ)**2)))/2);
    const entranceCut=Math.abs(cz)>1.20&&Math.abs(cx-railX)<1.11;
    if(!entranceCut){const a=iz*(nx+1)+ix;hillIndices.push(a,a+nx+1,a+1,a+1,a+nx+1,a+nx+2);}
  }
}
const hillGeo = new THREE.BufferGeometry(); hillGeo.setAttribute('position', new THREE.Float32BufferAttribute(hillPositions, 3)); hillGeo.setAttribute('color', new THREE.Float32BufferAttribute(hillColors, 3)); hillGeo.setIndex(hillIndices); hillGeo.computeVertexNormals();
mesh(hillGeo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1, side: THREE.DoubleSide }));
function archShape(r, base) { const s = new THREE.Shape(); s.moveTo(-r, 0); s.lineTo(r, 0); s.lineTo(r, base); s.absarc(0, base, r, 0, Math.PI, false); s.lineTo(-r, 0); return s; }
function portal(t, exit) {
  const p = centerPoint(t), tangent = new RailCurve(0).getTangent(t / TAU);
  const g = new THREE.Group(); g.position.set(p.x, groundY, p.z); g.rotation.y = Math.atan2(tangent.x, tangent.z) + (exit ? 0 : Math.PI); world.add(g);
  const shape = archShape(1.1, .91), hole = new THREE.Path();
  hole.moveTo(-.87, -.02); hole.lineTo(-.87, .9); hole.absarc(0, .9, .87, Math.PI, 0, true); hole.lineTo(.87, -.02); hole.lineTo(-.87, -.02); shape.holes.push(hole);
  const facade = mesh(new THREE.ExtrudeGeometry(shape, { depth: 1.05, bevelEnabled: false, curveSegments: 20 }), mat('#a8a48f'), g);facade.position.z=-.81;
  const dark = mesh(new THREE.ShapeGeometry(archShape(.89, .9)), new THREE.MeshBasicMaterial({ color: '#131b17', side: THREE.DoubleSide }), g); dark.position.z = -.75; dark.castShadow = false;
  box(1.73,.025,1.08,'#33382b',0,.015,-.28,g);
  for (let i = 0; i < 15; i++) { const a = Math.PI * i / 14; const b = box(.20, .25, .27, i % 3 ? '#aaa48e' : '#c6bda2', Math.cos(a) * 1.0, .91 + Math.sin(a) * 1.0, .11, g); b.rotation.z = a - Math.PI / 2; }
  for (const side of [-1, 1]) for (let i = 0; i < 4; i++) box(.23, .20, .28, i % 2 ? '#b9b197' : '#a9a18b', side * .98, .12 + i * .22, .11, g);
  box(.44, .16, .25, '#7e8070', 0, 2.05, .12, g);
  register(g, '穿山隧道', '两条轨道并排穿过石拱山洞，火车在山体中暂时消失，再从另一侧驶出。'); return g;
}
const tunnelPortals=[portal(4.425,false),portal(5.0,true)];

// Buildings from the hand-drawn composition: a mountain chalet, station, chapel.
function roofGeo(w, d, h) {
  const v = [-w/2,0,-d/2,w/2,0,-d/2,-w/2,h,0,w/2,h,0,-w/2,0,d/2,w/2,0,d/2];
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.setIndex([0,2,1,1,2,3,2,4,3,3,4,5,0,4,2,1,3,5,0,1,4,1,5,4]); g.computeVertexNormals(); return g;
}
function windowBox(w, h, x, y, z, g) {
  const wm = new THREE.MeshStandardMaterial({ color: '#768984', roughness: .36, emissive: '#ffb75c', emissiveIntensity: .035 }); windows.push(wm);
  box(w, h, .026, wm, x, y, z, g); box(w + .07, .035, .055, '#795b3c', x, y - h / 2 - .02, z + .016, g);
  box(.025, h, .045, '#e2d1ad', x, y, z + .02, g); box(w, .025, .045, '#e2d1ad', x, y, z + .02, g);
}
function house(x, y, z, opts = {}) {
  const { w = 1.25, d = .85, h = .84, color = C.cream, roof = C.roof, name = '山间小屋', text = '静静坐落在树林里的小屋。', angle = 0 } = opts;
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = angle; world.add(g);
  box(w + .13, .12, d + .11, '#bcb59b', 0, .04, 0, g); box(w, h, d, color, 0, h / 2 + .1, 0, g);
  const r = mesh(roofGeo(w + .24, d + .22, .42), mat(roof), g); r.position.y = h + .1;
  box(.14, .32, .14, '#978472', w * .25, h + .36, -.15, g);
  box(.23, .47, .035, '#75543d', -.23, .34, d / 2 + .025, g);
  windowBox(.23, .25, .27, .52, d / 2 + .025, g); windowBox(.23, .25, -.40, .65, d / 2 + .025, g);
  for (const side of [-1,1]) box(.047, h, .047, '#8c6b43', side*w/2, h/2+.1, d/2+.03, g);
  register(g, name, text); return g;
}
const chaletX = -5.76, chaletZ = -.5, chaletY = groundY + mountainHeight(chaletX, chaletZ);
const chalet = house(chaletX, chaletY, chaletZ, { w: 1.28, d: .82, h: 1.08, name: '坡顶木屋', text: '来自草图上方的小屋。站在露台，能望见整座铁路和秋色山林。', angle: -.12 });
box(1.6, .10, .50, '#8e7653', 0, .48, .7, chalet);
for (const xx of [-.68,-.23,.23,.68]) { box(.04,.46,.04,'#8c714b',xx,.74,.91,chalet); box(.04,.48,.04,'#8c714b',xx,.24,.76,chalet); }
box(1.45,.045,.04,'#8c714b',0,.96,.91,chalet);
const station = house(2.93, groundY, 5.0, { w: 1.8, d: .92, h: .9, color: '#e2d8bc', roof: '#777362', angle: -.36, name: '秋野车站', text: '站台就在8字外环旁。调整秋叶号的速度，让它缓缓经过车站。' });
box(2.4,.16,1.45,'#b9b3a0',0,.015,-.25,station);
box(2.03,.09,.55,'#687461',0,.76,.75,station);
for (const x of [-.83,-.28,.28,.83]) cyl(.035,.73,'#706a52',x,.38,.98,station);
for (const x of [-.58,.04,.63]) windowBox(.26,.28,x,.50,-.48,station);
const signTex = textTexture('AUTUMN', '#eee4c6', '#4b5546', 256, 96);
const sign = mesh(new THREE.PlaneGeometry(.64,.24),new THREE.MeshBasicMaterial({map:signTex}),station);sign.position.set(0,.76,.51);sign.castShadow=false;
const chapel = house(4.52, groundY, -3.12, { w: 1.08, d: .95, h: 1.14, color: '#ece1c4', roof: '#66735c', angle: .15, name: '林间小教堂', text: '对应手稿右侧的教堂。钟楼藏在金色树林之间，夜里窗光会亮起来。' });
box(.48,1.45,.48,'#d9cfaf',.72,.76,0,chapel);
const spire = mesh(new THREE.ConeGeometry(.43,.84,4),mat('#59644f'),chapel);spire.position.set(.72,1.93,0);spire.rotation.y=Math.PI/4;
box(.04,.19,.04,'#635d48',.72,2.44,0,chapel);box(.15,.034,.034,'#635d48',.72,2.47,.0,chapel);
windowBox(.17,.35,.72,1.06,.26,chapel);
house(-1.5, groundY, -4.55, { w: 1.12, color: '#cfaa79', roof: '#925f46', angle: .11, name: '木匠的家', text: '屋前摆着几根木料，车站的长椅大概就出自这里。' });
house(.06, groundY, -4.76, { w: 1.04, color: '#e1c89b', roof: '#687466', angle: -.06, name: '山村杂货铺', text: '一间很小的杂货铺，在很大的秋天里。' });
house(1.65, groundY, -4.98, { w: 1.04, color: '#d2d9bd', roof: '#956851', angle: -.16, name: '湖风旅舍', text: '来往的旅人住在这里，第二天再坐上湖风号。' });

// Pond: a little slice of the water-block reference, set inside the right loop.
const pondCenter = new THREE.Vector2(4.63, -.12), pondShape = new THREE.Shape();
for (let i=0;i<=60;i++){const a=i/60*TAU,r=1+.055*Math.sin(a*5);const x=pondCenter.x+Math.cos(a)*1.42*r,z=pondCenter.y+Math.sin(a)*1.84*r;i?pondShape.lineTo(x,-z):pondShape.moveTo(x,-z);}
const pondBed = mesh(new THREE.ShapeGeometry(pondShape,48),mat('#45574e'));pondBed.rotation.x=-Math.PI/2;pondBed.position.y=.615;pondBed.castShadow=false;
const waterMat = new THREE.ShaderMaterial({ uniforms: { time: { value: 0 }, night: { value: 0 } }, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2,
  vertexShader:'varying vec2 p;void main(){p=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader:'varying vec2 p;uniform float time;uniform float night;void main(){float w=sin(p.x*4.+p.y*3.+time*.45)*.5+sin(p.x*3.-p.y*5.-time*.35)*.5;vec3 c=mix(vec3(.22,.43,.42),vec3(.36,.57,.52),w*.16+.4);float shine=smoothstep(.90,1.0,sin(p.x*7.+p.y*5.+time*.4))*.018;c+=shine;c=mix(c,c*.45,night);gl_FragColor=vec4(c,.91);}' });
const pond = mesh(new THREE.ShapeGeometry(pondShape,48),waterMat);pond.rotation.x=-Math.PI/2;pond.position.y=.705;pond.castShadow=false;
const pondPoints=[];for(let i=0;i<=60;i++){const a=i/60*TAU,r=1+.055*Math.sin(a*5);pondPoints.push(new THREE.Vector3(pondCenter.x+Math.cos(a)*1.46*r,.65,pondCenter.y+Math.sin(a)*1.88*r));}
mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pondPoints),140,.052,5,true),mat('#b3ae8b'));
const boat=new THREE.Group();boat.position.set(4.58,.73,.5);boat.rotation.y=.5;world.add(boat);
const hull=mesh(new THREE.CapsuleGeometry(.16,.38,3,8),mat('#886d49'),boat);hull.rotation.x=Math.PI/2;hull.scale.y=.5;box(.16,.06,.25,'#d6c19b',0,.05,0,boat);
for(let i=0;i<3;i++){const duck=new THREE.Group();duck.position.set(4.03+i*.35,.735,-.9+i*.14);world.add(duck);const body=mesh(new THREE.SphereGeometry(.07,8,6),mat('#ded9bd'),duck);body.scale.set(1.3,.6,.8);const head=mesh(new THREE.SphereGeometry(.036,6,5),mat('#e5dec2'),duck);head.position.set(.06,.045,0);box(.035,.016,.02,'#c78e4f',.09,.042,0,duck);}

// Instanced trees, rocks, meadow clumps: a miniature texture without large downloads.
let seed=1847;function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
const trunkData=[],leafData=[[],[],[],[],[]],leafColors=['#9a9e57','#c7a34e','#b77a43','#6d8559','#d4b969'];
function tree(x,z,h=1.35,y=groundY,type=0){
  const tilt=(rand()-.5)*.12;trunkData.push({x,y:y+h*.36,z,sx:.09,sy:h*.72,sz:.09,tilt});
  const crown=type===1?4:3;
  for(let k=0;k<crown;k++){const a=k*2.4,rr=k===0?0:.21*h;leafData[Math.floor(rand()*leafColors.length)].push({x:x+Math.cos(a)*rr,y:y+h*(.69+k*.08),z:z+Math.sin(a)*rr,sx:h*(.29+rand()*.08),sy:h*(.34+rand()*.08),sz:h*(.28+rand()*.08),rot:rand()*TAU});}
}
const groundTrackPoints=[];for(let i=0;i<480;i++)groundTrackPoints.push(centerPoint(i/480*TAU));
function distTrack(x,z){let d=100;for(const p of groundTrackPoints)d=Math.min(d,(x-p.x)**2+(z-p.z)**2);return Math.sqrt(d);}
const buildingZones=[[-1.5,-4.55,1.05],[.06,-4.76,1],[1.65,-4.98,1],[4.52,-3.12,1.2],[2.93,5,1.4]];
let trees=0;
for(let attempt=0;attempt<1200&&trees<84;attempt++){
  const x=(rand()-.5)*16.8,z=(rand()-.5)*11.2;
  if(distTrack(x,z)<.91||((x-4.63)/1.7)**2+((z+.12)/2.08)**2<1||buildingZones.some(([a,b,r])=>Math.hypot(x-a,z-b)<r)||mountainHeight(x,z)>.1)continue;
  tree(x,z,.75+rand()*.85);trees++;
}
for(let i=0;i<24;i++){const x=-8.13+rand()*3.2,z=-2.15+rand()*4.3,y=mountainHeight(x,z);if(y>.45&&Math.hypot(x-chaletX,z-chaletZ)>.86)tree(x,z,.55+rand()*.75,groundY+y);}
function instanced(geometry,material,data,cb){const m=new THREE.InstancedMesh(geometry,material,data.length);data.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.rot||0,p.tilt||0);dummy.scale.set(p.sx,p.sy,p.sz);dummy.updateMatrix();m.setMatrixAt(i,dummy.matrix);if(cb)cb(m,p,i);});m.castShadow=true;m.receiveShadow=true;world.add(m);return m;}
instanced(new THREE.CylinderGeometry(.5,.68,1,7),mat('#806245'),trunkData);
for(let c=0;c<5;c++)instanced(new THREE.IcosahedronGeometry(1,1),mat(leafColors[c],{flatShading:true}),leafData[c]);
const rocks=[],grass=[];
for(let i=0;i<140;i++){const x=(rand()-.5)*16.7,z=(rand()-.5)*11.1;if(distTrack(x,z)<.6||mountainHeight(x,z)>.1||((x-4.63)/1.6)**2+((z+.12)/2.0)**2<1)continue;const r=.06+rand()*.13;rocks.push({x,y:groundY+.05,z,sx:r,sy:r*.65,sz:r*1.2,rot:rand()*TAU});}
instanced(new THREE.DodecahedronGeometry(1,0),mat('#bab59b'),rocks);
for(let i=0;i<340;i++){const x=(rand()-.5)*17,z=(rand()-.5)*11.4;if(distTrack(x,z)<.72||mountainHeight(x,z)>.1||((x-4.63)/1.6)**2+((z+.12)/2)**2<1)continue;grass.push({x,y:groundY+.05,z,sx:.09+rand()*.07,sy:.11+rand()*.06,sz:.10,rot:rand()*TAU});}
instanced(new THREE.ConeGeometry(.5,1,5),mat('#9b9f66'),grass);

// Lamps, benches, tiny people and a quiet country fence.
const glowMat=new THREE.MeshStandardMaterial({color:'#f5e1a7',emissive:'#ffc47a',emissiveIntensity:.05});windows.push(glowMat);
function lamp(x,z){cyl(.025,.83,'#5a6553',x,groundY+.415,z);box(.12,.04,.12,'#57624e',x,groundY+.85,z);const m=mesh(new THREE.SphereGeometry(.055,8,6),glowMat);m.position.set(x,groundY+.88,z);const l=new THREE.PointLight('#ffbd79',0,2.7,2);l.position.set(x,groundY+.85,z);world.add(l);lampLights.push(l);}
for(const [x,z]of [[1.93,5.63],[3.8,5.45],[5.42,-2.8],[-1.0,-3.65],[.57,-3.7],[4.0,2.36]])lamp(x,z);
function bench(x,z,angle=0){const g=new THREE.Group();g.position.set(x,groundY,z);g.rotation.y=angle;world.add(g);for(const xx of[-.24,.24])box(.055,.2,.28,'#626b55',xx,.10,0,g);box(.66,.055,.27,'#9b784d',0,.22,0,g);box(.66,.17,.035,'#9b784d',0,.35,-.13,g);}
bench(1.38,5.5,-.36);bench(5.4,2.1,-.4);bench(-.58,-3.73,.1);
for(let i=0;i<20;i++){const x=-2.4+i*.24,z=-3.61;cyl(.018,.28,'#a18a60',x,groundY+.14,z);if(i<19){box(.24,.025,.028,'#a18a60',x+.12,groundY+.11,z);box(.24,.025,.028,'#a18a60',x+.12,groundY+.24,z);}}
function person(x,z,color){const g=new THREE.Group();g.position.set(x,groundY+.02,z);world.add(g);box(.07,.16,.07,color,0,.23,0,g);const head=mesh(new THREE.SphereGeometry(.045,8,6),mat('#e1b993'),g);head.position.y=.355;for(const xx of[-.027,.027])box(.026,.15,.028,'#606657',xx,.08,0,g);for(const xx of[-.066,.066])box(.025,.13,.026,color,xx,.23,0,g);}
person(2.17,5.73,'#ad6947');person(2.43,5.82,'#6d8174');person(4.91,2.08,'#c2ae74');person(.54,-3.93,'#968374');

// Engines and carriages. Each bogie follows arc length, including gradients.
function locomotive(color){
  const g=new THREE.Group();
  box(.43,.10,1.07,'#41443a',0,.19,0,g);
  const boiler=cyl(.185,.62,color,0,.45,.18,g,12);boiler.rotation.x=Math.PI/2;
  const nose=cyl(.176,.026,'#383e36',0,.45,.50,g,12);nose.rotation.x=Math.PI/2;
  cyl(.07,.28,'#3f443b',0,.70,.34,g);cyl(.11,.05,'#3f443b',0,.85,.34,g);
  cyl(.07,.07,'#c5aa68',0,.65,.02,g);
  box(.43,.42,.36,color,0,.45,-.34,g);box(.48,.055,.44,'#424a3e',0,.70,-.34,g);
  for(const xx of[-.225,.225])box(.01,.20,.22,'#a9b6a3',xx,.51,-.33,g);
  box(.21,.16,.011,'#9ba995',0,.51,-.526,g);
  const head=cyl(.052,.04,glowMat,0,.53,.538,g,10);head.rotation.x=Math.PI/2;
  box(.50,.07,.17,'#ac8e61',0,.20,.62,g);box(.4,.045,.12,'#3d4538',0,.17,-.62,g);
  addWheels(g,[-.33,.05,.36],.145);return g;
}
function addWheels(g,zs,r=.12){for(const x of[-.25,.25])for(const z of zs){const wheel=cyl(r,.044,'#363d35',x,r,z,g,12);wheel.rotation.z=Math.PI/2;rotatingWheels.push(wheel);const hub=cyl(r*.38,.048,'#b8a47b',x,r,z,g,8);hub.rotation.z=Math.PI/2;}}
function tender(color){const g=new THREE.Group();box(.41,.12,.62,'#424a3b',0,.20,0,g);box(.41,.27,.54,color,0,.36,0,g);box(.34,.015,.46,'#333d33',0,.51,0,g);for(let i=0;i<8;i++){const m=mesh(new THREE.DodecahedronGeometry(.05,0),mat('#36382e'),g);m.position.set((rand()-.5)*.26,.55,(rand()-.5)*.36);}addWheels(g,[-.18,.18],.115);return g;}
function coach(color){const g=new THREE.Group();box(.44,.09,.97,'#3f483a',0,.20,0,g);box(.43,.44,.90,color,0,.46,0,g);box(.47,.06,.98,'#6c705e',0,.72,0,g);for(const x of[-.22,.22])for(let i=0;i<4;i++)box(.015,.18,.14,'#c4d1b8',x,.52,-.31+i*.205,g);box(.25,.18,.015,'#9aaf9d',0,.53,.458,g);addWheels(g,[-.30,.30],.12);return g;}
const routingCurve = new RailCurve(0), routingLength = routingCurve.getLength(), routingArcLengths = routingCurve.getLengths(1600);
const routingEvents = [];
const junctions = [{center:.58,start:.556,end:.604,label:'林边道岔'},{center:.135,start:.111,end:.159,label:'湖边道岔'}].map((j,i)=>({...j,index:i,startDistance:routingArcLengths[Math.round(j.start*1600)],endDistance:routingArcLengths[Math.round(j.end*1600)]}));
class CrossoverCurve extends THREE.Curve {
  constructor(j,from,to,rail=0){super();this.j=j;this.from=from;this.to=to;this.rail=rail;}
  getPoint(u,out=new THREE.Vector3()){const t=(this.j.start+(this.j.end-this.j.start)*u)*TAU,s=u*u*(3-2*u),offset=this.from+(this.to-this.from)*s+this.rail;return out.copy(centerPoint(t)).addScaledVector(normalAt(t),offset);}
}
const junctionLevers=[];
for(const j of junctions){
  for(const direction of[-1,1]){const from=-.36*direction,to=.36*direction,cc=new CrossoverCurve(j,from,to);
    const bed=mesh(new THREE.TubeGeometry(cc,60,.105,4,false),mat('#9e9b83'));bed.position.y=-.077;
    for(const rail of[-.155,.155])mesh(new THREE.TubeGeometry(new CrossoverCurve(j,from,to,rail),70,.022,6,false),mat('#83867b',{metalness:.6,roughness:.35}));
    const ties=new THREE.InstancedMesh(new THREE.BoxGeometry(.50,.045,.077),mat('#766347'),24);
    for(let k=0;k<24;k++){const u=k/23,p=cc.getPoint(u),t=cc.getTangent(u);dummy.position.copy(p);dummy.position.y-=.047;dummy.rotation.set(0,Math.atan2(t.x,t.z),0);dummy.scale.set(1,1,1);dummy.updateMatrix();ties.setMatrixAt(k,dummy.matrix);}world.add(ties);
  }
  const leverPoint=centerPoint(j.center*TAU).addScaledVector(normalAt(j.center*TAU),1.12);leverPoint.y=groundY;
  const g=new THREE.Group();g.position.copy(leverPoint);world.add(g);cyl(.13,.075,'#a6a18c',0,.045,0,g);const handle=box(.044,.32,.044,'#5a6755',0,.2,0,g);const bulb=mesh(new THREE.SphereGeometry(.077,8,6),mat('#65886b'),g);bulb.position.y=.38;register(g,j.label,'点击场景中的道岔标签或左侧按钮，在直行和换轨之间切换。列车经过道岔时按当时设置行驶。');junctionLevers.push({g,handle,bulb,point:leverPoint.clone().add(new THREE.Vector3(0,.7,0))});
}
function offsetForDistance(distance){let offset=-.36;for(const e of routingEvents){if(distance<e.start)break;if(distance<e.end){const u=(distance-e.start)/(e.end-e.start),s=u*u*(3-2*u);return e.from+(e.to-e.from)*s;}offset=e.to;}return offset;}
function routedPoint(distance,out=new THREE.Vector3()){const u=((distance%routingLength)+routingLength)%routingLength/routingLength,t=routingCurve.getUtoTmapping(u)*TAU;return out.copy(centerPoint(t)).addScaledVector(normalAt(t),offsetForDistance(distance));}
function processJunctions(prev,next){const lap=Math.floor(prev/routingLength);for(const j of junctions)for(const l of[lap,lap+1]){const start=l*routingLength+j.startDistance;if(prev<start&&next>=start&&state.switches[j.index]){const from=offsetForDistance(start-.001);routingEvents.push({start,end:l*routingLength+j.endDistance,from,to:-from,junction:j.index});routingEvents.sort((a,b)=>a.start-b.start);}}}
const trains=[{curve:routingCurve,length:routingLength,distance:3,cars:[locomotive(C.red),tender(C.red),coach('#ccb983'),coach('#ccb983')],gaps:[0,1.01,1.94,3.04],direction:1,index:0}];trains[0].cars.forEach(c=>world.add(c));
function trainTransform(train,car,index){const distance=train.distance-train.gaps[index];const p=routedPoint(distance),t=routedPoint(distance+.02).sub(routedPoint(distance-.02)).normalize();car.position.copy(p);car.lookAt(p.clone().add(t));return p;}
function makeSmoke(train){const puffs=[];for(let i=0;i<12;i++){const m=new THREE.Mesh(new THREE.IcosahedronGeometry(1,1),new THREE.MeshBasicMaterial({color:'#efebdc',transparent:true,opacity:0,depthWrite:false}));m.visible=false;world.add(m);puffs.push({mesh:m,age:9});}return{train,puffs,timer:0,next:0};}
trains.forEach(t=>smokeSystems.push(makeSmoke(t)));
const chimneyLocal=new THREE.Vector3(0,.91,.34);
function updateSmoke(dt){for(const sys of smokeSystems){sys.timer+=dt;if(state.running&&state.speeds[sys.train.index]>.05&&sys.timer>.15){sys.timer=0;const p=sys.puffs[sys.next++%sys.puffs.length];p.age=0;p.mesh.position.copy(chimneyLocal).applyMatrix4(sys.train.cars[0].matrixWorld);p.mesh.visible=true;}for(const p of sys.puffs){p.age+=dt;if(p.age>2){p.mesh.visible=false;continue;}p.mesh.position.y+=dt*.36;p.mesh.position.x-=dt*.09;p.mesh.scale.setScalar(.065+p.age*.085);p.mesh.material.opacity=Math.max(0,.36*(1-p.age/2));}}}

function textTexture(text,bg,fg,w=512,h=160){const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);ctx.fillStyle=fg;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`500 ${h*.32}px Georgia,serif`;ctx.fillText(text,w/2,h/2);return new THREE.CanvasTexture(c);}
const plaque=mesh(new THREE.PlaneGeometry(2.18,.38),new THREE.MeshBasicMaterial({map:textTexture('AUTUMN  /  01','#d5cbb0','#53614f')}));plaque.position.set(-5.63,.055,6.49);plaque.castShadow=false;
function register(object,title,text){object.userData.place={title,text};pickables.push(object);}

// UI, camera picking, export and a small synthesized steam whistle.
function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').classList.remove('show'),2400);}
function updateStatus(){const moving=state.running&&state.speeds[0]>0;$('statusText').textContent=moving?'秋叶号运行中':'列车已停稳';$('statusDot').classList.toggle('paused',!moving);$('playBtn').textContent=state.running?'Ⅱ':'▶';$('playBtn').setAttribute('aria-label',state.running?'暂停火车':'启动火车');}
function setSpeed(i,value){state.speeds[i]=Number(value);const key=i===0?'A':'B';$('speed'+key).value=value;$('speed'+key+'Value').textContent=Number(value).toFixed(1)+'×';$('speed'+key).style.background=`linear-gradient(to right,var(--train) 0 ${value/3*100}%,#d7d9cf ${value/3*100}% 100%)`;updateStatus();}
$('speedA').addEventListener('input',e=>setSpeed(0,e.target.value));setSpeed(0,state.speeds[0]);
function toggleSwitch(i){state.switches[i]=!state.switches[i];const on=state.switches[i],btn=$('switch'+(i+1)+'Btn'),marker=$('switch'+(i+1)+'Marker');btn.classList.toggle('active',on);btn.setAttribute('aria-pressed',String(on));btn.querySelector('strong').textContent=on?'换轨 ⇄':'直行 →';marker.classList.toggle('active',on);marker.querySelector('span').textContent=on?'换轨':'直行';junctionLevers[i].handle.rotation.z=on?-.45:.0;junctionLevers[i].bulb.material=mat(on?'#b47949':'#65886b');toast(junctions[i].label+'：'+(on?'经过时切换另一条轨道':'保持当前轨道'));}
for(let i=0;i<2;i++){ $('switch'+(i+1)+'Btn').addEventListener('click',()=>toggleSwitch(i));$('switch'+(i+1)+'Marker').addEventListener('click',()=>toggleSwitch(i));}
$('playBtn').addEventListener('click',()=>{state.running=!state.running;updateStatus();});
$('resetBtn').addEventListener('click',()=>{resetCamera();toast('回到最初的山野视角');});
$('orbitBtn').addEventListener('click',()=>{state.orbit=!state.orbit;controls.autoRotate=state.orbit;$('orbitBtn').classList.toggle('active',state.orbit);$('orbitBtn').setAttribute('aria-pressed',String(state.orbit));});
$('followBtn').addEventListener('click',()=>{state.follow=!state.follow;if(state.follow){state.orbit=false;controls.autoRotate=false;$('orbitBtn').classList.remove('active');$('orbitBtn').setAttribute('aria-pressed','false');}else resetCamera();$('followBtn').classList.toggle('active',state.follow);$('followBtn').setAttribute('aria-pressed',String(state.follow));});
$('themeBtn').addEventListener('click',()=>{state.night=!state.night;document.body.classList.toggle('night',state.night);$('themeName').textContent=state.night?'山村夜色':'秋日午后';scene.background.set(state.night?'#222c35':'#eee8dc');ground.material.color.set(state.night?'#222c35':'#eee8dc');hemi.intensity=state.night?.65:2.1;sun.intensity=state.night?.48:3.1;sun.color.set(state.night?'#a0b4d2':'#fff4d7');fill.intensity=state.night?.25:.8;renderer.toneMappingExposure=state.night?1.05:1.12;windows.forEach(m=>m.emissiveIntensity=state.night?1.8:.035);lampLights.forEach(l=>l.intensity=state.night?1.5:0);waterMat.uniforms.night.value=state.night?1:0;});
$('captureBtn').addEventListener('click',()=>{renderer.render(scene,camera);const a=document.createElement('a');a.href=renderer.domElement.toDataURL('image/png');a.download='山间慢车_当前视角.png';a.click();toast('当前模型视角已保存');});
let audio;
$('whistleBtn').addEventListener('click',()=>{audio ||= new(window.AudioContext||window.webkitAudioContext)();audio.resume();const now=audio.currentTime;for(const f of[510,640,765]){const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.setValueAtTime(f,now);o.frequency.linearRampToValueAtTime(f*.97,now+.8);g.gain.setValueAtTime(0,now);g.gain.linearRampToValueAtTime(.035,now+.08);g.gain.exponentialRampToValueAtTime(.001,now+1.1);o.connect(g).connect(audio.destination);o.start(now);o.stop(now+1.15);}toast('秋叶号：呜——');});
$('referenceBtn').addEventListener('click',()=>$('referenceDialog').showModal());$('referenceClose').addEventListener('click',()=>$('referenceDialog').close());$('referenceDialog').addEventListener('click',e=>{if(e.target===$('referenceDialog'))$('referenceDialog').close();});
$('infoClose').addEventListener('click',()=>$('infoCard').hidden=true);
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let pointerDown;
renderer.domElement.addEventListener('pointerdown',e=>pointerDown={x:e.clientX,y:e.clientY});
renderer.domElement.addEventListener('pointerup',e=>{if(!pointerDown||Math.hypot(e.clientX-pointerDown.x,e.clientY-pointerDown.y)>5)return;const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(pickables,true)[0];if(hit){let o=hit.object;while(o&&!o.userData.place)o=o.parent;if(o){$('infoTitle').textContent=o.userData.place.title;$('infoText').textContent=o.userData.place.text;$('infoCard').hidden=false;}}});
function resize(){const w=innerWidth,h=innerHeight,aspect=w/h;const halfH=w<600?Math.max(10.7,11.8/aspect):10.3;camera.left=-halfH*aspect;camera.right=halfH*aspect;camera.top=halfH;camera.bottom=-halfH;camera.updateProjectionMatrix();renderer.setSize(w,h);if(w<600)controls.target.set(.6,.7,0);else if(!state.follow)controls.target.copy(defaultTarget);}
addEventListener('resize',resize);resize();
const clock=new THREE.Clock();
function animate(){const dt=Math.min(clock.getDelta(),.06);state.elapsed+=dt;state.frames++;for(const train of trains){if(state.running){const next=train.distance+dt*2.2*state.speeds[0];processJunctions(train.distance,next);train.distance=next;}train.cars.forEach((car,i)=>trainTransform(train,car,i));}if(state.running&&state.speeds[0]>0)for(const wheel of rotatingWheels)wheel.rotation.x+=dt*6*state.speeds[0];world.updateMatrixWorld(true);updateSmoke(dt);waterMat.uniforms.time.value=state.elapsed;if(state.follow){const p=trains[0].cars[0].position;controls.target.lerp(p.clone().add(new THREE.Vector3(0,.7,0)),.035);camera.position.lerp(p.clone().add(new THREE.Vector3(8,7,10)),.025);}controls.update();const offset=offsetForDistance(trains[0].distance);state.lane=offset>0?1:0;$('routeName').textContent=Math.abs(offset)<.355?'正在换轨':'当前 '+(offset<0?'A':'B')+' 轨';junctionLevers.forEach((j,i)=>{const p=j.point.clone().project(camera),b=$('switch'+(i+1)+'Marker');b.style.left=(p.x*.5+.5)*innerWidth+'px';b.style.top=(-p.y*.5+.5)*innerHeight+'px';b.style.display=p.z<1?'block':'none';});renderer.render(scene,camera);if(!state.ready&&state.frames>3){state.ready=true;document.documentElement.dataset.ready='true';$('loading').classList.add('done');}requestAnimationFrame(animate);}
updateStatus();animate();
window.railway={state,trains,curves,lengths,scene,camera,renderer,controls,resetCamera,centerPoint,normalAt,setSpeed,groundY,pond,pondBed,waterMat,routingEvents,junctions,routingLength,routedPoint,offsetForDistance,processJunctions,toggleSwitch,tunnelPortals,hillGeo};
