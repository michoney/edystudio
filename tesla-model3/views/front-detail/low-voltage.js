import * as THREE from 'three';

// Vehicle axes in millimetres: +X forward, +Y up. Routes are schematic.
export function buildLowVoltage(label) {
  const group = new THREE.Group();
  function box(size, position, color) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), new THREE.MeshStandardMaterial({color, metalness:.4, roughness:.42}));
    mesh.position.set(...position);
    group.add(mesh);
  }
  function cable(points, color, radius) {
    const path = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), false, 'centripetal');
    group.add(new THREE.Mesh(new THREE.TubeGeometry(path, 48, radius, 8, false), new THREE.MeshStandardMaterial({color})));
  }
  // Curved inspection outline of the raised hood, hinged at the cowl.
  const hinge = new THREE.Group();
  hinge.position.set(1020, 1000, 0);
  hinge.rotation.z = .93;
  group.add(hinge);
  function hoodPoint(u,v) {
    return new THREE.Vector3(1000*u-90*u*u*v*v, -170*u+48*(1-v*v)*Math.sin(Math.PI*u), v*(690-110*u*u));
  }
  for (const v of [-1,-.77,.77,1]) {
    const points=Array.from({length:25},(_,i)=>hoodPoint(i/24,v));
    hinge.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:0x88adbf})));
  }
  for (const u of [0,1]) {
    const points=Array.from({length:25},(_,i)=>hoodPoint(u,i/12-1));
    hinge.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:0x88adbf})));
  }
  box([195,155,245],[1090,820,280],0x28343c);
  box([205,20,255],[1090,907,280],0x47545b);
  box([34,20,38],[1090,927,360],0xb64437);
  box([34,20,38],[1090,927,200],0x737e85);
  box([290,85,265],[-925,315,160],0x839296);
  for(let z=65;z<265;z+=20) box([260,10,7],[-925,362,z],0x65777d);
  cable([[-440,240,0],[-710,240,0],[-925,296,40]],0xff892b,11);
  cable([[-925,337,288],[-820,350,430],[680,350,430],[970,620,430],[1090,939,360]],0x37d4b4,9);
  cable([[1090,939,200],[1060,920,145],[995,813,100]],0x637178,7);
  const tag=(text,p,offset)=>label(group,text,'#78cfc2',new THREE.Vector3(...p),new THREE.Vector3(...offset));
  tag('机舱盖 Hood',[1500,1570,0],[0,150,0]);
  tag('低压电瓶 LV Battery',[1090,926,360],[160,140,260]);
  tag('降压转换器 PCS · DC/DC',[-925,365,160],[-220,380,240]);
  return group;
}
