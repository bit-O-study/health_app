const fs=require('node:fs');
const root='tools/media/imports/all-remaining-20261116';
for(const p of [root+'/horizontal-press-studio-tail.mjs',...['seated-leg-press-machine','horizontal-calf-raise-machine'].map(id=>root+'/horizontal-presses/'+id+'-studio.mjs')]){let s=fs.readFileSync(p,'utf8').replace('seat.position.y=contact.seatBottom-.34','seat.position.y=contact.seatBottom-.36');s=s.replace('plateTravel:plate.position.z-basePlateZ','plateTravel:plate.position.z-basePlateZ,cableLength:plate.position.z+.3+5+11.5+1+7-stack.position.y-.7');fs.writeFileSync(p,s);}
