import {PHOTOGRAPHY_LIBRARY} from './photography-library-data.js';

// Two physical reels lead to the entire real collection. Subject filters live
// inside the mobile reel; paths stay literal in photography-library-data.js.
export const PHOTOGRAPHY_ROLLS=Object.freeze([
  Object.freeze({id:'clouds',label:'Clouds',title:'The skies I stop for.',intro:'Looking up is one of the ways I slow down. These are skies I’ve photographed on my phone.',photos:Object.freeze(PHOTOGRAPHY_LIBRARY.filter(photo=>photo.category==='clouds'))}),
  Object.freeze({id:'mobile',label:'Mobile photography',title:'Small things. Worth a second look.',intro:'Flowers, places, reflections and light. I take my phone out when something catches my eye.',photos:Object.freeze(PHOTOGRAPHY_LIBRARY.filter(photo=>photo.category!=='clouds'))})
]);
