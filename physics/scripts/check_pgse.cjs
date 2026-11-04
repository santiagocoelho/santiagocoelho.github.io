const assert=require('node:assert/strict');
const {simulate,bValue,gaussianEcho,reflect,normalizeDirection}=require('../pgse-engine.js');
const p={delta:15,Delta:40,g:40,direction:[1,0,0],parallel:2,perp:.3,radius:6,intrinsic:2};
const end=r=>r.frames.at(-1);
const zero=simulate({...p,g:0});for(const f of zero.frames)for(const k of ['free','disk'])assert.equal(f[k].magnitude,1);
const stationary=simulate({...p,parallel:0,perp:0,intrinsic:0});assert(Math.abs(end(stationary).free.magnitude-1)<1e-12);assert(Math.abs(end(stationary).disk.magnitude-1)<1e-12);assert(stationary.frames.some(f=>f.free.magnitude<.95));
assert(Math.abs(bValue({...p,g:80})/bValue(p)-4)<1e-12);
assert(gaussianEcho({...p,direction:[0,1,0]})>gaussianEcho(p));
const gaussian=simulate(p,{N:12000});assert(Math.abs(end(gaussian).free.magnitude-gaussian.analytic)<.025);
for(const f of gaussian.frames)for(let i=0;i<f.disk.points.length;i+=3)assert(Math.hypot(f.disk.points[i],f.disk.points[i+1])<=p.radius+1e-9);
const coarse=simulate(p,{N:6000,dt:.1}),fine=simulate(p,{N:6000,dt:.05});assert(Math.abs(end(coarse).disk.magnitude-end(fine).disk.magnitude)<.035);
const open=simulate({...p,radius:100,parallel:2,perp:2},{N:6000});assert(Math.abs(end(open).disk.magnitude-open.analytic)<.05);
for(const [x,y,dx,dy,R] of [[0,0,5,0,3],[3,0,2,1,3],[-2,1,-4,3,3]])assert(Math.hypot(...reflect(x,y,dx,dy,R))<=R+1e-9);
console.log('PASS: no gradients, stationary refocusing, b ∝ G², Gaussian analytic agreement, reflecting boundaries, timestep comparison and large-circle limit.');

const n=normalizeDirection([1,1,1]);for(const v of n)assert(Math.abs(v-1/Math.sqrt(3))<1e-14);
assert.throws(()=>normalizeDirection([0,0,0]));assert.throws(()=>normalizeDirection([1,NaN,0]));
assert(Math.abs(gaussianEcho({...p,direction:[1,1,1]})-Math.exp(-bValue(p)*(2+.3+.3)/3000))<1e-14);
const z=simulate({...p,direction:[0,0,1]},{N:12000});assert(Math.abs(end(z).free.magnitude-z.analytic)<.025);assert(Math.abs(end(z).disk.magnitude-Math.exp(-bValue(p)*p.intrinsic/1000))<.025);
const neg=simulate({...p,direction:[-1,0,0]});assert(Math.abs(end(neg).free.magnitude-end(simulate(p)).free.magnitude)<1e-12);
for(const timing of [{delta:1,Delta:2},{delta:30,Delta:31},{delta:30,Delta:100}]){const r=simulate({...p,...timing,g:200,direction:[1,1,1]});assert(r.frames.every(f=>Number.isFinite(f.free.magnitude)&&Number.isFinite(f.disk.magnitude)));}
console.log('PASS: normalized 3D directions, invalid input, z diffusion, sign symmetry and expanded timing/gradient endpoints.');
