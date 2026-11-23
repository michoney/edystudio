import * as T from 'three';

export function buildFrontDetail(axleX,wheelY,trackHalf){
 const assembly=new T.Group();
 assembly.name='Model Y 前悬挂与转向';
 const aluminum=new T.MeshStandardMaterial({color:0x889ba8,metalness:.66,roughness:.33,fog:false});
 const steel=new T.MeshStandardMaterial({color:0xb9c6ce,metalness:.78,roughness:.26,fog:false});
 const black=new T.MeshStandardMaterial({color:0x242b31,metalness:.17,roughness:.56,fog:false});
 const rubber=new T.MeshStandardMaterial({color:0x171d22,roughness:.84,fog:false});
 function mesh(name,geometry,material,position){
  const object=new T.Mesh(geometry,material);
  object.name=name;
  object.position.copy(position);
  assembly.add(object);
  return object;
 }
 function segment(name,a,b,ra,rb,material){
  const direction=b.clone().sub(a);
  const object=mesh(name,new T.CylinderGeometry(rb,ra,direction.length(),24),material,a.clone().lerp(b,.5));
  object.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),direction.normalize());
 }
 function ball(name,point,radius,material){
  mesh(name,new T.SphereGeometry(radius,24,16),material,point);
 }
 function eye(name,point,radius,thickness,material){
  mesh(name,new T.TorusGeometry(radius,thickness,12,32),material,point);
 }
 const vec=(x,y,z)=>new T.Vector3(axleX+x,wheelY+y,z);
 segment('转向机壳体',vec(-110,40,-365),vec(-110,40,365),39,39,black);
 segment('前副车架横梁',vec(-215,-92,-465),vec(-215,-92,465),54,54,black);
 for(const side of [-1,1]){
  const p=(x,y,z)=>vec(x,y,side*z);
  const hub=p(0,0,trackHalf-94);
  const upper=p(7,164,trackHalf-135);
  const lower=p(5,-108,trackHalf-133);
  segment('转向节上耳',hub,upper,54,28,aluminum);
  segment('转向节下耳',hub,lower,51,31,aluminum);
  eye('轮端轴承外圈',hub,73,12,steel);
  eye('轮端轴承内圈',hub,43,10,steel);
  const armPivots=[p(-151,217,427),p(142,215,444)];
  for(const end of armPivots){
   segment('上控制臂',upper,end,26,22,aluminum);
   eye('上臂衬套',end,28,9,rubber);
  }
  for(const end of [p(149,-104,435),p(-232,-75,423)]){
   segment('下控制连杆',lower,end,32,23,aluminum);
   eye('下臂衬套',end,31,10,rubber);
  }
  for(const [name,point,sign] of [['上球头',upper,1],['下球头',lower,-1]]){
   ball(name,point,25,steel);
   segment(name+'防尘套',point,point.clone().add(new T.Vector3(0,sign*24,0)),29,18,rubber);
  }
  const tie=p(-91,28,trackHalf-135);
  const rack=p(-110,40,365);
  segment('转向拉杆',rack,tie,13,11,steel);
  ball('外转向球头',tie,23,steel);
  segment('外球头连接臂',tie,hub,21,27,aluminum);

  const base=p(35,-76,590), tower=p(77,427,470);
  const along=(t)=>base.clone().lerp(tower,t);
  segment('减震筒',base,along(.63),36,34,black);
  segment('活塞杆',along(.58),tower,13,13,steel);
  segment('下弹簧座',along(.32),along(.36),66,72,black);
  segment('上弹簧座',along(.90),along(.94),70,63,black);
  const length=base.distanceTo(tower);
  const direction=tower.clone().sub(base).normalize();
  const rotation=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),direction);
  const points=[];
  for(let i=0;i<=180;i++){
   const u=i/180,theta=u*Math.PI*13;
   points.push(new T.Vector3(58*Math.cos(theta),(.36+.54*u)*length,58*Math.sin(theta)).applyQuaternion(rotation).add(base));
  }
  mesh('螺旋弹簧',new T.TubeGeometry(new T.CatmullRomCurve3(points),180,8,10,false),steel,new T.Vector3());
 }
 return assembly;
}

export function buildWheelDetail(axleX,wheelY,trackHalf){
 const assembly=new T.Group();
 assembly.name='Model Y 四轮的制动与轮端轴承';
 const iron=new T.MeshStandardMaterial({color:0x9daab3,metalness:.59,roughness:.37,fog:false});
 const inner=new T.MeshStandardMaterial({color:0x526878,metalness:.49,roughness:.44,fog:false});
 const pad=new T.MeshStandardMaterial({color:0x354953,metalness:.23,roughness:.52,fog:false});
 function annulus(outer,hole,thickness){
  const shape=new T.Shape();
  shape.absarc(0,0,outer,0,Math.PI*2,false);
  const bore=new T.Path();
  bore.absarc(0,0,hole,0,Math.PI*2,true);
  shape.holes.push(bore);
  return new T.ExtrudeGeometry(shape,{depth:thickness,bevelEnabled:false,curveSegments:40}).translate(0,0,-thickness/2);
 }
 function mesh(name,geometry,material,position){
  const object=new T.Mesh(geometry,material);
  object.name=name;
  object.position.set(...position);
  assembly.add(object);
  return object;
 }
 const disc=annulus(164,105,9), hat=annulus(107,43,28);
 const race=annulus(75,54,9), innerRace=annulus(45,30,10);
 const ball=new T.SphereGeometry(7,14,10);
 for(const x of [-axleX,axleX])for(const side of [-1,1]){
  const z=trackHalf-84;
  mesh('制动盘外摩擦面',disc,iron,[x,wheelY,side*(z+8)]);
  mesh('制动盘内摩擦面',disc,iron,[x,wheelY,side*(z-8)]);
  mesh('制动盘帽',hat,inner,[x,wheelY,side*z]);
  mesh('制动卡钳',new T.BoxGeometry(53,99,58),pad,[x-145,wheelY+42,side*z]).rotation.z=-.21;
  mesh('轴承外圈',race,iron,[x,wheelY,side*(z-42)]);
  mesh('轴承内圈',innerRace,iron,[x,wheelY,side*(z-42)]);
  for(let i=0;i<12;i++){
   const angle=i*Math.PI/6;
   mesh('轴承滚珠',ball,iron,[x+49*Math.cos(angle),wheelY+49*Math.sin(angle),side*(z-42)]);
  }
 }
 return assembly;
}
