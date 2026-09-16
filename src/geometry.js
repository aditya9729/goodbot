// GOODBOT — reusable, renderer-independent 3D geometry. Apache-2.0.
export const sub=(a,b)=>a.map((v,i)=>v-b[i]);
export const add=(a,b)=>a.map((v,i)=>v+b[i]);
export const scale=(a,s)=>a.map(v=>v*s);
export const dot=(a,b)=>a.reduce((v,x,i)=>v+x*b[i],0);
export const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export const normalize=a=>scale(a,1/(Math.hypot(...a)||1));
export const rotateY=(p,a)=>[p[0]*Math.cos(a)+p[2]*Math.sin(a),p[1],-p[0]*Math.sin(a)+p[2]*Math.cos(a)];
export class MeshBuilder {
 constructor(){this.v=[];this.materials=[];this.instance=0;}
 material(hex,rough=.7,metal=0,pattern=0,emission=0,texScale=1){const n=parseInt(hex.slice(1),16),id=this.materials.length/8;this.materials.push((n>>16)/255,((n>>8)&255)/255,(n&255)/255,rough,metal,pattern,emission,texScale);return id;}
 tri(a,b,c,m,normals=null,uvs=null){let ns=normals||Array(3).fill(normalize(cross(sub(b,a),sub(c,a))));[a,b,c].forEach((p,i)=>this.v.push(...p,...ns[i],...(uvs?.[i]||[p[0],p[2]+p[1]]),m+64*this.instance));}
 quad(a,b,c,d,m,normal=null){this.tri(a,b,c,m,normal?Array(3).fill(normal):null);this.tri(a,c,d,m,normal?Array(3).fill(normal):null);}
 box(x,y,z,w,h,d,m,r=0,angle=0){
 const dims=[w,h,d],origin=[x,y,z],point=p=>add(origin,rotateY(p,angle));
 const sides=[[0,1,1,2],[0,-1,2,1],[1,1,2,0],[1,-1,0,2],[2,1,0,1],[2,-1,1,0]];
 r=Math.min(r,...dims.map(q=>q/2-.001));
 for(const [axis,sgn,u,v]of sides){const coords=k=>r>0?[-dims[k]/2,-dims[k]/2+r,dims[k]/2-r,dims[k]/2]:[-dims[k]/2,dims[k]/2];const us=coords(u),vs=coords(v);
 const vertex=(uu,vv)=>{let p=[0,0,0];p[axis]=sgn*dims[axis]/2;p[u]=uu;p[v]=vv;let n=[0,0,0];n[axis]=sgn;
 if(r>0){let inner=p.map((q,k)=>Math.max(-dims[k]/2+r,Math.min(dims[k]/2-r,q)));n=normalize(sub(p,inner));p=add(inner,scale(n,r));}return {p:point(p),n:rotateY(n,angle),uv:[uu,vv]};};
 for(let i=0;i<us.length-1;i++)for(let j=0;j<vs.length-1;j++){const a=vertex(us[i],vs[j]),b=vertex(us[i+1],vs[j]),c=vertex(us[i+1],vs[j+1]),dd=vertex(us[i],vs[j+1]);this.tri(a.p,b.p,c.p,m,[a.n,b.n,c.n],[a.uv,b.uv,c.uv]);this.tri(a.p,c.p,dd.p,m,[a.n,c.n,dd.n],[a.uv,c.uv,dd.uv]);}
 }
 }
 cylinder(x,y,z,r,h,m,segments=18,rTop=r){const p=(i,yy,rr)=>[x+Math.cos(i/segments*Math.PI*2)*rr,yy,z+Math.sin(i/segments*Math.PI*2)*rr],n=i=>normalize([Math.cos(i/segments*Math.PI*2),(r-rTop)/h,Math.sin(i/segments*Math.PI*2)]);
 for(let i=0;i<segments;i++){const a=p(i,y-h/2,r),b=p(i+1,y-h/2,r),c=p(i+1,y+h/2,rTop),d=p(i,y+h/2,rTop);
 this.tri(a,c,b,m,[n(i),n(i+1),n(i+1)]);this.tri(a,d,c,m,[n(i),n(i),n(i+1)]);this.tri([x,y+h/2,z],d,c,m,Array(3).fill([0,1,0]));this.tri([x,y-h/2,z],b,a,m,Array(3).fill([0,-1,0]));}}
 tube(a,b,r,m,segments=10){const dir=normalize(sub(b,a)),right=normalize(cross(dir,Math.abs(dir[1])>.9?[1,0,0]:[0,1,0])),up=normalize(cross(dir,right));const offset=i=>add(scale(right,r*Math.cos(i/segments*2*Math.PI)),scale(up,r*Math.sin(i/segments*2*Math.PI)));
 for(let i=0;i<segments;i++){const q=offset(i),s=offset(i+1),a0=add(a,q),a1=add(a,s),b0=add(b,q),b1=add(b,s),n0=normalize(q),n1=normalize(s);this.tri(a0,b0,b1,m,[n0,n0,n1]);this.tri(a0,b1,a1,m,[n0,n1,n1]);this.tri(a,a1,a0,m,Array(3).fill(scale(dir,-1)));this.tri(b,b0,b1,m,Array(3).fill(dir));}}
 sphere(x,y,z,w,h,d,m,nu=16,nv=10,power=1){const sp=t=>Math.sign(t)*Math.pow(Math.abs(t),power);const point=(u,v)=>{const a=u*2*Math.PI,b=v*Math.PI;let p=[w/2*sp(Math.sin(b)*Math.cos(a)),h/2*sp(Math.cos(b)),d/2*sp(Math.sin(b)*Math.sin(a))];const exponent=2/power-1;let n=normalize(p.map((c,i)=>{let size=[w,h,d][i]/2;return Math.sign(c)*Math.pow(Math.abs(c/size),exponent)/size;}));return {p:add([x,y,z],p),n};};
 for(let i=0;i<nu;i++)for(let j=0;j<nv;j++){const a=point(i/nu,j/nv),b=point((i+1)/nu,j/nv),c=point((i+1)/nu,(j+1)/nv),q=point(i/nu,(j+1)/nv);this.tri(a.p,b.p,c.p,m,[a.n,b.n,c.n]);this.tri(a.p,c.p,q.p,m,[a.n,c.n,q.n]);}}
 surface(fn,nu,nv,m){const p=(u,v)=>fn(u,v),vertex=(u,v)=>{const pt=p(u,v),du=sub(p(u+.0001,v),p(u-.0001,v)),dv=sub(p(u,v+.0001),p(u,v-.0001));return {p:pt,n:normalize(cross(dv,du)),uv:[u,v]};};
 for(let i=0;i<nu;i++)for(let j=0;j<nv;j++){const a=vertex(i/nu,j/nv),b=vertex((i+1)/nu,j/nv),c=vertex((i+1)/nu,(j+1)/nv),d=vertex(i/nu,(j+1)/nv);this.tri(a.p,c.p,b.p,m,[a.n,c.n,b.n],[a.uv,c.uv,b.uv]);this.tri(a.p,d.p,c.p,m,[a.n,d.n,c.n],[a.uv,d.uv,c.uv]);}}
 lathe(x,y,z,profile,m,segments=20){for(let j=0;j<profile.length-1;j++){const[r0,y0]=profile[j],[r1,y1]=profile[j+1];for(let i=0;i<segments;i++){const vertex=(ii,r,h)=>{const a=ii/segments*Math.PI*2;return {p:[x+r*Math.cos(a),y+h,z+r*Math.sin(a)],n:normalize([(y1-y0)*Math.cos(a),r0-r1,(y1-y0)*Math.sin(a)])};};const a=vertex(i,r0,y0),b=vertex(i+1,r0,y0),c=vertex(i+1,r1,y1),d=vertex(i,r1,y1);this.tri(a.p,c.p,b.p,m,[a.n,c.n,b.n]);this.tri(a.p,d.p,c.p,m,[a.n,d.n,c.n]);}}}
 append(other){this.v.push(...other.v);}
}
