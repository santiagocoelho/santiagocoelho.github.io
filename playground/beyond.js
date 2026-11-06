'use strict';

const byId = id => document.getElementById(id);
const samples = 256;
const perpendicular = 0.3;
const anisotropy = 1.5;

// For isotropically oriented axes, the absolute cosine to a fixed axis is uniform on [0,1].
const apparent = Array.from({length: samples}, (_, i) => {
  const cosine = (i + 0.5) / samples;
  return perpendicular + anisotropy * cosine * cosine;
});
const diffusivities = {
  LTE: apparent,
  PTE: apparent.map(d => perpendicular + (anisotropy - (d - perpendicular)) / 2),
  STE: [perpendicular + anisotropy / 3]
};

function signal(values, b) {
  const weighting = b / 1000; // s/mm² to ms/µm²
  return values.reduce((sum, d) => sum + Math.exp(-weighting * d), 0) / values.length;
}

function svgElement(parent, name, attrs, label) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', name);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  if (label !== undefined) el.textContent = label;
  parent.appendChild(el);
}

for (let i = 0; i < 24; i++) {
  const x = 22 + (i % 8) * 39;
  const y = 18 + Math.floor(i / 8) * 34;
  const cosine = ((i * 7) % 24 + 0.5) / 24;
  const minor = 2.4, major = 14.4;
  // Project a prolate tensor glyph tilted out of the drawing plane.
  const projected = Math.sqrt(major ** 2 * (1 - cosine ** 2) + minor ** 2 * cosine ** 2);
  svgElement(byId('rods'), 'ellipse', {cx:x, cy:y, rx:projected, ry:minor,
    transform:'rotate(' + (i * 137.5) + ' ' + x + ' ' + y + ')', fill:'#2563c9'});
  svgElement(byId('balls'), 'circle', {cx:x, cy:y, r:8 * (perpendicular + anisotropy * cosine ** 2), fill:'#a34716'});
}

const X = b => 49 + 478 * b / 3000;
let logScale = true;
function Y(s) {
  const fraction = logScale ? Math.log(s / 0.05) / Math.log(20) : s;
  return 196 - 174 * fraction;
}
function drawAxes() {
  const axes = byId('axes');
  axes.replaceChildren();
  const ticks = logScale ? [0.05, 0.1, 0.2, 0.5, 1] : [0, 0.25, 0.5, 0.75, 1];
  for (const tick of ticks) {
    svgElement(axes, 'line', {x1:X(0), x2:X(3000), y1:Y(tick), y2:Y(tick), stroke:'#dfe6ee'});
    svgElement(axes, 'text', {x:40, y:Y(tick)+5, 'text-anchor':'end'}, tick);
  }
  for (const b of [0, 1000, 2000, 3000]) {
    svgElement(axes, 'text', {x:X(b), y:217, 'text-anchor':'middle'}, b);
  }
  svgElement(axes, 'text', {x:10, y:13}, 'S/S₀');
  svgElement(axes, 'text', {x:288, y:239, 'text-anchor':'middle'}, 'b (s/mm²)');
}

function curve(values) {
  return Array.from({length:121}, (_, i) => {
    const b = i * 25;
    return (i ? 'L' : 'M') + X(b) + ' ' + Y(signal(values, b));
  }).join(' ');
}

const lessons = {
  LTE: 'Linear encoding probes one direction. The diffusivities it samples have the same distribution in both voxels, so their signals overlap.',
  PTE: 'Planar encoding averages diffusion along two axes within each compartment. This narrows the spread of apparent diffusivities in A. In B, every direction within a compartment is equivalent.',
  STE: 'Spherical encoding probes each compartment’s mean diffusivity. All compartments in A share one mean, while B contains a mixture of slow and fast means.'
};
let shape = 'LTE';

function updateMarker() {
  const b = Number(byId('weight').value);
  byId('weightValue').textContent = b + ' s/mm²';
  byId('cursor').setAttribute('x1', X(b));
  byId('cursor').setAttribute('x2', X(b));
  for (const [voxel, values] of [['A', diffusivities[shape]], ['B', apparent]]) {
    const s = signal(values, b);
    byId('signal' + voxel).textContent = s.toFixed(3);
    byId('point' + voxel).setAttribute('cx', X(b));
    byId('point' + voxel).setAttribute('cy', Y(s));
  }
}

function updatePlot() {
  logScale = document.querySelector('input[name="scale"]:checked').value === 'log';
  drawAxes();
  byId('curveB').setAttribute('d', curve(apparent));
  shape = document.querySelector('input[name="shape"]:checked').value;
  byId('curveA').setAttribute('d', curve(diffusivities[shape]));
  byId('lesson').textContent = lessons[shape];
  updateMarker();
}
document.querySelectorAll('input[type="radio"]').forEach(input => input.addEventListener('change', updatePlot));
byId('weight').addEventListener('input', updateMarker);
updatePlot();
