// Source: the existing case contexts and authored card details in portfolio.js.
// These describe contribution, not proficiency ratings or measured outcomes.
export const PROJECT_CARD_CONTRIBUTIONS = Object.freeze({
  connectaid: 'My part: core design system and remote testing coordination.',
  giggles: 'My part: electronics, game logic and the working prototype.',
  'pixel-mania': 'My part: visual system, interface and interaction prototyping.',
  syringe: 'My part: selected concept; shared research and 3D printing. Teammate: Maya modelling.',
  'workplace-mode': 'My part: research, synthesis and the interaction concept.',
  'jan-aushadhi': 'My part: shared field research; later interface walkthroughs as a separate learning exercise.',
  tear: 'My part: concept, gesture, emotional journey and art direction.',
});

export function projectContribution(id, fallback = '') {
  return PROJECT_CARD_CONTRIBUTIONS[id] || fallback;
}
