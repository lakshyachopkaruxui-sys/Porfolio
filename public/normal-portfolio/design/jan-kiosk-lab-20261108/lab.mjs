import {ITEMS, SCENARIOS, HELP_COPY, TASKS, createState, transition, selection, totalCents, blankWorksheet} from './engine.mjs';

let state = createState();
const screen = document.getElementById('screen');
const progress = document.getElementById('progress');
const notice = document.getElementById('notice');
const money = cents => new Intl.NumberFormat('en-IN', {style: 'currency', currency: 'INR', maximumFractionDigits: 2}).format(cents / 100);
const terminal = () => ['complete', 'cancelled', 'handoff'].includes(state.step);

function node(tag, text, parent, className) {
  const item = document.createElement(tag);
  if (text !== undefined) item.textContent = text;
  if (className) item.className = className;
  parent?.append(item);
  return item;
}

function dispatch(event, preserveFocus) {
  state = transition(state, event);
  render(preserveFocus);
}

function button(label, event, parent, className = '') {
  const item = node('button', label, parent, className);
  item.type = 'button';
  item.addEventListener('click', () => dispatch(event));
  return item;
}

function title(text, intro) {
  const heading = node('h2', text, screen);
  heading.id = 'step-title';
  heading.tabIndex = -1;
  if (intro) node('p', intro, screen, 'screen-intro');
}

function callout(label, text, kind = '') {
  const box = node('div', undefined, screen, `callout ${kind}`);
  node('strong', label, box);
  node('p', text, box);
}

function orderSummary() {
  const list = node('ul', undefined, screen, 'order-list');
  for (const item of selection(state).filter(item => item.quantity > 0)) {
    const row = node('li', undefined, list);
    node('span', `${item.name} · ${item.quantity} × ${money(item.priceCents)}`, row);
    node('strong', money(item.subtotalCents), row);
  }
  const total = node('p', undefined, screen, 'total');
  node('span', 'Demo total', total);
  node('span', money(totalCents(state)), total);
}

function reference() {
  const box = node('div', undefined, screen, 'receipt');
  node('p', 'Order reference', box, 'small');
  node('p', state.orderRef || 'No order created', box, 'reference');
  if (state.payment.attempts.length) {
    node('p', `Payment reference: ${state.payment.attempts.at(-1).reference}`, box, 'small');
    node('p', `Payment status: ${state.payment.status}`, box);
  }
}

function renderProgress() {
  const stages = ['Demo account', 'Prescription & items', 'Review & payment', 'Collection'];
  let stage = 0;
  const actual = state.step === 'help' ? state.resumeStep : state.step;
  if (['prescription', 'items', 'stock-issue'].includes(actual)) stage = 1;
  if (['review', 'payment-failed', 'payment-pending', 'payment-unknown'].includes(actual)) stage = 2;
  if (['collection', 'collection-issue', 'complete'].includes(actual)) stage = 3;
  if (['handoff', 'cancelled'].includes(state.step)) stage = null;
  progress.replaceChildren();
  stages.forEach((text, index) => {
    const item = node('li', `${index + 1}. ${text}`, progress);
    if (index === stage) item.setAttribute('aria-current', 'step');
  });
}

function render(preserveFocus, initial = false) {
  screen.replaceChildren();
  renderProgress();
  switch (state.step) {
    case 'start':
      title('Start with the demo account', 'Use a prepared account to try collecting fictional items from a pharmacy-side kiosk.');
      callout('No real details needed', 'The next button stands in for a card and PIN check. Do not use a real card, PIN or prescription.');
      if (SCENARIOS[state.scenarioId].noCard) {
        callout('No demo card is available', 'You can still ask pharmacy staff for help.', 'warning');
        button('I do not have a card', {type: 'HELP', reason: 'no-card'}, node('div', undefined, screen, 'actions'));
      } else button('Use demo card & PIN', {type: 'ENTER_DEMO'}, node('div', undefined, screen, 'actions'));
      break;
    case 'prescription':
      title('Choose the prepared prescription', 'The account has one fictional prescription. No real patient or medicine information is shown.');
      if (SCENARIOS[state.scenarioId].unclear) {
        callout('This prescription is unclear', 'Ask pharmacy staff to check it. The kiosk cannot interpret it for you.', 'warning');
        button('Get prescription help', {type: 'HELP', reason: 'unclear-prescription'}, node('div', undefined, screen, 'actions'));
      } else {
        callout('DEMO-RX-01', 'Item A · permitted quantity 2. Item B · permitted quantity 1.');
        button('Choose DEMO-RX-01', {type: 'CHOOSE_PRESCRIPTION', id: 'DEMO-RX-01'}, node('div', undefined, screen, 'actions'));
      }
      break;
    case 'items': {
      title('Review items and quantities', 'Choose within the prepared prescription limits. Availability will be checked before payment.');
      for (const item of ITEMS) {
        const card = node('div', undefined, screen, 'item-card');
        const info = node('div', undefined, card);
        node('h3', item.name, info);
        node('p', `${money(item.priceCents)} per fictional unit`, info);
        node('p', `Permitted quantity: ${item.permitted}`, info, 'small');
        const label = node('label', 'Quantity', card);
        label.htmlFor = `quantity-${item.id}`;
        const select = node('select', undefined, label);
        select.id = `quantity-${item.id}`;
        select.setAttribute('aria-label', `${item.name} quantity`);
        for (let quantity = 0; quantity <= item.permitted; quantity++) {
          const option = node('option', String(quantity), select);
          option.value = String(quantity);
        }
        select.value = String(state.quantities[item.id]);
        select.addEventListener('change', () => dispatch({type: 'SET_QUANTITY', id: item.id, quantity: Number(select.value)}, select.id));
      }
      const total = node('p', `Selected demo total: ${money(totalCents(state))}`, screen, 'total');
      total.setAttribute('aria-live', 'polite');
      node('p', 'Leaving out a prescription item requires staff review before this demo can continue.', screen, 'field-hint');
      const next = button('Check availability', {type: 'CHECK_STOCK'}, node('div', undefined, screen, 'actions'));
      next.disabled = totalCents(state) <= 0;
      if (next.disabled) node('p', 'Choose at least one item to check availability.', screen, 'field-hint');
      break;
    }
    case 'stock-issue':
      if (state.stock.status === 'unavailable') {
        title('Item B is unavailable', 'Your selected order cannot be confirmed in full. Payment has not started.');
        callout('Ask staff about the next step', 'The kiosk does not suggest a substitute. A pharmacy would need to confirm whether a partial collection is appropriate.', 'warning');
        button('Get stock help', {type: 'HELP', reason: 'stock'}, node('div', undefined, screen, 'actions'));
      } else {
        title('Availability could not be confirmed', 'Do not pay until the stock check is confirmed.');
        callout('No payment started', 'Try checking again, or ask pharmacy staff for help.', 'warning');
        const actions = node('div', undefined, screen, 'actions');
        button('Check availability again', {type: 'CHECK_STOCK'}, actions);
        button('Get stock help', {type: 'HELP', reason: 'stock'}, actions, 'secondary');
      }
      break;
    case 'review': {
      title('Check before demo payment', 'Check the prescription, quantities and total. All prices and items are fictional.');
      callout('Availability confirmed for this selection', `Prepared prescription: ${state.prescription}. Changing the items requires another availability check.`);
      orderSummary();
      const actions = node('div', undefined, screen, 'actions');
      button(`Make demo payment · ${money(totalCents(state))}`, {type: 'SUBMIT_PAYMENT'}, actions);
      button('Change items & quantities', {type: 'BACK'}, actions, 'secondary');
      node('p', 'This button simulates one payment attempt. No money is moved and no payment details are requested.', screen, 'small');
      break;
    }
    case 'payment-pending':
    case 'payment-unknown': {
      const isUnknown = state.step === 'payment-unknown';
      title(isUnknown ? 'Payment status is unknown' : 'Payment is still pending', 'There is no confirmed result yet. Keep this reference and check the same payment attempt.');
      callout('Do not pay again', 'Another payment is unavailable while this attempt is unsettled. You can check its status or ask staff.', 'warning');
      reference();
      const actions = node('div', undefined, screen, 'actions');
      button('Check demo payment status', {type: 'CHECK_PAYMENT'}, actions);
      button('Get payment help', {type: 'HELP', reason: 'payment-unresolved'}, actions, 'secondary');
      break;
    }
    case 'payment-failed': {
      title('Demo payment failed', 'This attempt has a confirmed failure. No demo payment is confirmed for the order.');
      reference();
      const actions = node('div', undefined, screen, 'actions');
      button('Try demo payment again', {type: 'SUBMIT_PAYMENT'}, actions);
      button('Review the order', {type: 'BACK'}, actions, 'secondary');
      break;
    }
    case 'collection':
      title('Payment confirmed', 'Keep the reference for collection. Do not make another payment for this order.');
      reference();
      orderSummary();
      button('Continue to demo collection', {type: 'CONFIRM_COLLECTION'}, node('div', undefined, screen, 'actions'));
      break;
    case 'collection-issue':
      title('Collection could not be completed', 'Payment is confirmed. Keep this order reference and ask pharmacy staff to resolve collection.');
      reference();
      callout('Do not pay again', 'No refund, replacement or cancellation has been made by this prototype.', 'warning');
      button('Get collection help', {type: 'HELP', reason: 'collection'}, node('div', undefined, screen, 'actions'));
      break;
    case 'help': {
      const [heading, body] = HELP_COPY[state.helpReason] || HELP_COPY.general;
      title(heading, body);
      reference();
      const actions = node('div', undefined, screen, 'actions');
      button('Return to the same step', {type: 'RETURN_FROM_HELP'}, actions);
      button('End demo with staff handoff', {type: 'STAFF_HANDOFF'}, actions, 'secondary');
      node('p', 'The handoff records a stopping point in this demo. It does not mean a staff member was contacted or the issue was resolved.', screen, 'small');
      break;
    }
    case 'handoff':
      title('Demo ended at staff handoff', 'Keep the reference shown here. The issue has not been marked resolved, collected, cancelled or refunded.');
      reference();
      button('Begin another demo', {type: 'RESET'}, node('div', undefined, screen, 'actions'));
      break;
    case 'complete':
      title('Demo collection complete', 'You have reached the end of the simulated flow. No real medicines, money or staff service were involved.');
      reference();
      button('Begin another demo', {type: 'RESET'}, node('div', undefined, screen, 'actions'));
      break;
    case 'cancelled':
      title('Demo stopped before confirmation', 'No demo payment is confirmed. Your real accounts and money are unaffected.');
      button('Begin another demo', {type: 'RESET'}, node('div', undefined, screen, 'actions'));
      break;
  }
  if (!terminal() && state.step !== 'help') {
    const utility = node('div', undefined, screen, 'utilities');
    if (['prescription', 'items', 'stock-issue'].includes(state.step)) button('Back', {type: 'BACK'}, utility, 'quiet');
    button('Staff help', {type: 'HELP'}, utility, 'quiet');
    button(['pending', 'unknown', 'confirmed'].includes(state.payment.status) ? 'Stop and get help' : 'Cancel demo', {type: 'CANCEL'}, utility, 'quiet');
    button('Start over', {type: 'RESET'}, utility, 'quiet');
  }
  notice.textContent = state.notice;
  document.getElementById('scenario-note').textContent = `Current scenario: ${SCENARIOS[state.scenarioId].name}. Scripted responses only. Payment attempts in this run: ${state.payment.attempts.length}.`;
  if (!initial) {
    if (preserveFocus) document.getElementById(preserveFocus)?.focus({preventScroll: true});
    else document.getElementById('step-title')?.focus();
  }
}

const scenarioSelect = document.getElementById('scenario');
for (const [id, scenario] of Object.entries(SCENARIOS)) {
  const option = node('option', scenario.name, scenarioSelect);
  option.value = id;
}
document.getElementById('start-scenario').addEventListener('click', () => {
  state = createState(scenarioSelect.value, state.run + 1);
  render();
});

for (const task of TASKS) {
  const fieldset = node('fieldset', undefined, document.getElementById('task-fields'), 'task-field');
  node('legend', task.id, fieldset);
  node('p', task.goal, fieldset);
  const row = node('div', undefined, fieldset, 'task-row');
  for (const [key, title, options] of [
    ['outcome', 'Observed outcome', ['not observed', 'completed without help', 'completed with help', 'not completed', 'stopped']],
    ['assistance', 'Assistance', ['not observed', 'none', 'prompt', 'staff assistance', 'moderator intervention']],
  ]) {
    const label = node('label', title, row);
    label.htmlFor = `${task.id}-${key}`;
    const select = node('select', undefined, label);
    select.id = `${task.id}-${key}`;
    options.forEach(value => {const option = node('option', value, select); option.value = value;});
  }
  for (const [key, labelText] of [['observation', 'What happened / exact words'], ['interpretation', 'Interpretation — keep separate from observation'], ['nextChange', 'Possible next change / question']]) {
    const label = node('label', labelText, fieldset);
    label.htmlFor = `${task.id}-${key}`;
    const textarea = node('textarea', undefined, fieldset);
    textarea.id = `${task.id}-${key}`;
    textarea.rows = 2;
    textarea.maxLength = 2000;
  }
}

function download(blank = false) {
  const sheet = blankWorksheet();
  if (!blank) {
    sheet.sessionCode = document.getElementById('session-code').value.trim();
    sheet.participantRole = document.getElementById('participant-role').value;
    sheet.language = document.getElementById('session-language').value.trim();
    sheet.context = document.getElementById('session-context').value.trim();
    sheet.overallNote = document.getElementById('overall-note').value.trim();
    for (const task of sheet.tasks) for (const key of ['outcome', 'assistance', 'observation', 'interpretation', 'nextChange']) task[key] = document.getElementById(`${task.id}-${key}`).value;
  }
  const url = URL.createObjectURL(new Blob([JSON.stringify(sheet, null, 2) + '\n'], {type: 'application/json'}));
  const link = document.createElement('a');
  link.href = url;
  link.download = blank ? 'jan-kiosk-blank-observation.json' : 'jan-kiosk-local-observation.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  document.getElementById('export-notice').textContent = blank ? 'Blank template downloaded locally. No results are prefilled.' : 'Worksheet downloaded locally. Nothing was sent to a server.';
}
document.getElementById('download-notes').addEventListener('click', () => download(false));
document.getElementById('download-blank').addEventListener('click', () => download(true));
render(undefined, true);
