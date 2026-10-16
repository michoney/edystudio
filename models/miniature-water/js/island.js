/* A continuous horseshoe limestone coast. Geometry, plants and water-depth
   classification all sample the same terrain, avoiding floating vegetation. */
(function(global){
'use strict';
const ISL={EXTENT:100,DEPTH:17,SEA:0,lagoon:{x:0,z:3,rx:21,rz:23}};
const R=mulberry32(62041), TAU=Math.PI*2;
const profile=[[0.0,-1],[.65,-.9],[.69,0],[.72,.09],[.735,.28],[.75,.45],[.765,.64],[.78,.81],[.80,.94],[.86,1],[.98,.94],[1.10,.72],[1.22,.33],[1.30,-.14]];
function ridge(a){return 19+8*Math.exp(-Math.pow((a+.62)/.6,2))+2.7*Math.sin(a*3.4+1.2)+1.4*Math.sin(a*7.1);}
function shape(x,z){const xx=x/30, zz=(z-8)/26;return {r:Math.hypot(xx,zz),a:Math.atan2(xx,zz)};}
function taper(a){return smoothstep(2.19,1.81,Math.abs(a));}
function radialHeight(r,a){
  let v=-1;
  for(let i=1;i<profile.length;i++)if(r<=profile[i][0]){
    const prev=profile[i-1],next=profile[i];
    v=lerp(prev[1],next[1],clamp((r-prev[0])/(next[0]-prev[0]),0,1));break;
  }
  if(r>1.30)return -8;
  const h=ridge(a)*v*taper(a);
  return h;
}
function bedHeight(x,z){
  const q=shape(x,z);
  const shelf=-17+1.0+(fbm2(x*.06+8,z*.06,3)-.5)*1.4;
  // A crescent of dry ivory sand inside the cliff; it slopes into the mouth.
  const shoreline=1.5+.018*x*x + Math.sin(x*.22)*.5;
  const beach=1.5-Math.max(0,shoreline+7-z)*.24;
  const shoreMask=(1-smoothstep(.74,1.18,q.r));
  return lerp(shelf,beach,shoreMask);
}
function terrainHeight(x,z){
  const q=shape(x,z);
  let h=bedHeight(x,z);
  if(Math.abs(q.a)<2.19 && q.r>.66 && q.r<1.30){
    const noise=(fbm2(x*.18+1,z*.18+9,3)-.5)*1.8;
    h=Math.max(h,radialHeight(q.r,q.a)+noise*taper(q.a));
  }
  return h;
}
function material(p,n){
 const noise=fbm2(p[0]*.38+4,p[2]*.38,3);
 if(p[1]<1.6 && Math.hypot(p[0]/30,(p[2]-8)/26)<.72)return [.82+noise*.07,.75+noise*.07,.59+noise*.08];
 const layers=Math.sin(p[1]*2.7+fbm2(p[0]*.11,p[2]*.11,2)*3);
 let c=V3.lerp([.36,.32,.23],[.75,.69,.54],.40+noise*.56);
 const groove=Math.pow(Math.max(0,-layers),7)*.26;
 c=c.map(v=>v*(1-groove));
 const moss=smoothstep(.45,.85,n[1])*smoothstep(3,12,p[1]);
 c=V3.lerp(c,[.13+noise*.14,.17+noise*.14,.035+noise*.065],moss*.88);
 return c;
}
function makeLand(){
 const m=G.empty(),rows=[],N=130;
 // Sand shelf has its own smooth shore. The vertical limestone shell below is
 // sampled in geological coordinates rather than a coarse Cartesian grid.
 for(let j=0;j<=N;j++){
   const z=-50+j/N*100,row=[];
   for(let i=0;i<=N;i++){const x=-50+i/N*100;row.push(G.vert(m,x,bedHeight(x,z),z,0,1,0));}
   rows.push(row);
 }
 for(let j=0;j<N;j++)for(let i=0;i<N;i++)G.quad(m,rows[j][i],rows[j+1][i],rows[j+1][i+1],rows[j][i+1]);
 const sections=[];
 for(let k=1;k<profile.length-1;k++)for(let j=0;j<6;j++){
   const t=j/6;sections.push([lerp(profile[k][0],profile[k+1][0],t),lerp(profile[k][1],profile[k+1][1],t)]);
 }
 sections.push([1.3,-.14],[1.38,-.6]);
 const rings=[],A=220;
 for(let i=0;i<=A;i++){
   const a=-2.19+i/A*4.38,row=[];
   for(const [rad,yf] of sections){
     const h=yf*ridge(a)*taper(a);
     const ledge=(Math.sin(h*2.5+Math.sin(a*9)*.4)*.18+Math.sin(h*.9+a*13)*.25)*smoothstep(-.5,3,h);
     const jag=(fbm2(a*13+50, h*.23+8, 4)-.5)*3.8;
     const x=Math.sin(a)*(30*rad+jag+ledge),z=8+Math.cos(a)*(26*rad+jag+ledge);
     const y=h+(fbm2(x*.21,z*.21,3)-.5)*1.3*taper(a);
     row.push(G.vert(m,x,y,z,0,1,0));
   }rings.push(row);
 }
 for(let i=0;i<A;i++)for(let j=0;j<sections.length-1;j++)G.quad(m,rings[i][j],rings[i][j+1],rings[i+1][j+1],rings[i+1][j]);
 G.computeNormals(m);G.style(m,{color:material,rough:.93,metal:0,rim:.03});return m;
}
function seabed(){
 const m=G.box(100,1.5,100,{color:[.74,.64,.46],rough:.96});
 for(let i=1;i<m.pos.length;i+=3)m.pos[i]-=17.65;
 return m;
}
function pebble(seed){
 const rand=mulberry32(seed),m=G.lathe([[0,1],[.65,.85],[.98,.3],[.92,-.28],[.5,-.55],[0,-.5]],10,null,{closeBottom:true});
 for(let i=0;i<m.pos.length;i+=3){const k=.92+rand()*.16;m.pos[i]*=k;m.pos[i+2]*=k;}
 G.computeNormals(m);G.style(m,{color:(p,n)=>V3.lerp([.19,.22,.16],[.43,.43,.30],.3+n[1]*.25+rand()*.2),rough:.9});return m;
}
function foliage(seed){
 const rand=mulberry32(seed),m=G.empty();
 // Several uneven lobes per canopy, instanced across the ridge.
 for(let k=0;k<5;k++){
   const lobe=G.lathe([[0,.9],[.55,.81],[.87,.48],[1,.12],[.76,-.23],[0,-.28]],7,null,{closeBottom:true});
   const a=k*2.399,r=k===0?0:.42;
   for(let i=0;i<lobe.pos.length;i+=3){lobe.pos[i]=lobe.pos[i]*.66+Math.cos(a)*r;lobe.pos[i+1]=lobe.pos[i+1]*(.52+rand()*.12);lobe.pos[i+2]=lobe.pos[i+2]*.66+Math.sin(a)*r;}
   G.computeNormals(lobe);G.style(lobe,{color:(p,n)=>{
     const f=clamp(n[1]*.45+.38+rand()*.17,0,1);
     return V3.lerp([.065,.09,.015],[.31,.36,.065],f);
   },rough:.92});
   const offset=m.pos.length/3;m.pos.push(...lobe.pos);m.nrm.push(...lobe.nrm);m.col.push(...lobe.col);m.mat.push(...lobe.mat);m.idx.push(...lobe.idx.map(v=>v+offset));
 }return m;
}
const WORLD={};
WORLD.init=function(scene){
 scene.mesh('seabed',seabed());scene.place('seabed',[0,0,0]);
 scene.mesh('coast',makeLand());scene.place('coast',[0,0,0]);
 for(let i=0;i<3;i++)scene.mesh('pebble'+i,pebble(300+i));
 for(let i=0;i<2;i++)scene.mesh('moss'+i,foliage(100+i));
 WORLD.pebbles=[];WORLD.moss=[];
 for(let i=0;i<220;i++){
   const x=(R()-.5)*96,z=(R()-.5)*96,h=terrainHeight(x,z);
   if(h>-.8)continue;
   const s=.4+Math.pow(R(),2)*2.1;
   WORLD.pebbles.push({x,z,y:h+.25,s:[s,s*(.45+R()*.45),s],rot:R()*TAU,mesh:'pebble'+(i%3)});
 }
 // Shoreline boulders at the two headlands.
 for(let i=0;i<28;i++){
   const side=i%2?-1:1,a=side*(1.83+R()*.32),r=.65+R()*.20;
   const x=Math.sin(a)*30*r,z=8+Math.cos(a)*26*r,s=.7+R()*1.7;
   WORLD.pebbles.push({x,z,y:Math.max(-.8,terrainHeight(x,z))+.2,s:[s,s*.8,s*1.1],rot:R()*TAU,mesh:'pebble'+i%3});
 }
 for(let i=0;i<1700;i++){
   const a=(R()-.5)*4.22,r=.80+R()*.39;
   const x=Math.sin(a)*30*r,z=8+Math.cos(a)*26*r,h=terrainHeight(x,z);
   const dx=(terrainHeight(x+.25,z)-terrainHeight(x-.25,z))/.5;
   const dz=(terrainHeight(x,z+.25)-terrainHeight(x,z-.25))/.5;
   if(h<3.3||Math.hypot(dx,dz)>3.8)continue;
   const s=.50+Math.pow(R(),.7)*1.05;
   WORLD.moss.push({x,z,y:h+.02,s:[s,s*(.65+R()*.4),s],rot:R()*TAU,mesh:'moss'+i%2});
 }
 WORLD.walls=[];
 for(let side=0;side<4;side++){
   const m=G.empty(),rows=[];
   // More vertical subdivisions allow correct depth gradients at shallow angles.
   for(let j=0;j<=16;j++){
     const row=[];
     for(let i=0;i<=100;i++){
       const q=-50+i;
       const x=side<2?q:(side===2?-50:50),z=side<2?(side===0?-50:50):q;
       row.push(G.vert(m,x,j/16,z,0,0,1));
     }rows.push(row);
   }
   for(let j=0;j<16;j++)for(let i=0;i<100;i++)G.quad(m,rows[j][i],rows[j][i+1],rows[j+1][i+1],rows[j+1][i]);
   G.computeNormals(m);G.style(m,{color:[.2,.6,.6],rough:.1});scene.mesh('wall'+side,m);WORLD.walls.push('wall'+side);
 }
 return WORLD;
};
global.MINI={ISL,WORLD,bedHeight:terrainHeight,surfaceHeight:terrainHeight,archTop:terrainHeight,ARCH:{}};
})(window);
