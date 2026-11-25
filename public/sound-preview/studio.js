import {burst} from './burst.js';
let context, busy=false;
const buttons=[...document.querySelectorAll('button')];
function note(freq,decay,level,type='sine',end=freq){
 if(!context || context.state!=='running')return;
 const t=context.currentTime,o=context.createOscillator(),g=context.createGain();
 o.type=type;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(end,t+decay);
 g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(level,t+.006);g.gain.exponentialRampToValueAtTime(.0001,t+decay);
 o.connect(g);g.connect(context.destination);o.start(t);o.stop(t+decay+.015);o.onended=()=>{o.disconnect();g.disconnect()};
}
for(const button of buttons)button.onclick=async()=>{
 if(busy)return;busy=true;buttons.forEach(b=>b.disabled=true);
 let layer;
 try{
 try{context??=new AudioContext();await context.resume()}catch{}
 const stars=button.dataset.mode==='portfolio',garden=document.querySelector('select').selectedIndex===1;
 const cue=event=>{
 if(stars){if(event==='launch'){note(garden?660:1190,.32,.19);note(garden?990:2390,.14,.048)}else note(garden?880:1590,.26,.09)}
 else if(event==='launch'){note(garden?380:560,.105,.21,'triangle',garden?185:220);note(1120,.035,.045)}else note(garden?230:350,.12,.11,'sine',garden?140:155);
 };
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)cue('launch');
 else layer=burst(button,button.dataset.mode,cue);
 await new Promise(resolve=>setTimeout(resolve,2150));
 }finally{layer?.remove();buttons.forEach(b=>b.disabled=false);busy=false}
};