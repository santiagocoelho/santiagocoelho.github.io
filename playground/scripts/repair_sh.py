"""Stage an SH-only neighbor repair of the exported slice; never overwrite inputs.
Interpolate normalized fODF SH within tissue type, retaining all tissue parameters.
"""
from pathlib import Path
import argparse,json
import numpy as np
from scipy.special import sph_harm_y
from scipy.spatial import cKDTree
import nibabel as nib
P=argparse.ArgumentParser();P.add_argument('--data-dir',type=Path,required=True);P.add_argument('--source',type=Path,required=True);P.add_argument('--out',type=Path,required=True);args=P.parse_args()
assert args.out.resolve()!=args.data_dir.resolve()
args.out.mkdir(exist_ok=True,parents=True)
m=json.loads((args.data_dir/'phantom.json').read_text());a=np.fromfile(args.data_dir/'phantom.bin',dtype='<f4').reshape(-1,m['stride']);original=a.copy();bands=np.repeat(np.arange(4),[1,5,9,13])
def basis(n,offset=.5):
 z=1-2*(np.arange(n)+offset)/n;phi=np.arange(n)*np.pi*(3-np.sqrt(5));g=np.c_[np.sqrt(1-z*z)*np.cos(phi),np.sqrt(1-z*z)*np.sin(phi),z]
 Y=np.array([((lambda q:q.imag*np.sqrt(2) if k<0 else q.real*(np.sqrt(2) if k else 1))(sph_harm_y(l,abs(k),np.arccos(z),phi))) for l in [0,2,4,6] for k in range(-l,l+1)]).T
 return g,Y
G,Y=basis(2000);x,y,z=G.T;X=np.c_[x*x,y*y,z*z,2*x*y,2*x*z,2*y*z];pinv=np.linalg.pinv(X)
_,extra=basis(5000,.37);Y=np.concatenate([Y,extra])
def valid(sh,v,basis=Y,check_tensor=True):
 sh=np.atleast_2d(sh);ok=np.ones(len(sh),bool);prev=np.ones((len(sh),len(basis)));first=None
 for si in range(3):
  S=(4*np.pi*sh*v[35+si*4:39+si*4][bands])@basis.T
  ok&=np.all((S>1e-7)&(S<=1+1e-6)&(S<=prev+1e-6),axis=1);prev=S
  if si==0:first=S
 if check_tensor:
  co=-np.log(np.maximum(first[:,:len(G)],1e-12))@pinv.T;D=np.zeros((len(sh),3,3));D[:,0,0]=co[:,0];D[:,1,1]=co[:,1];D[:,2,2]=co[:,2];D[:,0,1]=D[:,1,0]=co[:,3];D[:,0,2]=D[:,2,0]=co[:,4];D[:,1,2]=D[:,2,1]=co[:,5];ok&=np.linalg.eigvalsh(D)[:,0]>1e-5
 return ok
# Evaluate each voxel with its own response, in bounded batches.
def audit(arr,basis,check_tensor):
 bad=[]
 for i in np.flatnonzero(arr[:,0]):
  if not valid(arr[i,7:35],arr[i],basis,check_tensor)[0]:bad.append(i)
 return np.array(bad,dtype=int)
bad=audit(a,Y,True);print('Affected voxels:',len(bad),flush=True)
xy=np.c_[np.arange(len(a))%m['width'],np.arange(len(a))//m['width']];badmask=np.zeros(len(a),bool);badmask[bad]=True
max_distance=0;repaired=[]
for lab in [1,2,3]:
 donors=np.flatnonzero((a[:,0]==lab)&~badmask);targets=bad[a[bad,0]==lab]
 if not len(targets):continue
 tree=cKDTree(xy[donors])
 for i in targets:
  # Candidates must also yield valid signals under the recipient's unchanged response.
  success=False
  for k in [16,64,256,len(donors)]:
   dist,nn=tree.query(xy[i],k=min(k,len(donors)));dist=np.atleast_1d(dist);ids=donors[np.atleast_1d(nn)];keep=valid(original[ids,7:35],a[i]);ids=ids[keep][:8];dist=dist[keep][:8]
   if not len(ids):continue
   weights=1/np.maximum(dist,1e-6)**2;weights/=weights.sum();candidate=weights@original[ids,7:35]
   if valid(candidate,a[i])[0]:success=True;break
  if not success:raise RuntimeError(f'No valid neighbor interpolation for voxel {i}')
  a[i,7:35]=candidate;max_distance=max(max_distance,float(dist.max()));repaired.append(dict(index=int(i),donors=ids.tolist(),weights=weights.tolist()))
print('Checking independent 10000-direction grid...',flush=True)
_,Ycheck=basis(10000,.61);remaining=audit(a,Ycheck,False)
if len(remaining):raise RuntimeError(f'{len(remaining)} invalid voxels on independent grid: {remaining[:20]}')
assert np.array_equal(a[:,:7],original[:,:7]) and np.array_equal(a[:,35:],original[:,35:])
assert np.array_equal(a[~badmask],original[~badmask])
a.astype('<f4').tofile(args.out/'phantom.bin');badmask.astype('u1').tofile(args.out/'repair-mask.bin')
m['sh_repair']=dict(method='Inverse-distance-squared interpolation of normalized fODF SH from up to 8 nearest valid same-tissue voxels; donors also validated with recipient response. Tissue parameters and b0 unchanged.',voxels=len(bad),max_donor_distance_voxels=max_distance,validation_directions=10000,original_data=str(args.data_dir),coefficients_file='odf_sh_repaired_slice_z18.nii.gz')
(args.out/'phantom.json').write_text(json.dumps(m,indent=2)+'\n');(args.out/'repair-report.json').write_text(json.dumps(dict(summary=m['sh_repair'],repairs=repaired),indent=2)+'\n')
# Save a one-slice coefficient image next to the original volume, in original SH units.
fod=nib.as_closest_canonical(nib.load(args.source/'odf_sh.nii'));zi=m['slices'][0]['index'];c0=np.asarray(fod.dataobj[:,:,zi,0]);sh=a[:,7:35].reshape(m['height'],m['width'],28).swapaxes(0,1)[::-1,::-1];sh=sh*(c0[...,None]*np.sqrt(4*np.pi));slice_original=np.asarray(fod.dataobj[:,:,zi,:]).copy();spatial_mask=badmask.reshape(m['height'],m['width']).T[::-1,::-1];slice_original[spatial_mask]=sh[spatial_mask];sh=slice_original;aff=fod.affine.copy();aff[:3,3]=(fod.affine@np.array([0,0,zi,1]))[:3];nib.save(nib.Nifti1Image(sh[:,:,None,:].astype('f4'),aff),args.source/'odf_sh_repaired_slice_z18.nii.gz')
print(json.dumps(m['sh_repair'],indent=2))
