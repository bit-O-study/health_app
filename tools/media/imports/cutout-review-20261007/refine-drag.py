from pathlib import Path
import hashlib
import importlib.util
import numpy as np
from scipy.ndimage import label
from PIL import Image
spec=importlib.util.spec_from_file_location('cutout', 'tools/media/motion-cutout.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
source=Path('tools/media/motion-guides/drag-curl.jpg')
sha=hashlib.sha256(source.read_bytes()).hexdigest()[:12]
base=Path('tools/media/imports/cutout-review-20261007/local')
dest=base/'drag-curl-refined/tools/media/motion-guides/drag-curl/cut'/('u2netp-'+sha)
dest.mkdir(parents=True,exist_ok=True)
with Image.open(source) as sheet:
 for i,box in enumerate(m.panel_boxes(*sheet.size,8)):
  original=np.array(sheet.crop(box).convert('RGB'))
  with Image.open(base/'drag-curl/tools/media/motion-guides/drag-curl/cut'/('u2netp-'+sha)/(str(i+1)+'.png')) as cut:
   rgba=np.array(cut)
  # Asset-specific white studio cleanup; preserve enclosed white shoes below ankles.
  white=(original.min(axis=2)>225)&(np.ptp(original.astype(int),axis=2)<22)
  components,n=label(white)
  border=np.unique(np.concatenate([components[0],components[-1],components[:,0],components[:,-1]]))
  remove=np.isin(components,border[border>0])
  for component in range(1,n+1):
   ys,xs=np.where(components==component)
   if len(ys)>35 and ys.max()<int(original.shape[0]*.80):remove[ys,xs]=True
  rgba[remove,3]=0
  Image.fromarray(rgba).save(dest/(str(i+1)+'.png'))
print('Refined 8 candidate alpha panels; original files unchanged')
