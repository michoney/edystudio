import './blueprint.css';

const panel = document.querySelector('#blueprint');
const canvas = document.querySelector('#blueprint-canvas');
const ctx = canvas.getContext('2d');
const cols = 20, rows = 12, cell = 40;
const storeKey = 'edy-construction-blueprint-v1';
let tool = 'wall', drawing = false, start = null, items = [];

const presets = {
  courtyard: [{type:'room',x:3,y:2,w:8,h:6},{type:'room',x:12,y:3,w:5,h:4},{type:'door',x:7,y:8},{type:'door',x:12,y:5}],
  studio: [{type:'room',x:3,y:3,w:13,h:5},{type:'wall',x:3,y:9,w:13,h:0},{type:'door',x:9,y:8}]
};
const color = {room:'#40c6b4',wall:'#7bd5ff',door:'#e3aa43'};
const clamp = (n,min,max) => Math.max(min,Math.min(max,n));

function snapPoint(e){
  const r = canvas.getBoundingClientRect();
  return {x:clamp(Math.floor((e.clientX-r.left)/r.width*cols),0,cols-1),y:clamp(Math.floor((e.clientY-r.top)/r.height*rows),0,rows-1)};
}
function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#0a1714';ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.strokeStyle='#24544e';ctx.lineWidth=1;for(let x=0;x<=cols;x++){ctx.beginPath();ctx.moveTo(x*cell,0);ctx.lineTo(x*cell,rows*cell);ctx.stroke()}for(let y=0;y<=rows;y++){ctx.beginPath();ctx.moveTo(0,y*cell);ctx.lineTo(cols*cell,y*cell);ctx.stroke()}
  items.forEach((item,i)=>{ctx.strokeStyle=color[item.type];ctx.fillStyle=`${color[item.type]}22`;ctx.lineWidth=3;ctx.beginPath();if(item.type==='room'){ctx.fillRect(item.x*cell+4,item.y*cell+4,item.w*cell-8,item.h*cell-8);ctx.strokeRect(item.x*cell+4,item.y*cell+4,item.w*cell-8,item.h*cell-8)}else if(item.type==='wall'){ctx.moveTo(item.x*cell+cell/2,item.y*cell+cell/2);ctx.lineTo((item.x+item.w)*cell+cell/2,(item.y+item.h)*cell+cell/2);ctx.stroke()}else{ctx.arc(item.x*cell+cell/2,item.y*cell+cell/2,10,0,Math.PI*2);ctx.fill();ctx.stroke()}ctx.fillStyle=color[item.type];ctx.font='10px monospace';ctx.fillText(String(i+1).padStart(2,'0'),item.x*cell+7,item.y*cell+16)});updateStats();
}
function updateStats(){
  const rooms=items.filter(v=>v.type==='room'),walls=items.filter(v=>v.type==='wall'),doors=items.filter(v=>v.type==='door');
  document.querySelector('#bp-area').textContent=rooms.reduce((n,v)=>n+v.w*v.h,0)*4+'㎡';document.querySelector('#bp-walls').textContent=walls.length+rooms.length*4;document.querySelector('#bp-doors').textContent=doors.length;
}
function status(text){document.querySelector('#bp-status').textContent=text}
function preset(name){items=structuredClone(presets[name]);draw();status('已载入 '+(name==='courtyard'?'一层小院':'临街工作室'));}
function save(){localStorage.setItem(storeKey,JSON.stringify(items));status('蓝图已保存');}
function eraseAt(p){items=items.filter(v=>v.type==='room'?!(p.x>=v.x&&p.x<v.x+v.w&&p.y>=v.y&&p.y<v.y+v.h):!(p.x===v.x&&p.y===v.y));}
function finish(p){
  if(!start)return;
  if(tool==='erase'){eraseAt(p)}else if(tool==='door'){items.push({type:'door',x:p.x,y:p.y})}else{const x=Math.min(start.x,p.x),y=Math.min(start.y,p.y),w=Math.max(1,Math.abs(p.x-start.x)+1),h=tool==='wall'?Math.abs(p.y-start.y):Math.max(1,Math.abs(p.y-start.y)+1);items.push({type:tool,x,y,w,h})}
  drawing=false;start=null;draw();status('布局已更新 · 可继续绘制');
}
canvas.addEventListener('pointerdown',e=>{drawing=true;start=snapPoint(e);canvas.setPointerCapture(e.pointerId);if(tool==='door'||tool==='erase')finish(start)});
canvas.addEventListener('pointerup',e=>{if(drawing)finish(snapPoint(e))});canvas.addEventListener('pointercancel',()=>{drawing=false;start=null});
document.querySelectorAll('.bp-tool').forEach(btn=>btn.addEventListener('click',()=>{tool=btn.dataset.tool;document.querySelectorAll('.bp-tool').forEach(v=>v.classList.toggle('active',v===btn));status('当前工具 · '+btn.textContent)}));
document.querySelectorAll('.bp-preset').forEach(btn=>btn.addEventListener('click',()=>preset(btn.dataset.preset)));
document.querySelector('#blueprint-clear').addEventListener('click',()=>{items=[];draw();status('画布已清空')});
document.querySelector('#bp-save').addEventListener('click',save);
document.querySelector('#bp-build').addEventListener('click',()=>{save();const rooms=items.filter(v=>v.type==='room');document.querySelector('#bp-plan').innerHTML=`<b>自动施工序列已生成</b><br>01 放置 ${rooms.length||1} 组地基<br>02 浇筑墙体与门洞<br>03 检查结构边界<br>04 可执行自动放置地基`;status('施工序列就绪');if(typeof window.__EDY_BUILD_BLUEPRINT==='function')window.__EDY_BUILD_BLUEPRINT(items)});
document.querySelector('#blueprint-open').addEventListener('click',()=>{panel.classList.add('open');panel.setAttribute('aria-hidden','false');draw()});
document.querySelector('#blueprint-close').addEventListener('click',()=>{panel.classList.remove('open');panel.setAttribute('aria-hidden','true')});
const saved=localStorage.getItem(storeKey);if(saved){try{items=JSON.parse(saved)}catch{preset('courtyard')}}else preset('courtyard');draw();
