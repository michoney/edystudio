const SPECS={foundation:{size:[4,.5,2],capacity:220},column:{size:[.65,3,.65],capacity:80},slab:{size:[4,.35,4],capacity:320}};
export class BuildSystem{
  constructor(){this.forms=[];this.nextId=1}
  snap(n){return Math.round(n*2)/2}
  placeForm(type,position){const spec=SPECS[type];if(!spec)throw new Error('unknown form');const p={x:this.snap(position.x),y:this.snap(position.y),z:this.snap(position.z)};if(type==='slab'&&p.y>0&&!this.forms.some(f=>f.type==='column'&&f.state==='cured'))return {error:'unsupported'};if(this.forms.some(f=>f.position.x===p.x&&f.position.y===p.y&&f.position.z===p.z))return {error:'occupied'};const form={id:this.nextId++,type,position:p,capacity:spec.capacity,filled:0,strength:0,state:'empty',age:0};this.forms.push(form);return form}
  pour(id,liters,strength){const f=this.forms.find(v=>v.id===id);if(!f||liters<=0)return 0;const accepted=Math.min(liters,f.capacity-f.filled);f.strength=(f.strength*f.filled+strength*accepted)/(f.filled+accepted);f.filled+=accepted;if(f.filled>=f.capacity*.92)f.state='wet';return accepted}
  remove(id){const index=this.forms.findIndex(f=>f.id===id);if(index<0)return null;return this.forms.splice(index,1)[0]}
  update(dt){for(const f of this.forms){if(f.state==='wet'){f.age+=dt;if(f.age>=6)f.state='setting'}else if(f.state==='setting'){f.age+=dt;if(f.age>=22+(1-f.strength)*35)f.state='cured'}}}
  getProgress(){const cured=this.forms.filter(f=>f.state==='cured');return {foundations:cured.filter(f=>f.type==='foundation').length,columns:cured.filter(f=>f.type==='column').length,slabs:cured.filter(f=>f.type==='slab').length}}
}
