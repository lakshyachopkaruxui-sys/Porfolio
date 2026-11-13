// Optional normal-portfolio interactions. Conversation history stays in memory;
// the browser never asks for or stores an API key.
import {mountAssistantDiscovery} from './assistant-discovery.js?v=20261104-fab';

let extraInstanceCount = 0;

function element(tag, className, text, parent) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  parent?.append(node);
  return node;
}

function button(className, text, parent) {
  const node = element('button', className, text, parent);
  node.type = 'button';
  return node;
}

const PROJECT_IDS = new Set(['pixel-mania', 'syringe', 'connectaid', 'giggles', 'workplace-mode', 'jan-aushadhi']);
const SUGGESTED_QUESTIONS = [
  {label: 'Which project first?', question: 'Which project should I look at first?'},
  {label: 'Lakshya’s role in Giggles', question: 'What was Lakshya’s role in Giggles?'},
  {label: 'Experience so far', question: 'What experience does Lakshya have?'},
];

export function assistantResponseError(status, payload) {
  const code = String(payload?.code || payload?.error?.code || '').toLowerCase();
  if ([404, 501].includes(status) || payload?.configured === false || /not.configured|missing.key|setup.required/.test(code)) {
    return 'The assistant hasn’t been connected yet. You can still browse the projects and contact details on this page.';
  }
  if (status === 429) return 'The assistant is busy. Please try again in a moment.';
  if (status === 503) return 'The assistant is temporarily unavailable. Please try again in a moment.';
  if (status < 200 || status >= 300) return typeof payload?.error === 'string' ? payload.error : 'The assistant couldn’t answer just now. Please try again.';
  if (typeof payload?.text !== 'string' || !payload.text.trim()) return 'The assistant returned an empty answer. Please try again.';
  return null;
}

/** POST /api/portfolio-chat accepts messages and returns {text, sources}. */
export function mountPortfolioAssistant(host, {onOpenProject} = {}) {
  if (!host) return null;
  const prefix = `portfolio-assistant-${++extraInstanceCount}`;
  const lifecycle = new AbortController();
  const listen = (node, type, handler) => node.addEventListener(type, handler, {signal: lifecycle.signal});
  const launcher = button('portfolio-assistant-launcher', undefined, host);
  const launcherIcon = element('span', 'assistant-launcher-icon', undefined, launcher);
  launcherIcon.setAttribute('aria-hidden', 'true');
  const portrait = element('img', undefined, undefined, launcherIcon);
  portrait.src = new URL('./assets/personal/carousel/p11.webp', import.meta.url).href;
  portrait.alt = ''; portrait.width = 36; portrait.height = 36;
  const launcherCopy = element('span', 'assistant-launcher-copy', undefined, launcher);
  element('span', 'assistant-launcher-label', 'Ask my AI', launcherCopy);
  element('span', 'assistant-launcher-hint', 'My work, explained', launcherCopy);
  launcher.setAttribute('aria-label', 'Ask my AI about Lakshya’s work');
  launcher.setAttribute('aria-haspopup', 'dialog');
  launcher.setAttribute('aria-controls', prefix);
  launcher.setAttribute('aria-expanded', 'false');
  const entryPoints = [...(document.querySelectorAll?.('[data-assistant-open]') || [])];
  let returnTrigger = launcher;
  for (const entry of entryPoints) {
    entry.hidden = false;
    entry.setAttribute('aria-haspopup', 'dialog');
    entry.setAttribute('aria-controls', prefix);
    entry.setAttribute('aria-expanded', 'false');
  }
  let footerVisible = false;
  let restoringLauncherFocus = false;
  const footerPanel = entryPoints.find(entry => entry.closest('.contact-ai'))?.closest('.contact-ai');
  const updateFooterDock = () => {
    // The footer has its own AI entry. Keep that copy readable, while retaining
    // a keyboard visitor's currently focused launcher until focus moves away.
    host.dataset.footerAssistant = String(footerVisible && !restoringLauncherFocus && document.activeElement !== launcher);
  };
  const footerObserver = footerPanel && typeof window.IntersectionObserver === 'function'
    ? new window.IntersectionObserver(entries => {
      footerVisible = entries.some(entry => entry.isIntersecting);
      updateFooterDock();
    }) : null;
  footerObserver?.observe(footerPanel);
  listen(document, 'focusin', updateFooterDock);
  listen(document, 'focusout', updateFooterDock);

  function expanded(value) {
    for (const entry of [launcher, ...entryPoints]) entry.setAttribute('aria-expanded', String(value));
  }

  const invitation = element('aside', 'assistant-invitation', undefined, host);
  invitation.hidden = true;
  invitation.setAttribute('aria-label', 'Portfolio AI introduction');
  const invitationDismiss = button('assistant-invitation-dismiss', 'Dismiss', invitation);
  invitationDismiss.setAttribute('aria-label', 'Dismiss AI introduction');
  element('p', 'assistant-invitation-title', 'Questions about my work?', invitation);
  element('p', 'assistant-invitation-copy', 'Ask my portfolio AI about a project, my experience or how I work.', invitation);
  const invitationOpen = button('assistant-invitation-open', 'Ask a question', invitation);

  const dialog = element('dialog', 'portfolio-assistant-dialog', undefined, host);
  dialog.id = prefix;
  dialog.setAttribute('aria-labelledby', `${prefix}-title`);
  dialog.setAttribute('aria-describedby', `${prefix}-intro`);
  const shell = element('div', 'assistant-shell', undefined, dialog);
  const header = element('header', 'assistant-header', undefined, shell);
  const identity = element('img', 'identity-mark', undefined, header);
  identity.src = new URL('./assets/identity/shared-curve/lc-ink.svg', import.meta.url).href;
  identity.alt = '';
  identity.width = 40;
  identity.height = 33;
  identity.setAttribute('aria-hidden', 'true');
  const heading = element('h2', 'assistant-title', 'Portfolio AI', header);
  heading.id = `${prefix}-title`;
  const closeButton = button('assistant-close', 'Close', header);
  const intro = element('p', 'assistant-intro', 'Ask about my projects, experience or approach.', shell);
  intro.id = `${prefix}-intro`;
  const suggestions = element('div', 'assistant-suggestions', undefined, shell);
  suggestions.setAttribute('role', 'group');
  suggestions.setAttribute('aria-label', 'Suggested questions');
  const suggestionButtons = SUGGESTED_QUESTIONS.map(({label, question}) => {
    const control = button('assistant-suggestion', label, suggestions);
    listen(control, 'click', () => requestAnswer(question));
    return control;
  });

  const transcript = element('div', 'assistant-transcript', undefined, shell);
  transcript.setAttribute('role', 'log');
  transcript.setAttribute('aria-label', 'Conversation');
  transcript.setAttribute('aria-live', 'polite');
  transcript.setAttribute('aria-relevant', 'additions text');
  transcript.tabIndex = 0;
  const emptyState = element('p', 'assistant-empty', 'Or ask your own question.', transcript);
  const status = element('p', 'assistant-status', '', shell);
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');

  const form = element('form', 'assistant-form', undefined, shell);
  const label = element('label', 'assistant-input-label', 'Your question', form);
  label.htmlFor = `${prefix}-input`;
  const input = element('textarea', 'assistant-input', undefined, form);
  input.id = label.htmlFor;
  input.name = 'question';
  input.rows = 2;
  input.maxLength = 1400;
  input.required = true;
  input.autocomplete = 'off';
  input.placeholder = 'What would you like to know?';
  const formFooter = element('div', 'assistant-form-footer', undefined, form);
  const keyboardHint = element('span', 'assistant-keyboard-hint', 'Enter to ask · Shift + Enter for a new line', formFooter);
  keyboardHint.id = `${prefix}-keyboard-hint`;
  input.setAttribute('aria-describedby', keyboardHint.id);
  const sendButton = element('button', 'assistant-send', 'Ask', formFooter);
  sendButton.type = 'submit';
  const resetButton = button('assistant-reset', 'Clear conversation', shell);
  resetButton.hidden = true;
  element('p', 'assistant-privacy', 'AI answers can be imperfect. Questions go to Google Gemini; keep private information out.', shell);

  let history = [];
  let currentTurn = null;
  let requestController = null;
  let requestVersion = 0;
  let busy = false;
  let destroyed = false;
  const discovery = mountAssistantDiscovery({host, launcher, invitation, dismiss: invitationDismiss,
    open: invitationOpen, onOpen: openAssistant});

  function updateBusy(value) {
    busy = value;
    transcript.setAttribute('aria-busy', String(value));
    sendButton.disabled = value;
    sendButton.textContent = value ? 'Asking…' : 'Ask';
    suggestionButtons.forEach(control => { control.disabled = value; });
    if (currentTurn) currentTurn.retry.disabled = value;
  }

  function showFailure(message) {
    if (!currentTurn) return;
    currentTurn.loading.hidden = true;
    currentTurn.error.hidden = false;
    currentTurn.errorText.textContent = message;
    currentTurn.retry.disabled = false;
    status.textContent = 'No answer was received.';
    transcript.scrollTop = transcript.scrollHeight;
  }

  function stopPending(message) {
    if (!busy) return;
    requestVersion += 1;
    requestController?.abort();
    requestController = null;
    updateBusy(false);
    showFailure(message);
  }

  function closeAssistant() {
    stopPending('That request was stopped. You can try it again when you’re ready.');
    if (dialog.open) dialog.close();
    expanded(false);
    const trigger = returnTrigger?.isConnected ? returnTrigger : launcher;
    restoringLauncherFocus = trigger === launcher;
    if (restoringLauncherFocus) host.dataset.footerAssistant = 'false';
    try { if (trigger.isConnected) trigger.focus({preventScroll: true}); }
    finally { restoringLauncherFocus = false; updateFooterDock(); }
  }

  function openAssistant(trigger = launcher) {
    if (destroyed) return;
    returnTrigger = trigger?.isConnected ? trigger : launcher;
    discovery?.consume();
    if (!dialog.open) dialog.showModal();
    expanded(true);
    input.focus({preventScroll: true});
  }

  function sourceLink(source, parent) {
    if (!source || typeof source.url !== 'string') return;
    let url;
    try { url = new URL(source.url, window.location.href); } catch { return; }
    if (!['http:', 'https:'].includes(url.protocol)) return;
    const item = element('li', undefined, undefined, parent);
    const link = element('a', 'assistant-source-link', typeof source.label === 'string' && source.label.trim() ? source.label : url.hostname, item);
    link.href = url.href;
    if (url.origin !== window.location.origin) {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    } else {
      listen(link, 'click', event => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const match = url.hash.match(/^#(?:portfolio\/)?project-([a-z0-9-]+)$/);
        if (match && PROJECT_IDS.has(match[1]) && typeof onOpenProject === 'function') {
          event.preventDefault();
          closeAssistant();
          onOpenProject(match[1], launcher);
        } else if (url.hash && url.pathname === window.location.pathname) {
          closeAssistant();
        }
      });
    }
  }

  function answerArticle(text, sources) {
    const article = element('article', 'assistant-message assistant-message-answer', undefined, transcript);
    element('h3', 'assistant-speaker', 'Portfolio assistant', article);
    // Model output is text, never HTML. Source URLs receive an independent check.
    element('p', 'assistant-message-text', text, article);
    if (Array.isArray(sources) && sources.length) {
      const sourceGroup = element('div', 'assistant-sources', undefined, article);
      element('p', 'assistant-sources-label', 'Explore the source', sourceGroup);
      const list = element('ul', 'assistant-source-list', undefined, sourceGroup);
      sources.forEach(source => sourceLink(source, list));
      if (!list.children.length) sourceGroup.remove();
    }
  }

  function pendingTurn(question) {
    if (currentTurn) {
      currentTurn.question = question;
      currentTurn.userText.textContent = question;
      currentTurn.error.hidden = true;
      currentTurn.loading.hidden = false;
      return;
    }
    const user = element('article', 'assistant-message assistant-message-user', undefined, transcript);
    element('h3', 'assistant-speaker', 'You', user);
    const userText = element('p', 'assistant-message-text', question, user);
    const loading = element('p', 'assistant-loading', 'Looking through the portfolio…', transcript);
    const error = element('div', 'assistant-error', undefined, transcript);
    error.hidden = true;
    error.setAttribute('role', 'alert');
    const errorText = element('p', undefined, '', error);
    const retry = button('assistant-retry', 'Try again', error);
    listen(retry, 'click', () => {
      if (currentTurn) requestAnswer(currentTurn.question);
    });
    currentTurn = {question, user, userText, loading, error, errorText, retry};
  }

  async function requestAnswer(rawQuestion) {
    if (destroyed || busy) return;
    const question = rawQuestion.trim();
    if (!question) { input.reportValidity(); return; }
    if (question.length > input.maxLength) {
      status.textContent = 'Please shorten the question to 1,400 characters.';
      return;
    }
    // A suggested/retry/send control may disappear or become disabled below.
    // Keep keyboard focus on the composer instead of a hidden control.
    if (dialog.open) input.focus({preventScroll: true});
    emptyState.hidden = true;
    suggestions.hidden = true;
    resetButton.hidden = false;
    pendingTurn(question);
    input.value = '';
    updateBusy(true);
    status.textContent = 'Waiting for an answer…';
    transcript.scrollTop = transcript.scrollHeight;
    const version = ++requestVersion;
    const controller = new AbortController();
    requestController = controller;
    let timedOut = false;
    const timer = window.setTimeout(() => { timedOut = true; controller.abort(); }, 60000);
    try {
      const response = await fetch('/api/portfolio-chat', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
        body: JSON.stringify({messages: [...history.slice(-6).map(item => ({...item, content: item.content.slice(0, item.role === 'assistant' ? 2000 : 1400)})), {role: 'user', content: question}]}),
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => null);
      if (destroyed || version !== requestVersion) return;
      const failure = assistantResponseError(response.status, payload);
      if (failure) throw new Error(failure);
      const text = payload.text.trim();
      currentTurn.loading.remove();
      currentTurn.error.remove();
      currentTurn = null;
      history.push({role: 'user', content: question}, {role: 'assistant', content: text});
      answerArticle(text, payload.sources);
      updateBusy(false);
      status.textContent = 'Answer ready.';
      transcript.scrollTop = transcript.scrollHeight;
    } catch (error) {
      if (destroyed || version !== requestVersion) return;
      updateBusy(false);
      if (timedOut) showFailure('The answer took too long. Please try again.');
      else if (error.name === 'AbortError') showFailure('That request was stopped. You can try it again.');
      else if (error instanceof TypeError) showFailure('The assistant couldn’t connect. Check the connection and try again.');
      else showFailure(error.message || 'The assistant couldn’t answer just now. Please try again.');
    } finally {
      window.clearTimeout(timer);
      if (version === requestVersion) requestController = null;
    }
  }

  function resetConversation() {
    requestVersion += 1;
    requestController?.abort();
    requestController = null;
    currentTurn = null;
    history = [];
    transcript.replaceChildren(emptyState);
    emptyState.hidden = false;
    suggestions.hidden = false;
    resetButton.hidden = true;
    input.value = '';
    updateBusy(false);
    status.textContent = 'Conversation cleared.';
    if (dialog.open) input.focus({preventScroll: true});
  }

  listen(launcher, 'click', () => openAssistant(launcher));
  for (const entry of entryPoints) listen(entry, 'click', () => openAssistant(entry));
  listen(closeButton, 'click', closeAssistant);
  listen(dialog, 'cancel', event => { event.preventDefault(); closeAssistant(); });
  listen(dialog, 'close', () => {
    expanded(false);
    stopPending('That request was stopped. You can try it again when you’re ready.');
  });
  listen(resetButton, 'click', resetConversation);
  listen(form, 'submit', event => { event.preventDefault(); requestAnswer(input.value); });
  listen(input, 'keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      requestAnswer(input.value);
    }
  });

  return {
    destroy() {
      destroyed = true;
      requestVersion += 1;
      requestController?.abort();
      discovery?.destroy();
      lifecycle.abort();
      footerObserver?.disconnect();
      for (const entry of entryPoints) { entry.hidden = true; entry.removeAttribute('aria-controls'); entry.setAttribute('aria-expanded', 'false'); }
      if (dialog.open) dialog.close();
      launcher.remove();
      invitation.remove();
      dialog.remove();
      history = [];
    },
  };
}

const PIXEL_COLOURS = ['Blank', 'Blue', 'Yellow', 'Green', 'Pink'];
const PIXEL_ROWS = 8;
const PIXEL_COLUMNS = 12;

/** An original, optional drawing toy. No scoring, autoplay or saved artwork. */
export function mountPixelBreak(host) {
  if (!host) return null;
  const prefix = `pixel-break-${++extraInstanceCount}`;
  const lifecycle = new AbortController();
  const listen = (node, type, handler) => node.addEventListener(type, handler, {signal: lifecycle.signal});
  const section = element('section', 'pixel-break', undefined, host);
  section.setAttribute('aria-labelledby', `${prefix}-title`);
  const header = element('header', 'pixel-break-header', undefined, section);
  element('h3', 'pixel-break-title', 'A little pixel break', header).id = `${prefix}-title`;
  const hint = element('p', 'pixel-break-hint', 'Tap a square to cycle its colour. Make whatever you like.', header);
  hint.id = `${prefix}-hint`;
  const toolbar = element('div', 'pixel-break-toolbar', undefined, section);
  const legend = element('ul', 'pixel-break-legend', undefined, toolbar);
  legend.setAttribute('aria-label', 'Colour cycle');
  PIXEL_COLOURS.forEach((colour, index) => {
    const item = element('li', undefined, undefined, legend);
    const swatch = element('span', 'pixel-break-swatch', undefined, item);
    swatch.dataset.colour = index;
    swatch.setAttribute('aria-hidden', 'true');
    element('span', undefined, colour, item);
  });
  const clear = button('pixel-break-clear', 'Clear board', toolbar);
  const viewport = element('div', 'pixel-break-viewport', undefined, section);
  const grid = element('div', 'pixel-break-grid', undefined, viewport);
  grid.setAttribute('role', 'grid');
  grid.setAttribute('aria-label', 'Pixel drawing board');
  grid.setAttribute('aria-rowcount', PIXEL_ROWS);
  grid.setAttribute('aria-colcount', PIXEL_COLUMNS);
  const keyboardHint = element('p', 'pixel-break-keyboard', 'Arrow keys move between squares. Space or Enter changes the colour.', section);
  keyboardHint.id = `${prefix}-keyboard`;
  grid.setAttribute('aria-describedby', `${hint.id} ${keyboardHint.id}`);
  element('p', 'pixel-break-pan-hint', 'Slide across the board to reach more squares.', section);
  const status = element('p', 'pixel-break-status', '', section);
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');

  const values = Array(PIXEL_ROWS * PIXEL_COLUMNS).fill(0);
  const cells = [];
  let active = 0;

  function labelCell(index) {
    const row = Math.floor(index / PIXEL_COLUMNS) + 1;
    const column = index % PIXEL_COLUMNS + 1;
    const next = PIXEL_COLOURS[(values[index] + 1) % PIXEL_COLOURS.length];
    cells[index].dataset.colour = values[index];
    cells[index].setAttribute('aria-label', `Row ${row}, column ${column}: ${PIXEL_COLOURS[values[index]]}. Activate for ${next.toLowerCase()}.`);
  }

  function focusCell(index) {
    cells[active].tabIndex = -1;
    active = index;
    cells[active].tabIndex = 0;
    cells[active].focus({preventScroll: true});
    cells[active].scrollIntoView({block: 'nearest', inline: 'nearest', behavior: 'instant'});
  }

  for (let row = 0; row < PIXEL_ROWS; row += 1) {
    const rowNode = element('div', 'pixel-break-row', undefined, grid);
    rowNode.setAttribute('role', 'row');
    rowNode.setAttribute('aria-rowindex', row + 1);
    for (let column = 0; column < PIXEL_COLUMNS; column += 1) {
      const cell = element('div', 'pixel-break-cell', undefined, rowNode);
      cell.setAttribute('role', 'gridcell');
      cell.setAttribute('aria-colindex', column + 1);
      const square = button('pixel-break-square', undefined, cell);
      const index = row * PIXEL_COLUMNS + column;
      square.dataset.pixel = index;
      square.tabIndex = index === 0 ? 0 : -1;
      cells.push(square);
      labelCell(index);
    }
  }

  listen(grid, 'click', event => {
    const square = event.target.closest('button[data-pixel]');
    if (!square || !grid.contains(square)) return;
    const index = Number(square.dataset.pixel);
    values[index] = (values[index] + 1) % PIXEL_COLOURS.length;
    labelCell(index);
    focusCell(index);
    status.textContent = `Row ${Math.floor(index / PIXEL_COLUMNS) + 1}, column ${index % PIXEL_COLUMNS + 1}: ${PIXEL_COLOURS[values[index]]}.`;
  });
  listen(grid, 'keydown', event => {
    const square = event.target.closest('button[data-pixel]');
    if (!square || event.defaultPrevented || event.isComposing || event.keyCode === 229 || event.altKey || event.metaKey) return;
    const index = Number(square.dataset.pixel);
    const row = Math.floor(index / PIXEL_COLUMNS);
    const column = index % PIXEL_COLUMNS;
    let next = index;
    if (event.key === 'ArrowRight' && !event.ctrlKey) next = row * PIXEL_COLUMNS + Math.min(column + 1, PIXEL_COLUMNS - 1);
    else if (event.key === 'ArrowLeft' && !event.ctrlKey) next = row * PIXEL_COLUMNS + Math.max(column - 1, 0);
    else if (event.key === 'ArrowDown' && !event.ctrlKey) next = Math.min(row + 1, PIXEL_ROWS - 1) * PIXEL_COLUMNS + column;
    else if (event.key === 'ArrowUp' && !event.ctrlKey) next = Math.max(row - 1, 0) * PIXEL_COLUMNS + column;
    else if (event.key === 'Home') next = event.ctrlKey ? 0 : row * PIXEL_COLUMNS;
    else if (event.key === 'End') next = event.ctrlKey ? values.length - 1 : row * PIXEL_COLUMNS + PIXEL_COLUMNS - 1;
    else return; // Native button activation supplies Enter and Space exactly once.
    event.preventDefault();
    focusCell(next);
  });
  listen(clear, 'click', () => {
    values.fill(0);
    cells.forEach((_, index) => labelCell(index));
    status.textContent = 'Board cleared.';
  });

  return {destroy() { lifecycle.abort(); section.remove(); }};
}
