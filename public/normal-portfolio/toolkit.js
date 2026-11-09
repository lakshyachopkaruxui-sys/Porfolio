import {RESUME_TOOLKIT_ADDITIONS} from './toolkit-resume.js';

// Personal capability/tool coverage confirmed by Lakshya on 29 October 2026.
// This does not assign every method to an individual case study.
const TOOL_LOGOS = {
  Miro: 'miro.avif', Notion: 'notion.avif', FigJam: 'figjam.avif',
  Figma: 'figma.svg', Framer: 'framer.webp', GitHub: 'github.avif',
  Xcode: 'xcode.avif', 'VS Code': 'vscode.avif',
  ChatGPT: 'chatgpt.avif', Gemini: 'gemini.avif', Claude: 'claude.avif',
  'Google Forms': 'google-forms.svg', ProtoPie: 'protopie.png',
  Illustrator: 'illustrator.svg', Photoshop: 'photoshop.svg', 'Figma Make': 'figma-make.png',
  'Arduino C++': 'arduino.jpg', ESP32: 'esp32.svg', 'RFID (MFRC522)': 'rfid.svg',
  'GitHub Copilot': 'github-copilot.svg', Antigravity: 'antigravity.svg',
  'NotebookLM (Google)': 'notebooklm.svg',
  Maya: 'maya.svg', '3D printing': '3d-printing.svg',
  Midjourney: 'midjourney.svg', Perplexity: 'perplexity.svg',
  'Google Search (AI Mode)': 'google-search.png', 'LLM Arena': 'arena.png',
};

export const TOOLKIT_ITEMS = [
  {
    id: 'research', name: 'Research with people', short: 'Research',
    description: 'I look at what people do, listen to their experiences and test the points where an interaction gets difficult.',
    methods: ['User Research', 'Usability Testing', 'Eye Tracking'],
    tools: ['Miro', 'Notion', 'FigJam'], tone: 'blue',
  },
  {
    id: 'experience', name: 'Shape the experience', short: 'Experience design',
    description: 'I work through the structure, flow and small interaction details, then put a prototype in people’s hands.',
    methods: ['Interaction Design', 'Information Architecture', 'Prototyping'],
    tools: ['Figma', 'Framer'], tone: 'pink',
  },
  {
    id: 'systems', name: 'Think in systems', short: 'Systems thinking',
    description: 'I follow an experience across its touchpoints, looking at the relationships and dependencies that shape it.',
    methods: ['Journey Mapping', 'Service Design', 'Systems Mapping'],
    tools: [], tone: 'mint',
  },
  {
    id: 'collaboration', name: 'Work across disciplines', short: 'Cross-disciplinary',
    description: 'I bring an electronics background into UX, connecting physical prototypes, interfaces and the people working on them.',
    methods: ['Collaboration', 'Communication', 'Problem Solving'],
    tools: ['GitHub'], tone: 'yellow',
  },
  {
    id: 'code', name: 'Code to explore', short: 'Creative coding',
    description: 'With AI support, I make working prototypes to try the behaviour that a static screen can’t show.',
    methods: ['HTML', 'CSS', 'GitHub', 'Rapid Prototyping'],
    tools: ['GitHub', 'Xcode', 'VS Code'], tone: 'lilac',
  },
  {
    id: 'ai', name: 'Think and make with AI', short: 'AI in practice',
    description: 'I use AI to question ideas, explore conversations and build prototypes, then review what it produces against the design intent.',
    methods: ['AI Prototyping', 'Conversational UX', 'Prompting'],
    tools: ['ChatGPT', 'Gemini', 'Claude'], tone: 'peach',
  },
];

let instanceCount = 0;
function element(tag, className, text, parent) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  parent?.append(node);
  return node;
}

export function mountToolkit(host) {
  if (!host) return null;
  const idPrefix = `capability-${++instanceCount}`;
  host.replaceChildren();
  host.classList.add('toolkit-explorer');
  const workbench = element('div', 'capability-workbench', undefined, host);
  element('p', 'capability-board-label', 'Ways I work', workbench);
  const controls = element('div', 'toolkit-controls', undefined, workbench);
  controls.setAttribute('role', 'group');
  controls.setAttribute('aria-label', 'Explore design capabilities');
  const detail = element('div', 'toolkit-detail', undefined, host);
  const status = element('p', 'toolkit-status', undefined, host);
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('aria-atomic', 'true');

  const records = TOOLKIT_ITEMS.map((item, index) => {
    const button = element('button', `toolkit-tool toolkit-tone-${item.tone}`, undefined, controls);
    button.type = 'button';
    button.dataset.capability = item.id;
    button.setAttribute('aria-controls', `${idPrefix}-${item.id}`);
    button.setAttribute('aria-pressed', 'false');
    const number = element('span', 'toolkit-tool-index', String(index + 1).padStart(2, '0'), button);
    number.setAttribute('aria-hidden', 'true');
    element('span', 'toolkit-tool-name', item.short, button);

    const panel = element('section', `toolkit-panel toolkit-tone-${item.tone}`, undefined, detail);
    panel.id = `${idPrefix}-${item.id}`;
    panel.hidden = true;
    panel.setAttribute('aria-labelledby', `${panel.id}-title`);
    const additions = RESUME_TOOLKIT_ADDITIONS[item.id];
    const overview = element('div', 'toolkit-overview', undefined, panel);
    element('h3', 'toolkit-detail-title', item.name, overview).id = `${panel.id}-title`;
    element('p', 'toolkit-description', item.description, overview);
    if (additions?.note) element('p', 'capability-more-note', additions.note, overview);
    const methodBlock = element('div', 'toolkit-method-block', undefined, panel);
    element('h4', 'capability-subheading', 'Methods & skills', methodBlock);
    const methods = element('ul', 'capability-methods', undefined, methodBlock);
    for (const method of new Set([...item.methods, ...(additions?.methods || [])])) element('li', undefined, method, methods);
    const allTools = [...new Set([...item.tools, ...(additions?.tools || [])])];
    if (allTools.length) {
      const toolBlock = element('div', 'toolkit-tools-block', undefined, panel);
      element('h4', 'capability-subheading', 'Tools I use', toolBlock);
      const tools = element('ul', 'capability-tools', undefined, toolBlock);
      for (const tool of allTools.filter(name => TOOL_LOGOS[name])) {
        const toolItem = element('li', undefined, undefined, tools);
        const logoFrame = element('span', 'capability-logo', undefined, toolItem);
        const logo = element('img', undefined, undefined, logoFrame);
        logo.src = new URL(`./assets/toolkit/${TOOL_LOGOS[tool]}`, import.meta.url).href;
        logo.alt = ''; // The adjacent name identifies the software without repetition.
        logo.width = 40; logo.height = 40; logo.decoding = 'async';
        element('span', 'capability-tool-label', tool, toolItem);
      }
      const namedTools = allTools.filter(name => !TOOL_LOGOS[name]);
      if (namedTools.length) {
        const names = element('ul', 'capability-tool-names', undefined, toolBlock);
        for (const tool of namedTools) element('li', undefined, tool, names);
      }
    }
    return {item, button, panel};
  });

  const marker = element('span', 'capability-selection-marker', undefined, controls);
  marker.setAttribute('aria-hidden', 'true');
  marker.hidden = true;
  const motionPreference = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const hoverPreference = window.matchMedia?.('(hover: hover) and (pointer: fine)');
  let activeId;
  let destroyed = false;
  let markerAnimation = null;
  const panelAnimations = new Set();
  let enteringPanel = null;
  let entranceTimer = null;
  let motionEngine = typeof detail.animate === 'function' ? 'waapi' : 'css';
  let measureFrame = null;
  let pointerFocusButton = null;
  let clearPointerTimer = null;

  function cancelPanelAnimation() {
    for (const animation of panelAnimations) animation.cancel();
    panelAnimations.clear();
    enteringPanel?.classList.remove('is-entering');
    enteringPanel = null;
    if (entranceTimer !== null) clearTimeout(entranceTimer);
    entranceTimer = null;
  }
  function cancelMarkerAnimation() {
    markerAnimation?.cancel();
    markerAnimation = null;
  }
  function motionAllowed() {
    return !destroyed && !motionPreference?.matches && document.visibilityState !== 'hidden';
  }
  function syncMotionMode() {
    host.dataset.toolkitMotion = motionPreference?.matches ? 'off' : motionEngine;
  }
  function trackPanelAnimation(target, frames, timing) {
    const animation = target.animate(frames, {...timing, fill: 'backwards'});
    panelAnimations.add(animation);
    const release = () => panelAnimations.delete(animation);
    // Cancellation during rapid switches must not create an unhandled rejection.
    if (animation.finished?.then) animation.finished.then(release, release);
    else { animation.onfinish = release; animation.oncancel = release; }
  }
  function positionMarker(animate = false) {
    if (destroyed) return;
    const selected = records.find(record => record.item.id === activeId)?.button;
    if (!selected) return;
    const markerStyle = window.getComputedStyle(marker);
    const controlsBox = controls.getBoundingClientRect();
    const buttonBox = selected.getBoundingClientRect();
    // The selected border remains the complete fallback without this stylesheet.
    if (motionPreference?.matches || markerStyle.position !== 'absolute' || !controlsBox.width || !buttonBox.width) {
      cancelMarkerAnimation();
      marker.hidden = true;
      return;
    }
    const wasVisible = !marker.hidden;
    const from = markerStyle.transform;
    marker.hidden = false;
    const x = buttonBox.left - controlsBox.left - controls.clientLeft - 10;
    const y = buttonBox.top - controlsBox.top - controls.clientTop + (buttonBox.height - marker.offsetHeight) / 2;
    const to = `translate3d(${x}px, ${y}px, 0)`;
    cancelMarkerAnimation();
    // Keep the final position underneath WAAPI so interruption always has a visible baseline.
    marker.style.transform = to;
    if (!animate || !wasVisible || !motionAllowed() || motionEngine !== 'waapi' || typeof marker.animate !== 'function') return;
    try {
      const animation = marker.animate([{transform: from}, {transform: to}], {
        duration: 280, easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
      });
      markerAnimation = animation;
      animation.finished?.catch(() => {});
      animation.onfinish = () => {
        if (markerAnimation !== animation) return;
        cancelMarkerAnimation();
      };
    } catch {
      motionEngine = 'css';
      syncMotionMode();
    }
  }
  function enterPanel(panel) {
    if (!motionAllowed()) return;
    const easing = 'cubic-bezier(0.23, 1, 0.32, 1)';
    if (motionEngine === 'waapi') {
      try {
        trackPanelAnimation(panel, [
          {opacity: .25, transform: 'translateY(12px)'},
          {opacity: 1, transform: 'translateY(0)'},
        ], {duration: 380, easing});
        [...panel.querySelectorAll('.capability-tools > li')].forEach((tool, index) => {
          trackPanelAnimation(tool, [
            {opacity: .2, transform: 'translateY(8px)'},
            {opacity: 1, transform: 'translateY(0)'},
          ], {duration: 320, delay: Math.min(index * 30, 80), easing});
        });
        return;
      } catch {
        // Some engines expose animate() without supporting the requested effect.
        // Drop partial effects and use the same visible-baseline CSS entrance.
        cancelPanelAnimation();
        motionEngine = 'css';
        syncMotionMode();
      }
    }
    enteringPanel = panel;
    panel.classList.add('is-entering');
    entranceTimer = setTimeout(cancelPanelAnimation, 400);
  }
  function settleMotion() {
    cancelPanelAnimation();
    syncMotionMode();
    positionMarker();
  }
  function scheduleMeasurement() {
    if (destroyed || measureFrame !== null) return;
    measureFrame = requestAnimationFrame(() => {
      measureFrame = null;
      cancelPanelAnimation();
      positionMarker();
    });
  }
  function select(id, announce = true, input = 'programmatic') {
    if (destroyed) return;
    const next = records.find(record => record.item.id === id);
    if (!next) return;
    host.dataset.toolkitInput = input;
    if (input !== 'pointer') cancelPanelAnimation();
    if (id === activeId) {
      if (input !== 'pointer') positionMarker();
      return;
    }
    cancelPanelAnimation();
    activeId = id;
    for (const record of records) {
      const selected = record.item.id === id;
      record.button.setAttribute('aria-pressed', String(selected));
      record.panel.hidden = !selected;
    }
    positionMarker(input === 'pointer');
    if (input === 'pointer') enterPanel(next.panel);
    if (announce) status.textContent = `${next.item.short}: methods and tools shown.`;
  }
  function selectedButton(event) {
    const button = event.target.closest('button[data-capability]');
    return button && controls.contains(button) ? button : null;
  }
  function handleClick(event) {
    const button = selectedButton(event);
    if (button) select(button.dataset.capability, true, event.detail > 0 || event.pointerType ? 'pointer' : 'keyboard');
    clearPointerIntent();
  }
  function handleFocus(event) {
    const button = selectedButton(event);
    if (button) select(button.dataset.capability, true, button === pointerFocusButton ? 'pointer' : 'keyboard');
    clearPointerIntent();
  }
  function clearPointerIntent() {
    pointerFocusButton = null;
    if (clearPointerTimer !== null) clearTimeout(clearPointerTimer);
    clearPointerTimer = null;
  }
  function handlePointerDown(event) {
    clearPointerIntent();
    pointerFocusButton = selectedButton(event);
  }
  function handlePointerUp() {
    // Native pointer focus/click may follow pointerup. Keep that single sequence together.
    if (!pointerFocusButton) return;
    clearPointerTimer = setTimeout(clearPointerIntent, 0);
  }
  function handleKey() {
    clearPointerIntent();
    host.dataset.toolkitInput = 'keyboard';
    settleMotion();
  }
  let lastPointerPosition = '';
  function handlePointer(event) {
    if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
    if (hoverPreference && !hoverPreference.matches) return;
    // Keyboard scrolling can change the element under
    // a stationary pointer. Only an actual pointer movement changes the reveal.
    const position = `${event.clientX},${event.clientY}`;
    if (position === lastPointerPosition) return;
    lastPointerPosition = position;
    const button = selectedButton(event);
    if (button) select(button.dataset.capability, true, 'pointer');
  }
  controls.addEventListener('click', handleClick);
  controls.addEventListener('focusin', handleFocus);
  controls.addEventListener('pointermove', handlePointer);
  detail.addEventListener('focusin', cancelPanelAnimation);
  document.addEventListener('pointerdown', handlePointerDown, true);
  document.addEventListener('pointerup', handlePointerUp, true);
  document.addEventListener('pointercancel', clearPointerIntent, true);
  document.addEventListener('keydown', handleKey, true);
  document.addEventListener('visibilitychange', settleMotion);
  window.addEventListener('blur', clearPointerIntent);
  window.addEventListener('pagehide', settleMotion);
  window.addEventListener('pageshow', settleMotion);
  window.addEventListener('resize', scheduleMeasurement, {passive: true});
  if (motionPreference?.addEventListener) motionPreference.addEventListener('change', settleMotion);
  else motionPreference?.addListener?.(settleMotion);
  const resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(scheduleMeasurement) : null;
  resizeObserver?.observe(controls);
  records.forEach(record => resizeObserver?.observe(record.button));
  syncMotionMode();
  select(TOOLKIT_ITEMS[0].id, false);
  document.fonts?.ready.then(scheduleMeasurement);
  return {
    select,
    destroy() {
      destroyed = true;
      clearPointerIntent();
      cancelPanelAnimation();
      cancelMarkerAnimation();
      if (measureFrame !== null) cancelAnimationFrame(measureFrame);
      resizeObserver?.disconnect();
      controls.removeEventListener('click', handleClick);
      controls.removeEventListener('focusin', handleFocus);
      controls.removeEventListener('pointermove', handlePointer);
      detail.removeEventListener('focusin', cancelPanelAnimation);
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('pointerup', handlePointerUp, true);
      document.removeEventListener('pointercancel', clearPointerIntent, true);
      document.removeEventListener('keydown', handleKey, true);
      document.removeEventListener('visibilitychange', settleMotion);
      window.removeEventListener('blur', clearPointerIntent);
      window.removeEventListener('pagehide', settleMotion);
      window.removeEventListener('pageshow', settleMotion);
      window.removeEventListener('resize', scheduleMeasurement);
      if (motionPreference?.removeEventListener) motionPreference.removeEventListener('change', settleMotion);
      else motionPreference?.removeListener?.(settleMotion);
      host.replaceChildren();
      host.classList.remove('toolkit-explorer');
      delete host.dataset.toolkitMotion;
      delete host.dataset.toolkitInput;
    },
  };
}
