'use strict';
(()=>{
const cv=document.getElementById('c'),ctx=cv.getContext('2d');
let W=390,H=844,DPR=1;
function resize(){DPR=Math.min(window.devicePixelRatio||1,2);W=innerWidth;H=innerHeight;cv.width=W*DPR;cv.height=H*DPR;ctx.setTransform(DPR,0,0,DPR,0,0);}
addEventListener('resize',resize);resize();
const IMG={};['muna','kid1','kid2','kid3','kid4'].forEach(k=>{const i=new Image();i.src='img/'+k+'.png';IMG[k]=i;});
const KIDS=['kid1','kid2','kid3','kid4'];
const LS={get:(k,d)=>{try{return +localStorage.getItem('muna_'+k)||d}catch(e){return d}},set:(k,v)=>{try{localStorage.setItem('muna_'+k,v)}catch(e){}}};
// ---------- Audio ----------
let AC=null,muted=LS.get('muted',0)===1;
const muteBtn=document.getElementById('mute');
function updMute(){muteBtn.textContent=muted?'🔇':'🔊';}updMute();
muteBtn.addEventListener('pointerdown',e=>{e.stopPropagation();muted=!muted;LS.set('muted',muted?1:0);updMute();if(muted)stopMusic();else if(state==='play')startMusic();});
function ac(){AC=AC||new (window.AudioContext||window.webkitAudioContext)();return AC;}
// generic voice: freq curve [[t,f],...], optional vibrato
function voice(pts,{type='square',vol=.1,vib=0,vibF=0,delay=0,dur}={}){if(muted)return;try{const A=ac(),t=A.currentTime+delay,o=A.createOscillator(),g=A.createGain();o.type=type;
 o.frequency.setValueAtTime(pts[0][1],t);for(const [dt,f] of pts.slice(1))o.frequency.exponentialRampToValueAtTime(Math.max(f,30),t+dt);
 const d=dur||pts[pts.length-1][0];g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.01);g.gain.setValueAtTime(vol,t+d*.7);g.gain.exponentialRampToValueAtTime(.0001,t+d);
 if(vib){const l=A.createOscillator(),lg=A.createGain();l.frequency.value=vibF;lg.gain.value=vib;l.connect(lg).connect(o.frequency);l.start(t);l.stop(t+d+.05);}
 o.connect(g).connect(A.destination);o.start(t);o.stop(t+d+.05);}catch(e){}}
function tone(f1,f2,dur,type='square',vol=.12,delay=0){voice([[0,f1],[dur,f2]],{type,vol,delay});}
const SFX={
 jump:()=>voice([[0,180],[.08,520],[.22,300]],{type:'sine',vol:.16,vib:60,vibF:28}),                 // boing
 spring:()=>voice([[0,250],[.45,1800]],{type:'triangle',vol:.14,vib:40,vibF:9}),                      // whee slide-whistle
 power:()=>{voice([[0,300],[.6,1500],[.8,1300]],{type:'sine',vol:.14,vib:50,vibF:7});},
 coin:()=>{voice([[0,1400],[.05,2600],[.09,1800]],{type:'square',vol:.06});},                         // squeak pop
 super:()=>{[523,659,784,1047].forEach((f,i)=>tone(f,f,.11,'triangle',.1,i*.08));voice([[0,900],[.12,1300],[.24,950],[.36,1350],[.5,1000]],{type:'sine',vol:.09,vib:120,vibF:14,delay:.34});}, // jingle + giggle
 stomp:()=>{voice([[0,700],[.12,120]],{type:'sine',vol:.2});tone(120,60,.08,'square',.08,.0);},          // bonk
 break:()=>voice([[0,140],[.25,70]],{type:'sawtooth',vol:.12,vib:40,vibF:35}),                         // raspberry
 over:()=>{[[392,370],[370,349],[349,330]].forEach(([a,b],i)=>voice([[0,a],[.3,b]],{type:'sawtooth',vol:.09,delay:i*.38,dur:.33}));voice([[0,330],[1.0,294]],{type:'sawtooth',vol:.09,vib:12,vibF:6,delay:1.14,dur:1.0});}, // wah-wah-wah-waaah
 shield:()=>voice([[0,600],[.1,900],[.3,200]],{type:'triangle',vol:.14})};

// ---------- Music (original chiptune loop) ----------
let musicOn=LS.get('music',1)===1,mus=null;
const musBtn=document.getElementById('music');
function updMus(){musBtn.textContent='🎵';musBtn.style.opacity=musicOn?1:.35;}updMus();
musBtn.addEventListener('pointerdown',e=>{e.stopPropagation();musicOn=!musicOn;LS.set('music',musicOn?1:0);updMus();if(!musicOn)stopMusic();else if(state==='play')startMusic();});
// C major bouncy tune, 2 bars x 4, 16th steps; 0 = rest. MIDI notes
const MEL=[72,0,76,0,79,0,76,77, 79,0,81,79,77,0,76,0, 74,0,77,0,81,0,79,77, 76,0,74,0,72,0,0,0,
           72,0,76,0,79,0,84,0, 83,0,81,0,79,0,77,76, 74,76,77,0,74,0,71,0, 72,0,0,0,67,0,0,0];
const BASS=[48,55,52,55,53,57,55,57,50,57,53,57,55,59,55,48];
const mf=n=>440*Math.pow(2,(n-69)/12);
function note(f,t,d,type,vol){const A=AC,o=A.createOscillator(),g=A.createGain();o.type=type;o.frequency.value=f;g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0005,t+d);o.connect(g).connect(mus.out);o.start(t);o.stop(t+d+.02);}
function startMusic(){if(!musicOn||muted||mus)return;try{ac();if(AC.state==='suspended')AC.resume();const out=AC.createGain();out.gain.value=.5;out.connect(AC.destination);
 mus={out,step:0,next:AC.currentTime+.05,id:0};
 const tick=()=>{if(!mus)return;const bpm=132+Math.min(36,(-camY||0)/400);const sd=60/bpm/4;
  while(mus.next<AC.currentTime+.12){const i=mus.step%64,t=mus.next;
   if(MEL[i])note(mf(MEL[i]),t,sd*1.6,'square',.035);
   if(i%4===0)note(mf(BASS[(i/4)%16]),t,sd*3,'triangle',.08);
   if(i%4===2){note(mf(BASS[((i-2)/4)%16]+12),t,sd*.8,'triangle',.04);}
   if(i%8===4)note(2000,t,.03,'square',.012); // hat
   mus.step++;mus.next+=sd;}};
 mus.id=setInterval(tick,25);tick();}catch(e){mus=null;}}
function stopMusic(){if(!mus)return;clearInterval(mus.id);try{mus.out.gain.setTargetAtTime(0,AC.currentTime,.05);}catch(e){}mus=null;}
// ---------- Input ----------
let tilt=0,hasTilt=false,keys={},touchDir=0;
addEventListener('keydown',e=>{keys[e.key]=1;if((e.key===' '||e.key==='Enter')&&state!=='play')tapStart();});
addEventListener('keyup',e=>{keys[e.key]=0;});
function onOri(e){if(e.gamma!=null){hasTilt=true;tilt=Math.max(-1,Math.min(1,e.gamma/25));}}
function enableTilt(){const D=window.DeviceOrientationEvent;if(D&&typeof D.requestPermission==='function'){D.requestPermission().then(r=>{if(r==='granted')addEventListener('deviceorientation',onOri);}).catch(()=>{});}else if(D)addEventListener('deviceorientation',onOri);}
const touches=new Map();
function updTouch(){let d=0;touches.forEach(x=>{d+=x<W/2?-1:1});touchDir=Math.sign(d);}
cv.addEventListener('pointerdown',e=>{if(state!=='play'){tapStart();return;}touches.set(e.pointerId,e.clientX);updTouch();});
cv.addEventListener('pointermove',e=>{if(touches.has(e.pointerId)){touches.set(e.pointerId,e.clientX);updTouch();}});
['pointerup','pointercancel','pointerleave'].forEach(n=>cv.addEventListener(n,e=>{touches.delete(e.pointerId);updTouch();}));
let tiltAsked=false;
function tapStart(){if(!tiltAsked){tiltAsked=true;enableTilt();}if(AC&&AC.state==='suspended')AC.resume();if(state==='over'&&performance.now()-overAt<700)return;startGame();}
// ---------- World ----------
const G=1500,JUMP=-820,SPRING=-1300,TRAMP=-1500,PW=64,PH=14;
let state='start',overAt=0,P,plats,coins,mons,pows,parts,floaters,camY,score,coinsRun,superRun,stomps,hi=LS.get('hi',0),coinBank=LS.get('coins',0),topGen,t0=0,shake=0;
const rnd=(a,b)=>a+Math.random()*(b-a);
function diff(){return Math.min(1,(-camY)/25000);}
function startGame(){
 P={x:W/2,y:H-150,vx:0,vy:JUMP,face:1,sq:1,anim:0,jet:0,prop:0,shield:0,magnet:0,dead:false};
 plats=[];coins=[];mons=[];pows=[];parts=[];floaters=[];camY=0;score=0;coinsRun=0;superRun=0;stomps=0;
 plats.push({x:W/2-PW/2,y:H-60,t:'n',vx:0});topGen=H-60;
 while(topGen>-H)gen();state='play';startMusic();
}
function gen(){
 const d=diff(),gap=rnd(55,85+d*95);topGen-=gap;
 const r=Math.random();let t='n';
 if(r<.2+d*.2)t='m';else if(r<.28+d*.3)t='b';else if(r<.33+d*.33)t='d';
 const p={x:rnd(0,W-PW),y:topGen,t,vx:t==='m'?rnd(40,80+d*80)*(Math.random()<.5?-1:1):0,broken:false,gone:0,fall:0};
 plats.push(p);
 if(t==='b'){gen0();return;} // breaking platform: ensure another real one nearby
 if(t==='b'||t==='d')return;
 const q=Math.random();
 if(q<.06)pows.push({x:p.x+PW/2,y:p.y,on:p,dx:rnd(-18,18),k:'spring'});
 else if(q<.085)pows.push({x:p.x+PW/2,y:p.y,on:p,dx:0,k:'tramp'});
 else if(q<.1&&-camY>800){const ks=['jet','prop','shield','magnet'];pows.push({x:p.x+PW/2,y:p.y-30,on:p,dx:0,k:ks[Math.random()*4|0],hover:1});}
 if(Math.random()<.35){const n=1+(Math.random()*3|0),cx=rnd(30,W-30);for(let i=0;i<n;i++)coins.push({x:cx,y:p.y-60-i*34,k:'gold',ph:Math.random()*6});}
 if(Math.random()<.035)coins.push({x:rnd(40,W-40),y:p.y-rnd(60,120),k:KIDS[Math.random()*4|0],ph:0,big:1});
 if(-topGen>1800&&Math.random()<.03+d*.07&&!mons.some(m=>Math.abs(m.y-topGen)<350)){mons.push({x:rnd(40,W-40),y:topGen-90,vx:rnd(30,70)*(Math.random()<.5?-1:1),k:Math.random()*3|0,ph:0,dead:0});}
}
function gen0(){topGen-=rnd(10,30);plats.push({x:rnd(0,W-PW),y:topGen,t:'n',vx:0,gone:0,fall:0});}
function burst(x,y,c,n=10,s=180){for(let i=0;i<n;i++){const a=Math.random()*6.28,v=rnd(s*.3,s);parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,l:rnd(.4,.8),c,r:rnd(2,4)});}}
const KIDPOW={kid1:['RAKETE!','jet',4],kid2:['SCHUTZSCHILD!','shield',8],kid3:['MAGNET!','magnet',8],kid4:['MEGA-SPRUNG!','mega',6]};
function kidPower(k){const [name,key,t]=KIDPOW[k];P[key]=t;if(key==='jet')P.prop=0;if(key==='magnet')P.dbl=t;P.kid=P.kid||{};P.kid[key]=k;P.banner={k,name,l:1.8};SFX.power();}
function floatTxt(x,y,s,c='#fff'){floaters.push({x,y,s,c,l:1});}
function bounce(v){if(P.mega>0)v*=1.45;P.lastBounce=v;P.vy=v;P.sq=.65;P.anim=1;}

// one physics substep: move, then swept landing test against CURRENT platform positions
function physStep(dt){
 P.x+=P.vx*dt;if(P.x<-20)P.x+=W+40;if(P.x>W+20)P.x-=W+40;
 if(P.jet>0){P.jet-=dt;P.vy=Math.max(P.vy-3200*dt,-1100);if(Math.random()<dt*60)burst(P.x-P.face*14,P.y+20,'#ffa53a',1,90);}
 else if(P.prop>0){P.prop-=dt;P.vy=Math.max(P.vy-2400*dt,-750);}
 else P.vy+=G*dt;
 const prevFeet=P.y+30;P.y+=P.vy*dt;const feet=P.y+30;
 for(const p of plats){
  if(p.t==='m'){p.x+=p.vx*dt;if(p.x<0||p.x>W-PW){p.vx*=-1;p.x=Math.max(0,Math.min(W-PW,p.x));}}
  if(p.broken){p.fall+=dt*600;p.y+=p.fall*dt;}
  if(p.gone)p.gone+=dt;}
 for(const u of pows)if(u.on){u.x=u.on.x+PW/2+u.dx;u.y=u.on.y-(u.hover?30:0);if(!u.used&&(u.on.broken||u.on.gone>.3))u.used=1;}
 const flying=P.jet>0||P.prop>0;
 if(flying||P.dead||P.vy<=0)return;
 // springs / trampolines first (their top sits above the platform)
 for(const u of pows){if(u.used||(u.k!=='spring'&&u.k!=='tramp'))continue;
  const top=u.y-(u.k==='tramp'?12:14),half=u.k==='tramp'?36:22;
  if(Math.abs(P.x-u.x)<half&&prevFeet<=top+2&&feet>=top){P.y=top-30;bounce(u.k==='tramp'?TRAMP:SPRING);u.act=1;SFX.spring();if(u.k==='tramp')P.flip=1;return;}}
 for(const p of plats){
  if(p.broken||p.gone)continue;
  if(P.x>p.x-14&&P.x<p.x+PW+14&&prevFeet<=p.y+2&&feet>=p.y){
   if(p.t==='b'){p.broken=true;SFX.break();burst(p.x+PW/2,p.y,'#8a5a2b',8);continue;}
   P.y=p.y-30;bounce(JUMP);SFX.jump();if(p.t==='d')p.gone=.001;if(p.t==='m')P.vx+=p.vx*.3;return;}}
}
// ---------- Update ----------
function update(dt){
 const d=diff();
 // control
 let ax=0;if(keys.ArrowLeft||keys.a)ax-=1;if(keys.ArrowRight||keys.d)ax+=1;if(touchDir)ax=touchDir;
 let target=(hasTilt&&!ax&&!touchDir)?tilt*420:ax*400;
 P.vx+=(target-P.vx)*Math.min(1,dt*10);if(Math.abs(P.vx)>20)P.face=Math.sign(P.vx);
 if(P.shield>0)P.shield-=dt;if(P.magnet>0)P.magnet-=dt;if(P.dbl>0)P.dbl-=dt;if(P.mega>0)P.mega-=dt;if(P.banner){P.banner.l-=dt;if(P.banner.l<=0)P.banner=null;}for(const k in (P.kid||{}))if(!(P[k]>0))delete P.kid[k];
 P.sq+=(1-P.sq)*Math.min(1,dt*12);P.anim=Math.max(0,P.anim-dt*1.6);
 // fixed substeps (<=1/240 s) so 30-120 Hz screens behave identically and nothing tunnels
 const n=Math.max(1,Math.ceil(dt/(1/240))),h=dt/n;
 for(let s=0;s<n;s++)physStep(h);
 const flying=P.jet>0||P.prop>0;
 for(const u of pows){if(u.act)u.act=Math.max(0,u.act-dt*4);
  if(u.used||u.k==='spring'||u.k==='tramp')continue;
  if(Math.abs(P.x-u.x)<30&&Math.abs(P.y-u.y)<40){u.used=1;SFX.power();
   if(P.kid)delete P.kid[u.k];if(u.k==='jet'){P.jet=2.6;P.prop=0;}else if(u.k==='prop'){P.prop=3;P.jet=0;}else if(u.k==='shield')P.shield=10;else P.magnet=10;
   floatTxt(u.x,u.y,{jet:'Jetpack!',prop:'Propeller!',shield:'Schutzschild!',magnet:'Magnet!'}[u.k],'#ffe04a');}}
 if(P.flip)P.flip=Math.max(0,P.flip-dt*1.3);
 // coins
 for(const c of coins){if(c.got)continue;c.ph+=dt*4;
  const dx=P.x-c.x,dy=P.y-c.y,dd=Math.hypot(dx,dy);
  if(P.magnet>0&&dd<260){c.x+=dx/dd*600*dt;c.y+=dy/dd*600*dt;}
  if(dd<(c.big?40:28)){c.got=1;if(c.big){superRun++;score+=500;SFX.super();kidPower(c.k);burst(c.x,c.y,'#ffe04a',26,260);burst(c.x,c.y,'#fff',14,200);floatTxt(c.x,c.y,'SUPER +500','#ffe04a');}
   else{const m=P.dbl>0?2:1;coinsRun+=m;score+=25*m;SFX.coin();burst(c.x,c.y,'#ffd23a',6,120);}}}
 // monsters
 for(const m of mons){if(m.dead){m.y+=500*dt;m.rot=(m.rot||0)+dt*8;continue;}
  m.ph+=dt;m.x+=m.vx*dt;if(m.x<30||m.x>W-30)m.vx*=-1;
  const dx=P.x-m.x,dy=P.y-m.y;
  if(!P.dead&&Math.abs(dx)<38&&Math.abs(dy)<42){
   if(flying||P.shield>0){m.dead=1;SFX.shield();score+=150;stomps++;floatTxt(m.x,m.y,'+150');}
   else if(P.vy>0&&dy<-10){m.dead=1;bounce(JUMP*1.05);SFX.stomp();score+=150;stomps++;burst(m.x,m.y,'#6ad06a',14);floatTxt(m.x,m.y,'+150');}
   else{P.dead=true;P.vy=-300;shake=.4;SFX.stomp();}
  }}
 // camera
 const line=camY+H*.4;if(P.y<line)camY=P.y-H*.4;
 score=Math.max(score,Math.floor(-camY/4)+coinsRun*25+superRun*500+stomps*150);
 while(topGen>camY-200)gen();
 const cut=camY+H+100;
 plats=plats.filter(p=>p.y<cut&&!(p.gone>=.5));coins=coins.filter(c=>c.y<cut&&!c.got);mons=mons.filter(m=>m.y<cut+200);pows=pows.filter(u=>u.y<cut&&!(u.used&&u.k!=='spring'&&u.k!=='tramp'));
 for(const q of parts){q.x+=q.vx*dt;q.y+=q.vy*dt;q.vy+=400*dt;q.l-=dt;}parts=parts.filter(q=>q.l>0);
 for(const f of floaters){f.y-=60*dt;f.l-=dt*.9;}floaters=floaters.filter(f=>f.l>0);
 if(shake>0)shake-=dt;
 if(P.y>camY+H+60)gameOver();
}
function gameOver(){state='over';stopMusic();overAt=performance.now();SFX.over();
 newHi=score>hi;if(newHi){hi=score;LS.set('hi',hi);}coinBank+=coinsRun+superRun*5;LS.set('coins',coinBank);}
let newHi=false;
// ---------- Drawing ----------
const COL={jacket:'#f7a8cf',jacket2:'#8e5bd1',white:'#ffffff',stripe1:'#e85aa8',stripe2:'#7b3fa0',skin:'#c98c6a',hair:'#2a1a14',shoe:'#f4f4f4'};
function rr(x,y,w,h,r){ctx.beginPath();ctx.roundRect?ctx.roundRect(x,y,w,h,r):ctx.rect(x,y,w,h);}
function limb(x1,y1,ang,len,w,c1,c2,tipC){ctx.save();ctx.translate(x1,y1);ctx.rotate(ang);ctx.lineCap='round';ctx.strokeStyle=c1;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,len);ctx.stroke();
 if(c2){ctx.strokeStyle=c2;ctx.lineWidth=w*.35;ctx.beginPath();ctx.moveTo(-w*.25,len*.15);ctx.lineTo(-w*.25,len*.85);ctx.stroke();}
 ctx.fillStyle=tipC;ctx.beginPath();ctx.ellipse(0,len+2,w*.55,w*.45,0,0,7);ctx.fill();ctx.restore();}
// draw Muna centred at x,y (y = body centre), s = scale
function drawMuna(x,y,s,o){
 const a=o.anim, sq=o.sq, up=o.vy<0?Math.min(1,-o.vy/800):0;
 const armA=o.fly?2.6:(0.4+a*2.4+up*.4), legK=a*1.0+up*.3;
 ctx.save();ctx.translate(x,y);ctx.scale(s*o.face*(1/Math.sqrt(sq)),s*sq);
 if(o.rot)ctx.rotate(o.rot*o.face);
 // legs (white pants with stripes)
 limb(-8,14,legK*.6+.08,24-legK*6,11,COL.white,COL.stripe1,COL.shoe);
 limb(8,14,-legK*.9-.08,24-legK*8,11,COL.white,COL.stripe2,COL.shoe);
 // back arm
 limb(-15,-10,armA+.2*Math.sin(o.t*10),22,9,COL.jacket,COL.jacket2,COL.skin);
 // torso jacket
 ctx.fillStyle=COL.jacket;rr(-17,-16,34,34,10);ctx.fill();
 ctx.fillStyle=COL.jacket2;ctx.beginPath();ctx.moveTo(-17,0);ctx.lineTo(17,-10);ctx.lineTo(17,-2);ctx.lineTo(-17,8);ctx.fill();
 ctx.fillStyle=COL.white;rr(-5,-16,10,34,3);ctx.fill();
 ctx.strokeStyle='#d8d8d8';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(0,-14);ctx.lineTo(0,16);ctx.stroke();
 // front arm
 limb(15,-10,-armA-.2*Math.sin(o.t*10+1),22,9,COL.jacket,COL.jacket2,COL.skin);
 // propeller hat / jetpack
 if(o.jet){ctx.fillStyle='#9aa4b1';rr(-26,-14,10,26,4);ctx.fill();ctx.fillStyle='#ff7a1a';ctx.beginPath();ctx.moveTo(-26,12);ctx.lineTo(-21,24+Math.random()*12);ctx.lineTo(-16,12);ctx.fill();}
 ctx.restore();
 // head (not mirrored so the face stays natural)
 const hs=s*(58+(1-sq)*-10),hy=y-s*16*sq-hs*.48;
 ctx.save();ctx.translate(x,hy);ctx.rotate(Math.sin(o.t*8)*.06*a + (o.rot?o.rot*o.face:0));
 if(IMG.muna.complete&&IMG.muna.naturalWidth){ctx.drawImage(IMG.muna,-hs/2,-hs/2,hs,hs);}else{ctx.fillStyle=COL.skin;ctx.beginPath();ctx.arc(0,0,hs/2,0,7);ctx.fill();}
 // hair bun on top
 ctx.fillStyle=COL.hair;ctx.beginPath();ctx.arc(0,-hs*.48,hs*.12,0,7);ctx.fill();
 if(o.prop){ctx.fillStyle='#ffd23a';ctx.beginPath();ctx.ellipse(0,-hs*.5,hs*.28,hs*.12,0,Math.PI,0);ctx.fill();ctx.fillStyle='#e8433a';ctx.fillRect(-2,-hs*.66,4,hs*.1);
  const r=o.t*30;ctx.strokeStyle='#3a8be8';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-Math.cos(r)*hs*.4,-hs*.68);ctx.lineTo(Math.cos(r)*hs*.4,-hs*.68);ctx.stroke();}
 ctx.restore();
}
function drawCoin(c,y){const w=Math.abs(Math.cos(c.ph))*.8+.2;ctx.save();ctx.translate(c.x,y);ctx.scale(w,1);
 ctx.fillStyle='#d99a12';ctx.beginPath();ctx.arc(0,0,11,0,7);ctx.fill();ctx.fillStyle='#ffd23a';ctx.beginPath();ctx.arc(0,0,8.5,0,7);ctx.fill();
 ctx.fillStyle='#d99a12';ctx.font='bold 11px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('M',0,1);ctx.restore();}
function drawFaceCoin(c,y,t){const r=26+Math.sin(t*5)*2;ctx.save();ctx.translate(c.x,y);
 const g=ctx.createRadialGradient(0,0,r*.6,0,0,r*1.8);g.addColorStop(0,'#fff6a0cc');g.addColorStop(1,'#fff6a000');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,r*1.8,0,7);ctx.fill();
 ctx.rotate(t*1.2);ctx.fillStyle='#fff';for(let i=0;i<4;i++){ctx.rotate(Math.PI/2);ctx.beginPath();ctx.moveTo(0,-r-14);ctx.lineTo(3,-r-6);ctx.lineTo(0,-r-2);ctx.lineTo(-3,-r-6);ctx.fill();}ctx.rotate(-t*1.2);
 ctx.fillStyle='#b8860b';ctx.beginPath();ctx.arc(0,0,r+5,0,7);ctx.fill();ctx.fillStyle='#ffd23a';ctx.beginPath();ctx.arc(0,0,r+2.5,0,7);ctx.fill();
 ctx.save();ctx.beginPath();ctx.arc(0,0,r,0,7);ctx.clip();const im=IMG[c.k];if(im.complete&&im.naturalWidth)ctx.drawImage(im,-r,-r,r*2,r*2);ctx.restore();
 ctx.strokeStyle='#fff8';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,r+3.5,-2.4,-1.2);ctx.stroke();ctx.restore();}
function drawPlat(p,y){let c1='#5fd35f',c2='#2f9e3a';if(p.t==='m'){c1='#3aa0ff';c2='#1456b0';}if(p.t==='b'){c1='#c9925a';c2='#8a5a2b';}if(p.t==='d'){c1='#fff';c2='#c9c9c9';}
 ctx.save();if(p.gone)ctx.globalAlpha=Math.max(0,1-p.gone*2);if(p.broken){ctx.translate(p.x+PW/2,y);ctx.rotate(.3);ctx.translate(-p.x-PW/2,-y);}
 ctx.fillStyle=c2;rr(p.x,y+3,PW,PH,7);ctx.fill();ctx.fillStyle=c1;rr(p.x,y,PW,PH-2,7);ctx.fill();
 if(p.t==='b'){ctx.strokeStyle=c2;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(p.x+PW/2-4,y);ctx.lineTo(p.x+PW/2+3,y+6);ctx.lineTo(p.x+PW/2-2,y+12);ctx.stroke();}
 ctx.restore();}
function drawPow(u,y,t){ctx.save();ctx.translate(u.x,y);
 if(u.k==='spring'){const h=u.act?22:12;ctx.strokeStyle='#888';ctx.lineWidth=3;ctx.beginPath();for(let i=0;i<=4;i++){ctx.lineTo(i%2?6:-6,-i*h/4);}ctx.stroke();ctx.fillStyle='#e8433a';ctx.fillRect(-9,-h-4,18,4);}
 else if(u.k==='tramp'){const b=u.act?8:0;ctx.strokeStyle='#555';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-26,0);ctx.lineTo(-22,-12);ctx.moveTo(26,0);ctx.lineTo(22,-12);ctx.stroke();ctx.strokeStyle='#e8433a';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-28,-12);ctx.quadraticCurveTo(0,-12+b*2,28,-12);ctx.stroke();}
 else{const bob=Math.sin(t*4)*4;ctx.translate(0,bob);ctx.fillStyle='#ffffffcc';ctx.beginPath();ctx.arc(0,0,20,0,7);ctx.fill();ctx.font='24px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText({jet:'🚀',prop:'🧢',shield:'🛡️',magnet:'🧲'}[u.k],0,1);}
 ctx.restore();}
function drawMon(m,y,t){ctx.save();ctx.translate(m.x,y);if(m.dead)ctx.rotate(m.rot||0);const cols=['#8b5cf6','#ef4444','#10b981'],s=1+Math.sin(t*6+m.ph)*.06;ctx.scale(s,1/s);
 ctx.fillStyle=cols[m.k];ctx.beginPath();if(m.k===1){for(let i=0;i<12;i++){const a=i/12*6.28,r=i%2?22:30;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}}else ctx.ellipse(0,0,30,24,0,0,7);ctx.fill();
 if(m.k===0){ctx.fillRect(-26,-30,8,14);ctx.fillRect(18,-30,8,14);}if(m.k===2){ctx.strokeStyle=cols[2];ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-10,-22);ctx.lineTo(-14,-36);ctx.moveTo(10,-22);ctx.lineTo(14,-36);ctx.stroke();}
 ctx.fillStyle='#fff';[-10,10].forEach(ex=>{ctx.beginPath();ctx.arc(ex,-4,7,0,7);ctx.fill();});ctx.fillStyle='#111';[-10,10].forEach(ex=>{ctx.beginPath();ctx.arc(ex+Math.sign(m.vx)*2,-3,3.5,0,7);ctx.fill();});
 ctx.fillStyle='#111';ctx.beginPath();ctx.arc(0,9,8,0,Math.PI);ctx.fill();ctx.fillStyle='#fff';ctx.fillRect(-5,9,3,4);ctx.fillRect(2,9,3,4);ctx.restore();}
function bg(off){ctx.fillStyle='#fdf6e3';ctx.fillRect(0,0,W,H);ctx.strokeStyle='#e6dcc0';ctx.lineWidth=1;const o=((off%24)+24)%24;ctx.beginPath();for(let y=-o;y<H;y+=24){ctx.moveTo(0,y);ctx.lineTo(W,y);}for(let x=0;x<W;x+=24){ctx.moveTo(x+.5,0);ctx.lineTo(x+.5,H);}ctx.stroke();}
function txt(s,x,y,size,c='#3b2a4a',al='center',stroke){ctx.font=`900 ${size}px system-ui,-apple-system,sans-serif`;ctx.textAlign=al;ctx.textBaseline='middle';if(stroke){ctx.lineWidth=size/6;ctx.strokeStyle=stroke;ctx.lineJoin='round';ctx.strokeText(s,x,y);}ctx.fillStyle=c;ctx.fillText(s,x,y);}
function hud(t){const top=Math.max(10,parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sat'))||10);
 ctx.fillStyle='#ffffffd0';rr(8,8,W-118,46,14);ctx.fill();txt(String(score),20,31,24,'#3b2a4a','left');
 drawCoin({x:W-202,ph:0},31);txt(String(coinsRun),W-186,31,18,'#3b2a4a','left');
 ctx.save();ctx.beginPath();ctx.arc(W-142,31,12,0,7);ctx.clip();ctx.drawImage(IMG.kid1,W-154,19,24,24);ctx.restore();txt(String(superRun),W-126,31,18,'#3b2a4a','left');
 let y=66;const bars=[['jet','🚀',2.6],['prop','🧢',3],['shield','🛡️',10],['magnet','🧲',10],['mega','⬆️',6]];
 for(let [k,ic,mx] of bars)if(P[k]>0){const kid=P.kid&&P.kid[k];if(kid)mx=KIDPOW[kid][2];ctx.fillStyle=kid?'#fff3b0e0':'#ffffffd0';rr(8,y,130,24,12);ctx.fill();if(kid){ctx.save();ctx.beginPath();ctx.arc(22,y+12,11,0,7);ctx.clip();ctx.drawImage(IMG[kid],11,y+1,22,22);ctx.restore();}else{ctx.font='16px system-ui';ctx.textAlign='left';ctx.fillText(ic,14,y+13);}ctx.fillStyle='#7b3fa0';rr(38,y+8,94*P[k]/mx,8,4);ctx.fill();y+=30;}}
let lastT=0;
function frame(ts){requestAnimationFrame(frame);let dt=Math.min(.033,(ts-lastT)/1000||0);lastT=ts;const t=ts/1000;
 if(state==='play'){update(dt);}
 if(state==='start'){bg(t*30);
  txt('Muna Jump',W/2,H*.16,Math.min(64,W/6),'#ff5fae','center','#5a2a7a');
  txt('Spring so hoch du kannst!',W/2,H*.16+52,18,'#5a2a7a');
  const ph=(t*1.4)%1,jy=Math.abs(Math.sin(ph*Math.PI))*150,an=ph<.5?1-ph*2:0;
  ctx.fillStyle='#2f9e3a';rr(W/2-50,H*.62+3,100,14,7);ctx.fill();ctx.fillStyle='#5fd35f';rr(W/2-50,H*.62,100,12,7);ctx.fill();
  drawMuna(W/2,H*.62-48-jy,1.5,{anim:ph<.12?1:Math.max(0,1-ph*1.6),sq:ph<.06||ph>.94?.75:1,vy:ph<.5?-600:300,face:1,t});
  KIDS.forEach((k,i)=>drawFaceCoin({x:W/2+(i-1.5)*Math.min(84,W/4.6),k},H*.74,t+i));
  txt('Sammle die Super-Coins!',W/2,H*.74+52,16,'#5a2a7a');
  txt('Tippen zum Starten',W/2,H*.86,24+Math.sin(t*5)*1.5,'#fff','center','#7b3fa0');
  txt('Handy neigen oder links/rechts tippen',W/2,H*.86+36,14,'#6b5a7a');
  txt(`Rekord: ${hi}   ·   Münzen gesamt: ${coinBank}`,W/2,H*.95,14,'#6b5a7a');
  return;}
 // game
 ctx.save();if(shake>0)ctx.translate(rnd(-6,6)*shake*2,rnd(-6,6)*shake*2);
 bg(-camY);
 for(const p of plats)drawPlat(p,p.y-camY);
 for(const u of pows)if(!u.used||u.k==='spring'||u.k==='tramp')drawPow(u,u.y-camY,t);
 for(const c of coins)c.big?drawFaceCoin(c,c.y-camY,t):drawCoin(c,c.y-camY);
 for(const m of mons)drawMon(m,m.y-camY,t);
 const py=P.y-camY;
 drawMuna(P.x,py,P.mega>0?1.5:1,{anim:P.dead?1:P.anim,sq:P.sq,vy:P.vy,face:P.face,t,jet:P.jet>0,prop:P.prop>0,fly:P.jet>0||P.prop>0,rot:P.dead?t*6:(P.flip?(1-P.flip)*6.283:0)});
 if(P.x<30)drawMuna(P.x+W+40,py,1,{anim:P.anim,sq:P.sq,vy:P.vy,face:P.face,t});if(P.x>W-30)drawMuna(P.x-W-40,py,1,{anim:P.anim,sq:P.sq,vy:P.vy,face:P.face,t});
 if(P.shield>0&&(P.shield>2||Math.sin(t*20)>0)){ctx.strokeStyle='#5fb8ffcc';ctx.fillStyle='#5fb8ff22';ctx.lineWidth=3;ctx.beginPath();ctx.arc(P.x,py-18,52,0,7);ctx.fill();ctx.stroke();}
 if(P.magnet>0){ctx.strokeStyle=`rgba(232,67,58,${.25+.15*Math.sin(t*10)})`;ctx.lineWidth=2;ctx.setLineDash([6,8]);ctx.beginPath();ctx.arc(P.x,py,70+((t*80)%60),0,7);ctx.stroke();ctx.setLineDash([]);}
 for(const q of parts){ctx.globalAlpha=Math.max(0,q.l*1.5);ctx.fillStyle=q.c;ctx.beginPath();ctx.arc(q.x,q.y-camY,q.r,0,7);ctx.fill();}ctx.globalAlpha=1;
 for(const f of floaters){ctx.globalAlpha=Math.max(0,f.l);txt(f.s,f.x,f.y-camY,18,f.c,'center','#5a2a7a');}ctx.globalAlpha=1;
 ctx.restore();hud(t);
 if(P.banner){const b=P.banner,a=Math.min(1,b.l*2),sc=1+Math.max(0,b.l-1.5)*1.5,r=70*sc;ctx.save();ctx.globalAlpha=a;ctx.translate(W/2,H*.32);
  ctx.fillStyle='#b8860b';ctx.beginPath();ctx.arc(0,0,r+8,0,7);ctx.fill();ctx.fillStyle='#ffd23a';ctx.beginPath();ctx.arc(0,0,r+4,0,7);ctx.fill();
  ctx.save();ctx.beginPath();ctx.arc(0,0,r,0,7);ctx.clip();ctx.drawImage(IMG[b.k],-r,-r,r*2,r*2);ctx.restore();
  txt(b.name,0,r+40,38,'#ffe04a','center','#7b3fa0');ctx.restore();}
 if(state==='over'){ctx.fillStyle='#2a1a3acc';ctx.fillRect(0,0,W,H);
  txt('Game Over!',W/2,H*.2,48,'#ff5fae','center','#fff');
  if(newHi)txt('🎉 Neuer Rekord! 🎉',W/2,H*.2+50,22,'#ffe04a');
  const L=[['Punkte',score],['Rekord',hi],['Münzen',coinsRun],['Super-Coins',superRun],['Monster besiegt',stomps],['Höhe',Math.floor(-camY/10)+' m'],['Münzen gesamt',coinBank]];
  L.forEach(([a,b],i)=>{txt(a,W/2-110,H*.34+i*40,18,'#fff','left');txt(String(b),W/2+110,H*.34+i*40,20,'#ffe04a','right');});
  drawMuna(W/2,H*.74,1.2,{anim:Math.abs(Math.sin(t*3)),sq:1,vy:0,face:1,t,rot:Math.sin(t*2)*.2});
  txt('Nochmal? Tippen!',W/2,H*.88,26+Math.sin(t*5)*1.5,'#fff','center','#ff5fae');}
}
requestAnimationFrame(frame);
window.__muna={get s(){return {state,P,coins,plats,mons,pows,score,camY}},startGame,update,set plats(v){plats=v},set pows(v){pows=v},set mons(v){mons=v},set state(v){state=v}};
})();
