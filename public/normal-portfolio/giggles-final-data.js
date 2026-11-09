// Final authority supplied by the owner on 5 November 2026. Page numbers are
// one-based PDF pages. The private source audit retains the complete document.
export const GIGGLES_FINAL_SOURCE = Object.freeze({
  file: 'Giggles_TID_Documentation.pdf', pages: 42,
  sha256: 'f60f1b278cc780d54592172d95f1a8d6ccfef4b85d96b76edd1a576ccec55741',
});

export const GIGGLES_TESTING_SESSIONS = [
  ['Individual session', '1 adult', '24 years', 'One-to-one play with teacher support.'],
  ['Group session', '3 children', '8–10 years', 'A full three-player game facilitated by teachers.'],
];

export const GIGGLES_TESTING_FINDINGS = [
  {
    id: 'first-attempt-guidance', page: 37,
    title: 'First use needed teacher guidance',
    observed: 'Children needed help during the first one or two attempts: where to tap, which shape to press and which card to choose. Once the flow became familiar, they enjoyed playing.',
    proposed: 'Guide the next action at the board with a glowing reader zone, lit shape controls and an on-screen picture of what to use.',
  },
  {
    id: 'practice-round', page: 37,
    title: 'Rules arrived after play had started',
    observed: 'Without a practice round, children had to learn the rules and play at the same time, which caused confusion.',
    proposed: 'Add a short demonstration round that walks through one practice turn with audio before the real game begins.',
  },
  {
    id: 'card-deck-confusion', page: 37,
    title: 'Two card categories looked like one set',
    observed: 'Emotion and situation cards were confused when the decks sat beside one another.',
    proposed: 'Give each category a consistent colour and symbol across card, tray and screen, such as a speech bubble for situations and a face for emotions.',
  },
  {
    id: 'language-access', page: 37,
    title: 'Text and audio were English-only',
    observed: 'The prototype had no Hindi or Marathi option for either the on-screen text or spoken prompts.',
    proposed: 'Add Hindi and Marathi text and audio, with a per-child language choice in the proposed Teacher App.',
  },
  {
    id: 'shared-screen-visibility', page: 38,
    title: 'Only one side could see the screen',
    observed: 'With three players around the board, the screen faced one side. The board had to be rotated each turn so the next child could see it.',
    proposed: 'Explore a raised, rotating screen stand in the centre, or mirrored displays that every player can see.',
  },
  {
    id: 'pawn-and-counting', page: 38,
    title: 'Pawn ownership and counting were unclear',
    observed: 'Children forgot which pawn was theirs and sometimes counted from Start instead of their current position.',
    proposed: 'Repeat each player’s pawn colour on screen and illuminate the occupied block as the starting point for counting.',
  },
  {
    id: 'reader-affordance', page: 38,
    title: 'The display looked like the answer surface',
    observed: 'Children tried to touch the phone screen to answer instead of tapping their card on the RFID reader.',
    proposed: 'Point to the reader with an on-screen arrow, a spoken “Tap your card here” cue and a light on the reader itself.',
  },
  {
    id: 'premature-sensor-trigger', page: 38,
    title: 'Counting fingers triggered questions early',
    observed: 'Touching blocks while counting activated a question before the pawn reached its destination.',
    proposed: 'Explore detection that responds only to the pawn, such as a magnet or tag, or show the counting hops on screen.',
  },
];

export const GIGGLES_TESTING_STRENGTHS = [
  {id: 'one-question', page: 40, title: 'One question at a time', body: 'Each screen keeps one picture and one question in focus.'},
  {id: 'consistent-layout', page: 40, title: 'A consistent layout', body: 'Communication, Emotion and Shape questions use the same screen structure, so the next prompt has a familiar place.'},
  {id: 'supportive-feedback', page: 40, title: 'Support before completion', body: 'Try Again, then a hint and answer reveal, keeps another attempt available instead of ending the turn with a punitive message.'},
  {id: 'tangible-response', page: 40, title: 'An answer they can hold or press', body: 'Physical cards and buttons turn the response into a tap or press rather than another screen control.'},
  {id: 'audio', page: 40, title: 'Audio alongside the question', body: 'A speaker option reads the question aloud. The documented participants could read independently; use by non-readers was not tested.'},
  {id: 'quiet-visuals', page: 40, title: 'A calm visual base', body: 'Cream backgrounds, rounded forms and soft colour are design choices to retain while refining the interaction.'},
  {id: 'teacher-support', page: 41, title: 'A familiar educator nearby', body: 'Teachers introduced and supported play in their familiar classroom manner. Connected app monitoring remains a future feature.'},
  {id: 'everyday-scenarios', page: 41, title: 'Familiar situations', body: 'Lunch boxes, shoelaces, gifts and sharing gave communication questions an everyday context.'},
  {id: 'shape-engagement', page: 41, title: 'Shapes invited a physical response', body: 'Finding and pressing the matching shape was a particularly engaging part of the session.'},
  {id: 'replay-interest', page: 41, title: 'Requests to play again', body: 'The documentation records children asking for another round after the game ended—a qualitative sign of interest.'},
];
