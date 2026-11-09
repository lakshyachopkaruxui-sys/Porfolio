import {CLOUD_PHOTOS} from './cloud-photo-data.js';
import {MOBILE_PHOTOS} from './mobile-photography-data.js';

// Literal paths keep the publishing dependency scanner aware of every thumbnail.
const cloudThumbs=[
  './assets/personal/photography/thumbs/layers-of-cloud.webp',
  './assets/personal/photography/thumbs/a-break-in-the-clouds.webp',
  './assets/personal/photography/thumbs/above-the-palms.webp',
  './assets/personal/photography/thumbs/sunlight-overhead.webp',
  './assets/personal/photography/thumbs/sky-along-the-path.webp',
  './assets/personal/photography/thumbs/a-quieter-sky.webp'
];
export const PHOTOGRAPHY_ROLLS=Object.freeze([
  Object.freeze({id:'clouds',label:'Clouds',title:'The skies I stop for.',intro:'Looking up is one of the ways I slow down. These are a few skies I’ve photographed on my phone.',photos:CLOUD_PHOTOS.map((photo,index)=>Object.freeze({...photo,thumb:cloudThumbs[index]}))}),
  Object.freeze({id:'mobile',label:'Mobile photography',title:'Small things. Worth a second look.',intro:'A flower, a reflection, a little light. I take my phone out when something catches my eye.',photos:MOBILE_PHOTOS})
]);
