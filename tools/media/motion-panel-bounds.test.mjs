import test from 'node:test';
import assert from 'node:assert/strict';
import { motionPanelBounds } from './motion-panel-bounds.mjs';

test('offset, thick grid dividers are excluded without cutting into the next pose',()=>{
 const width=400,height=400,data=Buffer.alloc(width*height*3,170);
 const xb=[[96,102],[197,204],[298,304]],yb=[[93,100],[196,202],[295,302]];
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  if(xb.some(([a,b])=>x>=a&&x<b)||yb.some(([a,b])=>y>=a&&y<b))data.fill(255,(y*width+x)*3,(y*width+x+1)*3);
 }
 const bounds=motionPanelBounds(data,width,height,3,4);
 assert.deepEqual(bounds[0],{left:4,top:4,width:88,height:85});
 assert.deepEqual(bounds[4],{left:4,top:104,width:88,height:88});
 assert.deepEqual(bounds[15],{left:308,top:306,width:88,height:90});
 for(const b of bounds)for(let y=b.top;y<b.top+b.height;y++)for(let x=b.left;x<b.left+b.width;x++)
  assert.equal(data[(y*width+x)*3],170,'white divider leaked into a pose');
});
test('borderless gray and broad white backgrounds retain equal-grid crops',()=>{
 for(const value of [170,255]){
  const bounds=motionPanelBounds(Buffer.alloc(400*200*3,value),400,200,3,2);
  assert.deepEqual(bounds[0],{left:4,top:4,width:92,height:92});
  assert.deepEqual(bounds[7],{left:304,top:104,width:92,height:92});
 }
});
