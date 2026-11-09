import {KENDRAS, APP_SCENARIOS, APP_ITEMS, createAppState, appTransition, blankAppWorksheet} from './card-app-engine.mjs';

let state = createAppState();
const screen = document.getElementById('app-screen');
const notice = document.getElementById('app-notice');
const store = () => KENDRAS.find(kendra => kendra.id === state.kendra).name;
const node = (tag, text, parent, className) => {
  const item = document.createElement(tag);
  if (text !== undefined) item.textContent = text;
  if (className) item.className = className;
  parent?.append(item);
  return item;
};
const send = event => {state = appTransition(state, event); render();};
function button(text, event, parent, className = '') {
  const item = node('button', text, parent, className);
  item.type = 'button';
  item.addEventListener('click', () => send(event));
  return item;
}
function title(text, description) {
  const heading = node('h2', text, screen);
  heading.id = 'app-step-title'; heading.tabIndex = -1;
  if (description) node('p', description, screen, 'screen-intro');
}
function box(heading, text, kind = '') {
  const item = node('div', undefined, screen, `callout ${kind}`);
  node('strong', heading, item); node('p', text, item);
}
function items() {
  const list = node('ul', undefined, screen, 'order-list');
  APP_ITEMS.forEach(item => {const row = node('li', undefined, list);node('span', item.name, row);node('strong', `Quantity ${item.quantity}`, row);});
}
function reference() {
  if (!state.request) return;
  const card = node('div', undefined, screen, 'receipt');
  node('p', 'Local demo reference', card, 'small');
  node('p', state.request.reference, card, 'reference');
  node('p', store(), card);
  node('p', 'Status: awaiting store review', card);
}
function render(initial = false) {
  screen.replaceChildren();
  const steps = ['Demo account', 'Prescription', 'Availability', 'Request'];
  const activeStep = state.step === 'help' ? state.resumeStep : state.step;
  const stage = activeStep === 'start' ? 0 : activeStep === 'prescription' ? 1 : ['kendra', 'stock-issue'].includes(activeStep) ? 2 : 3;
  const progress = document.getElementById('app-progress');
  progress.replaceChildren();
  steps.forEach((text, index) => {const item = node('li', `${index + 1}. ${text}`, progress); if (index === stage && !['ended', 'handoff'].includes(state.step)) item.setAttribute('aria-current', 'step');});
  switch (state.step) {
    case 'start':
      title('Use a prepared account', 'This stands in for an account linked to the selected health-card/app concept. No sign-in details are requested.');
      {
        const card = node('div', undefined, screen, 'demo-health-card');
        node('strong', 'Jan Aushadhi', card);
        node('span', 'Unified Health Card', card);
        node('small', 'DEMO', card);
      }
      box('One task to explore', 'Find a prepared prescription, check availability before travelling, then request store collection.');
      button('Use the demo account', {type: 'ENTER_DEMO'}, node('div', undefined, screen, 'actions'));
      break;
    case 'prescription':
      title('Choose the prepared prescription', 'DEMO-RX-01 contains Item A and Item B. These are fictional items, not medicine names.');
      if (APP_SCENARIOS[state.scenarioId].unclear) {
        box('The prescription cannot be understood', 'Ask pharmacy staff to check it. Do not guess or use this walkthrough for medical advice.', 'warning');
        button('Get prescription help', {type: 'HELP', reason: 'prescription'}, node('div', undefined, screen, 'actions'));
      } else {
        items();
        button('Choose DEMO-RX-01', {type: 'CHOOSE_PRESCRIPTION', id: 'DEMO-RX-01'}, node('div', undefined, screen, 'actions'));
      }
      break;
    case 'kendra': {
      title('Check a Kendra before travelling', 'Choose an example pharmacy. Both names are fictional; this walkthrough has no real location or stock data.');
      const label = node('label', 'Example Kendra', screen);
      label.htmlFor = 'kendra-choice';
      const select = node('select', undefined, screen);
      select.id = 'kendra-choice';
      KENDRAS.forEach(kendra => {const option = node('option', kendra.name, select);option.value = kendra.id;});
      select.value = state.kendra;
      select.addEventListener('change', () => {
        state = appTransition(state, {type: 'SET_KENDRA', id: select.value});
        render(true);
        document.getElementById('kendra-choice').focus({preventScroll: true});
      });
      button('Check demo availability', {type: 'CHECK_AVAILABILITY'}, node('div', undefined, screen, 'actions'));
      break;
    }
    case 'stock-issue': {
      const unknown = state.stock === 'unknown';
      title(unknown ? 'Availability could not be confirmed' : 'Items are unavailable here', unknown ? 'There is no reliable result for this example Kendra. Do not plan a journey on an unknown result.' : `${store()} cannot fulfil the prepared example. No collection request has been made.`);
      box('A clear next step matters', unknown ? 'Recheck, choose another example Kendra, or ask staff. A real service would need a reliable availability source.' : 'You can check another example Kendra or ask staff. This flow does not recommend substitute medicines.', 'warning');
      const actions = node('div', undefined, screen, 'actions');
      if (unknown) button('Check availability again', {type: 'CHECK_AVAILABILITY'}, actions);
      button('Choose another Kendra', {type: 'BACK'}, actions, unknown ? 'secondary' : '');
      button('Get availability help', {type: 'HELP', reason: 'stock'}, actions, 'secondary');
      break;
    }
    case 'review': {
      title('Review the collection request', 'Check the prescription and example Kendra before continuing.');
      box('Demo availability result: available', `Items in DEMO-RX-01 are available in this prepared example at ${store()}. This result is not a reservation or a real store confirmation.`);
      items();
      const actions = node('div', undefined, screen, 'actions');
      button('Create demo collection request', {type: 'REQUEST_COLLECTION'}, actions);
      button('Change Kendra', {type: 'BACK'}, actions, 'secondary');
      node('p', 'Changing the Kendra keeps the prepared account and prescription, but requires a new availability check.', screen, 'small');
      break;
    }
    case 'reference':
      title('Request awaiting store review', 'The demo request is recorded locally. No message has been sent and no collection is confirmed.');
      reference();
      box('Confirm with the pharmacy before travel', 'A real service would need the store to confirm the items, timing and collection arrangements. This reference alone does not establish that.', 'warning');
      button('See the staff handoff', {type: 'HELP', reason: 'request'}, node('div', undefined, screen, 'actions'));
      break;
    case 'help': {
      const copy = {
        prescription: ['Ask staff to check the prescription', 'The app cannot decide what an unclear prescription means or suggest a medicine.'],
        stock: ['Ask staff about availability', 'Staff would need to confirm reliable stock and a suitable next step. No alternative medicine is selected here.'],
        request: ['Confirm the request with the store', 'Use the reference to ask about availability and collection. This demo does not contact staff, reserve stock or mark the request fulfilled.'],
        general: ['Get help from pharmacy staff', 'A person unable to use the prepared card/account needs an assisted route. This walkthrough does not decide eligibility or create an account.'],
      }[state.helpReason] || ['Get help from pharmacy staff', 'No staff member is contacted by this walkthrough.'];
      title(...copy);
      reference();
      const actions = node('div', undefined, screen, 'actions');
      button('Return to the same step', {type: 'RETURN_FROM_HELP'}, actions);
      button('End with a staff handoff', {type: 'STAFF_HANDOFF'}, actions, 'secondary');
      break;
    }
    case 'handoff':
      title('Walkthrough ended at staff handoff', 'The need for staff is now visible. No assistance, reservation or collection has been completed.');
      reference();
      button('Begin another walkthrough', {type: 'RESET'}, node('div', undefined, screen, 'actions'));
      break;
    case 'ended':
      title('Walkthrough ended', 'No collection request was created in this example.');
      button('Begin another walkthrough', {type: 'RESET'}, node('div', undefined, screen, 'actions'));
      break;
  }
  if (!['ended', 'handoff', 'help'].includes(state.step)) {
    const utility = node('div', undefined, screen, 'utilities');
    if (['prescription', 'kendra'].includes(state.step)) button('Back', {type: 'BACK'}, utility, 'quiet');
    button('Staff help', {type: 'HELP'}, utility, 'quiet');
    button('End walkthrough', {type: 'END'}, utility, 'quiet');
  }
  notice.textContent = state.notice;
  if (!initial) document.getElementById('app-step-title')?.focus();
}

const scenarioSelect = document.getElementById('app-scenario');
for (const [id, value] of Object.entries(APP_SCENARIOS)) {const option = node('option', value.name, scenarioSelect);option.value = id;}
document.getElementById('app-start-scenario').addEventListener('click', () => {state = createAppState(scenarioSelect.value, state.run + 1);render();});
document.getElementById('app-download-worksheet').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(blankAppWorksheet(), null, 2) + '\n'], {type: 'application/json'}));
  const link = document.createElement('a');
  link.href = url;link.download = 'jan-selected-app-blank-observation.json';link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  document.getElementById('app-export-notice').textContent = 'Blank worksheet downloaded locally. No observations or results are prefilled.';
});
render(true);
