/* A hand-built miniature pirate brig. Buoyancy uses the same slosh/swell
   surface as the tank; no external models, textures or requests. */
(function(global){
'use strict';
const wood={color:[.16,.065,.022],rough:.72},trim={color:[.46,.27,.075],rough:.65},
 sail={color:[.82,.70,.48],rough:.95},black={color:[.018,.024,.023],rough:.9};
function make(){
 const parts=[],m=G.empty(),rings=[];
 for(let i=0;i<=22;i++){
   const t=i/22,z=(t-.5)*10,beam=Math.pow(Math.sin(t*Math.PI),.55)*1.65+.03,row=[];
   for(let j=0;j<=14;j++){
     const a=j/14*Math.PI;
     const x=-Math.cos(a)*beam,y=.7-Math.sin(a)*1.6+Math.pow(Math.abs(t-.5)*2,4)*.85;
     row.push(G.vert(m,x,y,z,0,1,0));
   }rings.push(row);
 }
 for(let i=0;i<22;i++)for(let j=0;j<14;j++)G.quad(m,rings[i][j],rings[i][j+1],rings[i+1][j+1],rings[i+1][j]);
 G.computeNormals(m);G.style(m,{color:p=>V3.lerp(wood.color,trim.color,Math.pow(Math.max(0,Math.sin(p[1]*12)),12)*.55),rough:.76});parts.push(m);
 parts.push(G.at(G.box(2.8,.20,7.4,trim),[0,.65,0]));
 parts.push(G.at(G.box(2.5,.9,2.0,wood),[0,1.08,2.55]));
 parts.push(G.at(G.box(2.75,.16,2.3,trim),[0,1.6,2.5]));
 // Raised gunwales and gunports.
 for(const side of [-1,1]){
  for(let i=0;i<10;i++){
   const z=-3.9+i*.8,x=side*(Math.sin((z/10+.5)*Math.PI)*1.6);
   parts.push(G.rod([x,.7,z],[x,1.12,z],.045,5,trim));
   if(i%2===0)parts.push(G.at(G.box(.12,.28,.33,black),[x,0.18,z]));
  }
  parts.push(G.rod([side*1.35,1.1,-3.1],[side*1.35,1.1,2.8],.065,6,trim));
 }
 for(const [z,height,width] of [[-.8,8.2,5.1],[2.05,6.4,3.4]]){
  parts.push(G.rod([0,.65,z],[0,height,z],.105,8,wood));
  for(const [y,w,h] of [[height-1.05,width,3.0],[height-3.6,width*.78,1.8]]){
    parts.push(G.rod([-w/2,y,z],[w/2,y,z],.065,7,wood));
    // Billowed cloth with a gently curved lower hem; duplicate winding so the
    // sail remains visible while the viewer circles the ship.
    const cloth=G.empty(),rows=[];
    for(let j=0;j<=10;j++){
      const v=j/10,row=[];
      for(let i=0;i<=16;i++){
        const u=i/16;
        row.push(G.vert(cloth,(u-.5)*w*(1-.12*v),y-v*h-.18*Math.sin(u*Math.PI),z-Math.sin(u*Math.PI)*Math.sin(v*Math.PI)*.7,0,0,-1));
      }rows.push(row);
    }
    for(let j=0;j<10;j++)for(let i=0;i<16;i++){
      const a=rows[j][i],b=rows[j+1][i],c=rows[j+1][i+1],d=rows[j][i+1];
      G.quad(cloth,a,b,c,d);G.quad(cloth,d,c,b,a);
    }
    // Explicit smooth normals on double-sided cloth, avoiding cancellation.
    G.style(cloth,sail);parts.push(cloth);
  }
  // Rigging forms the silhouette of a real little brig.
  for(const side of [-1,1])parts.push(G.rod([0,height-.5,z],[side*1.4,.8,z+1.1],.022,4,wood));
 }
 parts.push(G.rod([0,.9,-4.4],[0,1.7,-6],.07,7,wood));
 // Black Jolly Roger on the taller mast, with a tiny ivory skull and crossbones.
 parts.push(G.at(G.box(1.65,.9,.055,black),[.85,7.9,-.8]));
 const ivory={color:[.93,.87,.7],rough:.8};
 for(const dz of [-.84,-.76]){
  parts.push(G.at(G.sphere(.23,10,7,ivory),[.83,8.02,dz],[0,0,0],[1,.9,.3]));
  parts.push(G.at(G.box(.22,.14,.03,ivory),[.83,7.82,dz]));
  for(const x of [.75,.91])parts.push(G.at(G.sphere(.055,6,4,black),[x,8.04,dz+(dz<-.8?-.07:.07)]));
  parts.push(G.rod([.43,7.58,dz],[1.23,7.78,dz],.04,5,ivory));
  parts.push(G.rod([.43,7.78,dz],[1.23,7.58,dz],.04,5,ivory));
 }
 return G.merge(parts);
}
const SHIP={x:-21,z:-25,y:0,rx:0,rz:0,heading:-.58};
SHIP.init=scene=>scene.mesh('pirateShip',make());
SHIP.update=function(dt,t,water){
 const surface=water.sample(SHIP.x,SHIP.z),n=surface.normal;
 SHIP.vx=(SHIP.vx||0)+(surface.flow[0]*.35-(SHIP.vx||0)*1.3-(SHIP.x+21)*.40)*dt;
 SHIP.vz=(SHIP.vz||0)+(surface.flow[1]*.35-(SHIP.vz||0)*1.3-(SHIP.z+25)*.40)*dt;
 const x=clamp(SHIP.x+SHIP.vx*dt,-28,-14),z=clamp(SHIP.z+SHIP.vz*dt,-33,-18);
 const smooth=1-Math.exp(-dt*5);
 const heading=.15+Math.sin(t*.17)*.035;
 const dx=-n[0]/Math.max(n[1],.2),dz=-n[2]/Math.max(n[1],.2);
 SHIP.x=x;SHIP.z=z;SHIP.y=lerp(SHIP.y,surface.height+.30,smooth);
 SHIP.rx=lerp(SHIP.rx,Math.atan(dx*Math.sin(heading)+dz*Math.cos(heading)),smooth);
 SHIP.rz=lerp(SHIP.rz,-Math.atan(dx*Math.cos(heading)-dz*Math.sin(heading)),smooth);
 SHIP.heading=heading;
 return M4.compose(M4.create(),[SHIP.x,SHIP.y,SHIP.z],[SHIP.rx,SHIP.heading,SHIP.rz],[1.2,1.2,1.2]);
};

global.SHIP=SHIP;
})(window);
