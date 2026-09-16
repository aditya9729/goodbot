// Copyright 2026 Aditya Gudal. SPDX-License-Identifier: Apache-2.0
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const dist = (a,b) => Math.hypot(a.x-b.x,a.z-b.z);
export const lerp = (a,b,t) => a+(b-a)*t;
export function hash(seed) { let h=2166136261; for(const c of String(seed))h=Math.imul(h^c.charCodeAt(0),16777619); return h>>>0; }
export function random(seed) { let a=hash(seed); return ()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;}; }
export function inside(p,r,pad=0){return p.x>=r.x-r.w/2-pad&&p.x<=r.x+r.w/2+pad&&p.z>=r.z-r.d/2-pad&&p.z<=r.z+r.d/2+pad;}
export const clone = x => structuredClone(x);
export function text(value,max=180){return typeof value==='string'?value.replace(/[\u0000-\u001f<>]/g,'').slice(0,max):'';}

export function fullyInside(o,r){return Math.abs(o.x-r.x)+(o.w||0)/2<=r.w/2+1e-8&&Math.abs(o.z-r.z)+(o.d||0)/2<=r.d/2+1e-8;}
export function overlap(a,b){return Math.abs(a.x-b.x)<(a.w+b.w)/2&&Math.abs(a.z-b.z)<(a.d+b.d)/2;}

// Stable shortest-arc steering, including the -PI/+PI boundary.
export const wrapAngle = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
export function turnToward(current, target, maximumStep) {
 return wrapAngle(current + clamp(wrapAngle(target - current), -maximumStep, maximumStep));
}
