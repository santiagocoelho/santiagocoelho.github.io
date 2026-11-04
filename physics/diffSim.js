'use strict';
// Orthonormal, real, even MRtrix3 SH: negative m = sqrt(2) Im(Y_l^|m|).
const $ = id => document.getElementById(id);
const bands = [[0,1],[1,6],[6,15],[15,28]], orders=[0,2,4,6];
const state = {b:3000, az:90, polar:90, gain:3, order:6, mode:'direction', normalized:false, x:45,y:45, yaw:.5,pitch:.35};
let tensorData, meta, data, selected, sphere, basisSphere, lastValues;
const factorial=n=>{let v=1;for(let i=2;i<=n;i++)v*=i;return v;};
function shBasis(v){
 const z=Math.max(-1,Math.min(1,v[2])),phi=Math.atan2(v[1],v[0]),out=[];
 for(const l of orders)for(let m=-l;m<=l;m++){
  const a=Math.abs(m);let p=1;
  for(let k=1;k<=a;k++)p*=-(2*k-1)*Math.sqrt(Math.max(0,1-z*z));
  if(l>a){let prev=p;p=z*(2*a+1)*p;for(let k=a+2;k<=l;k++){const next=((2*k-1)*z*p-(k+a-1)*prev)/(k-a);prev=p;p=next;}}
  let y=p*Math.sqrt((2*l+1)/(4*Math.PI)*factorial(l-a)/factorial(l+a));
  if(m<0)y*=Math.SQRT2*Math.sin(a*phi);if(m>0)y*=Math.SQRT2*Math.cos(a*phi);out.push(y);
 }
 return out;
}
function direction(){const a=state.az*Math.PI/180,p=state.polar*Math.PI/180;return [Math.sin(p)*Math.cos(a),Math.sin(p)*Math.sin(a),Math.cos(p)];}
function voxel(i){return data.subarray(i*meta.stride,(i+1)*meta.stride);}
function coeff(v,b=state.b){const c=new Float64Array(28);if(!v[0])return c;if(!b){c[0]=Math.sqrt(4*Math.PI);return c;}const offset=35+4*(meta.shells.indexOf(b));for(let band=0;band<4;band++)for(let j=bands[band][0];j<bands[band][1];j++)c[j]=4*Math.PI*v[7+j]*v[offset+band];return c;}
function dot(a,b,n=28){let s=0;for(let j=0;j<n;j++)s+=a[j]*b[j];return s;}
function count(order){return (order+1)*(order+2)/2;}
function project(v){let [x,y,z]=v;const a=state.yaw,p=state.pitch;[x,y]=[Math.cos(a)*x-Math.sin(a)*y,Math.sin(a)*x+Math.cos(a)*y];return [x,Math.cos(p)*z-Math.sin(p)*y,Math.sin(p)*z+Math.cos(p)*y];}
function buildSphere(){const verts=[],faces=[],nt=24,np=48;for(let i=0;i<=nt;i++)for(let j=0;j<np;j++){const t=Math.PI*i/nt,p=2*Math.PI*j/np;verts.push([Math.sin(t)*Math.cos(p),Math.sin(t)*Math.sin(p),Math.cos(t)]);}for(let i=0;i<nt;i++)for(let j=0;j<np;j++){const a=i*np+j,b=i*np+(j+1)%np,c=a+np,d=b+np;faces.push([a,b,c],[b,d,c]);}sphere={verts,faces};basisSphere=verts.map(shBasis);}
function glyph(id,c,n,isFod,tensor=null){const canvas=$(id),ctx=canvas.getContext('2d'),w=canvas.width;ctx.clearRect(0,0,w,w);const vals=basisSphere.map(y=>Math.max(0,dot(c,y,n))),max=Math.max(...vals,1e-8);let vertices;
 if(tensor){const [xx,yy,zz,xy,xz,yz]=tensor;const points=sphere.verts.map(([x,y,z])=>[xx*x+xy*y+xz*z,xy*x+yy*y+yz*z,xz*x+yz*y+zz*z]);const scale=Math.max(...points.map(v=>Math.hypot(...v)),1e-8);vertices=points.map(v=>project(v.map(x=>x/scale)));}
 else vertices=sphere.verts.map((v,i)=>project(v.map(x=>x*vals[i]/max)));
 const faces=sphere.faces.map(f=>({f,z:f.reduce((s,i)=>s+vertices[i][2],0)/3})).sort((a,b)=>a.z-b.z);
 for(const {f,z} of faces){const vec=sphere.verts[f[0]],light=.62+.28*(z+1)/2;const rgb=isFod?vec.map(x=>Math.round((40+205*Math.abs(x))*light)):[Math.round(48*light),Math.round(125*light),Math.round(215*light)];ctx.fillStyle=`rgb(${rgb})`;ctx.beginPath();f.forEach((i,j)=>{const p=vertices[i];ctx[j?'lineTo':'moveTo'](w/2+p[0]*w*.36,w/2-p[1]*w*.36);});ctx.closePath();ctx.fill();}
 const colors=['#cd4258','#2b965f','#387ee0'],labels=['R','A','S'];[[1,0,0],[0,1,0],[0,0,1]].forEach((v,i)=>{const p=project(v);ctx.strokeStyle=colors[i];ctx.beginPath();ctx.moveTo(32,w-30);ctx.lineTo(32+22*p[0],w-30-22*p[1]);ctx.stroke();ctx.fillStyle=colors[i];ctx.font='10px system-ui';ctx.fillText(labels[i],32+28*p[0],w-30-28*p[1]);});
}

const shSurfaceBasis = typeof SH_MESH === 'undefined' ? [] : SH_MESH.verts.map(shBasis);
function angularSurface(c){
 const canvas=$('angular'),ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
 ctx.clearRect(0,0,w,h);
 const full=shSurfaceBasis.map(y=>dot(c,y)),partial=shSurfaceBasis.map(y=>dot(c,y,count(state.order)));
 const scale=Math.max(1e-8,...full.map(Math.abs),...partial.map(Math.abs));
 [full,partial].forEach((values,side)=>{
  const cx=w*(side?.75:.25),cy=h*.52,r=Math.min(w/4,h/2)*.77;
  const vertices=SH_MESH.verts.map((v,i)=>project(v.map(x=>x*Math.abs(values[i])/scale)));
  const faces=SH_MESH.faces.map(f=>({f,z:f.reduce((s,i)=>s+vertices[i][2],0)/3})).sort((a,b)=>a.z-b.z);
  for(const {f,z} of faces){
   const negative=f.reduce((s,i)=>s+values[i],0)<0,light=.65+.25*(z+1)/2;
   const base=negative?[210,65,80]:side?[48,125,215]:[112,140,165];
   ctx.fillStyle=`rgb(${base.map(x=>Math.round(x*light))})`;ctx.strokeStyle='rgba(255,255,255,.12)';ctx.lineWidth=.5;
   ctx.beginPath();f.forEach((i,j)=>ctx[j?'lineTo':'moveTo'](cx+vertices[i][0]*r,cy-vertices[i][1]*r));ctx.closePath();ctx.fill();ctx.stroke();
  }
  ctx.fillStyle='#16233a';ctx.textAlign='center';ctx.font='16px system-ui';ctx.fillText(side?`Reconstruction · ℓ ≤ ${state.order}`:'Reference · ℓ ≤ 6',cx,27);
  ctx.font='12px system-ui';ctx.fillStyle='#58677d';ctx.fillText('500 directions',cx,h-15);
  [[1,0,0],[0,1,0],[0,0,1]].forEach((v,i)=>{const q=project(v),x=cx-w/4+40,y=h-48;ctx.strokeStyle=['#cd4258','#2b965f','#387ee0'][i];ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+25*q[0],y-25*q[1]);ctx.stroke();ctx.fillStyle=ctx.strokeStyle;ctx.fillText(['R','A','S'][i],x+34*q[0],y-34*q[1]);});
 });
 $('surfaceRange').textContent=`Reference range: ${Math.min(...full).toFixed(3)} to ${Math.max(...full).toFixed(3)} · Reconstruction: ${Math.min(...partial).toFixed(3)} to ${Math.max(...partial).toFixed(3)} (S/S₀).`;
}

function image(){const cvs=$('brain'),ctx=cvs.getContext('2d'),off=document.createElement('canvas');off.width=meta.width;off.height=meta.height;const oc=off.getContext('2d'),im=oc.createImageData(meta.width,meta.height),y=shBasis(direction()),colors=[[0,0,0],[86,145,234],[99,177,139],[231,151,99]];lastValues=new Float32Array(meta.width*meta.height);
 for(let i=0;i<lastValues.length;i++){const v=voxel(i),c=coeff(v),s=state.mode==='mean'?c[0]/Math.sqrt(4*Math.PI):dot(c,y);lastValues[i]=s;const gray=Math.round(255*Math.min(1,Math.max(0,s*(state.normalized?1:v[1])*state.gain)));const rgb=state.mode==='tissue'?colors[v[0]]:[gray,gray,gray];im.data.set([...rgb,255],i*4);}
 oc.putImageData(im,0,0);ctx.imageSmoothingEnabled=false;ctx.drawImage(off,0,0,cvs.width,cvs.height);
 const x=(state.x+.5)*cvs.width/meta.width,yy=(state.y+.5)*cvs.height/meta.height;ctx.strokeStyle='#7ef3dc';ctx.lineWidth=1.5;ctx.strokeRect(x-5,yy-5,10,10);ctx.beginPath();ctx.moveTo(x-15,yy);ctx.lineTo(x-7,yy);ctx.moveTo(x+7,yy);ctx.lineTo(x+15,yy);ctx.moveTo(x,yy-15);ctx.lineTo(x,yy-7);ctx.moveTo(x,yy+7);ctx.lineTo(x,yy+15);ctx.stroke();
 $('imageBadge').textContent=`b = ${state.b.toLocaleString()} s/mm² · z = ${meta.slices[0].z_mm} mm`;
 $('imageTitle').textContent=state.mode==='tissue'?'Tissue segmentation':state.mode==='mean'?'Spherical-mean signal':state.b===0?'Baseline signal · b₀':'Diffusion-weighted signal';
}
function chart(canvasId,series,{xmin=0,xmax=360,ymin=0,ymax=1,xticks=[0,90,180,270,360],xlabel='φ (degrees)'}={}){const canvas=$(canvasId),ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height,p={l:48,r:15,t:16,b:42},X=x=>p.l+(w-p.l-p.r)*(x-xmin)/(xmax-xmin),Y=y=>h-p.b-(h-p.t-p.b)*(y-ymin)/(ymax-ymin);ctx.clearRect(0,0,w,h);ctx.font='12px system-ui';ctx.lineWidth=1;for(let k=0;k<=4;k++){const v=ymin+(ymax-ymin)*k/4;ctx.strokeStyle='#e5eaf2';ctx.beginPath();ctx.moveTo(p.l,Y(v));ctx.lineTo(w-p.r,Y(v));ctx.stroke();ctx.fillStyle='#65758b';ctx.textAlign='right';ctx.fillText(v.toFixed(2),p.l-7,Y(v)+4);}ctx.textAlign='center';for(const x of xticks){ctx.fillStyle='#65758b';ctx.fillText(x,X(x),h-p.b+19);}ctx.fillText(xlabel,w/2,h-3);ctx.save();ctx.beginPath();ctx.rect(p.l,p.t,w-p.l-p.r,h-p.t-p.b);ctx.clip();for(const s of series){ctx.strokeStyle=s.color;ctx.lineWidth=s.width||2.5;ctx.setLineDash(s.dash||[]);ctx.beginPath();s.points.forEach(([x,y],i)=>ctx[i?'lineTo':'moveTo'](X(x),Y(y)));ctx.stroke();ctx.setLineDash([]);if(s.dots)for(const [x,y] of s.points){ctx.fillStyle=s.color;ctx.beginPath();ctx.arc(X(x),Y(y),3.5,0,Math.PI*2);ctx.fill();}}ctx.restore();}
function details(){selected=voxel(state.y*meta.width+state.x);const label=['Background','White matter','Gray matter','CSF'][selected[0]],c=coeff(selected),y=shBasis(direction());$('voxelLabel').textContent=`${label} · (${state.x}, ${state.y})`;
 $('signalValue').textContent=dot(c,y).toFixed(3);$('meanValue').textContent=(c[0]/Math.sqrt(4*Math.PI)).toFixed(3);
 const ti=(state.y*meta.width+state.x)*8,t=tensorData.subarray(ti,ti+8);glyph('tensor',new Float64Array(28),28,true,t[6]?t:null);$('tensorNote').textContent=t[6]?`b = 1,000 fit${t[7]? ' · '+t[7]+' invalid samples omitted':''}`:selected[0]?'Non-positive-definite fit':'Outside brain';
 const fod=selected.subarray(7,35);glyph('fod',selected[0]===1?fod:new Float64Array(28),28,true);glyph('signal',c,count(state.order),false);
 $('voxelExplanation').textContent=selected[0]===1?'The tensor and CSD fODF stay fixed as you change shells. The signal surface changes with b-value; all three views share the same orientation.':selected[0]===0?'Outside the brain. Select a tissue voxel to explore its signal.':selected[0]===2?'Gray matter uses the phantom’s NEXI exchange response. The fODF display is reserved for white matter; the GM signal uses its stored orientation coefficients.':'CSF is modeled as freely diffusing isotropic water. Its signal is direction independent and decays rapidly with b-value.';
 const shells=[0,...meta.shells],dir= shells.map(b=>[b,dot(coeff(selected,b),y)]),mean=shells.map(b=>[b,coeff(selected,b)[0]/Math.sqrt(4*Math.PI)]);
 chart('decay',[{points:dir,color:'#2563c9',dots:true},{points:mean,color:'#087f83',dash:[5,4],dots:true}],{xmax:3000,xticks:shells,xlabel:'b (s/mm²)',ymin:0,ymax:1});
 angularSurface(c);
 const energy=bands.map(([a,b])=>c.slice(a,b).reduce((s,x)=>s+x*x,0)),total=energy.reduce((a,b)=>a+b,0),omitted=energy.reduce((s,e,i)=>s+(orders[i]>state.order?e:0),0);
 $('bands').innerHTML=energy.map((e,i)=>`<div class="band ${orders[i]>state.order?'disabled':''}"><span>ℓ = ${orders[i]}</span><div class="track"><div class="bar" style="width:${total?100*e/total:0}%"></div></div><span>${total?(100*e/total).toFixed(1):'0.0'}%</span></div>`).join('');
 $('error').textContent=`Share of total squared SH coefficient norm per band. Relative spherical L² truncation error: ${total?(100*Math.sqrt(omitted/total)).toFixed(2):'0.00'}%.`;
}
function sync(){document.querySelectorAll('[data-b]').forEach(el=>{const active=+el.dataset.b===state.b;el.classList.toggle('active',active);el.setAttribute('aria-pressed',active);});$('azimuth').value=state.az;$('polar').value=state.polar;$('gain').value=state.gain;$('order').value=state.order;$('mode').value=state.mode;$('normalize').textContent=state.normalized?'b₀ normalization: on · S/S₀':'b₀ normalization: off · S';$('normalize').setAttribute('aria-pressed',state.normalized);$('normalize').disabled=state.mode==='tissue';$('azimuthValue').textContent=state.az+'°';$('polarValue').textContent=state.polar+'°';$('gainValue').textContent=state.gain.toFixed(1)+'×';const d=direction();document.querySelectorAll('[data-axis]').forEach((el,i)=>{const active=Math.abs(d[i])>.999;el.classList.toggle('active',active);el.setAttribute('aria-pressed',active);});}
let scheduled=false;function render(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;sync();image();details();});}
function bind(){ $('angular').onkeydown=e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();state.yaw+=(e.key==='ArrowRight'?.12:e.key==='ArrowLeft'?-.12:0);state.pitch+=(e.key==='ArrowDown'?.12:e.key==='ArrowUp'?-.12:0);details();};document.querySelectorAll('[data-b]').forEach(el=>el.onclick=()=>{state.b=+el.dataset.b;render();});document.querySelectorAll('[data-axis]').forEach(el=>el.onclick=()=>{state.az=el.dataset.axis==='y'?90:0;state.polar=el.dataset.axis==='z'?0:90;render();});for(const [id,key] of [['azimuth','az'],['polar','polar'],['gain','gain'],['order','order']])$(id).oninput=()=>{state[key]=+$(id).value;render();};$('mode').onchange=()=>{state.mode=$('mode').value;render();};$('normalize').onclick=()=>{state.normalized=!state.normalized;render();};$('reset').onclick=()=>{Object.assign(state,{b:3000,az:90,polar:90,gain:3,order:6,mode:'direction',normalized:false,yaw:.5,pitch:.35});pickInitial();render();};
 $('brain').onclick=e=>{const r=$('brain').getBoundingClientRect();state.x=Math.min(meta.width-1,Math.max(0,Math.floor((e.clientX-r.left)/r.width*meta.width)));state.y=Math.min(meta.height-1,Math.max(0,Math.floor((e.clientY-r.top)/r.height*meta.height)));render();};
 $('brain').onkeydown=e=>{const steps={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};if(!steps[e.key])return;e.preventDefault();state.x=Math.max(0,Math.min(meta.width-1,state.x+steps[e.key][0]));state.y=Math.max(0,Math.min(meta.height-1,state.y+steps[e.key][1]));render();};
 for(const id of ['tensor','fod','signal','angular']){let drag=null;$(id).onpointerdown=e=>{drag=[e.clientX,e.clientY];$(id).setPointerCapture(e.pointerId);};$(id).onpointermove=e=>{if(!drag)return;state.yaw+=(e.clientX-drag[0])*.012;state.pitch+=(e.clientY-drag[1])*.012;drag=[e.clientX,e.clientY];details();};$(id).onpointerup=$(id).onpointercancel=()=>drag=null;}
}
function pickInitial(){let best=-Infinity;for(let y=Math.floor(meta.height*28/109);y<meta.height*65/109;y++)for(let x=Math.floor(meta.width*25/91);x<meta.width*65/91;x++){const v=voxel(y*meta.width+x);if(v[0]!==1)continue;const c=coeff(v,3000);if(basisSphere.some((b,i)=>i%12===0 && (dot(c,b)<0 || dot(c,b)>1)))continue;const anis=Array.from(v.subarray(8,13)).reduce((s,c)=>s+c*c,0),score=anis-.002*((x*91/meta.width-45)**2+(y*109/meta.height-43)**2);if(score>best){best=score;state.x=x;state.y=y;}}}
async function init(){try{const responses=await Promise.all([fetch('data/phantom.json',{cache:'no-store'}),fetch('data/phantom.bin',{cache:'no-store'}),fetch('data/tensor.bin',{cache:'no-store'})]);if(responses.some(r=>!r.ok))throw new Error('Could not load phantom files');meta=await responses[0].json();data=new Float32Array(await responses[1].arrayBuffer());tensorData=new Float32Array(await responses[2].arrayBuffer());if(tensorData.length!==meta.width*meta.height*8)throw new Error('Unexpected tensor data size');if(data.length!==meta.width*meta.height*meta.stride)throw new Error('Unexpected phantom data size');$('brain').width=meta.width*4;$('brain').height=meta.height*4;buildSphere();pickInitial();bind();$('lab').hidden=false;$('status').hidden=true;render();}catch(e){$('status').textContent='Unable to load the phantom. Serve this folder over HTTP and reload. '+e.message;}}
init();
