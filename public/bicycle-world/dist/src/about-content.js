import {ABOUT_STORY_PHOTOS} from './personal-photo-data.js';

// Personal statements and photo context supplied by Lakshya. Source mapping and
// editorial decisions are recorded in docs/about-refinement-copy-20261108.md.
const chapters=[
  {
    id:'people',label:'People',title:'Usually the one starting a conversation.',
    body:'I’m Lakshya, a UX designer and a people person. I love meeting someone new, making friends and bringing a little energy into the room.',
    detail:'Empathy is something I learned from my mother. I notice pauses and hesitation, and try to understand what someone is finding difficult before jumping to an answer.',
    photoIds:['lakshya-portrait'],
    reader:{
      photoId:'lakshya-portrait',
      lead:'I’m Lakshya, a UX designer with a background in Electronics & Telecommunication. Away from a screen, I’m usually starting a conversation, making a new friend or finding a reason to head out.',
      sections:[
        {title:'Listening comes with the conversation',body:'Empathy is something I learned from my mother. I pay attention to pauses, hesitation and small changes in expression. They remind me to listen closely and understand what someone is feeling.'},
        {title:'What brought me to UX',body:'I wanted to understand how people think and behave, and why everyday experiences can become frustrating. Design gives me a way to act on that interest: understand the difficulty, explore ideas and make something people can try.'}
      ]
    }
  },
  {
    id:'design',label:'Design',title:'My process leaves room to change.',
    body:'From app prototypes to physical products, I choose methods around the question in front of me. Something new can always send me back to an earlier decision.',
    detail:'My M.Des studies in User Experience at MIT ADT University have introduced me to different ways of researching, making and testing. I use them according to the people, the situation and what I need to understand next.',
    photoIds:['comparing-logo-patterns','syringe-redesign-at-meraki','giggles-best-project-meraki'],
    reader:{
      photoId:'comparing-logo-patterns',
      lead:'My route to UX began in Electronics & Telecommunication. I’m now studying User Experience at MIT ADT University, working across digital experiences and physical prototypes. I enjoy getting an idea out of my head and into someone’s hands.',
      sections:[
        {title:'Choose the next useful step',body:'I choose methods to suit the question and the people involved. Comparing logo patterns, for example, meant asking people which options they preferred. New observations can take me back to an earlier decision.'},
        {title:'From the studio to Meraki',body:'At Meraki, I presented our 20 cc syringe redesign and spoke with visitors about the project. Giggles, our interactive learning game, received the Best Project award. The photographs below hold those moments.'}
      ]
    }
  },
  {
    id:'away',label:'Beyond work',title:'A song, a circle, a reason to look up.',
    body:'I sing, play Garba and head out whenever I can. Photographing clouds gives me a quieter moment. You’ll find all of those interests somewhere in this garden.',
    detail:'Singing helps me slow down, and I love sharing it with people. Garba brings together music, movement and company. Pokémon and Toy Story are childhood favourites that found their way into this portfolio.',
    photoIds:['lakshya-outdoors'],
    reader:{
      photoId:'lakshya-outdoors',
      lead:'I love being around people, but I also enjoy the quieter moments between things. A song, an evening of Garba or a cloud that makes me stop for a photograph can change the pace of my day.',
      sections:[
        {title:'Give the energy somewhere to go',body:'I’m a vocalist and performed at Junoon during my M.Des studies. I also sing simply because I feel like it. Garba, meeting friends and heading out are other things I make time for.'},
        {title:'Why this garden feels personal',body:'Cloud photography gives me a reason to pause. Pokémon GO brings back the world I imagined as a child, and Woody comes from my love for Toy Story. Those interests helped shape the place you’re exploring.'}
      ]
    }
  }
];

const media=[
  {id:'lakshya-portrait',type:'image',src:'./assets/personal/lakshya-portrait.webp',width:960,height:1280,alt:'Lakshya smiling, wearing clear glasses and a blue shirt.',caption:'Hi, I’m Lakshya.'},
  ...ABOUT_STORY_PHOTOS.map(photo=>photo.id==='comparing-logo-patterns'
    ?{...photo,alt:'Lakshya and a classmate beside a table of printed logo patterns in a classroom.',caption:'Comparing logo patterns with participants'}
    :photo),
  {id:'lakshya-outdoors',type:'image',src:'./assets/personal/stories/lakshya-outdoors.webp',width:675,height:900,alt:'Lakshya wearing a cap and backpack, seated on a fallen tree in a wooded area.',caption:'A moment outdoors'}
];

export const ABOUT_CONTENT=Object.freeze({
  id:'about',title:'Meet Lakshya',eyebrow:'A LITTLE ABOUT ME',
  intro:'I’m Lakshya, a UX designer. A little of how I connect with people, approach my work and spend my time away from it.',
  chapters:Object.freeze(chapters.map(chapter=>Object.freeze({
    ...chapter,
    photoIds:Object.freeze(chapter.photoIds),
    reader:Object.freeze({...chapter.reader,sections:Object.freeze(chapter.reader.sections.map(section=>Object.freeze(section)))})
  }))),
  media:Object.freeze(media.map(photo=>Object.freeze(photo))),
  mediaNote:''
});
