import {LISTENING_COLLECTION} from './listening-room-data.js';
import {GARBA_PHOTOS} from './garba-room-data.js';

// Personal statements and event context supplied by Lakshya. No inferred songs,
// dates, venues or choreography are added to these memories.
const singingPhotos=['junoon','family'].map(id=>{
  const item=LISTENING_COLLECTION[id];
  return {...item,id,type:'image',src:item.image};
});
const chapters=[
  {
    id:'singing',label:'Singing',title:'There’s usually a song.',
    body:'I sing when I’m happy, and singing helps me slow down, too. Some moments stay with me; some become a recording.',
    detail:'I’m a vocalist. I’ve shared songs at Junoon, at a family function and at Tiny Desk. I also record myself simply because I feel like singing.',
    photoIds:['junoon','family'],
    reader:{photoId:'junoon',lead:'I’m a vocalist, but singing doesn’t need a stage. Sometimes I share a song with a room full of people. Sometimes I’m just in the mood to record one.',sections:[
      {title:'From a quiet recording to a room of people',body:'The listening room holds a spontaneous recording and a performance at Tiny Desk. Choose either one, settle by the screen and listen at your own pace.'},
      {title:'A few moments from the stage',body:'I performed at Junoon, the M.Des event at my college, and at a family function. These photographs hold a little of that side of me: the energy of sharing something I love.'}
    ]}
  },
  {
    id:'garba',label:'Garba',title:'Always room in the circle.',
    body:'Music, movement and people. Garba brings together a few of my favourite things—and usually another reason to make a friend.',
    detail:'I love socialising, meeting new people and joining in. Garba is another place for that energy. These are photographs from my own evenings, with more to explore in the courtyard.',
    photoIds:['garba-p26','garba-p24'],
    reader:{photoId:'garba-p26',lead:'I love playing Garba. The music, the movement and being around people all feel at home with my social side. I’m usually ready to join in.',sections:[
      {title:'The people are part of it',body:'I enjoy meeting someone new and making friends. Garba brings that energy into a shared space, where there’s a reason to move, laugh and be around people.'},
      {title:'A little of that evening, kept here',body:'These are my own photographs from Garba. The courtyard gives them a place in this garden: an open circle, warm lights and space to look closer at each moment.'}
    ]}
  }
];
export const HOBBIES_CONTENT=Object.freeze({
  id:'memory',title:'The Hobbies Courtyard',eyebrow:'LIFE BEYOND THE DESK',
  intro:'Singing and Garba are two things I make time for. Come in for a song, or spend a moment in the circle.',
  chapters:Object.freeze(chapters.map(chapter=>Object.freeze({...chapter,photoIds:Object.freeze(chapter.photoIds),reader:Object.freeze({...chapter.reader,sections:Object.freeze(chapter.reader.sections.map(Object.freeze))})}))),
  media:Object.freeze([...singingPhotos,...GARBA_PHOTOS.map(photo=>({...photo,type:'image'}))].map(Object.freeze)),
  mediaNote:''
});
