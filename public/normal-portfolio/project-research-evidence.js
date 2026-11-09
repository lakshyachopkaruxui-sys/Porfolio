// Source-bound visual additions for two research/concept cases.
// SOURCE.json beside each asset records the original source and transformations.
// Keep these additions independent of the shared Play-mode project catalogue.
import {JAN_FIELDWORK_PHOTOS, JAN_SOURCE_MODELS} from './jan-evidence.js?v=20261104-flow-audit';

const jan = 'assets/cases/jan-aushadhi/evidence/';
const workplace = 'assets/cases/workplace-mode/evidence/';

const visuals = {
  purchaseSequence: {
    src: `${jan}purchase-sequence.webp`, previewSrc: `${jan}purchase-sequence-preview.webp`,
    width: 1840, height: 1875,
    alt: 'Original Jan Aushadhi purchase sequence maps a medicine stockout to waiting for restocking, visiting another Kendra or asking about an alternative.',
    caption: 'Mapped purchase sequence · Stockouts can mean waiting, another visit or an alternative. Original team map, report p.16, Figure 3.',
  },
  stakeholders: {
    src: `${jan}stakeholder-map.webp`, previewSrc: `${jan}stakeholder-map-preview.webp`,
    width: 1800, height: 2350,
    alt: 'Original stakeholder map groups patients, customers, doctors, Kendra operators and owners, manufacturers, government, warehouse and wider service actors.',
    caption: 'Original stakeholder map · Patients, pharmacy teams and the organisations surrounding a purchase. These are service actors, rather than a recruitment count. Report p.18, Figure 5.',
  },
  supplyNotes: {
    src: `${jan}affinity-supply.webp`, width: 760, height: 672,
    alt: 'Original supply-chain affinity cluster contains notes about stockouts, waiting, buying larger quantities and trying other medicines.',
    caption: 'Supply-chain affinity notes · Reported concerns about stockouts, waiting and availability informed the service direction. Original research excerpt, report p.29, Figure 44; these are research perceptions.',
  },
  spendingNotes: {
    src: `${jan}affinity-spending.webp`, width: 984, height: 656,
    alt: 'Original medicine-spending affinity cluster groups notes about self-paying, recurring expense and difficulty affording medicines.',
    caption: 'Medicine-spending affinity notes · Recurring expense and self-paying emerged in the research. The budget example is an individual account, not a measured service saving. Report p.29, Figure 44.',
  },
  kioskAlternative: {
    src: `${jan}kiosk-alternative-flow.webp`, previewSrc: `${jan}kiosk-alternative-flow-preview.webp`,
    width: 1896, height: 2776,
    alt: 'Earlier unbuilt kiosk flow includes a QR card, OTP or biometric verification, prescription and stock checks, payment, dispensing and receipt paths.',
    caption: 'Earlier kiosk alternative · Report p.49, Figure 66. QR and OTP/biometric verification belong to this unbuilt exploration. The report selected a health-card/app; my current continuation explores card/PIN identification.',
  },
  researchScope: {
    src: `${workplace}research-scope.svg`, width: 1208, height: 620,
    alt: 'Research counts by method: 34 surveys, with 20 tech-savvy private and 14 commercial drivers; 13 interviews, with six private and seven commercial drivers.',
    caption: 'Study scope · 34 surveys (20 private, 14 commercial) and 13 interviews (6 private, 7 commercial), shown separately by method. Redrawn from the source record.',
  },
  affinityMap: {
    src: `${workplace}affinity-map-original.jpg`, previewSrc: `${workplace}affinity-map-preview.webp`,
    width: 2000, height: 2301,
    alt: 'Original interview affinity board groups excerpts into user behaviour, trust calibration, attention management, interaction errors, workaround and recovery, system limitations and safety perception.',
    caption: 'Original seven-theme affinity board · Grouped interview accounts connect screen avoidance, attention, mistakes and recovery to the proposed design rules. These are qualitative themes, not frequency estimates.',
  },
  mentalStrain: {
    src: `${workplace}mental-strain.svg`, width: 1208, height: 620,
    alt: 'Mean agreement across six mental-strain survey items: 3.04 for 20 tech-savvy private drivers and 3.58 for 14 commercial drivers on a one-to-five scale.',
    caption: 'Descriptive self-reports · Six agreement items, scale 1–5. Private drivers: 3.04 (n=20); commercial drivers: 3.58 (n=14). Redrawn from the source table; proposed screens were not evaluated.',
  },
  convergence: {
    src: `${workplace}concept-convergence.svg`, width: 1208, height: 380,
    alt: 'Original concept diagram connects route continuity, interruption control, acknowledgement, touch, tactile controls, voice and connection feedback to a shared foundation with Workplace Mode above it.',
    caption: 'Original concept synthesis · Seven shared attention and feedback rules form the foundation; Workplace Mode adds the commercial-driver work layer. The proposed concept has not been validated.',
  },
};

const paragraph = text => ({type: 'paragraph', text});
const heading = text => ({type: 'heading', text});
const figure = visual => ({type: 'figure', visual});
const points = section => section.points?.length ? [{type: 'points', items: section.points}] : [];
const alreadyEnriched = (section, directory) => section.blocks?.some(block =>
  block.visual?.src?.startsWith(directory) || block.visuals?.some(visual => visual.src?.startsWith(directory))
);

/** Add the report artifacts that explain Jan Aushadhi's existing research/concept chapters. */
export function enrichJanResearchStory(story) {
  if (!story?.sections) return story;
  return {
    ...story,
    sections: story.sections.flatMap(section => {
      if (alreadyEnriched(section, jan)) return section;
      const body = section.body || [];
      if (section.id === 'context') {
        const researchSection = {
          ...section, body: [], points: undefined,
          blocks: [
            ...body.slice(0, 1).map(paragraph),
            heading('What the retained research can establish'),
            {type: 'points', items: [
              {title: 'Mapped purchase accounts', body: 'The contextual-inquiry models on report pages 14–17 show people, dependencies and purchase sequences. A caregiver account connects prescription-name confusion, price and contacting the pharmacy before travelling. These accounts explain a situation; they are not frequency estimates.'},
              {title: 'Four questionnaire groups', body: 'Pages 20–28 separate customers, non-users, Kendra operators and doctors. Recruitment details and a reliable response base for each chart could not be verified from the retained records. We do not turn their percentages into a participant total or combine them with the contextual accounts.'},
              {title: 'Research synthesis', body: 'The affinity map on page 29 groups reported stock, spending, awareness and trust concerns. We use those as research perceptions and design questions; comments about medicine quality are not clinical evidence.'},
            ]},
            paragraph('In one mapped caregiver purchase, matching prescription names to medicines required help, and the pharmacy was contacted by phone or WhatsApp to check availability and opening times. The stockout sequence then led to waiting, another store or human help. Those accounts connected information clarity, availability and staff support in our design question.'),
            {type: 'gallery', layout: 'photos', visuals: JAN_FIELDWORK_PHOTOS},
            paragraph('We followed the purchase in context: how people understood the prescription, looked for medicine and handled a stockout. A Kendra is a Jan Aushadhi pharmacy.'),
            figure(visuals.purchaseSequence),
            ...body.slice(1).map(paragraph),
          ],
        };
        const serviceSection = {
          id: 'service-models', title: 'Service maps', body: [],
          blocks: [
            paragraph('We mapped how patients and families depend on doctors, pharmacy staff and medicine suppliers. The maps show where information and responsibility pass between people, helping us identify what a kiosk alone could not solve.'),
            figure(JAN_SOURCE_MODELS.flow),
            heading('Who needs support, and who can act'),
            figure(visuals.stakeholders),
            paragraph('We also compared who needs the service with who can help it operate. Patients and caregivers need clear choices; pharmacy staff, suppliers and other organisations would need to support stock information and fulfilment.'),
            figure(JAN_SOURCE_MODELS.priorities),
          ],
        };
        const problemSection = {
          id: 'problem-framing', title: 'Problem statement', body: [],
          blocks: [
            paragraph('Patients and caregivers paying for medicines need reliable information about their options and prices. Our research found that prescription confusion and uncertain stock made it harder to plan an affordable purchase and could mean another visit.'),
            paragraph('We focused on this question: how could the service help people understand medicine options and prices, check availability and get support before they pay?'),
            heading('Notes behind stock and spending concerns'),
            {type: 'gallery', layout: 'photos', visuals: [visuals.supplyNotes, visuals.spendingNotes]},
            figure(JAN_SOURCE_MODELS.problem),
            heading('What the next service needs to address'),
            ...points(section),
          ],
        };
        return [problemSection, researchSection, serviceSection];
      }
      if (section.id === 'direction') {
        return {
          ...section, body: [],
          blocks: [
            ...body.slice(0, 1).map(paragraph),
            heading('Exploring different service directions'),
            figure(JAN_SOURCE_MODELS.brainstorming),
            figure(JAN_SOURCE_MODELS.team),
            heading('The report selected a health card and app'),
            paragraph('The proposed card and app would keep prescription information together, show medicine composition and price information, and help someone check Kendra availability or order ahead before collecting. These were intended service functions in the report, not demonstrated improvements in cost or access.'),
            figure(JAN_SOURCE_MODELS.selectedService),
            paragraph('This historical proposal included registration, verification and card issue. Its order places biometric capture before consent, which needs revision before prototyping. It does not establish an implemented connection to medical records or payments.'),
            heading('The earlier kiosk alternative'),
            figure(JAN_SOURCE_MODELS.kiosk),
            figure(visuals.kioskAlternative),
            heading('What the earlier flow already considered'),
            paragraph('The earlier kiosk flow included help without a prescription, stock-unavailable routes, limits on prescribed quantities, retry/cancel choices and a receipt. Making those conditions visible matters as much as the successful purchase path. They are source concept logic, not a working service.'),
            heading('From the earlier flow to the next prototype'),
            heading('No prescription or unclear medicine information'),
            paragraph('Provide a visible route to pharmacy staff instead of leaving the person at a dead end.'),
            heading('Medicine unavailable'),
            paragraph('Explain the stock result before payment. The earlier flow explored another Kendra; reliable stock information and staff support are still dependencies.'),
            heading('Quantity selection'),
            paragraph('Make the permitted prescription quantity clear before confirmation.'),
            heading('Payment or collection does not complete'),
            paragraph('Explain the current status, retain an order reference where available and provide a help/cancel route. Detailed recovery rules remain to be prototyped.'),
            paragraph('A pharmacy-side kiosk could make collection and staff help easier to reach. It cannot, by itself, tell someone at home whether a journey will be worthwhile. A reliable availability service and a way to access it before travel remain separate needs. This is the current working hypothesis, not a recorded reason for the original team’s concept selection.'),
            ...body.slice(1).map(paragraph),
          ],
        };
      }
      return section;
    }),
  };
}

/** Add original synthesis and clearly labelled aggregate-data visuals to Workplace Mode. */
export function enrichWorkplaceResearchStory(story) {
  if (!story?.sections) return story;
  return {
    ...story,
    sections: story.sections.map(section => {
      if (alreadyEnriched(section, workplace)) return section;
      const body = section.body || [];
      if (section.id === 'research') {
        return {
          ...section, body: [], points: undefined,
          blocks: [
            ...body.slice(0, 1).map(paragraph),
            figure(visuals.researchScope),
            ...body.slice(1).map(paragraph),
            heading('Grouping the interview notes'),
            figure(visuals.affinityMap),
            ...points(section),
          ],
        };
      }
      if (section.id === 'findings') {
        return {
          ...section, body: [], points: undefined,
          blocks: [
            ...body.slice(0, 1).map(paragraph),
            figure(visuals.mentalStrain),
            ...body.slice(1).map(paragraph),
            ...points(section),
          ],
        };
      }
      if (section.id === 'alternatives') {
        return {
          ...section, body: [], comparison: undefined,
          blocks: [
            ...body.slice(0, 2).map(paragraph),
            figure(visuals.convergence),
            ...body.slice(2).map(paragraph),
            ...(section.comparison ? [{type: 'comparison', ...section.comparison}] : []),
          ],
        };
      }
      return section;
    }),
  };
}
