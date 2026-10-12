import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const canvas=document.querySelector('#scene');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;
const scene=new THREE.Scene();scene.background=new THREE.Color(0x02050b);scene.fog=new THREE.FogExp2(0x02050b,.045);
const camera=new THREE.PerspectiveCamera(34,innerWidth/innerHeight,.1,80);camera.position.set(9,.4,18);
const controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.enablePan=false;controls.minDistance=12;controls.maxDistance=25;controls.autoRotate=true;controls.autoRotateSpeed=.22;

const chromosome=new THREE.Group();chromosome.position.set(3.8,.1,0);chromosome.rotation.z=-.12;scene.add(chromosome);
const dot=document.createElement('canvas');dot.width=dot.height=96;const ctx=dot.getContext('2d');const grd=ctx.createRadialGradient(48,48,0,48,48,48);grd.addColorStop(0,'rgba(255,255,255,1)');grd.addColorStop(.25,'rgba(255,255,255,.94)');grd.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=grd;ctx.fillRect(0,0,96,96);const dotTexture=new THREE.CanvasTexture(dot);

function cloudMaterial(color,size,opacity=1){return new THREE.PointsMaterial({color,size,map:dotTexture,transparent:true,opacity,depthWrite:false,blending:THREE.AdditiveBlending,sizeAttenuation:true})}
function tubePoints(curve,count,radius){const out=[];for(let i=0;i<count;i++){const t=Math.random();const c=curve.getPoint(t);const tangent=curve.getTangent(t);const ref=Math.abs(tangent.y)<.9?new THREE.Vector3(0,1,0):new THREE.Vector3(1,0,0);const n1=new THREE.Vector3().crossVectors(tangent,ref).normalize();const n2=new THREE.Vector3().crossVectors(tangent,n1).normalize();const a=Math.random()*Math.PI*2,r=Math.sqrt(Math.random())*radius*(.74+Math.random()*.26);c.addScaledVector(n1,Math.cos(a)*r).addScaledVector(n2,Math.sin(a)*r);out.push(c.x,c.y,c.z)}return out}
function curveFor(side,arm){const sx=side*.82, bend=side*.18;return new THREE.CatmullRomCurve3([new THREE.Vector3(sx,arm*5.1,0),new THREE.Vector3(sx+bend,arm*2.65,.25),new THREE.Vector3(side*.28,arm*.55,0),new THREE.Vector3(side*.08,0,0)])}
const bodyPositions=[];for(const side of [-1,1])for(const arm of [-1,1])bodyPositions.push(...tubePoints(curveFor(side,arm),6500,.44));
const bodyGeo=new THREE.BufferGeometry();bodyGeo.setAttribute('position',new THREE.Float32BufferAttribute(bodyPositions,3));const body=new THREE.Points(bodyGeo,cloudMaterial(0x91b8d8,.072,.68));chromosome.add(body);

const telomereGeo=new THREE.BufferGeometry();const telomere=new THREE.Points(telomereGeo,cloudMaterial(0x69e8ff,.105,1));chromosome.add(telomere);
function rebuildCaps(health){const positions=[];const capLength=.32+health*1.55;for(const side of [-1,1])for(const arm of [-1,1]){const curve=curveFor(side,arm);for(let i=0;i<2500;i++){const f=Math.random();const y=arm*(5.08+f*capLength);const angle=Math.random()*Math.PI*2;const r=Math.sqrt(Math.random())*(.5+f*.06);positions.push(side*.82+Math.cos(angle)*r,y,Math.sin(angle)*r)}}telomereGeo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));telomereGeo.computeBoundingSphere()}

const division=document.querySelector('#division'),divisionValue=document.querySelector('#divisionValue'),barFill=document.querySelector('#barFill'),statusText=document.querySelector('#statusText'),statusDot=document.querySelector('#statusDot');
function update(){const n=Number(division.value),health=Math.max(.06,1-n/88);divisionValue.textContent=n;barFill.style.width=`${Math.round(health*100)}%`;rebuildCaps(health);if(health>.62){statusText.textContent='保护结构较完整';statusDot.style.background='#6df1d0';statusDot.style.boxShadow='0 0 12px #6df1d0'}else if(health>.28){statusText.textContent='端粒逐步缩短';statusDot.style.background='#ffd36b';statusDot.style.boxShadow='0 0 12px #ffd36b'}else{statusText.textContent='接近复制性衰老阈值';statusDot.style.background='#ff6f79';statusDot.style.boxShadow='0 0 12px #ff6f79'}}division.addEventListener('input',update);update();

const dustGeo=new THREE.BufferGeometry(),dustPos=new Float32Array(1600*3);for(let i=0;i<1600;i++){dustPos[i*3]=(Math.random()-.5)*34;dustPos[i*3+1]=(Math.random()-.5)*20;dustPos[i*3+2]=-5-Math.random()*15}dustGeo.setAttribute('position',new THREE.BufferAttribute(dustPos,3));const dust=new THREE.Points(dustGeo,cloudMaterial(0x4e789d,.028,.25));scene.add(dust);
const clock=new THREE.Clock(),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;function animate(){const t=clock.getElapsedTime();if(!reduced){telomere.material.opacity=.82+Math.sin(t*2.1)*.16;chromosome.rotation.y=Math.sin(t*.18)*.08;dust.rotation.z=t*.008}controls.update();renderer.render(scene,camera);requestAnimationFrame(animate)}animate();
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight)});
