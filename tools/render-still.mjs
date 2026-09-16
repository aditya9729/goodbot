import fs from 'node:fs';
import { WASM } from '../public/src/raster-data.js';
import { buildRoom,dynamicRoom } from '../public/src/hotel3d.js';
import { Game } from '../public/src/game.js';
const {exports:e}=new WebAssembly.Instance(new WebAssembly.Module(Buffer.from(WASM,'base64')));
const game=new Game();const {builder:b,m}=buildRoom(game.scene);dynamicRoom(b,m,game);
const vertices=new Float32Array(e.memory.buffer,e.vertices(),e.maxVertices()*9);vertices.set(b.v);new Float32Array(e.memory.buffer,e.materials(),512).set(b.materials);
const camera=process.argv.slice(2,8).map(Number),cfg=new Float32Array(e.memory.buffer,e.config(),32);cfg.set(camera.length===6?camera:[10.7,3.15,9.6,4.8,1.25,3.4]);cfg[6]=.5/Math.tan(57*Math.PI/360);cfg[7]=1.8;
console.time('raster');e.render(b.v.length/27,1100,760,1,1);console.timeEnd('raster');const pix=new Uint8Array(e.memory.buffer,e.image(),1100*760*4);const rgb=Buffer.alloc(1100*760*3);for(let i=0;i<1100*760;i++)rgb.set(pix.subarray(i*4,i*4+3),i*3);fs.writeFileSync('../evidence/first.ppm',Buffer.concat([Buffer.from('P6\n1100 760\n255\n'),rgb]));console.log('triangles',b.v.length/27,'vbytes',b.v.length*4);
