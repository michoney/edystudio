/* Conservative staggered-grid shallow water. R=surface elevation, G/B=east/
   north face discharge, A=water depth. Flux is shared by adjacent cells:
   dH/dt=-div(q); dq/dt=-g H (grad(eta)-tankSlope)-friction*q.
   Closed walls reflect waves. Dry terrain blocks flux. Pointer disturbances
   inject momentum, not water. This is a heightfield model, not 3D SPH. */
(function(global){
'use strict';
const N=192,EXTENT=100,DX=EXTENT/N;
const VS=`layout(location=0) in vec2 aPos;out vec2 vUv;void main(){vUv=aPos*.5+.5;gl_Position=vec4(aPos,0.,1.);}`;
const HEAD=`precision highp float;in vec2 vUv;out vec4 fragColor;
uniform sampler2D uState;uniform sampler2D uBed;uniform vec2 uTexel;uniform float uDt;uniform float uDx;
float bed(vec2 uv){return texture(uBed,uv).r;}
`;
const INIT=HEAD+`void main(){float b=bed(vUv);fragColor=vec4(max(0.,b),0.,0.,max(0.,-b));}`;
const MOMENTUM=HEAD+`
uniform vec2 uSlope;uniform vec4 uImpact;
void main(){
 vec2 uv=vUv;vec4 c=texture(uState,uv),e=texture(uState,uv+vec2(uTexel.x,0)),n=texture(uState,uv+vec2(0,uTexel.y));
 float bc=bed(uv),be=bed(uv+vec2(uTexel.x,0)),bn=bed(uv+vec2(0,uTexel.y));
 float he=max(0.,max(c.r,e.r)-max(bc,be));
 float hn=max(0.,max(c.r,n.r)-max(bc,bn));
 vec2 q=c.gb - 9.81*uDt*vec2(he*((e.r-c.r)/uDx-uSlope.x),hn*((n.r-c.r)/uDx-uSlope.y));
 // Pressure impulse changes horizontal momentum only; its divergence creates
 // the displaced depression and the compensating wave ring.
 vec2 dp=uv-uImpact.xy;float radius=max(uImpact.w,.008);
 vec2 impulse=dp/radius*exp(-dot(dp,dp)/(radius*radius)*2.);
 q+=impulse*uImpact.z*75.*min(vec2(he,hn),vec2(4.));
 q*=exp(-uDt*.50);
 // Donor-cell outflow limiter: four faces can remove at most 80% per step.
 float hc=max(0.,c.r-bc),ec=max(0.,e.r-be),nc=max(0.,n.r-bn);
 float maxE=(q.x>0.?hc:ec)*uDx/uDt*.20;
 float maxN=(q.y>0.?hc:nc)*uDx/uDt*.20;
 q=clamp(q,-vec2(maxE,maxN),vec2(maxE,maxN));
 if(uv.x>1.-uTexel.x*.6)q.x=0.;
 if(uv.y>1.-uTexel.y*.6)q.y=0.;
 fragColor=vec4(c.r,q,c.a);
}`;
const MASS=HEAD+`
void main(){
 vec4 c=texture(uState,vUv);
 float west=vUv.x<uTexel.x*.6?0.:texture(uState,vUv-vec2(uTexel.x,0)).g;
 float south=vUv.y<uTexel.y*.6?0.:texture(uState,vUv-vec2(0,uTexel.y)).b;
 float eta=c.r-uDt/uDx*(c.g-west+c.b-south);
 fragColor=vec4(eta,c.gb,max(0.,eta-bed(vUv)));
}`;
const NORMAL=HEAD+`
void main(){
 vec4 c=texture(uState,vUv);
 vec4 l=texture(uState,vUv-vec2(uTexel.x,0)),r=texture(uState,vUv+vec2(uTexel.x,0));
 vec4 d=texture(uState,vUv-vec2(0,uTexel.y)),u=texture(uState,vUv+vec2(0,uTexel.y));
 float hl=l.a>.01?l.r:c.r,hr=r.a>.01?r.r:c.r,hd=d.a>.01?d.r:c.r,hu=u.a>.01?u.r:c.r;
 vec3 n=normalize(vec3((hl-hr)/(2.*uDx),1.,(hd-hu)/(2.*uDx)));
 fragColor=vec4(n*.5+.5,c.a>.01?c.r:0.);
}`;
function create(gl,GLU,quad,bedTexture){
 if(!gl.getExtension('EXT_color_buffer_float'))throw Error('此水体需要浮点 WebGL2 支持，请使用较新的 Chrome / Safari。');
 const fmt={internal:gl.RGBA32F,format:gl.RGBA,type:gl.FLOAT,filter:gl.NEAREST};
 const state=[GLU.fbo(gl,N,N,fmt),GLU.fbo(gl,N,N,fmt)],flux=GLU.fbo(gl,N,N,fmt);
 const normals=GLU.fbo(gl,N,N,{internal:gl.RGBA16F,format:gl.RGBA,type:gl.HALF_FLOAT});
 const init=GLU.program(gl,VS,INIT,{},'water-init'),momentum=GLU.program(gl,VS,MOMENTUM,{},'water-momentum'),mass=GLU.program(gl,VS,MASS,{},'water-mass'),normal=GLU.program(gl,VS,NORMAL,{},'water-normal');
 let idx=0,pending=[],accumulator=0;const slope=[0,0];
 function draw(program,target,source,extra={}){
   GLU.bindTarget(gl,target);program.use().set({uTexel:[1/N,1/N],uDx:DX,uDt:1/120,...extra});
   program.tex('uBed',bedTexture,1);if(source)program.tex('uState',source.color,0);quad.draw();
 }
 function normalPass(){draw(normal,normals,state[idx]);}
 const W={res:N,extent:EXTENT,tex:null,normalTex:normals.color,texFb:null,
   setSlope(x,z){slope[0]=clamp(x,-.22,.22);slope[1]=clamp(z,-.22,.22);},
   splash(x,z,amount=.25,radius=.03){if(pending.length<32)pending.push([(x+50)/100,(z+50)/100,amount,radius]);},
   pendingCount:()=>pending.length,
   step(dt){
     gl.disable(gl.DEPTH_TEST);gl.disable(gl.BLEND);gl.disable(gl.CULL_FACE);
     // Fixed CFL-safe steps; at low FPS slow simulation instead of destabilizing.
     accumulator=Math.min(accumulator+Math.min(dt,.06)*2.2,.065);
     let steps=0;
     while(accumulator>=1/120 && steps<8){
       const impact=pending.shift()||[0,0,0,.03];
       draw(momentum,flux,state[idx],{uSlope:slope,uImpact:impact});
       const next=1-idx;draw(mass,state[next],flux);idx=next;accumulator-=1/120;steps++;
     }
     normalPass();W.tex=state[idx].color;W.texFb=state[idx].fbo;GLU.bindTarget(gl,null);
   },
   reset(){
     pending=[];accumulator=0;
     gl.disable(gl.DEPTH_TEST);gl.disable(gl.BLEND);gl.disable(gl.CULL_FACE);
     draw(init,state[0]);draw(init,state[1]);idx=0;normalPass();W.tex=state[0].color;W.texFb=state[0].fbo;GLU.bindTarget(gl,null);
   },
   stats(){
     const data=new Float32Array(N*N*4);gl.bindFramebuffer(gl.FRAMEBUFFER,state[idx].fbo);gl.readPixels(0,0,N,N,gl.RGBA,gl.FLOAT,data);gl.bindFramebuffer(gl.FRAMEBUFFER,null);
     let volume=0,min=Infinity,max=-Infinity,energy=0,finite=true;
     for(let i=0;i<data.length;i+=4){const h=data[i+3];volume+=h*DX*DX;finite=finite&&Number.isFinite(data[i]);if(h>.02){min=Math.min(min,data[i]);max=Math.max(max,data[i]);energy+=data[i+1]**2+data[i+2]**2;}}
     return {volume,min,max,energy,finite,gl:gl.getError()};
   },
   sample(x,z){
     const ix=clamp(Math.floor((x+50)/100*N),0,N-1),iz=clamp(Math.floor((z+50)/100*N),0,N-1);
     const p=new Float32Array(4),q=new Float32Array(4);
     gl.bindFramebuffer(gl.FRAMEBUFFER,normals.fbo);gl.readPixels(ix,iz,1,1,gl.RGBA,gl.FLOAT,p);
     gl.bindFramebuffer(gl.FRAMEBUFFER,state[idx].fbo);gl.readPixels(ix,iz,1,1,gl.RGBA,gl.FLOAT,q);gl.bindFramebuffer(gl.FRAMEBUFFER,null);
     return {height:p[3],normal:[p[0]*2-1,p[1]*2-1,p[2]*2-1],flow:[q[1]/Math.max(q[3],.1),q[2]/Math.max(q[3],.1)]};
   }
 };
 W.reset();return W;
}
global.WAVE={create,N,EXTENT};
})(window);
