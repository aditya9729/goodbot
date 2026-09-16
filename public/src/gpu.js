// Dependency-free WebGL2 renderer for the same authored geometry as the CPU path.
// Metallic/roughness GGX, filtered shadow map, procedural surfaces, filmic output.
// Environment fill is an approximation, not ray-traced global illumination.
export const VERTEX_SHADER = `#version 300 es
precision highp float;
layout(location=0) in vec3 position;
layout(location=1) in vec3 normal;
layout(location=2) in vec2 uv;
layout(location=3) in float code;
uniform vec3 eye, cameraR, cameraU, cameraF;
uniform vec3 lightR, lightU, lightF;
uniform float focal, aspect;
uniform int pass;
out vec3 world, N;
out vec2 tex;
flat out int matId;
flat out int instanceId;
out float axial;
void main(){
 world=position; N=normal; tex=uv; matId=int(code)%64; instanceId=int(code)/64;
 vec3 p=position-eye;axial=dot(p,cameraF);
 if(pass==1){vec3 q=position-vec3(6.,1.5,4.);gl_Position=vec4(dot(q,lightR)/9.5,dot(q,lightU)/9.5,-dot(q,lightF)/20.,1.);}
 else {float n=.06,f=65.;gl_Position=vec4(dot(p,cameraR)*focal/aspect,dot(p,cameraU)*focal,(f+n)/(f-n)*axial-2.*f*n/(f-n),axial);}
}`;
export const FRAGMENT_SHADER = `#version 300 es
precision highp float;
precision highp int;
in vec3 world,N;
in vec2 tex;
flat in int matId;
flat in int instanceId;
in float axial;
uniform vec4 material[128];
uniform vec3 eye,lightR,lightU,lightF;
uniform sampler2D shadowMap;
uniform int pass;
uniform float exposure;
out vec4 color;
const float PI=3.14159265;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float filteredSin(float t){return sin(t)*(1.-smoothstep(1.,5.,fwidth(t)));}
float visibility(vec3 p,float nl){
 vec3 q=p-vec3(6.,1.5,4.);vec2 uv=vec2(dot(q,lightR),dot(q,lightU))/19.+.5;
 float z=-dot(q,lightF)/40.+.5-(.0008+.0012*(1.-nl));
 if(any(lessThan(uv,vec2(.005)))||any(greaterThan(uv,vec2(.995))))return 1.;
 float v=0.;vec2 d=vec2(1./1536.);
 for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++)v+=z<=texture(shadowMap,uv+vec2(x,y)*d*1.25).r?1.:0.;
 return v/9.;
}
vec3 brdf(vec3 base,float metal,float rough,vec3 n,vec3 v,vec3 l){
 vec3 h=normalize(v+l);float nl=max(dot(n,l),0.),nv=max(dot(n,v),.001),nh=max(dot(n,h),0.),vh=max(dot(v,h),0.);
 float a=rough*rough,a2=a*a,d=a2/(PI*pow(nh*nh*(a2-1.)+1.,2.)+.00001);
 float k=pow(rough+1.,2.)/8.;float g=(nv/(nv*(1.-k)+k))*(nl/(nl*(1.-k)+k));
 vec3 f0=mix(vec3(.04),base,metal),f=f0+(1.-f0)*pow(1.-vh,5.);
 return ((1.-f)*(1.-metal)*base/PI+d*g*f/(4.*nv*max(nl,.001)))*nl;
}
void main(){
 vec4 a=material[matId*2],b=material[matId*2+1];int pat=int(b.y);
 if(pat==9)discard; // visual-only legacy contact shadow, never a contact or sensor hit.
 if(pass==1){if(b.z>1.)discard;color=vec4(1.);return;}
 if(pass==2){uint mm=uint(clamp(axial*1000.,1.,65535.)+.5);color=vec4(float(mm&255u),float(mm>>8),float(instanceId),255.)/255.;return;}
 vec3 n=normalize(N),v=normalize(eye-world);if(dot(n,v)<0.)n=-n;
 vec3 base=pow(a.rgb,vec3(2.2));float grain=1.;vec2 uv=tex*max(b.w,1.);
 if(pat==1)grain=.97+.022*filteredSin(uv.x*95.+sin(uv.y*1.6)*3.)+.014*filteredSin(uv.x*275.+sin(uv.y*2.)*4.);
 if(pat==2||pat==4)grain=.98+.01*(filteredSin(uv.x*240.)+filteredSin(uv.y*240.));
 if(pat==3)grain=.99+.014*hash(floor(uv*80.));base*=grain;
 float rough=clamp(a.w,.09,1.),metal=b.x,nl=max(dot(n,lightF),0.);
 vec3 radiance=brdf(base,metal,rough,n,v,lightF)*vec3(4.4,3.8,2.9)*visibility(world,nl);
 vec3 sky=mix(vec3(.14,.11,.09),vec3(.43,.49,.54),n.y*.5+.5);
 sky+=vec3(.16,.18,.19)*max(-n.z,0.);
 radiance+=base*sky*(1.-metal);
 vec3 f0=mix(vec3(.04),base,metal);float fres=pow(1.-max(dot(n,v),0.),5.);
 radiance+=(f0+(1.-f0)*fres)*mix(vec3(.11),vec3(.43,.48,.50),max(n.y,0.))*(1.-rough*.5);
 for(int i=0;i<2;i++){vec3 lp=i==0?vec3(.85,2.08,1.9):vec3(11.,2.12,1.25);vec3 d=lp-world;float d2=dot(d,d);radiance+=brdf(base,metal,rough,n,v,normalize(d))*vec3(5.,2.8,1.2)/(1.+d2*.8);}
 radiance+=base*b.z;radiance*=exposure;
 vec3 film=clamp((radiance*(2.51*radiance+.03))/(radiance*(2.43*radiance+.59)+.14),0.,1.);
 color=vec4(pow(film,vec3(1./2.2)),1.);
}`;
function normalize(a){const n=Math.hypot(...a)||1;return a.map(v=>v/n);}
function cross(a,b){return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
export class GPUCore {
 constructor(){
  this.canvas=document.createElement('canvas');const gl=this.gl=this.canvas.getContext('webgl2',{antialias:true,alpha:false,depth:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});
  if(!gl)throw new Error('WebGL2 unavailable');
  const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const msg=gl.getShaderInfoLog(s);gl.deleteShader(s);throw new Error(msg);}return s;};
  this.program=gl.createProgram();const vs=shader(gl.VERTEX_SHADER,VERTEX_SHADER),fs=shader(gl.FRAGMENT_SHADER,FRAGMENT_SHADER);gl.attachShader(this.program,vs);gl.attachShader(this.program,fs);gl.linkProgram(this.program);gl.deleteShader(vs);gl.deleteShader(fs);
  if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(this.program));
  this.uniforms=Object.fromEntries(['eye','cameraR','cameraU','cameraF','lightR','lightU','lightF','focal','aspect','pass','material[0]','shadowMap','exposure'].map(n=>[n,gl.getUniformLocation(this.program,n)]));
  this.staticMesh=this.mesh();this.dynamicMesh=this.mesh();this.light=normalize([-.27,.62,-.737]);this.lr=normalize(cross(this.light,[0,1,0]));this.lu=normalize(cross(this.lr,this.light));
  this.shadow=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.shadow);gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT24,1536,1536,0,gl.DEPTH_COMPONENT,gl.UNSIGNED_INT,null);this.texParams();
  this.shadowFbo=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,this.shadowFbo);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,this.shadow,0);gl.drawBuffers([gl.NONE]);gl.readBuffer(gl.NONE);this.assertFbo();gl.bindFramebuffer(gl.FRAMEBUFFER,null);
  this.lost=false;this.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.lost=true;});
 }
 assertFbo(){if(this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER)!==this.gl.FRAMEBUFFER_COMPLETE)throw new Error('Incomplete GPU target');}
 texParams(){const g=this.gl;g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.NEAREST);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.NEAREST);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);}
 mesh(){const g=this.gl,v=g.createVertexArray(),b=g.createBuffer();g.bindVertexArray(v);g.bindBuffer(g.ARRAY_BUFFER,b);for(const [i,size,offset]of [[0,3,0],[1,3,12],[2,2,24],[3,1,32]]){g.enableVertexAttribArray(i);g.vertexAttribPointer(i,size,g.FLOAT,false,36,offset);}g.bindVertexArray(null);return {v,b,count:0};}
 upload(mesh,array){const g=this.gl;g.bindBuffer(g.ARRAY_BUFFER,mesh.b);g.bufferData(g.ARRAY_BUFFER,new Float32Array(array),g.DYNAMIC_DRAW);mesh.count=array.length/9;}
 resize(w,h){if(this.w===w&&this.h===h)return;const g=this.gl;this.w=w;this.h=h;this.canvas.width=w;this.canvas.height=h;
  if(this.meta){g.deleteTexture(this.meta);g.deleteRenderbuffer(this.metaDepth);g.deleteFramebuffer(this.metaFbo);}
  this.meta=g.createTexture();g.bindTexture(g.TEXTURE_2D,this.meta);g.texImage2D(g.TEXTURE_2D,0,g.RGBA8,w,h,0,g.RGBA,g.UNSIGNED_BYTE,null);this.texParams();
  this.metaDepth=g.createRenderbuffer();g.bindRenderbuffer(g.RENDERBUFFER,this.metaDepth);g.renderbufferStorage(g.RENDERBUFFER,g.DEPTH_COMPONENT24,w,h);
  this.metaFbo=g.createFramebuffer();g.bindFramebuffer(g.FRAMEBUFFER,this.metaFbo);g.framebufferTexture2D(g.FRAMEBUFFER,g.COLOR_ATTACHMENT0,g.TEXTURE_2D,this.meta,0);g.framebufferRenderbuffer(g.FRAMEBUFFER,g.DEPTH_ATTACHMENT,g.RENDERBUFFER,this.metaDepth);this.assertFbo();g.bindFramebuffer(g.FRAMEBUFFER,null);
 }
 render(owner,staticMesh,dynamic,rebake){if(this.lost)throw new Error('GPU context lost');const g=this.gl,u=this.uniforms;this.resize(owner.rw,owner.rh);if(rebake)this.upload(this.staticMesh,staticMesh.v);this.upload(this.dynamicMesh,dynamic.v);
  g.useProgram(this.program);for(const [n,value]of [['eye',owner.eye],['cameraR',owner.R],['cameraU',owner.U],['cameraF',owner.F],['lightR',this.lr],['lightU',this.lu],['lightF',this.light]])g.uniform3fv(u[n],value);
  g.uniform1f(u.focal,1/Math.tan(owner.fov*Math.PI/360));g.uniform1f(u.aspect,this.w/this.h);g.uniform4fv(u['material[0]'],owner.materials);g.uniform1f(u.exposure,1.25);g.uniform1i(u.shadowMap,0);g.activeTexture(g.TEXTURE0);
  g.enable(g.DEPTH_TEST);g.depthFunc(g.LEQUAL);g.disable(g.CULL_FACE);g.disable(g.BLEND);g.disable(g.DITHER);
  const draw=()=>{for(const m of [this.staticMesh,this.dynamicMesh]){g.bindVertexArray(m.v);g.drawArrays(g.TRIANGLES,0,m.count);}};
  g.bindTexture(g.TEXTURE_2D,null);g.bindFramebuffer(g.FRAMEBUFFER,this.shadowFbo);g.viewport(0,0,1536,1536);g.clearDepth(1);g.clear(g.DEPTH_BUFFER_BIT);g.uniform1i(u.pass,1);draw();
  g.bindTexture(g.TEXTURE_2D,this.shadow);g.bindFramebuffer(g.FRAMEBUFFER,null);g.viewport(0,0,this.w,this.h);g.clearColor(.55,.62,.67,1);g.clear(g.COLOR_BUFFER_BIT|g.DEPTH_BUFFER_BIT);g.uniform1i(u.pass,0);draw();
  g.bindFramebuffer(g.FRAMEBUFFER,this.metaFbo);g.clearColor(0,0,0,0);g.clear(g.COLOR_BUFFER_BIT|g.DEPTH_BUFFER_BIT);g.uniform1i(u.pass,2);draw();g.bindFramebuffer(g.FRAMEBUFFER,null);g.bindVertexArray(null);
  const error=g.getError();if(error!==g.NO_ERROR)throw new Error('WebGL error '+error);
 }
 readPoint(x,y){const g=this.gl,a=new Uint8Array(4);g.bindFramebuffer(g.FRAMEBUFFER,this.metaFbo);g.readPixels(Math.min(this.w-1,Math.max(0,x)),Math.min(this.h-1,Math.max(0,this.h-1-y)),1,1,g.RGBA,g.UNSIGNED_BYTE,a);g.bindFramebuffer(g.FRAMEBUFFER,null);return {depth:(a[0]+256*a[1])/1000,instance:a[2]};}
 read(){const g=this.gl,n=this.w*this.h,rgb=new Uint8Array(n*4),meta=new Uint8Array(n*4);g.bindFramebuffer(g.FRAMEBUFFER,null);g.readPixels(0,0,this.w,this.h,g.RGBA,g.UNSIGNED_BYTE,rgb);g.bindFramebuffer(g.FRAMEBUFFER,this.metaFbo);g.readPixels(0,0,this.w,this.h,g.RGBA,g.UNSIGNED_BYTE,meta);g.bindFramebuffer(g.FRAMEBUFFER,null);
  const rgba=new Uint8ClampedArray(n*4),depth=new Float32Array(n),labels=new Uint16Array(n);for(let y=0;y<this.h;y++)for(let x=0;x<this.w;x++){const i=y*this.w+x,j=(this.h-1-y)*this.w+x;rgba.set(rgb.subarray(j*4,j*4+4),i*4);const d=meta[j*4]+256*meta[j*4+1];depth[i]=d?d/1000:NaN;labels[i]=meta[j*4+2];}return {rgba,depth,labels,width:this.w,height:this.h,depthQuantizationM:.001};
 }
 dispose(){const g=this.gl;for(const m of [this.staticMesh,this.dynamicMesh]){g.deleteVertexArray(m.v);g.deleteBuffer(m.b);}for(const t of [this.shadow,this.meta])if(t)g.deleteTexture(t);for(const f of [this.shadowFbo,this.metaFbo])if(f)g.deleteFramebuffer(f);if(this.metaDepth)g.deleteRenderbuffer(this.metaDepth);g.deleteProgram(this.program);}
}
