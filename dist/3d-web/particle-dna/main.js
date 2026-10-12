import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const canvas=document.querySelector('#scene');
const inductionButton=document.querySelector('#induction');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=THREE.SRGBColorSpace;
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x010106);
scene.fog=new THREE.Fog(0x010106,12,29);

const camera=new THREE.PerspectiveCamera(31,innerWidth/innerHeight,.1,60);
camera.position.set(0,.1,19.5);
const controls=new OrbitControls(camera,canvas);
controls.enableDamping=true;controls.enablePan=false;controls.minDistance=13;controls.maxDistance=21;
controls.autoRotate=true;controls.autoRotateSpeed=.035;

const dna=new THREE.Group();
dna.rotation.set(0,0,-.48);
dna.position.set(.35,.25,0);
scene.add(dna);

const positions=[],normals=[],seeds=[],rungLines=[];
const steps=360;
const length=14.8;
const turns=2.65;
const helixRadius=1.42;
const shellSamples=104;

function point(x,y,z,nx,ny,nz,t,seed){
  positions.push(x,y,z);normals.push(nx,ny,nz);seeds.push(seed,t,arguments.length>8?arguments[8]:0);
}

// 微距颗粒实体：两条粗大的 DNA 骨架带，密度足以形成连续砂粒表面。
for(let i=0;i<steps;i++){
  const t=i/(steps-1);
  const x=(t-.5)*length;
  const twist=t*Math.PI*2*turns;
  const pulse=1+Math.sin(twist*2.0+.7)*.09+Math.sin(twist*5.0)*.035;
  for(let strand=0;strand<2;strand++){
    const a=twist+strand*Math.PI;
    const cy=Math.cos(a)*helixRadius;
    const cz=Math.sin(a)*helixRadius;
    const strandRadius=(.31+Math.sin(twist*1.4+strand)*.025)*pulse;
    for(let j=0;j<shellSamples;j++){
      const phi=Math.random()*Math.PI*2;
      const fill=.7+Math.random()*.3;
      const rough=1+(Math.random()-.5)*.16;
      const r=strandRadius*fill*rough;
      const nx=Math.cos(phi),nz=Math.sin(phi);
      point(x+(Math.random()-.5)*.075,cy+nx*r,cz+nz*r,nx,0,nz,t,Math.random());
    }
  }

  // 双螺旋之间规则排列的碱基对竖条链，同样完全由微粒组成。
  if(i%6===0){
    const ay=Math.cos(twist)*(helixRadius-.16),az=Math.sin(twist)*(helixRadius-.16);
    const tangentY=-Math.sin(twist),tangentZ=Math.cos(twist);
    rungLines.push(x,ay,az,x,-ay,-az);
    const rungSamples=220;
    for(let k=0;k<rungSamples;k++){
      const f=.035+(k+.5)/rungSamples*.93+(Math.random()-.5)*.0025;
      const phi=Math.random()*Math.PI*2;
      const rr=Math.sqrt(Math.random())*.052;
      const offsetX=Math.cos(phi)*rr;
      const offsetT=Math.sin(phi)*rr;
      point(
        x+offsetX,
        THREE.MathUtils.lerp(ay,-ay,f)+tangentY*offsetT,
        THREE.MathUtils.lerp(az,-az,f)+tangentZ*offsetT,
        Math.cos(phi),
        tangentY*Math.sin(phi),
        tangentZ*Math.sin(phi),
        t,
        Math.random(),
        1
      );
    }
  }
}

const geometry=new THREE.BufferGeometry();
geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
geometry.setAttribute('aNormal',new THREE.Float32BufferAttribute(normals,3));
geometry.setAttribute('aSeed',new THREE.Float32BufferAttribute(seeds,3));

const material=new THREE.ShaderMaterial({
  transparent:true,depthWrite:true,depthTest:true,
  uniforms:{uTime:{value:0},uPixelRatio:{value:renderer.getPixelRatio()},uInduction:{value:0}},
  vertexShader:`
    attribute vec3 aNormal;attribute vec3 aSeed;
    uniform float uTime,uPixelRatio,uInduction;
    varying float vShade;varying float vSeed;varying float vDepth;varying float vFlow;varying float vPair;varying float vSpot;
    void main(){
      vec3 p=position;
      float travel=aSeed.y*68.-uTime*2.35+aSeed.x*5.;
      float flow=pow(.5+.5*sin(travel),7.)*(.22+uInduction*.78);
      p+=aNormal*(sin(uTime*.55+aSeed.x*22.)*.016+flow*.045);
      p.x+=sin(travel*.42)*.018;
      vec3 n=normalize(mat3(modelMatrix)*aNormal);
      vec3 lightDir=normalize(vec3(-.72,.58,.38));
      float diffuse=max(dot(n,lightDir),0.);
      float back=max(dot(-n,lightDir),0.);
      float spotCenter=-2.0+sin(uTime*.16)*2.4;
      float longitudinal=exp(-pow((p.x-spotCenter)/3.0,2.0));
      float upper=clamp(.56+p.y*.13,0.18,1.0);
      vSpot=longitudinal*upper*(.28+diffuse*.72);
      vFlow=flow;
      vPair=aSeed.z;
      vShade=.06+diffuse*.70+pow(back,4.)*.20+aSeed.z*.19+flow*.26+vSpot*1.02;
      vSeed=aSeed.x;
      vec4 mv=modelViewMatrix*vec4(p,1.);
      vDepth=clamp((-mv.z-10.)/16.,0.,1.);
      gl_Position=projectionMatrix*mv;
      gl_PointSize=(2.35+aSeed.x*1.05+aSeed.z*1.35+flow*(1.1+aSeed.z*.9))*uPixelRatio*(16./max(9.,-mv.z));
    }`,
  fragmentShader:`
    varying float vShade;varying float vSeed;varying float vDepth;varying float vFlow;varying float vPair;varying float vSpot;
    void main(){
      vec2 uv=gl_PointCoord-.5;float d=length(uv);if(d>.5)discard;
      float sphere=sqrt(max(0.,1.-d*d*4.));
      float edge=smoothstep(.5,.32,d);
      float grain=.76+vSeed*.24;
      vec3 base=vec3(.285,.295,.31)*(.62+vShade*1.28);
      vec3 silver=vec3(.72,.73,.74);
      vec3 color=mix(base,silver,clamp(vSpot*.78+vFlow*.11,0.,.68));
      color=mix(color,vec3(.50,.51,.525),vPair*.54);
      color*=.76+sphere*.31;
      float alpha=edge*grain*(1.-vDepth*.48)*(1.02+vFlow*.44+vPair*.58);
      gl_FragColor=vec4(color,alpha);
    }`
});
dna.add(new THREE.Points(geometry,material));

// 清晰的“梯子横档”：粒子仍是主体，细线只负责把每组碱基对的方向读出来。
const rungGeometry=new THREE.BufferGeometry();
rungGeometry.setAttribute('position',new THREE.Float32BufferAttribute(rungLines,3));
const rungMaterial=new THREE.LineBasicMaterial({color:0x666a6f,transparent:true,opacity:.2,depthWrite:false,blending:THREE.NormalBlending});
dna.add(new THREE.LineSegments(rungGeometry,rungMaterial));

// 后方固定白光的柔和光晕；光源本身不可见，只留下逆光。
const glowTexture=new THREE.CanvasTexture((()=>{const c=document.createElement('canvas');c.width=c.height=512;const g=c.getContext('2d');g.translate(256,256);for(let i=0;i<34;i++){const a=Math.random()*Math.PI*2,w=.018+Math.random()*.055,len=115+Math.random()*130;const grad=g.createLinearGradient(0,0,Math.cos(a)*len,Math.sin(a)*len);grad.addColorStop(0,'rgba(255,255,255,.15)');grad.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=grad;g.beginPath();g.moveTo(0,0);g.arc(0,0,len,a-w,a+w);g.closePath();g.fill()}const r=g.createRadialGradient(0,0,0,0,0,245);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.025,'rgba(255,255,255,.92)');r.addColorStop(.09,'rgba(225,230,235,.32)');r.addColorStop(.36,'rgba(180,190,202,.10)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(-256,-256,512,512);return c})());
const glow=new THREE.Sprite(new THREE.SpriteMaterial({
  map:glowTexture,color:0xdfe4e8,transparent:true,opacity:.42,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending
}));
glow.position.set(-2.35,1.75,-4.5);glow.scale.set(9,9,1);glow.material.opacity=0;scene.add(glow);

const dustCount=850,dustPositions=new Float32Array(dustCount*3);
for(let i=0;i<dustCount;i++){dustPositions[i*3]=(Math.random()-.5)*27;dustPositions[i*3+1]=(Math.random()-.5)*17;dustPositions[i*3+2]=-2-Math.random()*10}
const dustGeometry=new THREE.BufferGeometry();dustGeometry.setAttribute('position',new THREE.BufferAttribute(dustPositions,3));
const dust=new THREE.Points(dustGeometry,new THREE.PointsMaterial({color:0xaeb2b8,size:.018,transparent:true,opacity:.13,depthWrite:false}));scene.add(dust);

const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const clock=new THREE.Clock();
const factors=[...document.querySelectorAll('.oskm b')];
let activeFactor=-1;
let induction=false,inductionMix=0;
inductionButton.addEventListener('click',()=>{
  induction=!induction;
  inductionButton.setAttribute('aria-pressed',String(induction));
  inductionButton.querySelector('strong').textContent=induction?'PULSE ON':'OFF';
});
function animate(){
  const time=clock.getElapsedTime();material.uniforms.uTime.value=time;
  inductionMix+=(Number(induction)-inductionMix)*.035;
  material.uniforms.uInduction.value=inductionMix;
  rungMaterial.opacity=.14+inductionMix*.13+Math.sin(time*1.7)*.018;
  const nextFactor=Math.floor(time/2.2)%4;
  if(nextFactor!==activeFactor){activeFactor=nextFactor;factors.forEach((item,index)=>item.classList.toggle('active',induction&&index===activeFactor))}
  if(!induction)factors.forEach(item=>item.classList.remove('active'));
  if(!reduced){dna.rotation.y=Math.sin(time*.085)*.018;dna.rotation.x=Math.sin(time*.13)*.018;dust.rotation.z=time*.018;dust.position.x=Math.sin(time*.16)*.22}
  controls.update();renderer.render(scene,camera);requestAnimationFrame(animate);
}
animate();

addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);material.uniforms.uPixelRatio.value=renderer.getPixelRatio()});
