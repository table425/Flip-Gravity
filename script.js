(()=>{'use strict';
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d'),W=960,H=540;
const $=id=>document.getElementById(id);
const assets={bg:new Image(),tile:new Image(),rock:new Image(),normal:new Image(),flipped:new Image()};
assets.bg.src='textures/bg.png';assets.tile.src='textures/grass.png';assets.rock.src='../[32x32]-Rocky-Grass.png';assets.normal.src='textures/character.png';assets.flipped.src='textures/flipped.png';
const levels=[
{name:'FIRST STEPS',start:[66,438],exit:[866,430],platforms:[[0,500,960,40],[170,410,145,24],[385,320,145,24],[600,230,145,24],[790,145,110,24]],hazards:[[330,488,42,12],[545,488,42,12]],gems:[[235,370],[455,280],[665,190]]},
{name:'UPSIDE DOWN',start:[65,64],exit:[865,430],platforms:[[0,0,960,28],[0,500,960,40],[170,95,145,24],[380,185,145,24],[590,280,145,24],[370,405,145,24]],hazards:[[270,488,48,12],[630,488,48,12]],gems:[[230,145],[445,235],[650,330]]},
{name:'THE LONG WAY',start:[65,435],exit:[870,65],platforms:[[0,500,960,40],[0,0,960,28],[135,400,110,24],[315,310,110,24],[495,220,110,24],[675,130,110,24],[820,70,90,24]],hazards:[[255,488,42,12],[440,488,42,12],[625,488,42,12]],gems:[[190,355],[370,265],[550,175]]},
{name:'CEILING GARDEN',start:[65,62],exit:[870,435],platforms:[[0,0,960,28],[0,500,960,40],[160,100,130,24],[365,185,130,24],[570,270,130,24],[760,355,130,24]],hazards:[[300,18,52,12],[510,18,52,12],[720,18,52,12]],gems:[[220,150],[425,235],[630,320]]},
{name:'THE GAUNTLET',start:[60,435],exit:[870,65],platforms:[[0,500,960,40],[0,0,960,28],[115,405,100,24],[275,315,100,24],[435,225,100,24],[595,135,100,24],[780,70,110,24]],hazards:[[230,488,50,12],[400,488,50,12],[570,488,50,12],[740,488,50,12]],gems:[[165,360],[325,270],[485,180]]},
{name:'ONE LAST FLIP',start:[65,64],exit:[865,430],platforms:[[0,0,960,28],[0,500,960,40],[140,95,105,24],[300,185,105,24],[460,275,105,24],[620,365,105,24],[790,425,105,24]],hazards:[[255,18,48,12],[425,488,48,12],[595,18,48,12],[765,488,48,12]],gems:[[190,145],[350,235],[510,325]]}
];
// Extra routes and ledges make the centre of every room playable, while the
// ceiling and floor get deliberate spike lanes with safe passages between them.
levels.forEach((l,i)=>{
  const mid=[
    [[90,350,105,20],[300,255,105,20],[510,350,105,20],[720,255,105,20]],
    [[95,205,110,20],[300,300,110,20],[540,205,110,20],[745,355,110,20]],
    [[70,245,110,20],[265,390,110,20],[470,300,110,20],[700,390,110,20]],
    [[75,250,110,20],[285,340,110,20],[500,160,110,20],[735,245,110,20]],
    [[65,235,100,20],[235,390,100,20],[415,315,100,20],[600,390,100,20],[790,235,100,20]],
    [[80,220,110,20],[275,320,110,20],[475,220,110,20],[680,315,110,20]]
  ][i];
  l.platforms.push(...mid);
  // [x,y,width,height,direction] — -1 points down from the ceiling.
  l.hazards.push([145,488,92,12,1],[405,488,76,12,1],[690,488,88,12,1],
                 [215,28,86,12,-1],[495,28,96,12,-1],[760,28,82,12,-1]);
  // A few short spike patches on ledges; other ledges remain safe to land on.
  const ledges=mid.filter((_,j)=>((j+i)%2===0));
  ledges.forEach(([x,y,w])=>l.hazards.push([x+w*.58,y-9,Math.min(38,w*.34),10,1]));
  l.bouncers=[[330+(i%3)*25,390-(i%2)*75,76,18],[650-(i%2)*35,300+(i%3)*25,76,18]];
});
// Ten additional hand-varied rooms, reusing the supplied platform art and mechanics.
const extraNames=['MOONLIT RUN','SPIKE GARDEN','BOUNCE WORKS','THE HIGH ROAD','CRYSTAL CAVERN','REVERSE ROUTE','SKY BRIDGES','THE DEEP FLIP','LAST SPRINGS','GRAVITY MASTER'];
for(let n=0;n<10;n++){const base=levels[n%6],shift=(n%3)*18;const platforms=base.platforms.map(([x,y,w,h])=>[Math.max(0,Math.min(960-w,x+((n%2)?shift:-shift))),y,w,h]);
 const hazards=base.hazards.map(([x,y,w,h,d])=>[Math.max(0,Math.min(960-w,x+(n%2?12:-12))),y,w,h,d]);
 const gems=[[190+(n%3)*12,155],[465,270+(n%2)*18],[735-(n%3)*10,365]];
 levels.push({name:extraNames[n],start:n%2?[65,64]:[65,438],exit:n%2?[865,430]:[865,65],platforms,hazards,gems,bouncers:[[250+(n%4)*20,365,82,18],[565,205+(n%3)*22,82,18],[755,405,82,18]]});
}

let state='menu',level=0,deaths=0,gravity=1,keys={},player=null,particles=[],collected=new Set(),clock=0,last=0,acc=0,toast='',toastTicks=0,frame=0;
let bouncePower=0; // Starts as a normal platform; each death strengthens springs.
let musicVolume=.18,sfxVolume=.65,muted=false;
// Keep every solid platform separated: base ledges take priority, then optional ledges.
const rectsOverlap=(a,b,pad=5)=>a[0]<b[0]+b[2]+pad&&a[0]+a[2]+pad>b[0]&&a[1]<b[1]+b[3]+pad&&a[1]+a[3]+pad>b[1];
levels.forEach((l,i)=>{
  const accepted=[];
  l.platforms.forEach((p,j)=>{if(!accepted.some(q=>rectsOverlap(p,q,6)))accepted.push(p);});
  l.platforms=accepted;
  // Later rooms introduce moving platforms as the only added platform mechanic.
  if(i>=8){
    l.movers=l.platforms.slice(1,Math.min(4,l.platforms.length)).map((p,j)=>{const gaps=l.platforms.filter((q,k)=>k!==j+1&&p[1]<q[1]+q[3]&&p[1]+p[3]>q[1]).map(q=>q[0]>=p[0]?q[0]-(p[0]+p[2]):p[0]-(q[0]+q[2])).filter(g=>g>=0);const clearance=gaps.length?Math.min(...gaps):36;return {index:j+1,baseX:p[0],range:Math.min(14,Math.max(0,(clearance-8)/2)),speed:.8+j*.12,phase:j*1.7};});
  }
  // Springs are also checked against ledges so they never sit inside a platform.
  l.bouncers=(l.bouncers||[]).filter((b,j,arr)=>!l.platforms.some(p=>rectsOverlap(b,p,4))&&!arr.slice(0,j).some(q=>rectsOverlap(b,q,4)));
});
let sounds={gem:null,death:null,win:null,bgm:null};
try{sounds.gem=new Audio('sfx/yay.mp3');sounds.death=new Audio('sfx/death.mp3');sounds.win=new Audio('sfx/yay.mp3');sounds.bgm=new Audio('sfx/bgm.mp3');sounds.bgm.loop=true;sounds.bgm.volume=.18}catch(e){}
function applyVolumes(){if(sounds.bgm)sounds.bgm.volume=muted?0:musicVolume;['gem','death','win'].forEach(k=>{if(sounds[k])sounds[k].volume=muted?0:sfxVolume})}
function sound(name){const a=sounds[name];if(!a)return;applyVolumes();try{a.currentTime=0;const p=a.play();if(p?.catch)p.catch(()=>{})}catch(e){}}
const cur=()=>levels[level];
function spawn(){const [x,y]=cur().start;player={x,y,w:32,h:34,vx:0,vy:0,ground:false,inv:45};gravity=1;updateHud()}
function updateHud(){$('levelNum').textContent=String(level+1).padStart(2,'0');$('shards').textContent=`${collected.size}/${cur().gems.length}`;$('gravityLabel').textContent=gravity===1?'▼ DOWN':'▲ UP';$('deaths').textContent='♥ '+deaths;$('deaths').title='Spring power: '+bouncePower.toFixed(1)}
function show(title,heading,body,buttons){$('overlay').classList.remove('hidden');$('overlay').innerHTML=`<div class="panel"><div class="kicker">${title}</div><h1>${heading}</h1><p>${body}</p><div class="buttons">${buttons}</div></div>`;$('overlay').querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',()=>actions[b.dataset.action]?.()))}
function hide(){ $('overlay').classList.add('hidden') }
const actions={start(){level=0;deaths=0;bouncePower=0;collected=new Set();spawn();state='play';hide();try{sounds.bgm?.play().catch(()=>{})}catch(e){}},resume(){state='play';hide()},restart(){deaths++;collected=new Set();spawn();state='play';hide()},next(){level++;if(level>=levels.length){state='won';show('✦ YOU MADE IT ✦','WORLD\nRESTORED','You flipped through every stage. Every gem found. Every exit opened.','<button class="primary" data-action="start">PLAY AGAIN</button><button data-action="menu">TITLE SCREEN</button>')}else{collected=new Set();spawn();state='play';hide()}},settings(){const back=state==='paused'?'resume':'menu';$('overlay').classList.remove('hidden');$('overlay').innerHTML=`<div class="panel settings-panel"><div class="kicker">✦ AUDIO OPTIONS ✦</div><h1>SOUND</h1><label class="setting"><span>MUSIC</span><input id="musicVolume" type="range" min="0" max="100" value="${Math.round(musicVolume*100)}"><b id="musicValue">${Math.round(musicVolume*100)}%</b></label><label class="setting"><span>SOUND FX</span><input id="sfxVolume" type="range" min="0" max="100" value="${Math.round(sfxVolume*100)}"><b id="sfxValue">${Math.round(sfxVolume*100)}%</b></label><div class="buttons"><button id="muteBtn">${muted?'UNMUTE':'MUTE ALL'}</button><button id="testSound">TEST SOUND</button><button class="primary" data-action="${back}">DONE</button></div></div>`;const music=$('musicVolume'),fx=$('sfxVolume');music.addEventListener('input',()=>{musicVolume=Number(music.value)/100;$('musicValue').textContent=music.value+'%';applyVolumes()});fx.addEventListener('input',()=>{sfxVolume=Number(fx.value)/100;$('sfxValue').textContent=fx.value+'%';applyVolumes()});$('muteBtn').addEventListener('click',()=>{muted=!muted;$('muteBtn').textContent=muted?'UNMUTE':'MUTE ALL';applyVolumes()});$('testSound').addEventListener('click',()=>sound('gem'));$('overlay').querySelector('[data-action]').addEventListener('click',()=>actions[back]())},menu(){state='menu';show('★ PIXEL PLATFORM ADVENTURE ★','FLIP<br><span style="color:#77f0b2">GRAVITY</span>','Run, flip the world, collect the gems and find the exit.','<button class="primary" data-action="start">START GAME</button><button data-action="how">HOW TO PLAY</button><button data-action="settings">SOUND SETTINGS</button>')},how(){show('✦ HOW TO PLAY ✦','CHANGE THE\nRULES','Move with A / D or the arrow keys (touch controls work too). Press W, SPACE or UP to flip gravity. Collect every glowing gem, avoid the spikes and reach the portal.','<button class="primary" data-action="resume">GOT IT!</button>')}};
function flip(){if(state!=='play'||!player)return;gravity*=-1;player.vy=0;player.ground=false;emit(player.x+16,player.y+17,'#9affd0',12);updateHud()}
function emit(x,y,color,n=8){for(let i=0;i<n;i++)particles.push({x,y,vx:(Math.random()-.5)*4,vy:(Math.random()-.5)*4,life:24+Math.random()*12,color,size:2+Math.random()*3})}
const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
function die(){if(player.inv>0)return;deaths++;bouncePower=Math.min(22,bouncePower+2.2);sound('death');const [x,y]=[player.x+16,player.y+17];emit(x,y,'#ff719e',20);spawn();toast='TRY A DIFFERENT ROUTE';toastTicks=90}
function platformRect(l,index,entry){
 const [x,y,w,h]=entry;const mover=(l.movers||[]).find(m=>m.index===index);
 return {x:mover?mover.baseX+Math.sin(clock*mover.speed+mover.phase)*mover.range:x,y,w,h,hidden:false};
}
function hazardHitbox(h){
 const [x,y,w,height,dir=1]=h;
 // Tighten the hit region to the actual spike body instead of its old oversized rectangle.
 return dir===-1?{x:x+3,y:y+2,w:w-6,h:Math.max(5,height-3)}:{x:x+3,y:y+1,w:w-6,h:Math.max(5,height-3)};
}
function step(){if(state!=='play')return;frame++;clock+=1/60;const l=cur(),p=player;const left=keys.a||keys.A||keys.ArrowLeft,right=keys.d||keys.D||keys.ArrowRight;const dir=(right?1:0)-(left?1:0);p.vx=dir*5.0;const oldX=p.x,oldY=p.y;
// Horizontal movement and side blocking.
p.x+=p.vx; p.x=Math.max(0,Math.min(W-p.w,p.x));l.platforms.forEach((entry,i)=>{const r=platformRect(l,i,entry);if(!r.hidden&&overlap(p,r)){if(p.vx>0)p.x=r.x-p.w;else if(p.vx<0)p.x=r.x+r.w;}});
// Gravity and vertical surface collision.
p.vy+=gravity*.58;p.vy=Math.max(-14,Math.min(14,p.vy));p.y+=p.vy;p.ground=false;
l.platforms.forEach((entry,i)=>{const r=platformRect(l,i,entry);if(r.hidden||!overlap(p,r))return;
 if(p.vy>0&&oldY+p.h<=r.y+8){p.y=r.y-p.h;p.vy=0;p.ground=true}
 else if(p.vy<0&&oldY>=r.y+r.h-8){p.y=r.y+r.h;p.vy=0;p.ground=true}
 });
for(const [x,y,w,h,face=1] of (l.bouncers||[])){
 const r={x,y,w,h};if(!overlap(p,r))continue;
 const landsOnFace=face===1?(p.vy>0&&oldY+p.h<=y+9):(p.vy<0&&oldY>=y+h-9);
 if(landsOnFace){
   if(bouncePower>0){p.y=face===1?y-p.h:y+h;p.vy=face===1?-bouncePower:bouncePower;p.ground=false;emit(x+w/2,face===1?y:y+h,'#9affd0',9)}
   else {p.y=face===1?y-p.h:y+h;p.vy=0;p.ground=true;}
 }
}
// World bounds act as solid floor and ceiling.
if(p.y<28){p.y=28;p.vy=0;p.ground=gravity===-1}if(p.y+p.h>500){p.y=500-p.h;p.vy=0;p.ground=gravity===1}
if(p.y>H+50||p.y<-50)die();for(const hazard of l.hazards){if(overlap(p,hazardHitbox(hazard))){die();break}}
l.gems.forEach((g,i)=>{if(!collected.has(i)&&overlap(p,{x:g[0]-12,y:g[1]-12,w:24,h:24})){collected.add(i);sound('gem');emit(g[0],g[1],'#ffe17b',12);updateHud()}});
const e=l.exit;if(overlap(p,{x:e[0],y:e[1],w:38,h:54})&&collected.size===l.gems.length){state='cleared';sound('win');show('✦ STAGE COMPLETE ✦',`STAGE ${String(level+1).padStart(2,'0')}`,`${l.name} — all gems collected!`,'<button class="primary" data-action="next">NEXT STAGE →</button>')}
if(p.inv>0)p.inv--;particles.forEach(q=>{q.x+=q.vx;q.y+=q.vy;q.vy+=.08;q.life--});particles=particles.filter(q=>q.life>0);if(toastTicks>0)toastTicks--;
}
function drawBackground(){
 const grad=ctx.createLinearGradient(0,0,0,H);grad.addColorStop(0,'#38234f');grad.addColorStop(1,'#17152f');ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
 // One restrained parallax layer. It shifts slightly opposite the player's
 // movement, creating depth without adding extra moons or stacking backgrounds.
 if(assets.bg.complete&&assets.bg.naturalWidth){
   const bgW=W+64,bgH=H+32;
   const px=player?player.x+player.w/2:W/2;
   const py=player?player.y+player.h/2:H/2;
   const offsetX=-32-(px-W/2)*.035+Math.sin(clock*.18)*5;
   const offsetY=-16-(py-H/2)*.025;
   ctx.globalAlpha=.42;
   ctx.drawImage(assets.bg,offsetX,offsetY,bgW,bgH);
   ctx.globalAlpha=1;
 }
 // Soft distant stars; no grid overlay.
 for(let i=0;i<42;i++){const x=(i*137+Math.sin(clock*.22+i)*13)%W,y=(i*83)%H;ctx.globalAlpha=.22+.22*(.5+.5*Math.sin(clock*1.4+i));ctx.fillStyle='#fff0c8';ctx.fillRect(x,y,2,2)}ctx.globalAlpha=1;
}
function drawPlatform(x,y,w,h){
 // Layered rocky-grass tiles from the supplied 32x32 tileset.
 if(assets.rock.complete&&assets.rock.naturalWidth){for(let tx=x;tx<x+w;tx+=32){const tw=Math.min(32,x+w-tx);ctx.drawImage(assets.rock,0,0,64,64,tx,y,tw,h);}}
 else if(assets.tile.complete&&assets.tile.naturalWidth){for(let tx=x;tx<x+w;tx+=32)ctx.drawImage(assets.tile,0,0,90,90,tx,y,Math.min(32,x+w-tx),h)}
 else{ctx.fillStyle='#59416f';ctx.fillRect(x,y,w,h)}
 ctx.fillStyle='#b8f59a';ctx.fillRect(x,y,w,3);ctx.fillStyle='#17132a55';ctx.fillRect(x,y+h-3,w,3);
}
function draw(){ctx.clearRect(0,0,W,H);drawBackground();const l=cur();l.platforms.forEach((entry,i)=>{const r=platformRect(l,i,entry);if(r.hidden)return;ctx.save();const moving=(l.movers||[]).some(m=>m.index===i);if(moving){ctx.shadowColor='#75e8ff';ctx.shadowBlur=10;}drawPlatform(r.x,r.y,r.w,r.h);ctx.restore()});
// Spring platforms use the same supplied rocky tiles with a bright animated spring top.
for(const [x,y,w,h,face=1] of (l.bouncers||[])){drawPlatform(x,y,w,h);ctx.fillStyle='#65e8b1';const sy=face===1?y-5:y+h;ctx.fillRect(x+5,sy,w-10,5);ctx.fillStyle='#d9fff0';for(let sx=x+10;sx<x+w-8;sx+=13){const sign=face===1?-1:1;ctx.fillRect(sx,sy+sign*5,5,5);ctx.fillRect(sx+3,sy+sign*10,3,5)}}
// Spikes: pixel-art hazard silhouettes.
for(const [x,y,w,h,dir=1] of l.hazards){ctx.fillStyle='#4b183d';ctx.fillRect(x,dir===-1?y:y+7,w,Math.max(5,h-2));ctx.fillStyle='#ff719e';for(let sx=x;sx<x+w;sx+=14){ctx.beginPath();if(dir===-1){ctx.moveTo(sx,y+1);ctx.lineTo(sx+7,y+13);ctx.lineTo(sx+14,y+1)}else{ctx.moveTo(sx,y+9);ctx.lineTo(sx+7,y-2);ctx.lineTo(sx+14,y+9)}ctx.closePath();ctx.fill()}ctx.fillStyle='#ffd2df';for(let sx=x+4;sx<x+w;sx+=14)ctx.fillRect(sx,dir===-1?y+3:y+6,2,3)}
// Collectible gems.
l.gems.forEach((g,i)=>{if(collected.has(i))return;const bob=Math.sin(clock*4+i*2)*3;ctx.save();ctx.translate(g[0],g[1]+bob);ctx.shadowBlur=18;ctx.shadowColor='#ffe17b';ctx.fillStyle='#ffe17b';ctx.beginPath();ctx.moveTo(0,-12);ctx.lineTo(9,0);ctx.lineTo(0,12);ctx.lineTo(-9,0);ctx.closePath();ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#fff8c9';ctx.fillRect(-2,-7,3,7);ctx.restore()});
// Curved portal doorway with a layered arch and animated energy window.
const e=l.exit,unlocked=collected.size===l.gems.length,pulse=.5+.5*Math.sin(clock*4);ctx.save();
ctx.shadowBlur=unlocked?26+12*pulse:8;ctx.shadowColor=unlocked?'#77f0b2':'#9b82bd';
const dx=e[0]-5,dy=e[1]-5;ctx.fillStyle='#171126';ctx.beginPath();ctx.roundRect(dx-3,dy-3,54,68,17);ctx.fill();
ctx.fillStyle='#775a91';ctx.beginPath();ctx.roundRect(dx,dy,48,62,15);ctx.fill();
ctx.fillStyle='#d6b6e8';ctx.beginPath();ctx.roundRect(dx+5,dy+5,38,55,13);ctx.fill();
ctx.fillStyle='#21152f';ctx.beginPath();ctx.roundRect(dx+10,dy+10,28,50,11);ctx.fill();
const portal=ctx.createLinearGradient(0,dy+10,0,dy+60);portal.addColorStop(0,unlocked?'#b8ffe0':'#8d6cab');portal.addColorStop(.5,unlocked?'#42dba5':'#58416f');portal.addColorStop(1,unlocked?'#167f70':'#302343');ctx.fillStyle=portal;ctx.beginPath();ctx.roundRect(dx+13,dy+13,22,44,9);ctx.fill();
ctx.globalAlpha=.65;ctx.strokeStyle=unlocked?'#eafff4':'#d9c4ef';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(dx+24,dy+35,7+2*pulse,17,0,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;
ctx.fillStyle='#fff1c9';ctx.fillRect(dx+34,dy+34,3,3);ctx.restore();
ctx.fillStyle=unlocked?'#aaffd0':'#d9cbe8';ctx.font='18px VT323';ctx.fillText(unlocked?'ENTER':'3 SHARDS',e[0]-5,e[1]-12);
// Original player art from the supplied project.
const p=player;if(p&&assets.normal.complete&&assets.normal.naturalWidth){ctx.save();if(p.inv>0&&Math.floor(frame/5)%2===0)ctx.globalAlpha=.4;const sprite=gravity===1?assets.normal:assets.flipped;ctx.imageSmoothingEnabled=false;ctx.drawImage(sprite,p.x-2,p.y-2,p.w+4,p.h+4);ctx.restore()}else if(p){ctx.fillStyle='#20b54f';ctx.fillRect(p.x,p.y,p.w,p.h)}
particles.forEach(q=>{ctx.globalAlpha=Math.max(0,q.life/36);ctx.fillStyle=q.color;ctx.fillRect(q.x,q.y,q.size,q.size)});ctx.globalAlpha=1;ctx.fillStyle='#fff1c9';ctx.font='22px VT323';ctx.fillText(l.name,20,H-12);if(toastTicks){ctx.textAlign='center';ctx.fillStyle='#ffe17b';ctx.font='28px VT323';ctx.fillText(toast,W/2,76);ctx.textAlign='left'}
}
function loop(t){const delta=Math.min((t-last)/1000||0,.05);last=t;acc+=delta;while(acc>=1/60){step();acc-=1/60}draw();requestAnimationFrame(loop)}
window.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp',' '].includes(e.key))e.preventDefault();keys[e.key]=true;if(['w','W',' ','ArrowUp'].includes(e.key)&&!e.repeat)flip();if(e.key==='Escape'){if(state==='play'){state='paused';show('✦ PAUSED ✦','TAKE A\nBREATHER','The world can wait.','<button class="primary" data-action="resume">RESUME</button><button data-action="restart">RESTART</button><button data-action="settings">SOUND SETTINGS</button><button data-action="menu">TITLE SCREEN</button>')}else if(state==='paused')actions.resume()}});window.addEventListener('keyup',e=>keys[e.key]=false);window.addEventListener('blur',()=>{keys={};if(state==='play'){state='paused';show('✦ PAUSED ✦','TAKE A\nBREATHER','The world can wait.','<button class="primary" data-action="resume">RESUME</button><button data-action="menu">TITLE SCREEN</button>')}});
$('startBtn').addEventListener('click',actions.start);$('howBtn').addEventListener('click',actions.how);
function hold(id,key){const b=$(id);b.addEventListener('pointerdown',e=>{e.preventDefault();keys[key]=true;b.setPointerCapture?.(e.pointerId)});['pointerup','pointercancel','lostpointercapture'].forEach(ev=>b.addEventListener(ev,()=>keys[key]=false))}hold('leftBtn','a');hold('rightBtn','d');$('flipBtn').addEventListener('pointerdown',e=>{e.preventDefault();flip()});
applyVolumes();spawn();requestAnimationFrame(loop);
})();
