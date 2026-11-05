"""Check browser SH against SciPy and direct spherical convolution (numpy/scipy/node)."""
from pathlib import Path
import json, subprocess, argparse
import numpy as np
from scipy.special import sph_harm_y
from numpy.polynomial.legendre import leggauss
root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--data-dir',type=Path,default=root/'data');args=parser.parse_args()
meta=json.loads((args.data_dir/'phantom.json').read_text())
a=np.fromfile(args.data_dir/'phantom.bin',dtype='<f4').reshape(-1,meta['stride'])
# Evaluate production JS math without DOM or network, using node's VM.
js=r"""const fs=require('fs'),vm=require('vm');let src=fs.readFileSync(process.argv[1],'utf8').split('let plotResizeFrame=0;')[0];let ctx={};vm.createContext(ctx);vm.runInContext(src,ctx);const result=vm.runInContext(`JSON.stringify([[1,0,0],[0,1,0],[0,0,1],[.6,0,.8]].map(shBasis))`,ctx);console.log(result);"""
actual=np.array(json.loads(subprocess.check_output(['node','-e',js,str(root/'diffSim.js')],text=True)))
dirs=np.array([[1,0,0],[0,1,0],[0,0,1],[.6,0,.8]])
def basis(d):
 t=np.arccos(d[:,2]);p=np.arctan2(d[:,1],d[:,0]);out=[]
 for l in [0,2,4,6]:
  for m in range(-l,l+1):
   y=sph_harm_y(l,abs(m),t,p)
   out.append(y.imag*np.sqrt(2) if m<0 else y.real*(np.sqrt(2) if m else 1))
 return np.array(out).T
np.testing.assert_allclose(actual,basis(dirs),atol=2e-14)
# Independent product quadrature of P(n)*K(g.n), no SH convolution formula.
z,w=leggauss(48);phi=np.arange(96)*2*np.pi/96
zz,pp=np.meshgrid(z,phi,indexing='ij');sphere=np.stack([np.sqrt(1-zz**2)*np.cos(pp),np.sqrt(1-zz**2)*np.sin(pp),zz],axis=-1).reshape(-1,3)
weights=np.repeat(w,96)*2*np.pi/96;Y=basis(sphere);ix=np.repeat(np.arange(4),[1,5,9,13]);maxerr=0
for v in a[a[:,0]==1][::max(1,(a[:,0]==1).sum()//12)]:
 fod=Y@v[7:35]
 for si,b in enumerate([1,2,3]):
  x2=(sphere@dirs.T)**2;f,da,dap,dep,depp=v[2:7]
  kernel=f*np.exp(-b*(da*x2+dap*(1-x2)))+(1-f)*np.exp(-b*(dep*x2+depp*(1-x2)))
  direct=(fod*weights)@kernel
  sh=basis(dirs)@(4*np.pi*v[7:35]*v[35+si*4:39+si*4][ix])
  maxerr=max(maxerr,float(np.max(abs(direct-sh))))
  np.testing.assert_allclose(direct,sh,atol=3e-7)
for si,b in enumerate([1,2,3]):
 csf=a[a[:,0]==3,35+si*4:39+si*4]
 np.testing.assert_allclose(csf[:,0],np.exp(-3*b),rtol=1e-6)
 assert np.all(csf[:,1:]==0)
assert np.isfinite(a).all()
print(f'PASS: JS basis agrees with SciPy; WM direct convolution max error {maxerr:.2g}; all 3 CSF shells correct; finite export.')
