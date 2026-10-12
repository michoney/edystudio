class IceFluid {
  constructor(count=7600){
    this.particles=Array.from({length:count},()=>this.spawn());
    this.impulse={x:.5,y:.5,vx:0,vy:0,power:0};
  }
  spawn(){return{x:Math.random(),y:Math.random(),px:0,py:0,vx:0,vy:0,life:Math.random()}}
  pointerMove(current,last,viewport){
    this.impulse.x=current[0]/viewport[0];this.impulse.y=current[1]/viewport[1];
    this.impulse.vx=(current[0]-last[0])/viewport[0];this.impulse.vy=(current[1]-last[1])/viewport[1];this.impulse.power=1;
  }
  draw(ctx,mapPoint,lightAt,bend,time){
    ctx.save();ctx.globalCompositeOperation='screen';ctx.lineCap='round';
    for(const p of this.particles){
      p.px=p.x;p.py=p.y;
      const angle=Math.sin(p.y*9.2+time*.82)*1.35+Math.cos(p.x*13.4-time*.56)*.92+bend*1.65;
      p.vx=p.vx*.955+Math.cos(angle)*.00072+(p.y-.5)*.0003;
      p.vy=p.vy*.955+Math.sin(angle)*.00058-Math.sin(p.x*Math.PI)*(.00034+bend*.00072);
      const dx=p.x-this.impulse.x,dy=p.y-this.impulse.y,d2=dx*dx+dy*dy;
      if(this.impulse.power>.01&&d2<.035){const f=(1-d2/.035)*this.impulse.power;p.vx+=this.impulse.vx*f*.12;p.vy+=this.impulse.vy*f*.12}
      p.x+=p.vx;p.y+=p.vy;p.life+=.0035;
      if(p.x<0||p.x>1||p.y<0||p.y>1||p.life>1.8){Object.assign(p,this.spawn());continue}
      const a=mapPoint(p.px,p.py),b=mapPoint(p.x,p.y),light=lightAt(b.x,b.y);
      const speed=Math.min(1,Math.hypot(p.vx,p.vy)*180);
      const alpha=.035+light*.36+speed*.11+Math.abs(bend)*.05;
      const cool=150+Math.round(light*52),blue=170+Math.round(light*55);
      ctx.strokeStyle=`rgba(${cool},${cool+8},${blue},${alpha})`;ctx.lineWidth=.45+light*1.55+speed*.7;
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
      if(light>.28&&p.life%0.13<.008){ctx.fillStyle=`rgba(220,232,238,${light*.35})`;ctx.beginPath();ctx.arc(b.x,b.y,.45+light*.9,0,6.283);ctx.fill()}
    }
    this.impulse.power*=.93;ctx.restore();
  }
}
