import {mountCaseVideo} from './case-video.js?v=20261104-project-evidence';

// Build reviewed local content as DOM nodes, without evaluating markup or scripts.
// The surrounding chapters, navigation, image viewer and themes belong to Normal.
export function mountDhanContent(parent, nodes, {reader, cleanups}) {
  const document = parent.ownerDocument;
  const host = document.createElement('div');
  host.className = 'dhan-content';
  parent.append(host);
  const svgNames = {viewbox:'viewBox', preserveaspectratio:'preserveAspectRatio', markerwidth:'markerWidth', markerheight:'markerHeight', refx:'refX', refy:'refY', markerunits:'markerUnits'};
  const allowed = new Set(['section','div','article','header','nav','p','h4','strong','em','b','i','span','br','a','figure','figcaption','img','details','summary','dl','dt','dd','ol','ul','li','table','caption','thead','tbody','tr','th','td','blockquote','mark','svg','title','desc','defs','marker','path','g','ellipse','circle','rect','line','polyline','polygon','text','tspan']);
  function append(target, item, inSVG = false) {
    if (typeof item === 'string') { target.append(document.createTextNode(item)); return; }
    if (item.video) {
      cleanups.push(mountCaseVideo({parent:target,reader,media:item.video}));
      const video = target.lastElementChild?.querySelector('video');
      for (const source of item.video.tracks || []) {
        const track=document.createElement('track');
        Object.entries(source).forEach(([key,value]) => track.setAttribute(key,value));
        video?.append(track);
      }
      return;
    }
    if (!allowed.has(item.tag)) return;
    const isSVG = inSVG || item.tag === 'svg';
    const element = isSVG ? document.createElementNS('http://www.w3.org/2000/svg', item.tag) : document.createElement(item.tag);
    for (const [key,value] of Object.entries(item.attrs || {})) {
      if (/^on/i.test(key) || key === 'style') continue;
      element.setAttribute(isSVG ? svgNames[key] || key : key,value);
    }
    if (item.tag === 'img') {
      const link=document.createElement('a');
      link.href=item.attrs.src; link.target='_blank'; link.rel='noopener';
      link.setAttribute('aria-label',`Inspect image: ${item.attrs.alt}`);
      link.append(element); target.append(link);
    } else target.append(element);
    for (const child of item.children || []) append(element,child,isSVG);
    if (item.tag === 'a' && element.getAttribute('href')?.startsWith('#case-')) {
      const handler=event => {
        if (event.button > 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const id=element.getAttribute('href').slice(1);
        const destination=reader.querySelector(`[data-section-target="${id}"]`);
        if (destination) { event.preventDefault(); destination.click(); }
      };
      element.addEventListener('click',handler);
      cleanups.push(() => element.removeEventListener('click',handler));
    }
  }
  nodes.forEach(item => append(host,item));
}
