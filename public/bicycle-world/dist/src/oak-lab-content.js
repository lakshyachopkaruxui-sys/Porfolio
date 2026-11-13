import {POKEMON_COLLECTION} from './pokemon-collection-data.js';

// Oak is the story's fictional guide. Personal facts and process attribution
// come from Lakshya and the actual build; see docs/oak-lab-copy-20261109.md.
const freeze=value=>{
  if(value&&typeof value==='object'&&!Object.isFrozen(value)){
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};

export const OAK_COLLECTION_COUNT=POKEMON_COLLECTION.length;
export const OAK_ZONE_ORDER=Object.freeze(['welcome','collection','making']);

export const OAK_ZONES=freeze([
  {
    id:'welcome',label:'Meet Oak',title:'Why this world exists',
    intro:'Pokemon, a favourite film and a childhood wish that stayed with Lakshya.',
    primaryAction:{kind:'zone',target:'collection',label:'Show me his collection'}
  },
  {
    id:'collection',label:'His Pokemon GO collection',title:'Lakshya’s Pokemon GO collection',
    intro:`${OAK_COLLECTION_COUNT} screenshots from Lakshya’s own Pokemon GO collection.`,
    primaryAction:{kind:'collection',label:'Let me explore with Pikachu'}
  },
  {
    id:'making',label:'How he built this',title:'From the idea to this garden',
    intro:'The choices, tools and repeated rides that brought the world together.',
    primaryAction:{kind:'garden',label:'I’ll get back on the bicycle'}
  }
]);

export const OAK_DIALOGUE=freeze([
  {
    id:'childhood-wish',zone:'welcome',title:'Come in.',
    text:'Come in. I’m Professor Oak. When Lakshya watched Pokemon as a child, he wished he could step into that world. I’ll show you what became of that wish.',
    nextLabel:'What happened to that wish?',sceneCue:'oak'
  },
  {
    id:'pokemon-go-today',zone:'welcome',title:'Still exploring.',
    text:'That wish stayed with him. He still plays Pokemon GO. Before we look around, there’s one more childhood favourite I should introduce.',
    nextLabel:'Why is Woody here?',sceneCue:'oak'
  },
  {
    id:'woody-companion',zone:'welcome',title:'A familiar companion.',
    text:'You may notice Woody riding through this garden. Toy Story was a childhood favourite, and Woody was the character Lakshya loved. That’s why he rides along.',
    nextLabel:'Show me his collection',sceneCue:'collection'
  },
  {
    id:'real-collection',zone:'collection',title:'His Pokemon GO collection.',
    text:`Here’s a little of Lakshya’s Pokemon GO collection: ${OAK_COLLECTION_COUNT} of his own screenshots. Choose one to look closer, or let Pikachu take you through the exhibition.`,
    nextLabel:'How did this become a portfolio?',sceneCue:'collection'
  },
  {
    id:'collection-connection',zone:'collection',title:'From collection to garden.',
    text:'I’ll leave you to explore these. When you’re ready, the garden on my table will help me show you how this became a portfolio.',
    nextLabel:'How did this become a portfolio?',sceneCue:'map'
  },
  {
    id:'direction-and-tools',zone:'making',title:'A garden to explore.',
    text:'Let’s look at the garden. Bruno Simon’s portfolio inspired the freedom to explore through movement. Lakshya chose a bicycle and brought his own interests into the world.',
    nextLabel:'How did he build it?',sceneCue:'map'
  },
  {
    id:'build-in-layers',zone:'making',title:'One layer at a time.',
    text:'Lakshya directed the design and worked with ChatGPT to build it in layers. First came the route and riding; then the places, rooms and sound.',
    nextLabel:'What did he keep changing?',sceneCue:'map'
  },
  {
    id:'explore-or-read',zone:'making',title:'Where next?',
    text:'I’ve shown you some of Lakshya’s world. You can keep exploring, meet the person behind the work, or switch to Portfolio mode and read the projects.',
    nextLabel:'I’ll get back on the bicycle',sceneCue:'map'
  }
]);

export const OAK_MAKING_STEPS=freeze([
  {
    id:'childhood',title:'It started with a wish.',
    body:'This garden began with Pokemon, Toy Story and a childhood wish. I’ll show you how Lakshya turned those interests into a place you can explore.',
    detail:'',mapFocus:'all',stopIds:[],nextLabel:'Why explore by bicycle?'
  },
  {
    id:'exploration',title:'Movement became the way in.',
    body:'Bruno Simon’s portfolio gave Lakshya a reference for discovery through movement. Here, you ride a bicycle through a garden, finding different parts of his life along the way.',
    detail:'',mapFocus:'route',stopIds:[],nextLabel:'Show me the garden'
  },
  {
    id:'structure',title:'Every place has a reason.',
    body:'This is the garden you’ve been riding through. Choose a place on the miniature, or use its name below. I’ll tell you why it belongs here.',
    detail:'',mapFocus:'about',stopIds:['about','projects','work','music','cloud'],nextLabel:'How did he build it?'
  },
  {
    id:'layers',title:'Built with ChatGPT, layer by layer.',
    body:'Lakshya shaped the concept and reviewed each version. He worked with ChatGPT on implementation and code checks. I’ll show you the details that kept sending him back for another ride.',
    detail:'The route and riding came first. Landmarks, rooms and camera transitions followed. His photographs, recordings and the room sound gave those places their personal content.',
    detailLabel:'What came first?',mapFocus:'work',stopIds:['projects'],nextLabel:'What changed after those rides?'
  },
  {
    id:'details',title:'Another ride, another adjustment.',
    body:'Turns, pedalling, bridge crossings, signs and room entrances were revisited as Lakshya tried the garden. The aim was to make the journey feel clear, all the way back to your bicycle.',
    detail:'The build includes interface colour checks against WCAG 2.2 AA contrast targets, keyboard navigation and reduced-motion options.',
    detailLabel:'What about accessibility?',mapFocus:'hobbies',stopIds:['work'],nextLabel:'And the work itself?'
  },
  {
    id:'access',title:'Explore, or go straight to the work.',
    body:'You can wander here, or read the projects in Portfolio mode. Full case studies open in another tab, so the garden is still here when you return.',
    detail:'The garden and its rooms share rendering resources. Media loads when needed, and repeated objects reuse assets.',
    detailLabel:'How does it stay lightweight?',mapFocus:'all',stopIds:[],nextLabel:'I’ll get back on the bicycle'
  }
]);

export function getOakZone(id){return OAK_ZONES.find(zone=>zone.id===id)||null;}
export function getOakZoneDialogue(id){return OAK_DIALOGUE.filter(beat=>beat.zone===id);}
