// Small bounded, uncompressed ZIP writer. Paths are authored by the application.
const encoder=new TextEncoder();
const table=Uint32Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=(n&1)?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
export function crc32(bytes){let n=0xffffffff;for(const b of bytes)n=table[(n^b)&255]^(n>>>8);return (n^0xffffffff)>>>0;}
export async function zipFiles(files){
 if(files.length>2000)throw new Error('Too many export files');
 const local=[],central=[];let offset=0;
 for(const {name,data}of files){if(!/^[\w./-]+$/.test(name)||name.includes('..')||name.startsWith('/'))throw new Error('Unsafe export path');
  const path=encoder.encode(name),bytes=typeof data==='string'?encoder.encode(data):data instanceof Blob?new Uint8Array(await data.arrayBuffer()):new Uint8Array(data.buffer||data,data.byteOffset||0,data.byteLength);
  if(bytes.length>128*1024*1024||offset+bytes.length>160*1024*1024)throw new Error('Export size limit');
  const crc=crc32(bytes),h=new Uint8Array(30),v=new DataView(h.buffer);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint16(12,0x5821,true);v.setUint32(14,crc,true);v.setUint32(18,bytes.length,true);v.setUint32(22,bytes.length,true);v.setUint16(26,path.length,true);
  local.push(h,path,bytes);const c=new Uint8Array(46),d=new DataView(c.buffer);d.setUint32(0,0x02014b50,true);d.setUint16(4,20,true);d.setUint16(6,20,true);d.setUint16(8,0x800,true);d.setUint16(14,0x5821,true);d.setUint32(16,crc,true);d.setUint32(20,bytes.length,true);d.setUint32(24,bytes.length,true);d.setUint16(28,path.length,true);d.setUint32(42,offset,true);central.push(c,path);offset+=h.length+path.length+bytes.length;
 }
 const centralSize=central.reduce((a,b)=>a+b.length,0),end=new Uint8Array(22),d=new DataView(end.buffer);d.setUint32(0,0x06054b50,true);d.setUint16(8,files.length,true);d.setUint16(10,files.length,true);d.setUint32(12,centralSize,true);d.setUint32(16,offset,true);return new Blob([...local,...central,end],{type:'application/zip'});
}
export function downloadBlob(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
