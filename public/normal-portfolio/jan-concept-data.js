// Complete concept inventory from the unchanged 65-page team report.
// Original illustrations and new presentation diagrams have separate provenance.
import {JAN_SOURCE_MODELS} from './jan-evidence.js?v=20261104-flow-audit';
const p = text => ({type: 'paragraph', text});
const h = text => ({type: 'heading', text});
const list = items => ({type: 'list', items});
const disclosure = (title, blocks) => ({type: 'details', title, blocks});
const figure = visual => ({type: 'figure', visual});
const path = 'assets/cases/jan-aushadhi/concepts-20261108/';
const sourceFigure = (file, width, height, alt, caption) => figure({src: path + file, width, height, alt, caption});

export const JAN_BRAINSTORM_IDEAS = [
  'Medicine Maker — composition-setting app for chronic conditions',
  'DigiLocker for health needs', 'Jan Aushadhi branding rework', 'Composition teller',
  'Subscription model', 'WhatsApp integration', 'Creating a database',
  'Upload a prescription and order medicines', 'Medicine delivery',
  'ATM-style medicine kiosk', 'Scheduled medicine purchasing', 'Medicine takeaway system',
  'Check availability across Kendras', 'Quality-checker machine', 'Medicine arranger',
];
export const JAN_DEVELOPED_CONCEPTS = [
  {id: 'card-app', title: 'Unified health card and app', pages: [47,48,51,52,53,54,55,56,57,58,59,60,61,62,63], status: 'Selected for further development in the report'},
  {id: 'kiosk', title: 'Medicine-dispensing kiosk', pages: [48,49], status: 'Explored alternative; later interface-learning continuation'},
  {id: 'rfid', title: 'RFID-enabled medicine packaging', pages: [50], status: 'Explored traceability concept'},
];
export const JAN_APP_FEATURES = [
  'Medicine information', 'Kendra location and contact details', 'Order-ahead collection',
  'AI-assisted prescription reading and quantity suggestion', 'Medical history',
  'Prescription hub', 'Lab-test repository', 'Insurance tracking',
  'Card management', 'Permission-based third-party access', 'Expense tracking',
];
export const JAN_FUTURE_IDEAS = [
  'Store lab results', 'Connect wearable data', 'Medical-expense tracker',
  'AI health prediction', 'Calories and macros from food photos', 'Support-group community',
  'In-app video consultation', 'Consultation recording and automatic notes',
  'Medicine subscriptions and refills', 'Public-health emergency alerts',
  'Insurance comparison and claims portal', 'Medicine-demand prediction',
  'ABHA integration', 'Alexa / Google Home medicine reminders',
];
export const JAN_STORYBOARDS = [
  ['doctor-storyboard-source.png',794,1146,'Doctor',59],
  ['new-user-storyboard-source.png',870,1012,'New user',60],
  ['existing-user-storyboard-source.png',906,557,'Existing user',61],
  ['kendra-storyboard-source.png',844,1495,'Kendra operator',62],
  ['pharmacy-storyboard-source.png',840,1415,'Local pharmacy operator',63],
];

export function enrichJanConceptStory(story) {
  const direction = story.sections.find(section => section.id === 'direction');
  const earlier = direction.blocks;
  const kioskStart = earlier.findIndex(block => block.type === 'heading' && block.text === 'The earlier kiosk alternative');
  if (kioskStart < 0) throw new Error('Jan original kiosk evidence is missing');
  const oldKioskFigures = earlier.slice(kioskStart).filter(block => block.type === 'figure');
  const selected = {
    id: 'selected-service', title: 'Selected card and app', body: [], blocks: [
      p('We developed the unified health card and app further in the report. The card would identify the account; the app would bring prescription information, medicine details and collection planning together. These were proposed service functions, not a launched platform or measured improvement.'),
      {type: 'sources', items: [{title: 'Try the new card/app collection walkthrough', href: './design/jan-kiosk-lab-20261108/card-app.html', note: 'New November 2026 AI-assisted interface exploration. Prepared fictional data and a local collection request, not live inventory, a medical record or a confirmed reservation.'}]},
      figure({src: 'assets/cases/jan-aushadhi/presentation-20261108/card-app-original-v2.webp', width: 1536, height: 1024, alt: 'High-fidelity original-layout blue demo health card beside a phone showing fictional prescription items and a check-availability action.', caption: 'AI-generated high-fidelity concept mockup · November 2026. Card styling follows our original report design with demo fields; the app is illustrative, not an original or tested screenshot.'}),
      h('Three connected journeys'),
      {type: 'points', items: [
        {title: 'Join with help', body: 'A proposed registration centre checks documents and issues a physical or digital card. Consent and information requirements need review before real enrolment.'},
        {title: 'Keep the prescription available', body: 'The proposed doctor journey retrieves the permitted record and adds a prescription. It depends on consent, reliable records and staff access; no medical-record integration was built.'},
        {title: 'Plan collection', body: 'The proposed app checks medicine information and availability, then sends a collection request to the Kendra. The pharmacy prepares the order and helps with collection.'},
      ]},
      h('Where the service still needs a person'),
      {type: 'points', items: [
        {title: 'An availability result needs an owner', body: 'The source pharmacy flow assigns stock checking to the operator. A real pre-travel result would need someone responsible for its accuracy and freshness. The new walkthrough supplies fictional results; an unknown result routes to help.'},
        {title: 'A request is not a reservation', body: 'The walkthrough creates a local reference awaiting store review. Staff would need to agree who receives it, when they confirm it and whether stock is held before anyone travels. No request in this prototype contacts a pharmacy.'},
        {title: 'The handoff must be completed', body: 'The source flow places prescription review, stock checks and fulfilment with pharmacy staff. Passing a reference to the help screen only marks that dependency; it does not mean staff accepted the request or authorised collection.'},
      ]},
      h('What the card and app were intended to contain'),
      list(JAN_APP_FEATURES),
      p('The source also proposes AI-assisted reading and quantity calculation. These functions were not implemented or evaluated. The new walkthrough uses prepared fictional items and fixed limits; it does not interpret a prescription or recommend a medicine.'),
      disclosure('Inspect the original enrolment and service flows', [
        figure(JAN_SOURCE_MODELS.selectedService),
        p('The original enrolment order places biometric capture before consent. Page 51 also proposes up to ten years of medical history and approximately a month for card issue. These substantial first-use requirements need revision and staff review; this is a present design judgment, not a finding validated by this project. The current walkthrough starts with a prepared account and does not test enrolment.'),
        sourceFigure('doctor-flow-source.png',510,1261,'Original proposed doctor and record-access flow from the report.','Proposed doctor interaction · Report p.54, Figure70. Source concept flow; not an implemented database or medical-record service.'),
        sourceFigure('pharmacy-flow-source.png',1041,1453,'Original proposed Kendra and local-pharmacy prescription and collection flow.','Proposed pharmacy interaction · Report p.56, Figure71. Native summary above explains the main route; open the source for its full branches.'),
      ]),
      disclosure('See all five original service storyboards', [
        p('These are illustrative storyboards in the report, not field photographs, participant sessions or recordings of a working service. They show the proposed roles across the same card/app concept.'),
        list(JAN_STORYBOARDS.map(([, , , actor, page]) => `${actor} interaction · Report p.${page}`)),
        ...JAN_STORYBOARDS.map(([file,width,height,actor,page]) => sourceFigure(file,width,height,`${actor} interaction in an illustrative storyboard from the original report.`,`${actor} storyboard · Report p.${page}. Original illustrative proposal, not an observed outcome.`)),
      ]),
    ],
  };
  return {...story, sections: story.sections.flatMap(section => {
    if (section.id === 'direction') return [{...section, body: [], blocks: [
      p('We generated fifteen early ideas and developed three directions: a unified health card and app, a dispensing kiosk, and RFID-enabled packaging. The report took the card/app direction further. The kiosk and packaging remain visible as explored alternatives, rather than being presented as rejected or proven inferior.'),
      {type: 'points', items: JAN_DEVELOPED_CONCEPTS.map(concept => ({title: concept.title, body: concept.status + '.'}))},
      h('Why develop a shared card and app?'),
      p('The report connects the selected direction to keeping prescriptions together, making medicine information accessible and checking availability before a visit (pages 47 and 57–58). This is the proposed mechanism behind the choice, not evidence that it performed better than the alternatives.'),
      {type: 'points', items: [
        {title: 'Reach the decision before travel', body: 'The mapped purchase already involved contacting the pharmacy for availability. An app or another remote channel could support that earlier step; a machine at the pharmacy cannot solve it on its own.'},
        {title: 'Carry information between people', body: 'The proposed card links a patient account to doctor and pharmacy interactions. The packaging concept instead identifies a package record. Those are different service roles, so one is not a direct replacement for the other.'},
        {title: 'Accept the coordination cost', body: 'The card/app depends on reliable records, current stock and participating staff. Its broader feature list does not remove those dependencies. The present walkthrough therefore concentrates on checking and requesting collection, with other functions left as proposed scope.'},
      ]},
      disclosure('See all fifteen brainstorming ideas', [
        p('Complete idea inventory from report p.46. These are early team proposals, not delivered features or demonstrated medical capabilities.'),
        list(JAN_BRAINSTORM_IDEAS), figure(JAN_SOURCE_MODELS.brainstorming), figure(JAN_SOURCE_MODELS.team),
      ]),
      h('Unified health card and app'),
      p('We proposed one route for keeping prescription information accessible, understanding medicine options and planning a collection. The report selected this direction and developed enrolment, doctor and pharmacy interactions. The next chapter shows its full proposed scope.'),
      h('Medicine-dispensing kiosk'),
      p('We explored a machine beside a pharmacy to guide identification, prescription selection, stock checks, payment and collection. It would still depend on reliable stock, staff support and clear recovery when a purchase fails. Its illustrations are concept artwork, not hardware photographs.'),
      ...oldKioskFigures,
      p('The earlier flow considered missing prescriptions, unavailable stock, permitted quantities, retry/cancel and receipts. A kiosk at the pharmacy cannot by itself answer the question of availability before someone travels. That still needs a separate information channel.'),
      h('RFID-enabled medicine packaging'),
      p('We proposed a unique package identity linked to batch, expiry, billing and supporting quality records. The intended route was tagging, a recorded bill, and access through a shared link. The tag and the records behind it were not implemented; the illustration does not establish authenticity or medicine quality.'),
      {type: 'sources', items: [{title: 'Inspect the fictional package-record example', href: './design/jan-kiosk-lab-20261108/rfid-preview.html', note: 'New explanatory interaction · No tag reader or verified product record. It separates a record’s fields from evidence that a medicine is authentic.'}]},
      sourceFigure('rfid-packaging-source.png',1039,734,'Original concept illustration of a medicine carton and strips with package identity labels.','RFID packaging proposal · Report p.50, Figure67. Original illustrative artwork; no working tag or verified traceability system is demonstrated.'),
      p('The report records the selected direction and its intended benefits, but no formal comparative test or complete selection deliberation. The three directions remain part of the project. My later kiosk exercise is a separate learning choice, explained in its own chapter.'),
    ]}, selected];
    if (section.id === 'proposed-journey') return [{...section, body: [], blocks: [
      ...(section.body || []).map(p),
      {type: 'sources', items: [{title: 'Try the separate kiosk interface exploration', href: './design/jan-kiosk-lab-20261108/', note: 'Later learning exercise · New AI-assisted November 2026 prototype. All identity, stock, payment and collection states are simulated; not evaluated with participants.'}]},
    ]}];
    if (section.id === 'next') return [{...section, body: [], points: undefined, blocks: [
      ...(section.body || []).map(p), ...(section.blocks || []),
      h('A lesson from the mapped purchase'),
      p('The caregiver sequence already used phone or WhatsApp contact to check a pharmacy before travelling. That account gives the current continuation a concrete priority: make the stock result, request status and staff handoff understandable before adding more account or AI functions. This is a present design judgment grounded in that source account, not a newly observed improvement.'),
      ...(section.points?.length ? [{type: 'points', items: section.points}] : []),
      disclosure('See all fourteen future ideas from the report', [
        p('Complete future-scope inventory, report p.64. Some entries extend earlier feature ideas. None is presented as a built integration, demonstrated health prediction or achieved benefit.'),
        list(JAN_FUTURE_IDEAS),
      ]),
    ]}];
    return [section];
  })};
}
