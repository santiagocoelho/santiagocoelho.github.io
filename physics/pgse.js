'use strict';
const $=id=>document.getElementById(id);
const defaults={delta:15,Delta:40,g:40,angle:0,parallel:2,perp:.3,radius:6,intrinsic:2};
const params={...defaults};let result=null,worker=null,timer=null,frameIndex=100,playing=false,animation=0,lastTick=0;
const colors={free:'#377fdf',disk:'#0d9993'};
function phaseColor(phi){return `hsl(${((phi+Math.PI)/(2*Math.PI)*360%360+360)%360} 75% 65%)`;}
// Keep drawing coordinates stable while matching each canvas to its display pixels.
const canvasSizes=new WeakMap();
function setupCanvas(id){
 const c=$(id),ctx=c.getContext('2d');
 if(!canvasSizes.has(c)){canvasSizes.set(c,[c.width,c.height]);c.style.aspectRatio=`${c.width} / ${c.height}`;}
 const [w,h]=canvasSizes.get(c),ratio=Math.max(2,window.devicePixelRatio||1);
 const pixels=Math.max(w,Math.round(c.getBoundingClientRect().width*ratio)),height=Math.round(pixels*h/w);
 if(c.width!==pixels||c.height!==height){c.width=pixels;c.height=height;}
 ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,c.width,c.height);
 ctx.setTransform(c.width/w,0,0,c.height/h,0,0);return [ctx,w,h];
}
function line(ctx,pts,color,width=2){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();pts.forEach(([x,y],i)=>ctx[i?'lineTo':'moveTo'](x,y));ctx.stroke();}
function text(ctx,s,x,y,color='#58677d',size=14,align='left'){ctx.fillStyle=color;ctx.font=`${size}px system-ui`;ctx.textAlign=align;ctx.fillText(s,x,y);}
function sync(){for(const key of Object.keys(params)){$(key).value=params[key];$(key+'Value').textContent=params[key]+(['delta','Delta'].includes(key)?' ms':key==='g'?' mT/m':key==='angle'?'°':key==='radius'?' µm':' µm²/ms');}$('Delta').min=params.delta+2;$('bValue').textContent=Math.round(bValue(params)).toLocaleString();$('echoTime').textContent=`Echo at ${10+params.Delta+params.delta} ms`;}
function sequence(time=0){const [ctx,w,h]=setupCanvas('sequence'),TE=10+params.Delta+params.delta,X=t=>100+(w-145)*t/TE;
 const first=5,second=5+params.Delta,t180=TE/2,amp=params.g/80*35;
 [[65,'RF'],[140,'G(t)'],[225,'G effective']].forEach(([y,label])=>{line(ctx,[[100,y],[w-35,y]],'#ccd6e2',1);text(ctx,label,8,y+5,'#58677d',13);});
 for(const [t,label] of [[0,'90°'],[t180,'180°']]){line(ctx,[[X(t),65],[X(t),25]],'#152e50',3);text(ctx,label,X(t)+6,27,'#16233a',13);}
 for(const [baseline,effective] of [[140,false],[225,true]]){const pts=[[X(0),baseline]];for(const [t,sign] of [[first,1],[second,effective?-1:1]])pts.push([X(t),baseline],[X(t),baseline-sign*amp],[X(t+params.delta),baseline-sign*amp],[X(t+params.delta),baseline]);pts.push([X(TE),baseline]);line(ctx,pts,effective?'#087f83':'#2563c9',3);}
 line(ctx,[[X(first),87],[X(second),87]],'#8393aa',1);[first,second].forEach(t=>line(ctx,[[X(t),82],[X(t),92]],'#8393aa',1));text(ctx,`Δ = ${params.Delta} ms`,(X(first)+X(second))/2,79,'#58677d',12,'center');
 line(ctx,[[X(first),165],[X(first+params.delta),165]],'#8393aa',1);text(ctx,`δ = ${params.delta} ms`,(X(first)+X(first+params.delta))/2,183,'#58677d',12,'center');
 ctx.setLineDash([4,4]);line(ctx,[[X(TE),20],[X(TE),263]],'#8799b0',1);ctx.setLineDash([]);text(ctx,'Echo',X(TE)-3,15,'#16233a',12,'right');
 for(let t=0;t<=TE;t+=10)text(ctx,String(t),X(t),h-8,'#58677d',12,'center');text(ctx,'ms',w-5,h-8,'#58677d',12,'right');
 line(ctx,[[X(time),34],[X(time),270]],'#e08f39',2);
}
function motion(id,kind,f){const [ctx,w,h]=setupCanvas(id),p=result.params;
 const span=kind==='disk'?p.radius*1.35:Math.max(15,p.radius+2.5*Math.sqrt(2*Math.max(p.parallel,p.perp)*result.TE));
 const scale=(h-65)/(2*span),cx=w/2,cy=(h-25)/2;
 ctx.fillStyle='#09182b';ctx.fillRect(0,0,w,h);
 ctx.strokeStyle=kind==='disk'?'#74c8c2':'#60748f';ctx.lineWidth=2;ctx.setLineDash(kind==='disk'?[]:[5,5]);ctx.beginPath();ctx.arc(cx,cy,p.radius*scale,0,2*Math.PI);ctx.stroke();ctx.setLineDash([]);
 // Short history trails follow the same sampled walkers; never wrap positions.
 const oldest=Math.max(0,frameIndex-8);
 ctx.save();ctx.beginPath();ctx.rect(0,0,w,h-28);ctx.clip();
 for(let spin=0;spin<80;spin++){
  const points=[];for(let k=oldest;k<=frameIndex;k++){const a=result.frames[k][kind].points;points.push([cx+a[spin*3]*scale,cy-a[spin*3+1]*scale]);}
  line(ctx,points,'#6782a54a',1);
  const a=f[kind].points,x=cx+a[spin*3]*scale,y=cy-a[spin*3+1]*scale;ctx.fillStyle=phaseColor(a[spin*3+2]);ctx.beginPath();ctx.arc(x,y,3.2,0,Math.PI*2);ctx.fill();
 }
 ctx.restore();
 const angle=p.angle*Math.PI/180,ax=38,ay=43;line(ctx,[[ax-22*Math.cos(angle),ay+22*Math.sin(angle)],[ax+22*Math.cos(angle),ay-22*Math.sin(angle)]],'#f3ba6c',2);text(ctx,'G',ax+28,ay+5,'#f3ba6c',12);
 const bar=kind==='disk'?p.radius:Math.ceil(span/3/5)*5;line(ctx,[[22,h-18],[22+bar*scale,h-18]],'#b8c9df',2);text(ctx,bar+' µm',22,h-30,'#b8c9df',11);text(ctx,'x →',w-20,h-15,'#b8c9df',11,'right');
}
function phasors(f){const [ctx,w,h]=setupCanvas('phasors');['free','disk'].forEach((kind,j)=>{const x=w*(j?.75:.25),y=h/2,r=76,m=f[kind];ctx.strokeStyle='#d7e1ee';ctx.lineWidth=1;ctx.beginPath();ctx.arc(x,y,r,0,2*Math.PI);ctx.stroke();for(let i=0;i<80;i++){const phi=m.points[i*3+2];line(ctx,[[x,y],[x+r*Math.cos(phi),y-r*Math.sin(phi)]],'#91a4bb40',1);}line(ctx,[[x,y],[x+r*m.re,y-r*m.im]],colors[kind],5);text(ctx,`${kind==='free'?'Gaussian':'Restricted'}: |mean| = ${m.magnitude.toFixed(3)}`,x,h-12,colors[kind],15,'center');text(ctx,'Im',x+5,y-r-7,'#8393aa',11);text(ctx,'Re',x+r+8,y+4,'#8393aa',11);});}
function coherence(f){const [ctx,w,h]=setupCanvas('coherence'),left=50,right=w-25,top=20,bottom=h-40,X=t=>left+(right-left)*t/result.TE,Y=v=>bottom-(bottom-top)*v;
 for(let i=0;i<=4;i++){const v=i/4;line(ctx,[[left,Y(v)],[right,Y(v)]],'#e3eaf3',1);text(ctx,v.toFixed(2),left-9,Y(v)+4,'#58677d',12,'right');}
 for(let t=0;t<=result.TE;t+=10)text(ctx,t,X(t),bottom+20,'#58677d',12,'center');text(ctx,'Time (ms)',w/2,h-2,'#58677d',12,'center');text(ctx,'|S/S₀|',left,12,'#58677d',12);
 for(const kind of ['free','disk'])line(ctx,result.frames.map(a=>[X(a.t),Y(a[kind].magnitude)]),colors[kind],2.5);
 line(ctx,[[X(f.t),top],[X(f.t),bottom]],'#e08f39',2);
}
function draw(){if(!result)return;frameIndex=Math.max(0,Math.min(result.frames.length-1,frameIndex));const f=result.frames[frameIndex];$('time').value=Math.round(frameIndex/(result.frames.length-1)*100);$('timeValue').textContent=f.t.toFixed(1)+' ms';sequence(f.t);motion('freeMotion','free',f);motion('diskMotion','disk',f);phasors(f);coherence(f);}
function stop(){playing=false;cancelAnimationFrame(animation);$('play').textContent='▶ Play sequence';}
function animate(now){if(!playing)return;if(!lastTick)lastTick=now;const step=Math.floor((now-lastTick)/65);if(step){frameIndex+=step;lastTick=now;draw();if(frameIndex>=result.frames.length-1){stop();return;}}animation=requestAnimationFrame(animate);}
function calculate(){stop();if(worker)worker.terminate();worker=new Worker('pgse-worker.js');result=null;$('play').disabled=$('time').disabled=true;$('simStatus').textContent='Updating the visual experiment…';$('freeEcho').textContent=$('diskEcho').textContent='…';const started=performance.now();
 worker.onmessage=({data})=>{if(data.error){$('simStatus').textContent=data.error;return;}result=data.result;frameIndex=result.frames.length-1;const end=result.frames[frameIndex];$('freeEcho').textContent=result.analytic.toFixed(3);$('diskEcho').textContent=end.disk.magnitude.toFixed(3);$('freeEstimate').textContent=`Small-ensemble illustration: ${end.free.magnitude.toFixed(3)} (analytic value above).`;$('simStatus').textContent=`Ready · ${Math.round(performance.now()-started)} ms to update · scrub time or press Play.`;$('play').disabled=$('time').disabled=false;
 $('lesson').textContent=params.g===0?'With no gradients, moving spins accumulate no diffusion-encoding phase: both signals remain 1.':params.parallel===0&&params.perp===0&&params.intrinsic===0?'Stationary spins dephase during the first pulse, then fully refocus at the echo. Play the sequence to see the phase vectors come back together.':'Try rotating G by 90°: the Gaussian echo changes when Dₓ differs from Dᵧ. The circle has no preferred direction, so small changes there reflect the finite illustrative ensemble. Try increasing Δ to let spins encounter the wall more often.';
 draw();worker.terminate();worker=null;};worker.onerror=()=>{$('simStatus').textContent='The visual experiment could not start. Reload this page to retry.';};worker.postMessage({...params});
}
for(const key of Object.keys(defaults))$(key).oninput=()=>{params[key]=+$(key).value;if(params.Delta<params.delta+2)params.Delta=params.delta+2;sync();stop();if(worker){worker.terminate();worker=null;}result=null;$('play').disabled=$('time').disabled=true;$('simStatus').textContent='Updating the visual experiment…';sequence();clearTimeout(timer);timer=setTimeout(calculate,120);};
$('time').oninput=()=>{stop();if(result){frameIndex=Math.round(+$('time').value/100*(result.frames.length-1));draw();}};
$('play').onclick=()=>{if(playing){stop();return;}if(!result)return;if(frameIndex>=result.frames.length-1)frameIndex=0;playing=true;lastTick=0;$('play').textContent='Ⅱ Pause';draw();animation=requestAnimationFrame(animate);};
function preset(values){clearTimeout(timer);Object.assign(params,values);sync();calculate();}
$('noGradients').onclick=()=>preset({g:0});$('stationary').onclick=()=>preset({parallel:0,perp:0,intrinsic:0});$('resetPhysics').onclick=()=>preset(defaults);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});sync();sequence();calculate();

// Redraw on responsive layout changes and when moving between display densities.
let resizeFrame=0;function redrawCanvases(){cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>{if(result)draw();else sequence();});}
const canvasObserver=new ResizeObserver(redrawCanvases);document.querySelectorAll('canvas').forEach(c=>canvasObserver.observe(c));
window.addEventListener('resize',redrawCanvases);
let densityQuery;function watchDensity(){if(densityQuery)densityQuery.removeEventListener('change',densityChanged);densityQuery=matchMedia(`(resolution: ${window.devicePixelRatio||1}dppx)`);densityQuery.addEventListener('change',densityChanged);}
function densityChanged(){watchDensity();redrawCanvases();}watchDensity();
