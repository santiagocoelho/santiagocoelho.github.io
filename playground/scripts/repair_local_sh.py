from pathlib import Path
import json,argparse
import numpy as np,nibabel as nib
from scipy.special import sph_harm_y
parser=argparse.ArgumentParser();parser.add_argument('--source',type=Path,required=True);parser.add_argument('--data-dir',type=Path,required=True);parser.add_argument('--out',type=Path,required=True);args=parser.parse_args();root=args.source;src=args.data_dir;out=args.out;assert src.resolve()!=out.resolve();out.mkdir(exist_ok=True,parents=True)
m=json.loads((src/'phantom.json').read_text());a=np.fromfile(src/'phantom.bin',dtype='<f4').reshape(-1,47);old=a.copy();n=20000;z=1-2*(np.arange(n)+.5)/n;phi=np.arange(n)*np.pi*(3-np.sqrt(5));Y=np.array([(lambda v:v.imag*np.sqrt(2) if k<0 else v.real*(np.sqrt(2) if k else 1))(sph_harm_y(l,abs(k),np.arccos(z),phi)) for l in [0,2,4,6] for k in range(-l,l+1)]).T
# Uniformly scale all anisotropic SH coefficients, retaining each voxel's angular extrema.
# Choose the largest alpha satisfying positive, bounded, shell-monotone signals.
bands=np.repeat(np.arange(4),[1,5,9,13]);alphas=np.ones(len(a))
for i in np.flatnonzero(a[:,0]==1):
 prevmean=1.;prevangular=np.zeros(n);alpha=1.
 for si in range(3):
  c=4*np.pi*a[i,7:35]*a[i,35+si*4:39+si*4][bands];mean=c[0]/np.sqrt(4*np.pi);angular=Y[:,1:]@c[1:]
  lo=angular<0;hi=angular>0
  if lo.any():alpha=min(alpha,float(np.min((mean-1e-6)/(-angular[lo]))))
  if hi.any():alpha=min(alpha,float(np.min((1-mean)/angular[hi])))
  diff=angular-prevangular;pos=diff>0
  if pos.any():alpha=min(alpha,float(np.min((prevmean-mean)/diff[pos])))
  prevmean=mean;prevangular=angular
 if alpha<1:alpha=max(0,alpha*.999);a[i,8:35]*=alpha
 alphas[i]=alpha
# Ensure positive tensor fits too; additional within-voxel shrinkage only where required.
mesh=json.loads((Path(__file__).resolve().parents[1]/'sphere500.js').read_text().split('const SH_MESH = ')[1].rstrip(';\n'));g=np.array(mesh['verts']);x,y,z=g.T;X=np.c_[x*x,y*y,z*z,2*x*y,2*x*z,2*y*z];pinv=np.linalg.pinv(X);B=np.array([(lambda v:v.imag*np.sqrt(2) if k<0 else v.real*(np.sqrt(2) if k else 1))(sph_harm_y(l,abs(k),np.arccos(z),np.arctan2(y,x))) for l in [0,2,4,6] for k in range(-l,l+1)]).T
for i in np.flatnonzero(a[:,0]==1):
 c=4*np.pi*old[i,7:35]*old[i,35:39][bands];mean=c[0]/np.sqrt(4*np.pi);angular=B[:,1:]@c[1:]
 def ok(alpha):
  s=mean+alpha*angular
  if np.any(s<=0):return False
  xx,yy,zz,xy,xz,yz=pinv@(-np.log(s));return np.linalg.eigvalsh([[xx,xy,xz],[xy,yy,yz],[xz,yz,zz]])[0]>=.001
 if not ok(alphas[i]):
  lo=0.;hi=alphas[i]
  for _ in range(32):
   mid=(lo+hi)/2
   if ok(mid):lo=mid
   else:hi=mid
  alphas[i]=lo*.999;a[i,8:35]=old[i,8:35]*alphas[i]
a.tofile(out/'phantom.bin');np.save(out/'anisotropy_scale.npy',alphas);m['local_repair']={'method':'Within-voxel isotropic mixing; common scale for all l>0 SH, angular extrema unchanged','changed':int((alphas<1).sum()),'min_scale':float(alphas.min())};(out/'phantom.json').write_text(json.dumps(m,indent=2));print(m['local_repair']);print('Changed alpha percentiles',np.percentile(alphas[alphas<1],[0,25,50,75,100]))
zi=m['slices'][0]['index'];fod=nib.as_closest_canonical(nib.load(root/'odf_sh.nii'));v=np.asarray(fod.dataobj[:,:,zi,:]).copy();scale=alphas.reshape(m['height'],m['width']).T[::-1,::-1];v[:,:,1:]*=scale[:,:,None];aff=fod.affine.copy();aff[:3,3]=(fod.affine@np.array([0,0,zi,1]))[:3];nib.save(nib.Nifti1Image(v[:,:,None,:].astype('f4'),aff),root/f'odf_sh_local_repair_slice{zi}.nii.gz')
