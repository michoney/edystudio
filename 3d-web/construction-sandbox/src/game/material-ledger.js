export class MaterialLedger {
  constructor(stock={sand:900,cement:450,water:300,concrete:0}){this.stock={...stock}}
  add(kind,liters){if(liters<0)throw new Error('amount');this.stock[kind]=(this.stock[kind]||0)+liters;return this.stock[kind]}
  consume(kind,liters){if(liters<0||this.stock[kind]<liters)return false;this.stock[kind]-=liters;return true}
  mixConcrete({sand,cement,water}){
    if([sand,cement,water].some(v=>v<=0))throw new Error('invalid batch');
    if(!this.consume('sand',sand)||!this.consume('cement',cement)||!this.consume('water',water))throw new Error('insufficient materials');
    const idealWater=cement*.5,waterScore=Math.max(0,1-Math.abs(water-idealWater)/Math.max(idealWater,1));
    const sandScore=Math.max(0,1-Math.abs(sand-cement*2)/Math.max(cement*2,1));
    const strength=Math.max(.2,Math.min(1,(waterScore+sandScore)/2));
    const result={volume:sand+cement+water,strength:Number(strength.toFixed(2)),cureSeconds:Math.round(22+(1-strength)*35)};
    this.add('concrete',result.volume);return result;
  }
}
