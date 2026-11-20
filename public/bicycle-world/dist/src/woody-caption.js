import {wordTimes} from './woody-word-times.js';

const words = /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu;

function boundary(intervals, seconds) {
  const time = seconds * 100;
  let low = 0, high = intervals.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (intervals[mid] <= time) low = mid + 1;
    else high = mid;
  }
  return low;
}

// Split only when the recording or its caption changes. Punctuation and
// whitespace stay in their original text nodes, including between headings.
export function createWordCaption() {
  let intervals = null, nodes = [], current = -1, source = '';
  function select(index) {
    if (index === current) return;
    if (current >= 0) nodes[current].classList.remove('woody-spoken-word');
    if (index >= 0) nodes[index].classList.add('woody-spoken-word');
    current = index;
  }
  return {
    bind(clip, elements) {
      if (clip?.src && source === clip.src && nodes.length && elements.includes(nodes[0].parentNode)) return;
      select(-1);
      nodes = []; intervals = null; source = clip?.src || '';
      if (!source || !elements.length) return;
      const key = source.split('/').pop().split('?')[0].replace(/\.mp3$/, '');
      const times = wordTimes[key];
      const tokens = elements.flatMap(el => el.textContent.match(words) || []);
      const expected = clip.text.match(words) || [];
      if (!times || times.length !== tokens.length * 2 || tokens.join(' ') !== expected.join(' ')) return;
      intervals = times;
      for (const element of elements) {
        const text = element.textContent, fragment = element.ownerDocument.createDocumentFragment();
        let end = 0;
        for (const match of text.matchAll(words)) {
          fragment.append(text.slice(end, match.index));
          const span = element.ownerDocument.createElement('span');
          span.textContent = match[0];
          fragment.append(span); nodes.push(span);
          end = match.index + match[0].length;
        }
        fragment.append(text.slice(end));
        element.replaceChildren(fragment);
      }
    },
    update(frame) {
      if (!intervals || !frame?.playing) { select(-1); return Infinity; }
      const next = boundary(intervals, frame.time);
      select(next % 2 ? (next - 1) / 2 : -1);
      return next < intervals.length ? intervals[next] * 10 - frame.time * 1000 : Infinity;
    },
  };
}

// The browser can throttle 3D animation frames independently of audio.
// Schedule the next word edge, then read the media clock again on waking.
export function createCaptionClock(sample) {
  let timer;
  function sync() {
    clearTimeout(timer);
    const delay = sample();
    if (Number.isFinite(delay)) timer = setTimeout(sync, Math.max(8, Math.min(150, delay + 2)));
  }
  return sync;
}
