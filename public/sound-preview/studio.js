import {burst} from './burst.js';
const buttons=[...document.querySelectorAll('button')], image=new Image();
image.src='/entrance/49cdd3462d2e1fe2.webp';
let ac,noise,busy=false;
function voice(at,duration,gain,freq,end,air=false){
 const src=air?ac.createBufferSource():ac.createOscillator(), env=ac.createGain();
 let filter;
 if(air){src.buffer=noise;filter=ac.createBiquadFilter();filter.type='bandpass';filter.Q.value=.8;filter.frequency.setValueAtTime(freq,at);filter.frequency.exponentialRampToValueAtTime(end,at+duration);src.connect(filter);filter.connect(env)}
 else{src.frequency.setValueAtTime(freq,at);src.frequency.exponentialRampToValueAtTime(end,at+duration);src.connect(env)}
 env.gain.setValueAtTime(.0001,at);env.gain.exponentialRampToValueAtTime(gain,at+(air?.012:.004));env.gain.exponentialRampToValueAtTime(.0001,at+duration);env.connect(ac.destination);src.start(at);src.stop(at+duration+.01);src.onended=()=>{src.disconnect();env.disconnect();filter?.disconnect()};
}
function score(balls,impacts){
 const start=ac.currentTime+.055;
 if(balls){
 voice(start+.025,.115,.22,370,105);voice(start+.025,.075,.19,1900,620,true);
 let last=-1,count=0;
 for(const hit of impacts.sort((a,b)=>a.time-b.time)){
 if(hit.time-last<.11 || count>=4)continue;
 const f=235+hit.x*100;voice(start+hit.time,.085,.14*hit.strength,f,f*.62);voice(start+hit.time,.047,.12*hit.strength,1300,700,true);last=hit.time;count++;
 }
 }else{
 voice(start+.028,.28,.15,2300,4750,true);
 [.24,.395,.55].forEach((t,i)=>{const f=[1590,2100,1800][i],g=[.095,.061,.041][i];voice(start+t,.24,g,f,f*.998);voice(start+t,.11,g*.40,f*2.47,f*2.46);});
 }
 return ()=>{const stamp=ac.getOutputTimestamp?.();const audible=stamp?.performanceTime?stamp.contextTime+(performance.now()-stamp.performanceTime)/1000:ac.currentTime-(ac.outputLatency||ac.baseLatency||0);return Math.max(0,audible-start)};
}
for(const button of buttons)button.onclick=async()=>{
 if(busy)return;busy=true;buttons.forEach(b=>b.disabled=true);let layer;
 try{ac??=new AudioContext({latencyHint:'interactive'});await ac.resume();if(!noise){noise=ac.createBuffer(1,ac.sampleRate,ac.sampleRate);const d=noise.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1}
 const balls=button.dataset.mode==='play';if(balls)await image.decode();
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)score(balls,[]);else layer=burst(button,button.dataset.mode,score,image);
 await new Promise(r=>setTimeout(r,2400));
 }catch{document.querySelector('p').textContent='Playback could not start. Check browser audio and try again.'}finally{layer?.remove();busy=false;buttons.forEach(b=>b.disabled=false)}
};