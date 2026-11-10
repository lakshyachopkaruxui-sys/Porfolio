import {GARDEN_PALETTE} from './garden-palette.js';
import {getHorizontalNavigation,getBoundaryNavigation,isKeyboardShortcutBlocked,consumeNavigationKey} from './keyboard-navigation.js';
import {WORLD_BOUNDS,PATHS,BRIDGES,RIVER,STOPS,START,LANDMARKS} from './layout.js';

const TITLES={about:'Meet Lakshya',projects:'Works',work:'Hobbies',music:'Oak’s lab',cloud:'The Viewfinder'};
const DESCRIPTIONS={
  about:'A little about me, my energy and the way I see people.',
  projects:'The projects, decisions and process behind my work.',
  work:'Singing, Garba and moments with people.',
  music:'Pokemon GO catches, childhood memories and the story behind this world.',
  cloud:'Clouds and everyday moments, through my phone camera.'
};

export function createMapUI({onOpen,onClose,onRide,onRead,onPortfolio,onHelp,getView=()=> 'overview',onReset=()=>{}}){
  const dialog=document.createElement('dialog');dialog.id='world-map';dialog.setAttribute('aria-labelledby','map-title');
  const b=WORLD_BOUNDS,width=b.maxX-b.minX,depth=b.maxZ-b.minZ;
  const pathMarkup=PATHS.map(path=>{const points=path.points.map(p=>`${p.x},${p.z}`).join(' ');return `<polyline points="${points}" fill="none" stroke="${GARDEN_PALETTE.edge}" stroke-width="${path.width+.8}" stroke-linecap="round" stroke-linejoin="round"/><polyline points="${points}" fill="none" stroke="${GARDEN_PALETTE.path}" stroke-width="${path.width}" stroke-linecap="round" stroke-linejoin="round"/>${path.id==='circuit'?`<polyline points="${points}" fill="none" stroke="#eee8d4" stroke-width=".3" stroke-dasharray="1.15 1.35"/>`:''}`;}).join('');
  const works=LANDMARKS.projects;
  const projectMarkup=`<g><title>Works gallery. One entrance for every project.</title><circle cx="${works.x}" cy="${works.z}" r="${works.radius}" fill="#d8d3b9" stroke="#98714e" stroke-width=".45"/><path d="M ${works.x-works.radius*.45} ${works.z+works.radius*.76} H ${works.x+works.radius*.45}" stroke="#355d4e" stroke-width=".8"/></g>`;
  const stopMarkup=Object.entries(STOPS).map(([id,s])=>`<circle cx="${s.focus.x}" cy="${s.focus.z}" r="${s.size}" fill="#eee8d8" stroke="#b5bfaa" stroke-width=".35"/><circle cx="${s.x}" cy="${s.z}" r="3.2" fill="#355d4e"/><text x="${s.x}" y="${s.z+1}" text-anchor="middle" font-size="2.7" font-family="DM Sans, sans-serif" font-weight="600" fill="white">${s.number}</text>`).join('');
  const bridgeMarkup=BRIDGES.map(b=>`<rect x="${b.x-b.width/2}" y="${b.minZ}" width="${b.width}" height="${b.maxZ-b.minZ}" rx=".6" fill="#cfc1a6"/>`).join('');
  dialog.innerHTML=`<div class="reader-top"><span class="mode-switch" data-mode-switch id="map-portfolio">Portfolio / Play</span><button class="close-button" id="map-close" type="button" aria-label="Close garden map">Back to garden <span aria-hidden="true">×</span></button></div>
    <div class="map-content"><header class="map-heading"><div><p class="eyebrow">GARDEN TRAIL MAP</p><h1 id="map-title">Where shall we go?</h1><p>Five stops. Follow the path, or explore a place straight away.</p></div><span class="map-fold-label" aria-hidden="true">A little room to wander</span></header>
    <div class="map-layout"><figure class="plan-view"><div class="map-sheet-edge" aria-hidden="true"></div><svg viewBox="${b.minX-6} ${b.minZ-6} ${width+12} ${depth+12}" role="img" aria-label="The original winding garden circuit with two bridges. Meet Lakshya, Works, Hobbies, Oak’s lab and The Viewfinder are numbered to match the destination list."><rect x="${b.minX}" y="${b.minZ}" width="${width}" height="${depth}" rx="1" fill="${GARDEN_PALETTE.ground}" stroke="#aebba4" stroke-width=".4"/><rect x="${b.minX}" y="${RIVER.minZ}" width="${width}" height="${RIVER.maxZ-RIVER.minZ}" fill="#a7c8c7"/>${pathMarkup}${bridgeMarkup}${projectMarkup}${stopMarkup}<circle cx="${START.x}" cy="${START.z}" r="2" fill="#fffaf0" stroke="#456252" stroke-width=".5"/><text x="${START.x}" y="${START.z+5.7}" text-anchor="middle" font-size="2.7" font-family="DM Sans, sans-serif" fill="#29433e">ARRIVAL</text><g id="map-player"><circle r="2.4" fill="#cf714d" stroke="#fffaf0" stroke-width=".65"/><path d="M0 -5 L-1.4 -2.8 L1.4 -2.8 Z" fill="#9e4a31"/></g></svg><figcaption><span class="map-location"><span class="you-dot" aria-hidden="true"></span> You are here</span><span>One circuit · Two bridges</span></figcaption></figure>
    <div class="map-destinations" aria-label="Garden destinations">${Object.entries(STOPS).map(([id,s])=>`<section class="map-stop" aria-labelledby="map-stop-${id}"><div class="map-stop-copy"><span class="map-number" aria-hidden="true">${s.number}</span><div><h2 id="map-stop-${id}">${TITLES[id]}</h2><p>${DESCRIPTIONS[id]}</p></div></div><div class="map-stop-actions"><button type="button" data-map-ride="${id}" aria-label="Ride to ${TITLES[id]}">Ride there</button><button type="button" class="map-read" data-map-read="${id}" aria-label="Explore ${TITLES[id]} without riding">Explore</button></div></section>`).join('')}</div></div>
    <footer class="map-footer"><p>Take the ride at your own pace. Steering or braking takes control back.</p><button id="map-help" type="button" class="text-button">Open the riding guide</button><div class="map-reset"><p id="map-reset-description">Return Woody to arrival. Your projects and photos stay available.</p><button id="map-reset" type="button" aria-describedby="map-reset-description">Restart journey</button></div></footer></div>`;
  document.body.append(dialog);
  const close=()=>{if(!dialog.open)return;dialog.close();onClose();};
  dialog.querySelector('#map-close').addEventListener('click',close);
  dialog.querySelector('#map-portfolio').addEventListener('click',onPortfolio);
  dialog.querySelector('#map-help').addEventListener('click',()=>{close();onHelp();});
  dialog.querySelector('#map-reset').addEventListener('click',()=>{close();onReset();});
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  dialog.querySelectorAll('[data-map-ride]').forEach(button=>button.addEventListener('click',()=>{const id=button.dataset.mapRide;close();onRide(id);}));
  dialog.querySelectorAll('[data-map-read]').forEach(button=>button.addEventListener('click',()=>{const id=button.dataset.mapRead;close();onRead(id);}));
  const destinationButtons=[...dialog.querySelectorAll('[data-map-ride],[data-map-read]')];
  const hint=document.createElement('p');hint.id='map-keyboard-hint';hint.className='map-keyboard-hint';hint.textContent='W/S or ↑/↓: choose a stop · A/D or ←/→: Ride or Explore · Enter: go · Esc: back';
  dialog.querySelector('.map-heading').after(hint);
  dialog.querySelector('.map-destinations').setAttribute('aria-describedby',hint.id);
  dialog.addEventListener('keydown',event=>{
    if(!dialog.open||isKeyboardShortcutBlocked(event)||event.repeat)return;
    const key=event.key.toLowerCase();
    if(key==='m'){consumeNavigationKey(event);close();return;}
    const horizontal=getHorizontalNavigation(event),boundary=getBoundaryNavigation(event);
    const vertical=key==='w'||key==='arrowup'?-1:key==='s'||key==='arrowdown'?1:0;
    if(!horizontal&&!vertical&&!boundary)return;
    consumeNavigationKey(event);
    const index=destinationButtons.indexOf(event.target.closest?.('[data-map-ride],[data-map-read]'));
    let row=Math.floor(Math.max(0,index)/2),column=Math.max(0,index)%2;
    if(index>=0){row=Math.max(0,Math.min(destinationButtons.length/2-1,row+vertical));column=Math.max(0,Math.min(1,column+horizontal));}
    else if(horizontal>0)column=1;
    if(boundary)row=boundary==='first'?0:destinationButtons.length/2-1;
    const target=destinationButtons[row*2+column];
    target.focus({preventScroll:true});target.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});
  });
  return {get isOpen(){return dialog.open;},close,open(position){dialog.dataset.presentation=getView()==='follow'?'side':'full';onOpen();const marker=dialog.querySelector('#map-player');marker.setAttribute('transform',`translate(${position.x} ${position.z}) rotate(${-position.heading*180/Math.PI})`);if(!dialog.open)dialog.showModal();dialog.scrollTop=0;destinationButtons[0].focus({preventScroll:true});}};
}

