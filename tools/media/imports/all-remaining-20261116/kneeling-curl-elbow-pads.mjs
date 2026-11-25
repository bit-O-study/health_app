const elbowPads=['L','R'].map(side=>{const e=world('lowerarm01.'+side),p=box([1.5,.4,1.7],[e.x,0,e.z],pad);return {side,p};});
function elbowMinimum(item){let value=Infinity;for(let i=0;i<model.vertices.length/3;i++){const p=sample(i);if(Math.abs(p.x-item.p.position.x)<.75&&Math.abs(p.z-item.p.position.z)<.85&&p.y>1.5&&p.y<4.5)value=Math.min(value,p.y);}return value;}
for(const item of elbowPads){item.p.position.y=elbowMinimum(item)-.215;rod([item.p.position.x,-9,item.p.position.z],[item.p.position.x,item.p.position.y-.2,item.p.position.z],.18);}
const originalGeometry=window.inspectGeometry;window.inspectGeometry=frame=>{const result=originalGeometry(frame);return {...result,elbowGaps:elbowPads.map(item=>elbowMinimum(item)-item.p.position.y-.2)};};
window.renderSkinned(0);
