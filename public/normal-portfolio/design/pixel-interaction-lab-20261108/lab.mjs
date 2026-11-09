import {COLUMNS, ROWS, COLORS, CONDITIONS, TASKS, createModel, cycleCell, paintCells, resetBoard, undo, lineBetween, moveFocus, prepareTask, runSummary} from './model.mjs';

const $ = id => document.getElementById(id);
const board = $('board');
const conditionInputs = [...document.querySelectorAll('[name="condition"]')];
const cells = [];
let model = createModel();
let condition = 'cycle';
let selectedColor = 1;
let activeIndex = 0;
let panning = false;
let pending = null;
let run = null;
const records = [];

function announce(text) { $('board-status').textContent = text; }
function colorStyle(element, color) {
  element.style.backgroundColor = COLORS[color].hex;
  element.style.color = color === 1 ? '#fff' : '#222';
}
function record(kind, value = 1) {
  if (run) run.counts[kind] = (run.counts[kind] || 0) + value;
}
function renderCells(values = model.cells) {
  values.forEach((color, index) => {
    const cell = cells[index];
    if (cell.dataset.color === String(color)) return;
    cell.dataset.color = String(color);
    cell.textContent = COLORS[color].code;
    cell.setAttribute('aria-label', `Row ${Math.floor(index / COLUMNS) + 1}, column ${index % COLUMNS + 1}, ${COLORS[color].name}`);
    colorStyle(cell, color);
  });
}
function render() {
  renderCells();
  $('undo').disabled = !model.history.length;
  $('reset').disabled = !model.cells.some(Boolean);
  board.classList.toggle('is-panning', panning);
  board.classList.toggle('show-letters', $('letters').checked);
  $('pan').setAttribute('aria-pressed', String(panning));
  $('pan').textContent = panning ? 'Return to painting' : 'Move board view';
}
function focusCell(index, focus = true) {
  cells[activeIndex].tabIndex = -1;
  activeIndex = index;
  cells[index].tabIndex = 0;
  if (focus) {
    cells[index].focus({preventScroll: true});
    cells[index].scrollIntoView({block: 'nearest', inline: 'nearest', behavior: 'auto'});
  }
}
function change(next, kind, input) {
  const changed = next.cells.reduce((count, value, index) => count + (value !== model.cells[index] ? 1 : 0), 0);
  model = next;
  if (['cycle', 'paint', 'stroke'].includes(kind)) {
    record('activations'); record('changedCells', changed); record(input || 'assistive');
  } else record(kind);
  render();
  return changed;
}
function activate(index, input = 'keyboard') {
  if (panning) { announce('Move view is active. Return to painting to change a square.'); return; }
  const next = condition === 'cycle' ? cycleCell(model, index) : paintCells(model, [index], selectedColor);
  change(next, condition === 'cycle' ? 'cycle' : 'paint', input);
  announce(`Row ${Math.floor(index / COLUMNS) + 1}, column ${index % COLUMNS + 1}: ${COLORS[model.cells[index]].name}.`);
}
function performUndo() {
  cancelGesture();
  if (!model.history.length) { announce('No action to undo.'); return; }
  change(undo(model), 'undo'); announce('Last action undone.');
}

for (let row = 0; row < ROWS; row++) {
  const line = document.createElement('div');
  line.className = 'board-row'; line.setAttribute('role', 'row'); line.setAttribute('aria-rowindex', String(row + 1));
  for (let column = 0; column < COLUMNS; column++) {
    const cell = document.createElement('button');
    const index = row * COLUMNS + column;
    cell.type = 'button'; cell.className = 'cell'; cell.dataset.index = String(index);
    cell.setAttribute('role', 'gridcell'); cell.setAttribute('aria-colindex', String(column + 1)); cell.tabIndex = index === 0 ? 0 : -1;
    line.append(cell); cells.push(cell);
  }
  board.append(line);
}

function renderPalette() {
  $('palette').replaceChildren();
  $('palette').setAttribute('aria-label', condition === 'cycle' ? 'Colour cycle, read-only legend' : 'Choose a painting colour');
  COLORS.forEach((color, index) => {
    const item = document.createElement(condition === 'cycle' ? 'span' : 'button');
    item.className = 'palette-item';
    const swatch = document.createElement('span'); swatch.className = 'swatch'; swatch.textContent = color.code; swatch.setAttribute('aria-hidden', 'true'); colorStyle(swatch, index);
    item.append(swatch, document.createTextNode(color.name));
    if (condition !== 'cycle') {
      item.type = 'button'; item.dataset.colourChoice = String(index); item.setAttribute('aria-pressed', String(index === selectedColor));
      item.addEventListener('click', () => { cancelGesture(); selectedColor = index; record('colourSelections'); renderPalette(); $('palette').querySelector(`[data-colour-choice="${index}"]`).focus({preventScroll: true}); announce(`${color.name} selected. Activate a square${condition === 'drag' ? ' or draw a stroke' : ''}.`); });
    }
    $('palette').append(item);
  });
  $('selected-colour').textContent = condition === 'cycle' ? 'Cream → Blue → Orange → Lime → Magenta → Cream' : `Selected colour: ${COLORS[selectedColor].name}`;
  $('condition-description').textContent = CONDITIONS[condition].description;
}

function locate(event) {
  const bounds = board.getBoundingClientRect();
  const column = Math.floor((event.clientX - bounds.left) / (bounds.width / COLUMNS));
  const row = Math.floor((event.clientY - bounds.top) / (bounds.height / ROWS));
  return column >= 0 && column < COLUMNS && row >= 0 && row < ROWS ? row * COLUMNS + column : null;
}
function preview() {
  if (!pending || condition !== 'drag') return;
  const values = [...model.cells]; pending.indices.forEach(index => { values[index] = pending.color; }); renderCells(values);
}
function cancelGesture() {
  if (!pending) return;
  const id = pending.id; pending = null;
  if (board.hasPointerCapture?.(id)) board.releasePointerCapture(id);
  renderCells();
}
board.addEventListener('pointerdown', event => {
  if (panning || event.button !== 0 || pending) return;
  const index = locate(event); if (index === null) return;
  event.preventDefault(); focusCell(index, false); cells[index].focus({preventScroll: true});
  pending = {id: event.pointerId, input: event.pointerType || 'mouse', indices: new Set([index]), previous: index, first: index, x: event.clientX, y: event.clientY, moved: false, color: selectedColor};
  board.setPointerCapture(event.pointerId); preview();
});
board.addEventListener('pointermove', event => {
  if (!pending || pending.id !== event.pointerId) return;
  if (Math.hypot(event.clientX - pending.x, event.clientY - pending.y) > 10) pending.moved = true;
  if (condition !== 'drag') return;
  const index = locate(event);
  if (index === null) { pending.previous = null; return; }
  const path = pending.previous === null ? [index] : lineBetween(pending.previous, index);
  path.forEach(cell => pending.indices.add(cell)); pending.previous = index; preview();
});
board.addEventListener('pointerup', event => {
  if (!pending || pending.id !== event.pointerId) return;
  const gesture = pending;
  if (condition === 'drag') {
    const last = locate(event);
    if (last !== null) (gesture.previous === null ? [last] : lineBetween(gesture.previous, last)).forEach(index => gesture.indices.add(index));
  }
  pending = null;
  if (board.hasPointerCapture(event.pointerId)) board.releasePointerCapture(event.pointerId);
  if (condition === 'drag') {
    const count = change(paintCells(model, [...gesture.indices], gesture.color), 'stroke', gesture.input);
    announce(`Stroke finished. ${count} ${count === 1 ? 'square changed' : 'squares changed'}. Undo restores the stroke.`);
  } else if (!gesture.moved && locate(event) === gesture.first) activate(gesture.first, gesture.input);
  else { renderCells(); announce('No square changed. This condition uses single-square activations.'); }
});
board.addEventListener('pointercancel', () => { cancelGesture(); announce('Stroke cancelled. The board is unchanged.'); });
board.addEventListener('lostpointercapture', () => { if (pending) { cancelGesture(); announce('Stroke cancelled. The board is unchanged.'); } });
board.addEventListener('click', event => {
  // Assistive activation does not necessarily emit pointer or key events.
  if (event.detail !== 0 || !event.target.matches('.cell')) return;
  activate(Number(event.target.dataset.index), 'assistive');
});
board.addEventListener('focusin', event => { if (event.target.matches('.cell')) focusCell(Number(event.target.dataset.index), false); });
board.addEventListener('keydown', event => {
  if (event.key === 'Escape' && pending) { event.preventDefault(); cancelGesture(); announce('Stroke cancelled. The board is unchanged.'); return; }
  if (!event.target.matches('.cell')) return;
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
    event.preventDefault(); focusCell(moveFocus(activeIndex, event.key, event.ctrlKey || event.metaKey)); return;
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
    event.preventDefault(); performUndo(); return;
  }
  if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); if (!event.repeat) activate(activeIndex); }
});

conditionInputs.forEach(input => input.addEventListener('change', () => {
  if (!input.checked) return;
  cancelGesture(); condition = input.value; renderPalette(); render(); announce(`${CONDITIONS[condition].label}. Your drawing is retained.`);
}));
$('undo').addEventListener('click', performUndo);
$('reset').addEventListener('click', () => { cancelGesture(); change(resetBoard(model), 'reset'); announce('Board cleared. Undo can restore it.'); });
$('pan').addEventListener('click', () => { cancelGesture(); panning = !panning; record('panChanges'); render(); announce(panning ? 'Move view is active. Scroll or swipe the board; painting is paused.' : 'Painting is active.'); });
$('letters').addEventListener('change', render);

function taskCopy() {
  const task = TASKS[$('task').value]; $('task-goal').textContent = task.goal;
  $('reference').hidden = !task.pattern; $('reference-grid').replaceChildren();
  if (task.pattern) {
    $('reference-grid').className = 'reference-grid'; $('reference-grid').style.gridTemplateColumns = `repeat(${task.pattern[0].length},23px)`;
    task.pattern.flat().forEach(color => { const pixel = document.createElement('span'); pixel.textContent = COLORS[color].code; colorStyle(pixel, color); $('reference-grid').append(pixel); });
  }
  $('start-log').disabled = $('task').value === 'explore' || Boolean(run);
}
function prepare() {
  cancelGesture(); model = prepareTask($('task').value); selectedColor = 1; panning = false; focusCell(0, false); renderPalette(); render();
}
$('task').addEventListener('change', taskCopy);
$('prepare').addEventListener('click', () => { prepare(); announce('Prepared board loaded. Read the task before starting.'); });

function renderRecords() {
  $('log-rows').replaceChildren();
  records.forEach(item => {
    const row = document.createElement('tr');
    const labels = {completed: 'Completed without help', helped: 'Completed with help', stopped: 'Stopped / incomplete', interrupted: 'Interrupted'};
    [CONDITIONS[item.condition].label, TASKS[item.task].title, (item.elapsedMs / 1000).toFixed(1), labels[item.outcome], String(item.counts.activations)].forEach(value => { const cell = document.createElement('td'); cell.textContent = value; row.append(cell); });
    $('log-rows').append(row);
  });
  $('export-log').disabled = !records.length || Boolean(run); $('clear-log').disabled = !records.length || Boolean(run);
}
function recordingState() {
  conditionInputs.forEach(input => { input.disabled = Boolean(run); });
  $('task').disabled = Boolean(run); $('prepare').disabled = Boolean(run); $('stop-log').disabled = !run || !$('outcome').value; $('outcome').disabled = !run;
  taskCopy(); renderRecords();
}
$('start-log').addEventListener('click', () => {
  if (run || $('task').value === 'explore') return;
  prepare(); run = {condition, task: $('task').value, started: performance.now(), counts: {}};
  $('outcome').value = ''; recordingState(); $('log-status').textContent = 'Recording this task locally. Choose the observed outcome before finishing; no outcome is preselected.';
});
function finishRun(outcome) {
  if (!run) return;
  if (!['completed', 'helped', 'stopped', 'interrupted'].includes(outcome)) { $('log-status').textContent = 'Choose an observed outcome before recording the task.'; return; }
  cancelGesture();
  records.push(runSummary({...run, elapsedMs: performance.now() - run.started, outcome})); run = null; recordingState();
  $('log-status').textContent = `Task recorded locally. ${records.length} ${records.length === 1 ? 'record' : 'records'} in this tab. No result is scored automatically.`;
}
$('stop-log').addEventListener('click', () => finishRun($('outcome').value));
$('outcome').addEventListener('change', () => { $('stop-log').disabled = !run || !$('outcome').value; });
$('clear-log').addEventListener('click', () => { records.length = 0; renderRecords(); $('log-status').textContent = 'Local task records cleared.'; });
$('export-log').addEventListener('click', () => {
  const payload = {exploration: 'Pixel interaction comparison, November 2026', scope: 'Simplified input prototype; no automatic usability verdict', board: {columns: COLUMNS, rows: ROWS}, colours: COLORS, records};
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], {type: 'application/json'}));
  const link = document.createElement('a'); link.href = url; link.download = 'pixel-interaction-local-records.json'; document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  $('log-status').textContent = 'Local JSON exported. Keep observation notes alongside it; action counts do not determine a winner.';
});
window.addEventListener('blur', cancelGesture);
document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelGesture(); finishRun('interrupted'); } });
renderPalette(); render(); taskCopy(); announce('Condition A is ready. Activate a square to advance its colour.');
