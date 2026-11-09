// Original fieldwork and report artifacts; see the adjacent SOURCE.json records.
const fieldwork = 'assets/cases/jan-aushadhi/fieldwork/';
const models = 'assets/cases/jan-aushadhi/extended-evidence/';
const source = (name, width, height, alt, caption, extra = {}) => ({
  src: `${models}${name}.webp`, previewSrc: `${models}${name}-preview.webp`,
  width, height, alt, caption, ...extra,
});

export const JAN_FIELDWORK_PHOTOS = [
  {src: `${fieldwork}interview-visit.webp`, previewSrc: `${fieldwork}interview-visit-preview.webp`,
    width: 1800, height: 1350, personal: true,
    alt: 'Lakshya in a maroon shirt beside an older interview participant holding a child, with another child in front.',
    caption: 'Jan Aushadhi fieldwork · With an interview participant and children during our research visit.'},
  {src: `${fieldwork}team-interview.webp`, previewSrc: `${fieldwork}team-interview-preview.webp`,
    width: 1800, height: 1350, personal: true,
    alt: 'Lakshya and his three academic teammates standing with an interview participant during Jan Aushadhi fieldwork.',
    caption: 'Jan Aushadhi fieldwork · Our four-person academic team with an interview participant.'},
];

export const JAN_SOURCE_MODELS = {
  flow: source('flow-model', 3730, 2520,
    'Original contextual-inquiry flow model connects patients, family, clinicians, Kendras, pharmacies and medicine-supply actors.',
    'Original service flow · People, information and purchase dependencies. Report p.14, Figure 1; annotations reflect the team’s research synthesis.'),
  priorities: source('stakeholder-priorities', 2136, 1746,
    'Original power–interest map groups patients, customers, Kendra operators, warehouse operators, manufacturers and government alongside other service actors.',
    'Stakeholder priorities · The team’s power–interest analysis, report p.19, Figure 6.'),
  problem: source('problem-statement', 2360, 246,
    'Original selected problem statement links medicine spending with limited access to information about medicine options and prices.',
    'Original problem framing · The team’s selected statement, report p.45. This frames the design challenge; it is not a measured kiosk outcome.'),
  brainstorming: source('brainstorming-map', 2270, 1135,
    'Original brainstorming map explores prescription upload, medicine availability, delivery, records, subscription, composition information and a medicine kiosk.',
    'Exploring possible directions · Original brainstorming map, report p.46, Figure 60.'),
  team: source('brainstorming-team', 760, 425,
    'The project team discussing ideas at a table during the original Jan Aushadhi brainstorming session.',
    'Team brainstorming session · Original report photograph, p.46, Figure 61.', {personal: true}),
  selectedService: source('selected-service-flow', 1946, 3066,
    'Original report-selected health-card and app enrolment proposal, including registration, verification and card issue.',
    'Report-selected concept · Proposed health-card/app enrolment, report p.52, Figure 68. Historical exploration; no service was implemented.', {kind: 'diagram'}),
  kiosk: source('kiosk-concept-pair', 1404, 676,
    'Two original kiosk concept illustrations: a close-up dispensing-machine proposal and a contextual hospital-corridor view.',
    'Earlier kiosk illustrations · Original concept artwork, report p.48, Figures 64–65. These are unbuilt explorations, not hardware photographs.'),
};
