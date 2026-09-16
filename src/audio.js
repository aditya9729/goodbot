// Original procedural arrangement: "Little Lantern", 78 BPM, no remote audio.
export class HotelAudio {
 constructor(){this.ctx=null;this.enabled=false;this.music=.25;this.effects=.4;this.timer=null;this.step=0;this.next=0;this.progress=0;}
 async toggle(){if(!this.ctx){const AC=globalThis.AudioContext||globalThis.webkitAudioContext;if(!AC)return false;this.ctx=new AC();this.master=this.ctx.createGain();this.master.gain.value=.5;this.master.connect(this.ctx.destination);this.m=this.ctx.createGain();this.m.connect(this.master);this.fx=this.ctx.createGain();this.fx.connect(this.master);this.setVolume();}
 this.enabled=!this.enabled;if(this.enabled)await this.resume();else this.pause();return this.enabled;}
 setVolume(){if(this.m)this.m.gain.value=this.music;if(this.fx)this.fx.gain.value=this.effects;}
 note(freq,at,duration=.4,gain=.1,type='triangle',bus=this.m){if(!this.ctx||!bus)return;const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(gain,at+.015);g.gain.exponentialRampToValueAtTime(.001,at+duration);o.connect(g);g.connect(bus);o.start(at);o.stop(at+duration+.05);o.onended=()=>{o.disconnect();g.disconnect();};}
 schedule(){if(!this.ctx||!this.enabled||this.ctx.state!=='running')return;const beat=60/78/2;const chords=[[50,57,61,66],[47,54,59,62],[43,50,55,59],[45,52,57,61]];while(this.next<this.ctx.currentTime+.16){const chord=chords[Math.floor(this.step/16)%4];const f=n=>440*2**((n-69)/12);if(this.step%8===0)for(const n of chord)this.note(f(n),this.next,2.5,.055,'sine');if(this.step%2===0)this.note(f(chord[(this.step/2)%4]+12),this.next,.75,.1,'triangle');if(this.progress>.4&&this.step%4===3)this.note(f(chord[(this.step+1)%4]+24),this.next,.3,.04,'sine');this.next+=beat;this.step++;}}
 async resume(){if(!this.enabled||!this.ctx)return;await this.ctx.resume();this.next=this.ctx.currentTime+.06;clearInterval(this.timer);this.timer=setInterval(()=>this.schedule(),70);this.schedule();}
 pause(){clearInterval(this.timer);this.timer=null;this.ctx?.suspend().catch(()=>{});}
 chime(kind='good'){if(!this.enabled||this.ctx?.state!=='running')return;const notes=kind==='win'?[523,659,784,1047]:kind==='pick'?[440,550]:[587,740];notes.forEach((f,i)=>this.note(f,this.ctx.currentTime+i*.1,.4,.11,'sine',this.fx));}
}
