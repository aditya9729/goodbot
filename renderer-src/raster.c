// GOODBOT Perspective renderer. Copyright 2026 Aditya Gudal. Apache-2.0.
// Dependency-free software rasterizer: perspective-correct attributes, depth,
// directional shadow map, procedural materials, per-pixel light and contact AO.
// This is a visual renderer, not a contact/physics simulation.
#define MAXV 160000
#define MAXW 1280
#define MAXH 960
#define SH 1024
static float verts[MAXV*9], mats[64*8], cfg[32];
static float depth[MAXW*MAXH], shadow[SH*SH];
static unsigned short labels[MAXW*MAXH],baseLabels[MAXW*MAXH];
static int currentLabel;
__attribute__((export_name("depthBuffer"))) unsigned depthBuffer(){return (unsigned)depth;}
__attribute__((export_name("labelBuffer"))) unsigned labelBuffer(){return (unsigned)labels;}
static unsigned char pixels[MAXW*MAXH*4];
static int W,H,SHADOW,shadowReady;
static unsigned shadowBuilds;
__attribute__((export_name("shadowBuildCount"))) unsigned shadowBuildCount(){return shadowBuilds;}
static float eye[3],R[3],U[3],F[3],LR[3],LU[3],L[3],focal;
static float maxf(float a,float b){return a>b?a:b;}
static float minf(float a,float b){return a<b?a:b;}
static float clamp(float a,float b,float c){return maxf(b,minf(c,a));}
static float absf(float x){return x<0?-x:x;}
static float sq(float x){return x*x;}
static float root(float x){return __builtin_sqrtf(x);}
static float floorf1(float x){int v=(int)x;return x<v?v-1:v;}
static float fract(float x){return x-floorf1(x);}
static float sn(float x){x-=floorf1((x+3.14159265f)/6.2831853f)*6.2831853f;float y=1.27323954f*x-.405284735f*x*absf(x);return .225f*(y*absf(y)-y)+y;}
static float noise(float x,float y){unsigned n=(unsigned)((int)floorf1(x)*374761393u+(int)floorf1(y)*668265263u);n=(n^(n>>13))*1274126177u;return (float)(n^(n>>16))*(1.0f/4294967295.0f);}
static float dot(float*a,float*b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];}
static void norm(float*v){float k=1.f/maxf(.00001f,root(dot(v,v)));for(int i=0;i<3;i++)v[i]*=k;}
static void cross(float*a,float*b,float*c){c[0]=a[1]*b[2]-a[2]*b[1];c[1]=a[2]*b[0]-a[0]*b[2];c[2]=a[0]*b[1]-a[1]*b[0];}
__attribute__((export_name("vertices"))) unsigned vertices(){return (unsigned)verts;}
__attribute__((export_name("materials"))) unsigned materials(){return (unsigned)mats;}
__attribute__((export_name("config"))) unsigned config(){return (unsigned)cfg;}
__attribute__((export_name("image"))) unsigned image(){return (unsigned)pixels;}
__attribute__((export_name("maxVertices"))) unsigned maxVertices(){return MAXV;}
static float edge(float ax,float ay,float bx,float by,float px,float py){return (px-ax)*(by-ay)-(py-ay)*(bx-ax);}
static void shadowTri(float*a,float*b,float*c){
 float v[3][3];float* ptr[3]={a,b,c};
 for(int i=0;i<3;i++){float p[3]={ptr[i][0]-6,ptr[i][1]-1.5f,ptr[i][2]-4};v[i][0]=(dot(p,LR)/19+.5f)*SH;v[i][1]=(-dot(p,LU)/19+.5f)*SH;v[i][2]=-dot(p,L);}
 float ar=edge(v[0][0],v[0][1],v[1][0],v[1][1],v[2][0],v[2][1]);if(absf(ar)<.00001f)return;
 int x0=(int)maxf(0,floorf1(minf(v[0][0],minf(v[1][0],v[2][0])))),x1=(int)minf(SH-1,maxf(v[0][0],maxf(v[1][0],v[2][0]))+1);
 int y0=(int)maxf(0,floorf1(minf(v[0][1],minf(v[1][1],v[2][1])))),y1=(int)minf(SH-1,maxf(v[0][1],maxf(v[1][1],v[2][1]))+1);
 for(int y=y0;y<=y1;y++)for(int x=x0;x<=x1;x++){
 float a0=edge(v[1][0],v[1][1],v[2][0],v[2][1],x+.5f,y+.5f)/ar,a1=edge(v[2][0],v[2][1],v[0][0],v[0][1],x+.5f,y+.5f)/ar,a2=1-a0-a1;
 if(a0<0||a1<0||a2<0)continue;float d=a0*v[0][2]+a1*v[1][2]+a2*v[2][2];int k=y*SH+x;if(d<shadow[k])shadow[k]=d;
 }
}
static float visibility(float*x,float nl){
 if(!SHADOW)return 1;float p[3]={x[0]-6,x[1]-1.5f,x[2]-4};int u=(int)((dot(p,LR)/19+.5f)*SH),v=(int)((-dot(p,LU)/19+.5f)*SH);
 if(u<4||u>=SH-4||v<4||v>=SH-4)return 1;float d=-dot(p,L)-(.021f+.027f*(1-nl));float sum=0;
 const int offsets[16][2]={{-3,-1},{-2,2},{0,3},{2,2},{3,0},{2,-2},{0,-3},{-2,-2},{-1,0},{0,1},{1,0},{0,-1},{-3,1},{1,3},{3,-1},{-1,-3}};
 for(int j=0;j<16;j++)sum+=d<=shadow[(v+offsets[j][1])*SH+u+offsets[j][0]]?1.f:0.f;
 return sum/16.f;
}
static void shade(float *p,float*n,float u,float v,int mi,unsigned char*out){
 norm(n);float *m=mats+mi*8;int pattern=(int)m[5];float t=m[7]>0?m[7]:1;u*=t;v*=t;
 if(pattern==9){float a=maxf(0,1-u*u-v*v);a=a*a*.32f;for(int i=0;i<3;i++)out[i]=(unsigned char)(out[i]*(1-a));out[3]=255;return;}
 float grain=1;
 if(pattern==1){float g=sn(u*95+sn(v*1.6f)*3+sn(v*13)*.18f);grain=.97f+.024f*g+.012f*sn(u*240+sn(v*3)*4);}
 else if(pattern==2){float k=noise(u*110,v*110);grain=.98f+.035f*(k-.5f)+.007f*(sn(u*230)+sn(v*230));}
 else if(pattern==3)grain=.985f+.025f*noise(u*70,v*70);
 else if(pattern==4)grain=.94f+.045f*noise(u*80,v*80)+.012f*sn(v*180)+.01f*sn(u*160);
 else if(pattern==5)grain=.95f+.04f*sn(v*450);
 else if(pattern==7)grain=.8f+.35f*clamp(v*.25f,0,1);
 float nl=maxf(0,dot(n,L)),vis=visibility(p,nl),ambient=.24f+.13f*maxf(0,n[1])+.075f*maxf(0,-n[2]);
 // Broad sky illumination plus warm window sunlight, two local luminaires.
 float lights[3]={ambient*.92f+nl*vis*1.45f,ambient*.98f+nl*vis*1.21f,ambient+nl*vis*.91f};
 float lp[2][3]={{.85f,2.08f,1.9f},{11.0f,2.12f,1.25f}};
 for(int j=0;j<2;j++){float q[3]={lp[j][0]-p[0],lp[j][1]-p[1],lp[j][2]-p[2]};float d=dot(q,q);norm(q);float a=.95f/(1+d*.9f)*maxf(0,dot(q,n));lights[0]+=a;lights[1]+=a*.68f;lights[2]+=a*.35f;}
 float V[3]={eye[0]-p[0],eye[1]-p[1],eye[2]-p[2]};norm(V);float half[3]={L[0]+V[0],L[1]+V[1],L[2]+V[2]};norm(half);
 float s=maxf(0,dot(half,n));s=sq(s);s=sq(s);s=sq(s);if(m[3]<.6f)s=sq(s);if(m[3]<.3f)s=sq(s);
 float spec=s*(1-m[3])*(.10f+m[4]*1.05f)*vis;
 float ambientMetal=m[4]*(.045f+.13f*sq(1-maxf(0,dot(n,V))));
 float ex=cfg[7]>0?cfg[7]:1.45f;
 for(int i=0;i<3;i++){float color=m[i]*m[i]*grain*(lights[i]+m[6])+spec*(m[4]>.3f?m[i]:1)+ambientMetal*m[i];color*=ex;float film=clamp((color*(2.51f*color+.03f))/(color*(2.43f*color+.59f)+.14f),0,1);out[i]=(unsigned char)(clamp(root(maxf(0,film))*255,0,255));}out[3]=255;
}
// Input polygon vertices carry world coordinates, normals and texture coordinates.
// The near-plane clipper handles the room/follow camera being inside the scene.
static void tri(float*a,float*b,float*c,int mi){
 float *q[3]={a,b,c};float s[3][3];
 for(int i=0;i<3;i++){float p[3]={q[i][0]-eye[0],q[i][1]-eye[1],q[i][2]-eye[2]};float z=dot(p,F);if(z<.05f)return;s[i][2]=1/z;s[i][0]=W*.5f+dot(p,R)*focal/z;s[i][1]=H*.5f-dot(p,U)*focal/z;}
 float ar=edge(s[0][0],s[0][1],s[1][0],s[1][1],s[2][0],s[2][1]);if(absf(ar)<.00001f)return;
 int x0=(int)maxf(0,floorf1(minf(s[0][0],minf(s[1][0],s[2][0])))),x1=(int)minf(W-1,maxf(s[0][0],maxf(s[1][0],s[2][0]))+1);
 int y0=(int)maxf(0,floorf1(minf(s[0][1],minf(s[1][1],s[2][1])))),y1=(int)minf(H-1,maxf(s[0][1],maxf(s[1][1],s[2][1]))+1);
 if(x1<x0||y1<y0)return;
 float da0=(s[2][1]-s[1][1])/ar,da1=(s[0][1]-s[2][1])/ar;
 for(int y=y0;y<=y1;y++){
 float a0=edge(s[1][0],s[1][1],s[2][0],s[2][1],x0+.5f,y+.5f)/ar,a1=edge(s[2][0],s[2][1],s[0][0],s[0][1],x0+.5f,y+.5f)/ar;
 for(int x=x0;x<=x1;x++,a0+=da0,a1+=da1){float a2=1-a0-a1;if(a0<-.00001f||a1<-.00001f||a2<-.00001f)continue;
 float iz=a0*s[0][2]+a1*s[1][2]+a2*s[2][2];int k=y*W+x;if(iz<=depth[k])continue;if((int)mats[mi*8+5]!=9){depth[k]=iz;labels[k]=(unsigned short)currentLabel;}
 float k0=a0*s[0][2]/iz,k1=a1*s[1][2]/iz,k2=a2*s[2][2]/iz,p[3],n[3];
 for(int i=0;i<3;i++){p[i]=a[i]*k0+b[i]*k1+c[i]*k2;n[i]=a[i+3]*k0+b[i+3]*k1+c[i+3]*k2;}
 shade(p,n,a[6]*k0+b[6]*k1+c[6]*k2,a[7]*k0+b[7]*k1+c[7]*k2,mi,pixels+k*4);
 }}
}
static void clipped(float*a,float*b,float*c,int mi){
 float input[3][9],out[5][9];float*ptr[3]={a,b,c};float zz[3];for(int i=0;i<3;i++){for(int j=0;j<9;j++)input[i][j]=ptr[i][j];float p[3]={ptr[i][0]-eye[0],ptr[i][1]-eye[1],ptr[i][2]-eye[2]};zz[i]=dot(p,F);}
 if(zz[0]>.06f&&zz[1]>.06f&&zz[2]>.06f){tri(a,b,c,mi);return;}
 int n=0;for(int i=0;i<3;i++){int j=(i+1)%3;int ai=zz[i]>=.06f,bi=zz[j]>=.06f;if(ai){for(int k=0;k<9;k++)out[n][k]=input[i][k];n++;}if(ai!=bi){float t=(.061f-zz[i])/(zz[j]-zz[i]);for(int k=0;k<9;k++)out[n][k]=input[i][k]+t*(input[j][k]-input[i][k]);n++;}}
 for(int i=1;i+1<n;i++)tri(out[0],out[i],out[i+1],mi);
}
__attribute__((export_name("render"))) void render(int n,int width,int height,int shadows,int ao){
 W=width;H=height;SHADOW=shadows;if(W<1||H<1||W>MAXW||H>MAXH||n<0||n*3>MAXV)return;
 float up[3]={0,1,0};for(int i=0;i<3;i++){eye[i]=cfg[i];F[i]=cfg[i+3]-eye[i];}norm(F);cross(F,up,R);norm(R);cross(R,F,U);norm(U);focal=H*cfg[6];
 L[0]=-.27f;L[1]=.62f;L[2]=-.737f;norm(L);cross(L,up,LR);norm(LR);cross(LR,L,LU);norm(LU);
 if(shadows==1||(shadows&&!shadowReady)){shadowReady=1;shadowBuilds++;for(int i=0;i<SH*SH;i++)shadow[i]=100000;for(int i=0;i<n;i++){float*a=verts+i*27;int mi=((int)a[8])%64;if(mats[mi*8+6]<1.0f)shadowTri(a,a+9,a+18);}}
 for(int y=0;y<H;y++)for(int x=0;x<W;x++){int k=y*W+x;depth[k]=0;labels[k]=0;pixels[k*4]=171+(int)(30.f*y/H);pixels[k*4+1]=184+(int)(22.f*y/H);pixels[k*4+2]=190+(int)(11.f*y/H);pixels[k*4+3]=255;}
 for(int i=0;i<n;i++){float*a=verts+i*27;currentLabel=((int)a[8])/64;clipped(a,a+9,a+18,((int)a[8])%64);}
 // Slope-compensated screen-space occlusion. Reciprocal depth is planar in
 // screen space; comparing raw z made flat walls acquire false triangle shadows.
 if(ao)for(int y=8;y<H-8;y++)for(int x=8;x<W-8;x++){
  int k=y*W+x;float z=depth[k];if(z<=0)continue;
  float al=z-depth[k-1],ar=depth[k+1]-z,au=z-depth[k-W],ad=depth[k+W]-z;
  float gx=absf(al)<absf(ar)?al:ar,gy=absf(au)<absf(ad)?au:ad,occ=0;
  const int xy[8][2]={{-6,0},{6,0},{0,-6},{0,6},{-4,-4},{4,-4},{-4,4},{4,4}};
  for(int j=0;j<8;j++){int dx=xy[j][0],dy=xy[j][1];float q=depth[k+dy*W+dx],expected=z+dx*gx+dy*gy;
   if(q<=0||expected<=0)continue;float dd=1/expected-1/q;if(dd>.028f&&dd<.6f)occ+=(1-dd/.6f);
  }
  float a=1-occ*.046f;for(int j=0;j<3;j++)pixels[k*4+j]=(unsigned char)(pixels[k*4+j]*a);
 }
}
void *memset(void *p,int v,unsigned n){unsigned char*q=p;for(unsigned i=0;i<n;i++)q[i]=(unsigned char)v;return p;}
static float baseDepth[MAXW*MAXH];
static unsigned char basePixels[MAXW*MAXH*4];
__attribute__((export_name("bake"))) void bake(int n,int width,int height,int shadows,int ao){render(n,width,height,shadows,ao);for(int i=0;i<W*H;i++){baseDepth[i]=depth[i];baseLabels[i]=labels[i];}for(int i=0;i<W*H*4;i++)basePixels[i]=pixels[i];}
__attribute__((export_name("dynamic"))) void dynamic(int n){if(n<0||n*3>MAXV)return;for(int i=0;i<W*H;i++){depth[i]=baseDepth[i];labels[i]=baseLabels[i];}for(int i=0;i<W*H*4;i++)pixels[i]=basePixels[i];for(int i=0;i<n;i++){float*a=verts+i*27;currentLabel=((int)a[8])/64;clipped(a,a+9,a+18,((int)a[8])%64);}}
__attribute__((export_name("sampleDepth"))) float sampleDepth(int x,int y){if(x<0||x>=W||y<0||y>=H)return 0;return depth[y*W+x];}
