// November 2026 AI-assisted UX continuation. Local simulation only.
// No credentials, medicine recommendations, payment SDK or service connection.
export const ITEMS = Object.freeze([
  Object.freeze({id: 'a', name: 'Item A', priceCents: 4000, permitted: 2}),
  Object.freeze({id: 'b', name: 'Item B', priceCents: 2500, permitted: 1}),
]);

export const SCENARIOS = Object.freeze({
  normal: {name: 'Available items · confirmed payment', stock: ['available'], payment: ['confirmed'], collection: 'ready'},
  'no-card': {name: 'No demo card · staff help', noCard: true, stock: ['available'], payment: ['confirmed'], collection: 'ready'},
  'unclear-prescription': {name: 'Unclear prescription · staff help', unclear: true, stock: ['available'], payment: ['confirmed'], collection: 'ready'},
  'out-of-stock': {name: 'Item B unavailable', stock: ['unavailable'], payment: ['confirmed'], collection: 'ready'},
  'stock-unknown': {name: 'Stock check unavailable · recheck', stock: ['unknown', 'available'], payment: ['confirmed'], collection: 'ready'},
  'payment-pending': {name: 'Payment pending · status checks', stock: ['available'], payment: ['pending', 'pending', 'confirmed'], collection: 'ready'},
  'payment-unknown': {name: 'Payment unknown · status checks', stock: ['available'], payment: ['unknown', 'unknown', 'confirmed'], collection: 'ready'},
  'payment-failed': {name: 'Payment failed · one retry', stock: ['available'], payment: ['failed', 'confirmed'], collection: 'ready'},
  'collection-failed': {name: 'Payment confirmed · collection blocked', stock: ['available'], payment: ['confirmed'], collection: 'blocked'},
});

export const HELP_COPY = Object.freeze({
  general: ['Get help from pharmacy staff', 'Show the screen and any demo reference to a member of staff. This prototype does not contact anyone.'],
  'no-card': ['No card? Ask pharmacy staff', 'A pharmacy would need an assisted route for people without a card. This demo does not create an account or request identity documents.'],
  'unclear-prescription': ['Do not guess an unclear item', 'Ask pharmacy staff to check the prescription. The kiosk cannot recommend an alternative or decide what medicine someone needs.'],
  stock: ['Ask staff about availability', 'Stock must be confirmed before payment. Staff would need to explain unavailable items and any permitted next step. The kiosk does not suggest a substitute.'],
  'partial-selection': ['Check partial collection with staff', 'An item from the prepared prescription is not selected. Staff would need to confirm whether collection in parts is appropriate. This demo cannot authorise that choice.'],
  'payment-unresolved': ['Keep this payment reference', 'The payment is not settled. Ask staff to check its status before making another payment. This demo does not simulate a refund or cancel a payment.'],
  'paid-order': ['Keep the paid order reference', 'Payment is confirmed, but collection is not complete. Staff would need to resolve collection. Stopping this demo does not cancel or refund the order.'],
  collection: ['Ask staff to resolve collection', 'Show the confirmed payment and order reference. Do not pay again. Staff would need to check the order and arrange the next step.'],
});

export function createState(scenarioId = 'normal', run = 1) {
  return {
    scenarioId: SCENARIOS[scenarioId] ? scenarioId : 'normal', run,
    step: 'start', accountReady: false, prescription: null,
    quantities: {a: 2, b: 1}, stock: {status: 'not-checked', checks: 0, signature: null},
    orderRef: null, payment: {status: 'not-started', responses: 0, attempts: []},
    collected: false, resumeStep: null, helpReason: null, notice: '',
  };
}

export function selection(state) {
  return ITEMS.map(item => ({...item, quantity: state.quantities[item.id], subtotalCents: item.priceCents * state.quantities[item.id]}));
}

export const totalCents = state => selection(state).reduce((sum, item) => sum + item.subtotalCents, 0);
const signature = state => ITEMS.map(item => `${item.id}:${state.quantities[item.id]}`).join('|');
const responseAt = (values, count) => values[Math.min(count, values.length - 1)];
const pending = state => ['pending', 'unknown'].includes(state.payment.status);
const paid = state => state.payment.status === 'confirmed';

function help(state, reason) {
  return {...state, resumeStep: state.step === 'help' ? state.resumeStep : state.step, step: 'help', helpReason: HELP_COPY[reason] ? reason : 'general', notice: ''};
}

function applyPaymentResponse(state) {
  const scenario = SCENARIOS[state.scenarioId];
  const result = responseAt(scenario.payment, state.payment.responses++);
  state.payment.status = result;
  state.payment.attempts.at(-1).status = result;
  state.step = result === 'confirmed' ? 'collection' : `payment-${result}`;
  state.notice = result === 'confirmed' ? 'Demo payment confirmed. No further payment is available for this order.' : result === 'failed' ? 'This demo attempt failed. A retry is available.' : `Status checked: ${result}. Keep the same reference; no new payment was made.`;
  return state;
}

/** Returns a new state. Invalid, early or repeated events cannot move money state. */
export function transition(previous, event) {
  const state = structuredClone(previous);
  state.notice = '';
  const reject = message => ({...state, notice: message});
  switch (event.type) {
    case 'ENTER_DEMO':
      if (state.step !== 'start') return reject('Use the current step to continue.');
      if (SCENARIOS[state.scenarioId].noCard) return help(state, 'no-card');
      return {...state, accountReady: true, step: 'prescription'};
    case 'CHOOSE_PRESCRIPTION':
      if (state.step !== 'prescription' || !state.accountReady || event.id !== 'DEMO-RX-01') return reject('Choose the prepared demo prescription.');
      if (SCENARIOS[state.scenarioId].unclear) return help(state, 'unclear-prescription');
      return {...state, prescription: event.id, step: 'items'};
    case 'SET_QUANTITY': {
      const item = ITEMS.find(item => item.id === event.id);
      if (state.step !== 'items' || !item || !Number.isInteger(event.quantity) || event.quantity < 0 || event.quantity > item.permitted) return reject('Choose a quantity within the prepared prescription limit.');
      state.quantities[item.id] = event.quantity;
      state.stock = {...state.stock, status: 'not-checked', signature: null};
      return state;
    }
    case 'CHECK_STOCK': {
      if (!['items', 'stock-issue'].includes(state.step) || !state.accountReady || state.prescription !== 'DEMO-RX-01' || totalCents(state) <= 0) return reject('Select at least one permitted demo item before checking stock.');
      if (ITEMS.some(item => state.quantities[item.id] === 0)) return help(state, 'partial-selection');
      let result = responseAt(SCENARIOS[state.scenarioId].stock, state.stock.checks++);
      if (result === 'unavailable' && state.quantities.b === 0) result = 'available';
      state.stock.status = result;
      state.stock.signature = result === 'available' ? signature(state) : null;
      state.step = result === 'available' ? 'review' : 'stock-issue';
      if (result === 'available') state.orderRef ||= `DEMO-${String(state.run).padStart(4, '0')}`;
      return state;
    }
    case 'SUBMIT_PAYMENT':
      if (!['review', 'payment-failed'].includes(state.step) || pending(state) || paid(state) || state.stock.status !== 'available' || state.stock.signature !== signature(state) || !state.orderRef || totalCents(state) <= 0) return reject('Payment is unavailable. Check the current order or ask staff.');
      state.payment.attempts.push({reference: `${state.orderRef}-P${state.payment.attempts.length + 1}`, status: 'not-started', amountCents: totalCents(state), selection: signature(state)});
      return applyPaymentResponse(state);
    case 'CHECK_PAYMENT':
      if (!['payment-pending', 'payment-unknown'].includes(state.step) || !pending(state) || !state.payment.attempts.length) return reject('There is no unsettled payment to check here.');
      return applyPaymentResponse(state);
    case 'CONFIRM_COLLECTION':
      if (state.step !== 'collection' || !paid(state)) return reject('Confirm payment before collection.');
      if (SCENARIOS[state.scenarioId].collection === 'blocked') return {...state, step: 'collection-issue'};
      return {...state, step: 'complete', collected: true};
    case 'HELP':
      if (['complete', 'cancelled', 'handoff'].includes(state.step)) return reject('This demo has ended. You can begin another demo.');
      return help(state, event.reason || (pending(state) ? 'payment-unresolved' : paid(state) ? 'paid-order' : 'general'));
    case 'RETURN_FROM_HELP':
      if (state.step !== 'help' || !state.resumeStep) return reject('There is no earlier step to return to.');
      return {...state, step: state.resumeStep, resumeStep: null, helpReason: null};
    case 'STAFF_HANDOFF':
      if (state.step !== 'help') return reject('Open staff help first.');
      return {...state, step: 'handoff', resumeStep: null};
    case 'CANCEL':
      if (pending(state)) return help(state, 'payment-unresolved');
      if (paid(state) && !state.collected) return help(state, 'paid-order');
      if (state.collected) return reject('Collection is already marked complete.');
      return {...state, step: 'cancelled', resumeStep: null};
    case 'RESET':
      if (!['complete', 'cancelled', 'handoff'].includes(state.step) && (pending(state) || paid(state))) return help(state, pending(state) ? 'payment-unresolved' : 'paid-order');
      return createState(state.scenarioId, state.run + 1);
    case 'BACK':
      if (state.step === 'prescription') return {...state, step: 'start', accountReady: false, prescription: null};
      if (state.step === 'items') return {...state, step: 'prescription', prescription: null};
      if (['review', 'stock-issue'].includes(state.step)) return {...state, step: 'items', stock: {...state.stock, status: 'not-checked', signature: null}};
      if (state.step === 'payment-failed') return {...state, step: 'review'};
      return reject('Use the status check or staff help. Going back cannot clear this payment.');
    default:
      return reject('That action is not available.');
  }
}

export const TASKS = Object.freeze([
  {id: 'T1', goal: 'Use the prepared account and find its prescription.'},
  {id: 'T2', goal: 'Review permitted quantities and explain the total before continuing.'},
  {id: 'T3', goal: 'Handle an item that is unavailable or whose stock cannot be confirmed.'},
  {id: 'T4', goal: 'Get appropriate help without a card or with unclear prescription information.'},
  {id: 'T5', goal: 'Respond to an unsettled payment without making another payment.'},
  {id: 'T6', goal: 'Handle a confirmed payment when collection cannot be completed.'},
]);

export function blankWorksheet() {
  return {prototype: 'Jan kiosk UX lab · 8 November 2026', provenance: 'New AI-assisted continuation; not the 2025 team prototype or a live pharmacy service', sessionCode: '', participantRole: '', language: '', context: '', overallNote: '', tasks: TASKS.map(task => ({id: task.id, goal: task.goal, outcome: 'not observed', assistance: 'not observed', observation: '', interpretation: '', nextChange: ''}))};
}
