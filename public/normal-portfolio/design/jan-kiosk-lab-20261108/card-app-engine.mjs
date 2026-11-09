// New November 2026 walkthrough of one task in the report-selected card/app.
// All accounts, prescriptions, Kendras, items and responses are synthetic.
export const KENDRAS = Object.freeze([
  Object.freeze({id: 'north', name: 'Demo Kendra North'}),
  Object.freeze({id: 'south', name: 'Demo Kendra South'}),
]);
export const APP_SCENARIOS = Object.freeze({
  normal: {name: 'Available example', stock: ['available']},
  'out-of-stock': {name: 'North unavailable · another Kendra', stock: ['unavailable']},
  'stock-unknown': {name: 'Availability unknown · recheck or help', stock: ['unknown', 'available']},
  'unclear-prescription': {name: 'Unclear prepared prescription', unclear: true, stock: ['available']},
});
export const APP_ITEMS = Object.freeze([
  Object.freeze({name: 'Item A', quantity: 2}),
  Object.freeze({name: 'Item B', quantity: 1}),
]);

export function createAppState(scenarioId = 'normal', run = 1) {
  return {scenarioId: APP_SCENARIOS[scenarioId] ? scenarioId : 'normal', run, step: 'start', accountReady: false, prescription: null, kendra: 'north', stock: 'unchecked', checkedKendra: null, checks: 0, request: null, resumeStep: null, helpReason: null, notice: ''};
}

function help(state, reason = 'general') {
  return {...state, resumeStep: state.step === 'help' ? state.resumeStep : state.step, step: 'help', helpReason: reason, notice: ''};
}

export function appTransition(previous, event) {
  const state = structuredClone(previous);
  state.notice = '';
  const reject = message => ({...state, notice: message});
  switch (event.type) {
    case 'ENTER_DEMO':
      if (state.step !== 'start') return reject('Continue from the current step.');
      return {...state, accountReady: true, step: 'prescription'};
    case 'CHOOSE_PRESCRIPTION':
      if (state.step !== 'prescription' || !state.accountReady || event.id !== 'DEMO-RX-01') return reject('Choose the prepared example prescription.');
      if (APP_SCENARIOS[state.scenarioId].unclear) return help(state, 'prescription');
      return {...state, prescription: event.id, step: 'kendra'};
    case 'SET_KENDRA':
      if (state.step !== 'kendra' || !KENDRAS.some(kendra => kendra.id === event.id)) return reject('Choose a listed demo Kendra.');
      return {...state, kendra: event.id, stock: 'unchecked', checkedKendra: null, checks: 0};
    case 'CHECK_AVAILABILITY': {
      if (!['kendra', 'stock-issue'].includes(state.step) || !state.accountReady || state.prescription !== 'DEMO-RX-01' || state.request) return reject('Choose a prescription and Kendra before checking availability.');
      const responses = APP_SCENARIOS[state.scenarioId].stock;
      let result = responses[Math.min(state.checks++, responses.length - 1)];
      if (state.scenarioId === 'out-of-stock' && state.kendra === 'south') result = 'available';
      return {...state, stock: result, checkedKendra: result === 'available' ? state.kendra : null, step: result === 'available' ? 'review' : 'stock-issue'};
    }
    case 'REQUEST_COLLECTION':
      if (state.step !== 'review' || state.stock !== 'available' || state.checkedKendra !== state.kendra || !state.accountReady || !state.prescription || state.request) return reject('Review a confirmed demo availability result before requesting collection.');
      return {...state, step: 'reference', request: {reference: `DEMO-APP-${String(state.run).padStart(4, '0')}`, kendra: state.kendra, prescription: state.prescription, items: APP_ITEMS.map(item => ({...item})), status: 'awaiting-store-review'}};
    case 'BACK':
      if (state.step === 'prescription') return {...state, step: 'start', accountReady: false};
      if (state.step === 'kendra') return {...state, step: 'prescription', prescription: null, stock: 'unchecked', checkedKendra: null};
      if (['review', 'stock-issue'].includes(state.step)) return {...state, step: 'kendra', stock: 'unchecked', checkedKendra: null};
      return reject('Use staff help or end this walkthrough. The request remains unconfirmed.');
    case 'HELP':
      if (['handoff', 'ended'].includes(state.step)) return reject('This walkthrough has ended.');
      return help(state, event.reason || (state.request ? 'request' : state.stock === 'unknown' || state.stock === 'unavailable' ? 'stock' : 'general'));
    case 'RETURN_FROM_HELP':
      if (state.step !== 'help' || !state.resumeStep) return reject('There is no earlier step to return to.');
      return {...state, step: state.resumeStep, resumeStep: null, helpReason: null};
    case 'STAFF_HANDOFF':
      if (state.step !== 'help') return reject('Open staff help first.');
      return {...state, step: 'handoff', resumeStep: null};
    case 'END':
      return state.request ? help(state, 'request') : {...state, step: 'ended'};
    case 'RESET':
      if (state.request && !['handoff', 'ended'].includes(state.step)) return help(state, 'request');
      return createAppState(state.scenarioId, state.run + 1);
    default:
      return reject('That action is not available.');
  }
}

export const APP_TASKS = Object.freeze([
  {id: 'A1', goal: 'Use the prepared account and find its prescription.'},
  {id: 'A2', goal: 'Find out whether the example items are available at a Kendra before making a journey.'},
  {id: 'A3', goal: 'Change the Kendra during review and check the new choice without re-entering the account.'},
  {id: 'A4', goal: 'Respond to unavailable or unknown stock, or unclear prescription information.'},
  {id: 'A5', goal: 'Request collection and explain what the reference does and does not confirm.'},
]);

export function blankAppWorksheet() {
  return {artifact: 'Selected card/app core-task walkthrough · new November 2026 AI-assisted interface', sessionCode: '', role: '', language: '', setting: '', consentRecordedSeparately: '', tasks: APP_TASKS.map(task => ({...task, outcome: 'not observed', assistance: 'not observed', observation: '', interpretation: '', nextChange: ''})), limitations: ''};
}
