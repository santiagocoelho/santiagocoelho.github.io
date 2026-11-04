'use strict';
// Units: ms, µm, mT/m; gamma is radians/s/T. Rectangular ideal PGSE.
const GAMMA=267.52218744e6;
function bValue({delta,Delta,g}) {return GAMMA**2*1e-21*g*g*delta*delta*(Delta-delta/3);}
function gaussianEcho(p){const a=p.angle*Math.PI/180,D=p.parallel*Math.cos(a)**2+p.perp*Math.sin(a)**2;return Math.exp(-bValue(p)*D/1000);}
function random(seed){let s=seed>>>0;return ()=>{s+=0x6D2B79F5;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
// Specular reflection of each short Brownian step at an impermeable circle.
function reflect(x,y,dx,dy,R){
 for(let bounce=0;bounce<4096;bounce++){
  if((x+dx)**2+(y+dy)**2<=R*R)return [x+dx,y+dy];
  const aa=dx*dx+dy*dy;if(aa<1e-24)return [x,y];
  const bb=2*(x*dx+y*dy),cc=x*x+y*y-R*R;
  const t=Math.max(0,Math.min(1,(-bb+Math.sqrt(Math.max(0,bb*bb-4*aa*cc)))/(2*aa)));
  x+=t*dx;y+=t*dy;dx*=1-t;dy*=1-t;
  const length=Math.hypot(x,y),nx=x/length,ny=y/length,dot=dx*nx+dy*ny;
  dx-=2*dot*nx;dy-=2*dot*ny;x*=1-1e-12;y*=1-1e-12;
 }
 throw new Error('Reflection failed to converge; reduce the integration step.');
}
function simulate(p,options={}){
 const N=options.N||1200,dt=options.dt||.1,visible=Math.min(80,N),frames=[],rng=random(options.seed||20261104);
 if(!(p.delta>0&&p.Delta>=p.delta+2&&p.g>=0&&p.radius>0))throw new Error('Invalid PGSE timing or substrate.');
 const TE=10+p.Delta+p.delta,nsteps=Math.ceil(TE/dt),h=TE/nsteps,a=p.angle*Math.PI/180,gx=Math.cos(a),gy=Math.sin(a);
 const arrays=()=>({x:new Float64Array(N),y:new Float64Array(N),phase:new Float64Array(N)}),free=arrays(),disk=arrays();
 for(let i=0;i<N;i++){const r=p.radius*Math.sqrt(rng()),th=2*Math.PI*rng();free.x[i]=disk.x[i]=r*Math.cos(th);free.y[i]=disk.y[i]=r*Math.sin(th);}
 function capture(t){const sample=m=>{let re=0,im=0;const pts=[];for(let i=0;i<N;i++){re+=Math.cos(m.phase[i]);im+=Math.sin(m.phase[i]);if(i<visible)pts.push(m.x[i],m.y[i],m.phase[i]);}return {points:pts,re:re/N,im:im/N,magnitude:Math.hypot(re,im)/N};};frames.push({t,free:sample(free),disk:sample(disk)});}
 capture(0);let next=TE/100;
 const sx=Math.sqrt(2*p.parallel*h),sy=Math.sqrt(2*p.perp*h),sr=Math.sqrt(2*p.intrinsic*h);
 // Exact interval overlap keeps integrated gradient area balanced, even for test dt values.
 const overlap=(lo,hi,start,end)=>Math.max(0,Math.min(hi,end)-Math.max(lo,start));
 for(let step=0;step<nsteps;step++){
  const lo=step*h,hi=(step+1)*h;
  const area=overlap(lo,hi,5,5+p.delta)-overlap(lo,hi,5+p.Delta,5+p.Delta+p.delta);
  const factor=GAMMA*1e-12*p.g*area;
  for(let i=0;i<N;i++){
   let r=Math.sqrt(-2*Math.log(Math.max(rng(),1e-15))),th=2*Math.PI*rng(),dx=sx*r*Math.cos(th),dy=sy*r*Math.sin(th);
   free.phase[i]+=factor*(gx*(free.x[i]+dx/2)+gy*(free.y[i]+dy/2));free.x[i]+=dx;free.y[i]+=dy;
   r=Math.sqrt(-2*Math.log(Math.max(rng(),1e-15)));th=2*Math.PI*rng();
   const [nx,ny]=reflect(disk.x[i],disk.y[i],sr*r*Math.cos(th),sr*r*Math.sin(th),p.radius);
   disk.phase[i]+=factor*(gx*(disk.x[i]+nx)/2+gy*(disk.y[i]+ny)/2);disk.x[i]=nx;disk.y[i]=ny;
  }
  if(hi>=next-1e-8||step===nsteps-1){capture(hi);next+=TE/100;}
 }
 return {frames,N,dt:h,TE,b:bValue(p),analytic:gaussianEcho(p),uncertainty:1/Math.sqrt(N),params:p};
}
if(typeof module!=='undefined')module.exports={simulate,bValue,gaussianEcho,reflect};
