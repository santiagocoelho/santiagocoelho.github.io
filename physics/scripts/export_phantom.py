"""Export one axial slice from a generated BrainDiffusionPhantom (no full volumes).
Usage: python3 export_phantom.py /path/to/generated/phantom
Requires numpy, scipy, nibabel. SH coefficients retain MRtrix world RAS axes.
"""
from pathlib import Path
import argparse, json, sys
import numpy as np
import nibabel as nib
from numpy.polynomial.legendre import leggauss

parser = argparse.ArgumentParser()
parser.add_argument('source', type=Path)
parser.add_argument('--z-mm', type=float, default=18., help='Axial world z coordinate; nearest slice is exported')
parser.add_argument('--kernels', type=Path, default=Path('/Users/coelhs01/Git/ARMNEXI-phantom'))
parser.add_argument('--out', type=Path, default=Path(__file__).resolve().parents[1] / 'data')
args = parser.parse_args()
args.out.mkdir(parents=True, exist_ok=True)
names = ['label','b0','wm_f','wm_Da','wm_Da_perp','wm_De_par','wm_De_perp']
vols = [nib.as_closest_canonical(nib.load(args.source / (n+'.nii'))) for n in names]
fod = nib.as_closest_canonical(nib.load(args.source/'odf_sh.nii'))
assert all(v.shape == fod.shape[:3] and np.allclose(v.affine, fod.affine) for v in vols)
zindices = [int(np.clip(round((args.z_mm-fod.affine[2,3])/fod.affine[2,2]),0,fod.shape[2]-1))]
# Radiological view: world +R on image left; anterior at top.
def slices(v):
    a = np.asarray(v.dataobj, dtype=np.float32)
    return np.stack([a[::-1, ::-1, z].swapaxes(0,1) for z in zindices])
a = np.stack([slices(v) for v in vols], axis=-1)
sh = slices(fod)
mask = a[...,0] > 0
scale = np.percentile(a[...,1][mask], 99)
a[...,1] = np.clip(a[...,1]/scale,0,1)
c0 = sh[...,0].copy()
valid = c0 > .05*np.median(c0[a[...,0]==1])
sh /= np.maximum(c0[...,None],1e-10)*np.sqrt(4*np.pi)
sh[~valid] = 0
sh[~valid,0] = 1/np.sqrt(4*np.pi)
# Use the same verified WM / NEXI kernels as the phantom forward model.
sys.path.insert(0, str(args.kernels))
from armnexi_kernels import kl_wm, kl_gm
lab = a[...,0]
kernels = np.zeros((*lab.shape, 3, 4))
gm = [slices(nib.as_closest_canonical(nib.load(args.source/(n+'.nii')))) for n in ['gm_f_n','gm_Da','gm_De','gm_tau_ex']]
for si,b in enumerate([1.,2.,3.]):
    m = lab == 1
    kernels[m,si,:] = kl_wm(b,a[...,2][m],a[...,3][m],a[...,5][m],a[...,6][m],a[...,4][m],lmax=6)
    m = lab == 2
    kernels[m,si,:] = kl_gm(b,*(v[m] for v in gm),30.,lmax=6)
    kernels[lab==3,si,0] = np.exp(-b*3)
packed = np.concatenate([a,sh,kernels.reshape(*lab.shape,12)],axis=-1).astype('<f4')
assert np.isfinite(packed).all()
packed.tofile(args.out/'phantom.bin')
x,w = leggauss(32)
meta = dict(width=packed.shape[2],height=packed.shape[1],stride=packed.shape[3],slices=[dict(index=z,z_mm=float(fod.affine[2,2]*z+fod.affine[2,3])) for z in zindices],fields=names+['SH: 28 MRtrix coefficients, integral normalized to 1'],source='BrainDiffusionPhantom / '+args.source.name,shells=[1000,2000,3000],kernel_offset=35,resolution_mm=float(fod.header.get_zooms()[0]),quadrature=dict(x=x.tolist(),w=w.tolist()),b0_scale=float(scale),fallback_wm_voxels=int(np.sum(~valid & (a[...,0]==1))))
(args.out/'phantom.json').write_text(json.dumps(meta,indent=2)+'\n')
print(f'Exported {packed.shape}: {packed.nbytes/1e6:.2f} MB; isotropic fallback in {meta["fallback_wm_voxels"]} WM voxels')
