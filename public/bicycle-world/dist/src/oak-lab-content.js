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
    id:'welcome',label:'The childhood wish',title:'Why this world exists',
    intro:'Pokémon, a favourite film and a childhood wish that stayed with Lakshya.',
    primaryAction:{kind:'zone',target:'collection',label:'See his collection'}
  },
  {
    id:'collection',label:'His Pokémon GO collection',title:'Lakshya’s Pokémon GO collection',
    intro:`${OAK_COLLECTION_COUNT} screenshots from Lakshya’s own Pokémon GO collection.`,
    primaryAction:{kind:'collection',label:'Walk with Pikachu'}
  },
  {
    id:'making',label:'Building this portfolio',title:'From the idea to this garden',
    intro:'The choices, tools and repeated rides that brought the world together.',
    primaryAction:{kind:'garden',label:'Back on the bicycle'}
  }
]);

export const OAK_DIALOGUE=freeze([
  {
    id:'childhood-wish',zone:'welcome',title:'Come in. There’s a story behind this garden.',
    text:'I’m Professor Oak. When Lakshya was a child, he watched Pokémon and imagined a world where he could meet and catch them himself. Let me show you where that wish led.',
    nextLabel:'Then came Pokémon GO',sceneCue:'oak'
  },
  {
    id:'pokemon-go-today',zone:'welcome',title:'The adventure found a place in everyday life.',
    text:'Pokémon GO brought a little of that idea into the real world. Lakshya still plays when he wants a break. The childhood fascination is still there, along with the pleasure of going out and discovering something.',
    nextLabel:'Why Woody rides along',sceneCue:'oak'
  },
  {
    id:'woody-companion',zone:'welcome',title:'Another childhood favourite came along.',
    text:'Toy Story was a favourite film, and Woody was the character Lakshya especially loved. That’s why Woody is your companion here. Together, these familiar faces make the portfolio feel more like his world.',
    nextLabel:'See his collection',sceneCue:'collection'
  },
  {
    id:'real-collection',zone:'collection',title:'A little of his Pokémon GO world.',
    text:`These ${OAK_COLLECTION_COUNT} screenshots come from Lakshya’s own Pokémon GO collection. I’ve given them a home here. Choose a Pokémon to look closer, or take a walk through the exhibition with Pikachu.`,
    nextLabel:'How the collection fits',sceneCue:'collection'
  },
  {
    id:'collection-connection',zone:'collection',title:'The collection explains the company you meet.',
    text:'The Pokémon in the garden are part of the same affection you see in this collection. This place brings that interest into the ride. When you’re ready, I’ll show you how Lakshya built the portfolio around it.',
    nextLabel:'How he built this world',sceneCue:'map'
  },
  {
    id:'direction-and-tools',zone:'making',title:'Lakshya directed it. ChatGPT helped build it.',
    text:'Lakshya shaped the concept, chose the references and reviewed each version. He worked with ChatGPT for implementation and code checks. Bruno Simon’s portfolio inspired the feeling of exploring through movement; the bicycle, interests and memories made the direction personal.',
    nextLabel:'Look at the garden plan',sceneCue:'map'
  },
  {
    id:'build-in-layers',zone:'making',title:'One layer, then another ride.',
    text:'The map and bicycle came first. Landmarks, rooms, camera transitions and sound followed. Lakshya kept riding and reviewing: a slow turn, an unclear sign or a difficult return became the next thing to refine.',
    nextLabel:'Two ways to explore',sceneCue:'map'
  },
  {
    id:'explore-or-read',zone:'making',title:'The work is always within reach.',
    text:'The garden makes room for wandering; Portfolio mode takes visitors straight to the work. Shared scene resources and on-demand media help keep exploration lightweight. The goal is simple: enjoy the ride, and find what you came for.',
    nextLabel:'Back on the bicycle',sceneCue:'map'
  }
]);

export const OAK_MAKING_STEPS=freeze([
  {
    id:'childhood',title:'Start with a childhood wish',
    body:'Lakshya grew up watching Pokémon and imagining a world where he could meet and catch them. Pokémon GO brought part of that wish outside, and he still enjoys playing.',
    detail:'Toy Story was another childhood favourite, especially Woody. Bringing him along as a companion connects the ride to a film and character Lakshya loves.',
    mapFocus:'all',stopIds:[],nextLabel:'Find a way to explore'
  },
  {
    id:'exploration',title:'Make movement part of discovery',
    body:'Bruno Simon’s portfolio showed how movement, interaction and discovery could make a website feel like a place. Lakshya wanted that freedom to explore, with his own interests shaping the experience.',
    detail:'A bicycle became the way through a winding garden. The camera follows the rider, destinations appear gradually, and open space gives visitors room to notice what comes next.',
    mapFocus:'route',stopIds:[],nextLabel:'Give each part a place'
  },
  {
    id:'structure',title:'Give each part a place',
    body:'About introduces Lakshya before visitors reach his work. Singing and Garba share Hobbies, this lab holds Pokémon and the portfolio story, and Cloud Lookout gives his photography a home.',
    detail:'The destinations use the garden’s existing pockets. Each one offers a different side of Lakshya, with an entrance, something worth exploring and a clear way back to the bicycle.',
    mapFocus:'about',stopIds:['about','projects','work','music','cloud'],nextLabel:'Build it one layer at a time'
  },
  {
    id:'layers',title:'Build one layer, then review it',
    body:'Lakshya directed the concept and reviewed the design, working with ChatGPT for implementation and code checks. The first layer established the route, bicycle proportions and riding behaviour.',
    detail:'Landmarks followed, then interiors and camera transitions. Personal photographs, recordings and sound gave the places their content. Each layer was reviewed before the next part was developed.',
    mapFocus:'work',stopIds:['projects'],nextLabel:'Refine how the ride feels'
  },
  {
    id:'details',title:'Refine the moments you feel',
    body:'A turn that felt too slow led to changes in automatic riding. Pedalling, stopping, bridge crossings, camera framing and signs were revisited as Lakshya tried the garden.',
    detail:'The same attention went into entering rooms, returning to the bicycle and balancing sound. His own photographs, singing recordings and Pokémon GO screenshots make those destinations personal.',
    mapFocus:'hobbies',stopIds:['work'],nextLabel:'Keep the work within reach'
  },
  {
    id:'access',title:'Keep the work within reach',
    body:'The garden and its rooms share rendering resources. Media loads when needed, and repeated objects reuse assets. Detail is added carefully so exploration stays practical for a website.',
    detail:'Portfolio mode offers a direct route to the work. Full case studies open there in a new tab, leaving the garden available. Visitors can explore or get straight to reading.',
    mapFocus:'all',stopIds:[],nextLabel:'Back on the bicycle'
  }
]);

export function getOakZone(id){return OAK_ZONES.find(zone=>zone.id===id)||null;}
export function getOakZoneDialogue(id){return OAK_DIALOGUE.filter(beat=>beat.zone===id);}
