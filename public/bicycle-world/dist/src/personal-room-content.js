import {HOBBIES_CONTENT} from './hobbies-content.js';
import {ABOUT_CONTENT} from './about-content.js';
import {CLOUD_PHOTOS} from './cloud-photo-data.js';
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
    id:'cloud',title:'The Cloud Lookout',eyebrow:'A REASON TO LOOK UP',
    intro:'I take photographs when something catches my eye. Clouds are a favourite. This is a little space for that quieter side of me.',
    chapters:[
      {id:'looking-up',label:'My cloud photos',title:'The skies I stop for.',body:'I take photographs when something catches my eye. Clouds are a favourite, and looking up gives me a calm moment.',detail:'I’m usually moving around, meeting people or finding something to do. Cloud photography is one of the quieter things I return to.'},
      {id:'noticing',label:'Frame the sky',title:'A small piece of a big sky.',body:'Choose a view and keep a little piece of this illustrated sky. A small way to share something I love doing.',detail:'Move the frame until something catches your eye, then keep the illustrated view as a postcard. Explore my cloud photos to see the real skies I have photographed.'},
      {id:'quiet',label:'A quiet moment',title:'No rush from here.',body:'Singing and photographing clouds help me slow down. This corner holds a little of that quieter side of me.',detail:'Stay for a moment, change the frame, or return to the garden whenever you’re ready.'}
    ],
    media:CLOUD_PHOTOS,
    mediaNote:'Explore my own cloud photography. The sky-framing activity is an illustrated space to play with a view.'
  })
});

export function personalRoomContent(id){return PERSONAL_ROOMS[id]||null;}
