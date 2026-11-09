import {HOBBIES_CONTENT} from './hobbies-content.js';
import {ABOUT_CONTENT} from './about-content.js';
import {PHOTOGRAPHY_ROLLS} from './photography-rolls.js';
import {HOBBY_PHOTOS} from './personal-photo-data.js';
import {SINGING_RECORDING} from './personal-recording-data.js';

/**
 * Personal statements supplied by Lakshya in this project's conversation.
 * These are editorially shortened, not invented research or achievements.
 * Empty media arrays mean no personal media has been supplied for that topic.
 */
const freezeRoom=room=>Object.freeze({...room,chapters:Object.freeze(room.chapters.map(chapter=>Object.freeze(chapter))),media:Object.freeze(room.media.map(item=>Object.freeze(item)))});

export const PERSONAL_ROOMS=Object.freeze({
  about:ABOUT_CONTENT,
  memory:HOBBIES_CONTENT,
  music:freezeRoom({
    id:'music',title:'The Music Corner',eyebrow:'ON STAGE AND OFF',
    intro:'I’m a vocalist. I sing when I’m happy, and singing is also one of the things that helps me slow down.',
    chapters:[
      {id:'singing',label:'Singing',title:'There’s usually a song.',body:'Singing is something I love doing for myself as well as sharing with other people.',detail:'It gives my energy somewhere to go. Sometimes that means performing; sometimes it is simply singing because I’m happy.'},
      {id:'junoon',label:'Junoon',title:'A moment on stage.',body:'I performed at Junoon during my M.Des studies. It’s an event for the M.Des community at my college.',detail:'Music is one of the ways I connect with people beyond a conversation.'},
      {id:'garba',label:'Garba',title:'Room for movement.',body:'I love playing Garba. The music, the movement and being around people all connect with my social side.',detail:'That is another part of the energy I wanted this portfolio to carry.'}
    ],
    media:[],
    mediaNote:'Enter the listening room in Hobbies for my spontaneous recording, Tiny Desk performance and photographs from Junoon and a family function.'
  }),
  cloud:freezeRoom({
    id:'cloud',title:'The Cloud Lookout',eyebrow:'THROUGH MY PHONE',
    intro:'Clouds are a favourite, but my camera roll holds more than the sky. I take photographs when something catches my eye.',
    chapters:[
      {id:'clouds',label:'Clouds',title:'The skies I stop for.',body:'Looking up gives me a calm moment. Step into the camera to see a few skies I’ve photographed.',detail:'I’m often moving around or meeting people. Photographing clouds gives me a reason to pause and notice what is overhead.'},
      {id:'mobile-photography',label:'Mobile photography',title:'Small things. Worth a second look.',body:'A flower, a reflection, a little light. I take my phone out when something catches my eye.',detail:'Photography is something I do for the feeling of it. These are moments I wanted to keep, alongside the clouds I love photographing.'}
    ],
    media:PHOTOGRAPHY_ROLLS.flatMap(roll=>roll.photos),
    mediaNote:'My own photographs, taken on my phone. Choose Clouds or Mobile photography inside the viewfinder.'
  })
});

export function personalRoomContent(id){return PERSONAL_ROOMS[id]||null;}
