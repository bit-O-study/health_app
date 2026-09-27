// Locate narrow white dividers near the expected grid; plain backgrounds use equal cells.
export function motionPanelBounds(data,width,height,channels,rows) {
 const xCounts=new Uint32Array(width),yCounts=new Uint32Array(height);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const p=(y*width+x)*channels;
  if(data[p]>245&&data[p+1]>245&&data[p+2]>245){xCounts[x]++;yCounts[y]++;}
 }
 function bands(counts,cross,count) {
  const length=counts.length,result=[[0,0]];
  for(let i=1;i<count;i++){
   const expected=Math.round(i*length/count),radius=Math.max(2,Math.round(length/count*0.1));
   const low=Math.max(0,expected-radius),high=Math.min(length,expected+radius);
   const candidates=[];
   for(let p=low;p<high;p++){
    if(counts[p]<cross*0.9)continue;
    const start=p;
    while(p<high&&counts[p]>=cross*0.9)p++;
    // Ignore broad white background areas, including runs touching the search edge.
    if(start>low&&p<high&&p-start<=Math.max(2,length*0.025))candidates.push([start,p]);
   }
   candidates.sort((a,b)=>Math.abs((a[0]+a[1])/2-expected)-Math.abs((b[0]+b[1])/2-expected));
   result.push(candidates[0]??[expected,expected]);
  }
  result.push([length,length]);
  return result;
 }
 const xs=bands(xCounts,height,4),ys=bands(yCounts,width,rows);
 return Array.from({length:rows*4},(_,i)=>{
  const col=i%4,row=Math.floor(i/4);
  const left=xs[col][1]+4,top=ys[row][1]+4;
  return {left,top,width:xs[col+1][0]-4-left,height:ys[row+1][0]-4-top};
 });
}
