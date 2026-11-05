"""Fit log-linear DTI to the exported b1000 signal on 500 full-sphere directions.
Run after export_phantom.py. Diffusivities are in µm²/ms (b=1 ms/µm²).
Nonphysical shell samples are excluded; non-positive-definite fits are flagged.
"""
from pathlib import Path
import json, argparse
import numpy as np
from scipy.special import sph_harm_y
root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--data-dir',type=Path,default=root/'data');args=parser.parse_args();data_dir=args.data_dir
meta=json.loads((data_dir/'phantom.json').read_text())
a=np.fromfile(data_dir/'phantom.bin',dtype='<f4').reshape(-1,meta['stride'])
mesh=json.loads((root/'sphere500.js').read_text().split('const SH_MESH = ')[1].rstrip(';\n'))
g=np.array(mesh['verts']); x,y,z=g.T
X=np.c_[x*x,y*y,z*z,2*x*y,2*x*z,2*y*z]
Y=[]
for l in [0,2,4,6]:
 for m in range(-l,l+1):
  v=sph_harm_y(l,abs(m),np.arccos(z),np.arctan2(y,x))
  Y.append(v.imag*np.sqrt(2) if m<0 else v.real*(np.sqrt(2) if m else 1))
Y=np.array(Y).T
bands=np.repeat(np.arange(4),[1,5,9,13])
S=(4*np.pi*a[:,7:35]*a[:,35:39][:,bands])@Y.T
out=np.zeros((len(a),8),dtype='<f4')
for i in np.flatnonzero(a[:,0]):
 valid=(S[i]>0)&(S[i]<=1)&np.isfinite(S[i])
 if valid.sum()<28:continue
 coef,_,rank,_=np.linalg.lstsq(X[valid],-np.log(S[i,valid]),rcond=None)
 xx,yy,zz,xy,xz,yz=coef;D=np.array([[xx,xy,xz],[xy,yy,yz],[xz,yz,zz]])
 out[i,:6]=coef;out[i,6]=int(rank==6 and np.linalg.eigvalsh(D).min()>0)
 out[i,7]=500-valid.sum()
out.tofile(data_dir/'tensor.bin')
# Analytic isotropic check: CSF is D=3 in all directions.
csf=out[a[:,0]==3];np.testing.assert_allclose(csf[:,:3],3,atol=1e-6);np.testing.assert_allclose(csf[:,3:6],0,atol=1e-6)
print(f'DTI fits: {int(out[:,6].sum())} valid; {int(((a[:,0]>0)&(out[:,6]==0)).sum())} flagged; CSF D=3 check passed.')

# Direction-encoded color FA: RGB = FA * abs(principal eigenvector in RAS).
D=np.zeros((len(out),3,3));D[:,0,0]=out[:,0];D[:,1,1]=out[:,1];D[:,2,2]=out[:,2];D[:,0,1]=D[:,1,0]=out[:,3];D[:,0,2]=D[:,2,0]=out[:,4];D[:,1,2]=D[:,2,1]=out[:,5]
evals,evecs=np.linalg.eigh(D);den=(evals**2).sum(axis=1);fa=np.sqrt(1.5*((evals-evals.mean(axis=1)[:,None])**2).sum(axis=1)/np.maximum(den,1e-20));rgb=np.round(255*np.clip(fa,0,1)[:,None]*np.abs(evecs[:,:,-1])).astype('u1');rgb[out[:,6]==0]=0;rgb.tofile(data_dir/'color-fa.bin')
