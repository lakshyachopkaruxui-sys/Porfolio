import {PIXEL_COLOR_TOKENS} from '../../pixel-mania-source-data.js';

export const COLUMNS = 28;
export const ROWS = 18;
export const CELL_COUNT = COLUMNS * ROWS;
const token = name => PIXEL_COLOR_TOKENS.find(item => item.name === name).hex;
export const COLORS = Object.freeze([
  {name: 'Cream', code: 'C', hex: token('YellowishWhite')},
  {name: 'Blue', code: 'B', hex: token('OceanBlue')},
  {name: 'Orange', code: 'O', hex: token('BruteOrange')},
  {name: 'Lime', code: 'L', hex: token('NeonLime')},
  {name: 'Magenta', code: 'M', hex: token('BubblegumPink')},
]);
export const CONDITIONS = Object.freeze({
  cycle: {label: 'A · Cycle each cell', description: 'Each activation moves one cell to the next colour. Dragging does not paint.'},
  select: {label: 'B · Choose, then tap', description: 'Choose a colour, then activate individual cells. Dragging does not paint.'},
  drag: {label: 'C · Choose, then draw', description: 'Choose a colour, then drag a stroke or activate individual cells.'},
});

function checkIndex(index) {
  if (!Number.isInteger(index) || index < 0 || index >= CELL_COUNT) throw new RangeError('Cell index is outside the board.');
}
function checkColor(color) {
  if (!Number.isInteger(color) || color < 0 || color >= COLORS.length) throw new RangeError('Unknown colour.');
}
export const indexOf = (row, column) => {
  if (!Number.isInteger(row) || !Number.isInteger(column) || row < 0 || row >= ROWS || column < 0 || column >= COLUMNS) throw new RangeError('Row or column is outside the board.');
  return row * COLUMNS + column;
};

export function createModel(cells = Array(CELL_COUNT).fill(0)) {
  if (cells.length !== CELL_COUNT) throw new RangeError('The board must contain 504 cells.');
  for (let index = 0; index < CELL_COUNT; index++) checkColor(cells[index]);
  return {cells: [...cells], history: []};
}

function commit(model, changes) {
  if (!changes.length) return model;
  const cells = [...model.cells];
  changes.forEach(change => { cells[change.index] = change.after; });
  return {cells, history: [...model.history.slice(-99), changes]};
}

export function cycleCell(model, index) {
  checkIndex(index);
  return commit(model, [{index, before: model.cells[index], after: (model.cells[index] + 1) % COLORS.length}]);
}

export function paintCells(model, indices, color) {
  checkColor(color);
  const changes = [];
  for (const index of new Set(indices)) {
    checkIndex(index);
    if (model.cells[index] !== color) changes.push({index, before: model.cells[index], after: color});
  }
  return commit(model, changes);
}

export function resetBoard(model) {
  return paintCells(model, model.cells.map((_, index) => index), 0);
}

export function undo(model) {
  const changes = model.history.at(-1);
  if (!changes) return model;
  const cells = [...model.cells];
  changes.forEach(change => { cells[change.index] = change.before; });
  return {cells, history: model.history.slice(0, -1)};
}

/** Include intermediate cells when a pointer crosses the grid quickly. */
export function lineBetween(start, end) {
  checkIndex(start); checkIndex(end);
  let x = start % COLUMNS, y = Math.floor(start / COLUMNS);
  const endX = end % COLUMNS, endY = Math.floor(end / COLUMNS);
  const dx = Math.abs(endX - x), dy = -Math.abs(endY - y);
  const sx = x < endX ? 1 : -1, sy = y < endY ? 1 : -1;
  let error = dx + dy;
  const result = [];
  while (true) {
    result.push(indexOf(y, x));
    if (x === endX && y === endY) break;
    const doubled = error * 2;
    if (doubled >= dy) { error += dy; x += sx; }
    if (doubled <= dx) { error += dx; y += sy; }
  }
  return result;
}

export function moveFocus(index, key, control = false) {
  checkIndex(index);
  const row = Math.floor(index / COLUMNS), column = index % COLUMNS;
  if (key === 'ArrowLeft') return indexOf(row, Math.max(0, column - 1));
  if (key === 'ArrowRight') return indexOf(row, Math.min(COLUMNS - 1, column + 1));
  if (key === 'ArrowUp') return indexOf(Math.max(0, row - 1), column);
  if (key === 'ArrowDown') return indexOf(Math.min(ROWS - 1, row + 1), column);
  if (key === 'Home') return control ? 0 : indexOf(row, 0);
  if (key === 'End') return control ? CELL_COUNT - 1 : indexOf(row, COLUMNS - 1);
  return index;
}

const flag = [[1, 1, 1, 1], [2, 0, 0, 0]];
export const TASKS = Object.freeze({
  explore: {title: 'Free exploration', goal: 'Make anything you like. This is practice, not a recorded task.', pattern: null},
  flag: {title: 'Small symbol', goal: 'Make a small flag anywhere on the board: four blue squares in a row, with one orange square directly below its left end.', pattern: flag},
  rectangle: {title: 'Larger block', goal: 'Make a solid magenta block anywhere on the board, six squares wide and three squares high. Leave the other squares cream.', pattern: Array.from({length: 3}, () => Array(6).fill(4))},
  recovery: {title: 'Restore a drawing', goal: 'The prepared flag changed by accident. Make it match the reference again, leaving the rest of the board as it is.', pattern: flag},
});

export function prepareTask(task) {
  if (!Object.hasOwn(TASKS, task)) throw new RangeError('Unknown task.');
  let model = createModel();
  if (task !== 'recovery') return model;
  const cells = [...model.cells];
  for (let column = 10; column < 14; column++) cells[indexOf(7, column)] = 1;
  cells[indexOf(8, 10)] = 2;
  model = createModel(cells);
  // One accidental blue-to-orange change is reachable in all three conditions.
  return paintCells(model, [indexOf(7, 12)], 2);
}

/** Export a fixed schema; no free-text, identity, URL or device fingerprint fields. */
export function runSummary({condition, task, elapsedMs, outcome, counts}) {
  if (!Object.hasOwn(CONDITIONS, condition) || !Object.hasOwn(TASKS, task) || task === 'explore') throw new RangeError('Invalid recorded condition or task.');
  if (!['completed', 'helped', 'stopped', 'interrupted'].includes(outcome)) throw new RangeError('Unknown task outcome.');
  const allowed = ['activations', 'changedCells', 'colourSelections', 'undo', 'reset', 'panChanges', 'mouse', 'touch', 'pen', 'keyboard', 'assistive'];
  const safeNumber = value => Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : 0;
  const safeCounts = Object.fromEntries(allowed.map(key => [key, safeNumber(counts?.[key])]));
  return {condition, task, elapsedMs: safeNumber(elapsedMs), timingBasis: 'Recording window, including Start/Finish navigation; not pure painting or task-completion time.', outcome, counts: safeCounts};
}
