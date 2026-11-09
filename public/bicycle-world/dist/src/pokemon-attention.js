const clamp=(value,min=0,max=1)=>Math.max(min,Math.min(max,value));
const smooth=value=>{const t=clamp(value);return t*t*(3-2*t);};
const profiles={pikachu:{period:8.7,offset:.4,yaw:.18,pitch:.035},bulbasaur:{period:12.3,offset:2.1,yaw:.11,pitch:.025},charmander:{period:10.9,offset:1.3,yaw:.14,pitch:.03}};

/** A finite glance has a rest, a look, a hold and a slower return. Seconds
 * own the pose; an existing scratch result avoids per-frame allocations. */
export function samplePokemonAttention(id,time,movement=0,turnRate=0,quiet=false,out={}){
  out.yaw=0;out.pitch=0;out.tail=0;
  if(quiet)return out;
  const profile=profiles[id]||profiles.bulbasaur;
  const seconds=(Number.isFinite(time)?time:0)+profile.offset;
  const cycle=Math.floor(seconds/profile.period),local=seconds-cycle*profile.period;
  // Alternating durations prevent an exact left-right metronome. Each event
  // still finishes well before the next cycle, with zero boundary velocity.
  const start=2.0+(cycle%2===0?0:.7),hold=.65+(cycle%3===0?.4:0);
  const elapsed=local-start,returnStart=.7+hold;
  const envelope=elapsed<0?0:elapsed<.7?smooth(elapsed/.7):elapsed<returnStart?1:1-smooth((elapsed-returnStart)/1.15);
  const side=cycle%2===0?1:-1,rest=1-clamp(Number.isFinite(movement)?movement:0);
  const turn=clamp(Number.isFinite(turnRate)?turnRate:0,-1,1)*(1-rest);
  out.yaw=side*profile.yaw*envelope*rest+turn*.09;
  out.pitch=profile.pitch*envelope*rest;
  out.tail=-side*profile.yaw*.22*envelope*rest-turn*.035;
  return out;
}
