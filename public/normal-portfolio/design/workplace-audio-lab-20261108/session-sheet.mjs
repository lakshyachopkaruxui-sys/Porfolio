import {APPROACHES, SCENARIOS} from './model.mjs';

// Labels intentionally match the existing comparison. This sheet never reads or
// changes prototype state and never turns a simulation into a participant result.
export const APPROACH_LABELS = Object.freeze({existing: 'Existing-pattern comparison', receipt: 'Explicit action receipt'});
export const SCENARIO_LABELS = Object.freeze({confirmed: 'Confirmed immediately', delayed: 'Delayed · result still pending', failed: 'Known failure · not applied', unknown: 'Unknown · response unavailable'});
export const TASKS = Object.freeze([
  {id: 'normal', title: 'Normal response', prompt: 'You no longer want this track. Change it, keeping the route information available.', setup: 'Reset, choose the intended approach and Confirmed immediately. Keep the same initial track and available input paths.'},
  {id: 'delayed', title: 'Delayed response', prompt: 'You no longer want this track. Change it, keeping the route information available.', setup: 'Use Delayed · result still pending in both approaches. Record the declared response condition and any manually supplied result.'},
  {id: 'unknown', title: 'Unknown outcome', prompt: 'What do you believe happened? What would you do now?', setup: 'Use Unknown · response unavailable or declare Lose the response after a delayed request. Record which method was used.'},
  {id: 'read-state', title: 'Read current state', prompt: 'Find out what the player currently reports, if that information is available.', setup: 'Begin with a declared pending/unknown result. After Check playback state, supply the chosen authoritative playback snapshot. Record its actual values.'},
  {id: 'failure', title: 'Known failure', prompt: 'What would you do next?', setup: 'Use Known failure · not applied, or declare Confirm no change during a pending request. Record which setup was used.'},
  {id: 'mute', title: 'Local mute with pending change', prompt: 'You want the output quiet while this is unresolved.', setup: 'Begin with a delayed request. The model is silent; observe what the person thinks the local mute flag means.'},
  {id: 'return', title: 'Change view and return', prompt: 'Leave the music view, then return when useful.', setup: 'Declare the same pending/unknown condition in both approaches. Do not tell the person a particular route or expected answer.'},
  {id: 'reload', title: 'Refresh/reload', prompt: 'We will reload this model now. What do you believe happened?', setup: 'Declare a reload with an unresolved command. This does not recreate a physical head-unit reboot. Record the interpretation after restoration.'},
]);
export const CRITICAL_LABELS = Object.freeze({
  'none-observed': 'None observed in this trial',
  'capture-as-success': 'Local input treated as confirmed playback',
  'last-known-as-current': 'Last-known track treated as definitely current under unknown',
  'mute-as-cancel': 'Mute treated as cancelling or confirming the track request',
  'return-as-action': 'Leaving/reloading treated as sending or cancelling a command',
  'query-as-next': 'Reading playback state treated as another Next',
  other: 'Other supported misunderstanding — describe in notes',
});
const COMPREHENSION_LABELS = {accurate: 'Accurate for the supplied state', incorrect: 'Incorrect', unclear: 'Unclear from the observation'};
const OUTCOME_LABELS = {completed: 'Goal completed', 'left-by-choice': 'Left deliberately; not automatically a failure', blocked: 'Blocked', stopped: 'Stopped or interrupted'};
const TRIAL_KIND_LABELS = {independent: 'Independent comparison trial', practice: 'Practice', exploration: 'Exploration with carried state'};
const nullable = value => typeof value === 'string' && value.trim() ? value.trim() : null;
const checked = value => value === true || value === 'on';
const allowed = (value, choices, label, optional = false) => {
  if (optional && !value) return null;
  if (!choices.includes(value)) throw new Error(`Choose ${label}.`);
  return value;
};
export function optionalCount(value, label = 'a count') {
  const text = value == null ? '' : String(value).trim();
  if (!text) return null;
  if (!/^\d+$/.test(text) || !Number.isSafeInteger(Number(text))) throw new Error(`Enter a whole, non-negative number for ${label}, or leave it blank.`);
  return Number(text);
}
export function createSession(raw, {draft = false} = {}) {
  const participantCode = nullable(raw.participantCode);
  if ((participantCode && !/^[A-Za-z]{1,3}\d{1,4}$/.test(participantCode)) || (!draft && !participantCode)) {
    throw new Error('Use an anonymous research code such as P01; do not enter a name or contact detail.');
  }
  const order = draft && !raw.order ? null : allowed(raw.order, ['AB', 'BA'], 'the planned A/B order');
  const round = draft && !raw.round ? null : allowed(raw.round, ['pilot', 'matched', 'retest'], 'the study round');
  if (!draft && (!checked(raw.stationary) || !checked(raw.participationAgreed) || !checked(raw.simulationExplained))) {
    throw new Error('Confirm stationary use, agreed participation and the explained simulation before adding observations.');
  }
  return {participantCode, sessionDate: nullable(raw.sessionDate), round, plannedOrder: order,
    language: nullable(raw.language), familiarity: nullable(raw.familiarity), baselineContext: nullable(raw.baselineContext),
    researcherMarked: {stationary: checked(raw.stationary), participationAgreed: checked(raw.participationAgreed), simulationExplained: checked(raw.simulationExplained)}};
}
export function createObservation(raw, id) {
  const task = TASKS.find(task => task.id === raw.taskId);
  if (!task) throw new Error('Choose the task actually observed.');
  const approach = allowed(raw.approach, APPROACHES, 'the actual approach');
  const scenario = allowed(raw.scenario, SCENARIOS, 'the actual response setting');
  const trialKind = allowed(raw.trialKind, ['independent', 'practice', 'exploration'], 'the trial kind');
  if (trialKind === 'independent' && !checked(raw.resetConfirmed)) throw new Error('Reset before an independent trial, or record carried state as exploration.');
  const observedActions = nullable(raw.observedActions);
  if (!observedActions) throw new Error('Record an action or explanation actually observed. A planned result is not an observation.');
  return {id, taskId: task.id, taskTitle: task.title, suggestedPrompt: task.prompt,
    approach, scenario, trialKind, resetConfirmed: checked(raw.resetConfirmed), setupNotes: nullable(raw.setupNotes),
    observedActions, participantExplanation: nullable(raw.participantExplanation),
    comprehension: allowed(raw.comprehension, ['accurate', 'incorrect', 'unclear'], 'a state-understanding code', true),
    taskOutcome: allowed(raw.taskOutcome, ['completed', 'left-by-choice', 'blocked', 'stopped'], 'a task outcome', true),
    helpCount: optionalCount(raw.helpCount, 'help events'), repeatCount: optionalCount(raw.repeatCount, 'repeated command attempts'),
    criticalCode: allowed(raw.criticalCode, Object.keys(CRITICAL_LABELS), 'a misunderstanding code', true),
    interpretation: nullable(raw.interpretation), timingNote: nullable(raw.timingNote)};
}
export function upsertObservation(records, observation) {
  const index = records.findIndex(record => record.id === observation.id);
  return index < 0 ? [...records, observation] : records.map((record, position) => position === index ? observation : record);
}
export function removeObservation(records, id) {
  return records.filter(record => record.id !== id);
}
export function createExport(session, records, exportedAt = new Date().toISOString()) {
  return {schemaVersion: 1, tool: 'Workplace audio/navigation session sheet',
    exportedAt, exportTimeMeaning: 'File preparation time from the browser clock, not participant timing',
    prototypePath: 'normal-portfolio/design/workplace-audio-lab-20261108/',
    protocol: 'hmi-audio-evaluation-20261108.md', captureMethod: 'Manual researcher entry; not prototype telemetry',
    recordStatus: records.length ? 'Researcher-entered observations; not independently verified' : 'No observations recorded',
    session, recordCount: records.length, observations: records,
    measurementBoundary: 'No automatic participant time, gaze, safety score, success rate or winner. Missing fields are null; entered counts come from the researcher.'};
}

export function mountSessionSheet(document) {
  const byId = id => document.getElementById(id);
  const sessionForm = byId('session-form');
  const trialForm = byId('trial-form');
  const sessionFields = byId('session-fields');
  const status = byId('sheet-status');
  const error = byId('sheet-error');
  const dialog = byId('clear-dialog');
  let session = null;
  let records = [];
  let editId = null;
  let nextId = 1;
  let removalId = null;
  let dirty = false;
  let trialDirty = false;
  const control = (form, name) => form.elements.namedItem(name);
  const read = form => Object.fromEntries([...form.elements].filter(element => element.name)
    .map(element => [element.name, element.type === 'checkbox' ? element.checked : element.value]));
  const message = text => { status.textContent = text; error.hidden = true; };
  const fail = problem => { error.textContent = problem.message; error.hidden = false; error.tabIndex = -1; error.focus(); };
  const node = (tag, text, parent) => {
    const item = document.createElement(tag);
    if (text != null) item.textContent = text;
    parent?.append(item);
    return item;
  };
  function options(select, entries) {
    for (const [value, label] of entries) { const option = node('option', label, select); option.value = value; }
  }
  options(byId('task-select'), TASKS.map(task => [task.id, task.title]));
  options(byId('approach-select'), APPROACHES.map(value => [value, `${value === 'existing' ? 'A' : 'B'} · ${APPROACH_LABELS[value]}`]));
  options(byId('scenario-select'), SCENARIOS.map(value => [value, SCENARIO_LABELS[value]]));
  options(byId('critical-select'), Object.entries(CRITICAL_LABELS));
  function taskHelp() {
    const task = TASKS.find(task => task.id === control(trialForm, 'taskId').value);
    byId('task-card').hidden = !task;
    if (task) { byId('task-name').textContent = task.title; byId('task-prompt').textContent = `Neutral prompt: “${task.prompt}”`; byId('task-setup').textContent = `Researcher setup: ${task.setup}`; }
  }
  function resetTrial() {
    trialForm.reset(); taskHelp(); editId = null; trialDirty = false;
    byId('save-trial').textContent = 'Add observed trial'; byId('cancel-edit').hidden = true;
  }
  function edit(record) {
    resetTrial(); editId = record.id;
    for (const [name, value] of Object.entries(record)) {
      const input = control(trialForm, name);
      if (!input) continue;
      if (input.type === 'checkbox') input.checked = Boolean(value);
      else input.value = value ?? '';
    }
    taskHelp(); byId('save-trial').textContent = 'Save changes'; byId('cancel-edit').hidden = false;
    control(trialForm, 'observedActions').focus(); message('Editing the existing record. Save changes to replace it; cancel keeps the earlier version.');
  }
  function renderRecords() {
    const container = byId('records'); container.replaceChildren();
    if (!records.length) { node('p', 'No observations recorded.', container); return; }
    for (const [index, record] of records.entries()) {
      const article = node('article', null, container); article.className = 'record';
      const header = node('header', null, article); node('h3', `Record ${index + 1} · ${record.taskTitle}`, header);
      const actions = node('div', null, header);
      const button = node('button', 'Edit', actions); button.type = 'button'; button.className = 'secondary'; button.setAttribute('aria-label', `Edit record ${index + 1}`); button.addEventListener('click', () => edit(record));
      const remove = node('button', 'Remove', actions); remove.type = 'button'; remove.className = 'secondary'; remove.setAttribute('aria-label', `Remove record ${index + 1}`); remove.addEventListener('click', () => {
        removalId = record.id; byId('clear-title').textContent = `Remove record ${index + 1}?`;
        byId('clear-description').textContent = 'This removes only that record from this tab. The other notes and any downloaded files stay unchanged.';
        byId('confirm-clear').textContent = 'Remove record'; dialog.showModal();
      });
      const meta = node('p', `${APPROACH_LABELS[record.approach]} · ${SCENARIO_LABELS[record.scenario]} · ${TRIAL_KIND_LABELS[record.trialKind]}`, article); meta.className = 'record-meta';
      const list = node('dl', null, article);
      for (const [label, value] of [['Observed actions', record.observedActions], ['Participant explanation', record.participantExplanation],
        ['Understanding', COMPREHENSION_LABELS[record.comprehension]], ['Task outcome', OUTCOME_LABELS[record.taskOutcome]], ['Help events', record.helpCount],
        ['Repeated command attempts', record.repeatCount], ['Critical misunderstanding', CRITICAL_LABELS[record.criticalCode]],
        ['Researcher interpretation', record.interpretation], ['Independent timing note', record.timingNote], ['Setup notes', record.setupNotes]]) {
        node('dt', label, list); node('dd', value == null || value === '' ? 'Not recorded / not assessed' : String(value), list);
      }
    }
  }
  byId('task-select').addEventListener('change', taskHelp);
  trialForm.addEventListener('submit', event => {
    event.preventDefault();
    if (!sessionForm.reportValidity() || !trialForm.reportValidity()) return;
    try {
      const currentSession = session || createSession(read(sessionForm));
      const record = createObservation(read(trialForm), editId || `trial-${nextId}`);
      const editing = Boolean(editId);
      records = upsertObservation(records, record); session = currentSession;
      if (!editing) nextId++;
      dirty = true;
      sessionFields.disabled = true; resetTrial(); renderRecords();
      message(`${records.length} record${records.length === 1 ? '' : 's'} in this tab. Session setup is locked; export and clear before another participant.`);
    } catch (problem) { fail(problem); }
  });
  byId('cancel-edit').addEventListener('click', () => {
    const editing = Boolean(editId); resetTrial();
    message(editing ? 'Edit cancelled. The earlier record is unchanged.' : 'Unsaved trial cleared. Recorded trials are unchanged.');
  });
  for (const name of ['input', 'change']) {
    sessionForm.addEventListener(name, () => { dirty = true; });
    trialForm.addEventListener(name, () => {
      dirty = true; trialDirty = true; byId('cancel-edit').hidden = false;
      byId('cancel-edit').textContent = editId ? 'Cancel edit' : 'Discard unsaved trial';
    });
  }
  document.defaultView?.addEventListener('beforeunload', event => {
    if (!dirty) return;
    event.preventDefault(); event.returnValue = '';
  });
  byId('export-notes').addEventListener('click', () => {
    try {
      if (trialDirty || editId) throw new Error('Save the current trial or cancel its edit before exporting, so the download includes the notes you intend to keep.');
      const data = createExport(session || createSession(read(sessionForm), {draft: true}), records);
      const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
      const url = URL.createObjectURL(blob);
      const link = node('a', null, document.body); link.href = url; link.download = `workplace-${data.session.participantCode || 'unrecorded'}-notes.json`; link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
      dirty = false;
      message('JSON download prepared locally. No notes were uploaded. Check the downloaded file before clearing this tab.');
    } catch (problem) { fail(problem); }
  });
  byId('clear-notes').addEventListener('click', () => {
    removalId = null; byId('clear-title').textContent = 'Clear notes from this tab?';
    byId('clear-description').textContent = 'Export first if you need these notes. This clears the session and trial records in memory. Files you already downloaded stay on your computer.';
    byId('confirm-clear').textContent = 'Clear this tab'; dialog.showModal();
  });
  byId('cancel-clear').addEventListener('click', () => { removalId = null; dialog.close(); byId('clear-notes').focus(); });
  byId('confirm-clear').addEventListener('click', () => {
    if (removalId) {
      records = removeObservation(records, removalId);
      if (editId === removalId) resetTrial();
      if (!records.length) { session = null; sessionFields.disabled = false; }
      removalId = null; dirty = true; renderRecords(); dialog.close();
      message(`${records.length} record${records.length === 1 ? '' : 's'} remain in this tab. Export again to keep this version.`);
      byId('export-notes').focus(); return;
    }
    records = []; session = null; nextId = 1; sessionFields.disabled = false; sessionForm.reset(); resetTrial(); renderRecords(); dialog.close();
    dirty = false;
    message('This tab is clear. Exported files have not been changed. No observations recorded.'); control(sessionForm, 'participantCode').focus();
  });
}
if (typeof document !== 'undefined' && document.querySelector('[data-session-sheet]')) mountSessionSheet(document);
