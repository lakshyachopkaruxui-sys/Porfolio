import {AUDIO_MIX} from './audio-mix.js';

/** Genuine mechanical riding texture; not an isolated freewheel recording. */
export const BICYCLE_SOUNDS=Object.freeze({
  rolling:Object.freeze({
    src:new URL('../assets/bicycle-audio/bicycle-riding-loop.ogg',import.meta.url).href,
    gain:AUDIO_MIX.bicycle,
    coastingScale:.55,
  }),
});
