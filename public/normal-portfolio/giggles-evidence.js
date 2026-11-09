import {GIGGLES_FINAL_ASSETS} from './assets/cases/giggles/final-documentation/asset-data.js';
import {GIGGLES_TESTING_SESSIONS, GIGGLES_TESTING_FINDINGS, GIGGLES_TESTING_STRENGTHS} from './giggles-final-data.js';
// Final-document Giggles narrative. See docs/giggles-final-source-audit-20261105.md.
// Artifact exports retain original pixels; concept and measured-outcome boundaries remain explicit.
const paragraph = text => ({type: 'paragraph', text});
const heading = text => ({type: 'heading', text});
const points = items => ({type: 'points', items});
const list = items => ({type: 'list', items});
const table = (caption, columns, rows) => ({type: 'table', caption, columns, rows});
const chapter = (id, title, blocks) => ({id, title, body: [], blocks});
const gallery = (visuals, layout) => ({type: 'gallery', visuals, ...(layout ? {layout} : {})});
const picture = visual => ({type: 'figure', visual});

const dimensions = {
  'read-the-room-concept': [1312,1199], 'sequencing-concept': [1312,1199],
  categories: [842,305], 'communication-cards': [2058,764], 'board-layout': [1600,1600],
  'emotion-cards': [2057,764], 'shape-controls': [2170,725],
  'child-logo': [720,360], 'child-start': [720,360], 'child-turn': [720,360],
  'child-correct': [720,360], 'child-retry': [720,360], 'child-hint': [720,360],
  'child-finish': [720,360], 'child-completed': [720,360],
  'teacher-profile': [390,1449], 'teacher-welcome': [390,844], 'teacher-add': [390,844],
  'teacher-setup': [390,844], 'teacher-children': [390,844], 'teacher-ai': [390,1834],
  'teacher-progress': [390,853], 'teacher-history': [390,936],
  'teacher-session': [390,1216], 'teacher-settings': [390,853],
  'research-flow': [1001,1369], 'research-classroom-sequence': [709,945],
  'research-parent-sequence': [709,945], 'research-artifacts': [1133,1203],
  'research-affinity': [940,1135], 'research-stakeholders': [940,997],
  'research-caregiver-comparison': [827,465],
};
const previews = new Set(['communication-cards', 'emotion-cards', 'shape-controls']);
function visual(name, alt, caption, extra = {}) {
  const [width,height] = dimensions[name];
  return {
    src: `assets/cases/giggles/evidence/${name}.webp`,
    ...(previews.has(name) ? {previewSrc: `assets/cases/giggles/evidence/${name}.preview.webp`} : {}),
    width, height, alt, caption, ...extra,
  };
}
const figure = (name, alt, caption, extra) => picture(visual(name, alt, caption, extra));
const childScreen = (name, alt, caption) => visual(`child-${name}`, alt, caption);
const teacherScreen = (name, alt, caption) => visual(`teacher-${name}`, alt, `${caption} · Designed concept with illustrative data.`, {phone: true});

export const GIGGLES_QUESTION_BANK = {
  communication: [
    ['Someone keeps taking your pencil.', 'Please stop.', 'How would you stop someone?'],
    ['You cannot open your lunch box.', 'Can you help me?', 'Ask for help'],
    ['A friend gives you a gift.', 'Thank you!', 'What do you say when someone gives you something?'],
    ['You accidentally break your friend’s toy.', 'I’m sorry.', 'What do you say when you make a mistake?'],
    ['Your teacher gives you a sticker.', 'Thank you!', 'What do you say when someone gives you something?'],
    ['You cannot tie your shoelaces.', 'Can you help me?', 'Ask for help'],
  ],
  emotion: [
    ['Child is smiling and laughing.', 'Happy', 'Their face shows joy.'],
    ['Child is crying.', 'Sad', 'They look upset.'],
    ['Child is shouting.', 'Angry', 'Their face shows anger.'],
    ['Child is playing with balloons.', 'Happy', 'Their face shows joy.'],
    ['Child lost their toy.', 'Sad', 'They look upset.'],
    ['Child is lost in a crowded place.', 'Scared', 'They feel afraid.'],
  ],
  shape: [
    ['Ball', 'Circle', 'The shape has no corners.'],
    ['Window', 'Square', 'The shape has 4 equal sides.'],
    ['Pizza slice', 'Triangle', 'The shape has 3 sides.'],
    ['Clock face', 'Circle', 'The shape has no corners.'],
    ['Square photo frame', 'Square', 'The shape has 4 equal sides.'],
    ['Star cookie', 'Star', 'It has 5 pointy corners.'],
  ],
};

/** Final-document narrative; original build photographs and verified award remain supplementary evidence. */
export function enrichGigglesStory(story, {fieldVisit, buildPhotos = [], components = []} = {}) {
  const supplied = [...new Map(buildPhotos.filter(item => item?.src).map(item => [item.src, item])).values()];
  const productPhoto = supplied.find(item => item.kind === 'product') || supplied[0];
  const planningPhotos = supplied.filter(item => item !== productPhoto && item.kind === 'planning');
  const interactionPhotos = supplied.filter(item => item !== productPhoto && item.kind === 'interaction');
  const wiringPhotos = supplied.filter(item => item !== productPhoto && item.kind === 'wiring');
  const assemblyPhotos = supplied.filter(item => item !== productPhoto && !planningPhotos.includes(item) && !interactionPhotos.includes(item) && !wiringPhotos.includes(item));
  const photoBlocks = items => items.length ? [gallery(items, 'photos')] : [];
  const meraki = story.sections?.find(item => item.id === 'reflection')?.figures?.find(item => item.personal);
  const finalVisual = (file, caption) => ({...GIGGLES_FINAL_ASSETS[file], ...(caption ? {caption} : {})});
  const sourceNote = text => ({...paragraph(text), sourceNote: true});

  return {
    ...story,
    intro: 'Giggles is a learning board game for autistic children. A phone shows each question; players answer by tapping a card on the reader or pressing a physical shape. I built the electronics, game logic and working prototype during the six-week project; teammates designed the interfaces, which I helped review. Testing at Vishwansh Foundation showed where the instructions, shared screen and turns needed to be clearer.',
    outcome: {
      title: 'Current outcome',
      text: 'A working physical–digital game and a teacher-supported trial with four participants. The visit identified eight interaction issues and ten strengths to carry forward. The Teacher App and post-test fixes remain proposed; learning gains have not been measured.',
      target: 'testing',
    },
    readingTime: 20,
    award: {title: 'Best Project', event: 'Meraki · Pre-grad show'},
    sections: [
      chapter('product', 'The game', [
        paragraph('A player rolls the die, moves a pawn and activates a learning category. A phone shows the question. The player answers with an RFID card, which the electronic reader recognises, or by pressing a matching shape. Lights, speech and on-screen feedback respond before the next turn.'),
        gallery([
          ...(productPhoto ? [productPhoto] : []),
          finalVisual('board-layout.webp', 'The final board design has 20 blocks: Start, Finish and 18 learning blocks, six per category. The four-shape artwork shows the full design; the documented firmware implements Circle and Square.'),
        ], 'photos'),
        points([
          {title: 'Communication', body: 'Choose a phrase for an everyday situation, such as asking for help or setting a boundary.'},
          {title: 'Emotion', body: 'Match the activity’s expected emotion to an illustrated question.'},
          {title: 'Shapes and physical response', body: 'Find and press a matching shape, combining visual comparison with a tangible action.'},
        ]),
        picture(finalVisual('category-cards.webp')),
        gallery([
          childScreen('start', 'Giggles Start the Game screen instructing the player to tap a card to begin.', 'Start the game · Tap the START card.'),
          childScreen('turn', 'Player turn screen with a die and pawn, instructing the player to roll and move.', 'Take a turn · Roll the die and move the pawn.'),
        ]),
        paragraph('The working prototype runs the child-facing game, manages three-player turns and holds the current game state. The wider concept adds saved individual records and a Teacher App; these were not connected to the final electronics prototype.'),
        points([
          {title: 'What the visit examined', body: 'Could participants follow a turn, choose a physical answer and understand the game’s feedback with teacher support? The trial exposed instructions, screen visibility and sensor problems in that loop.'},
          {title: 'What remains a proposal', body: 'Helping educators compare independent answers, hints and support across sessions requires saved records and a connected teacher view. The classroom visit did not evaluate that wider service.'},
        ]),
        ...photoBlocks(interactionPhotos),
      ]),
      chapter('challenge', 'Problem statement', [
        paragraph('A correct answer alone does not tell an educator how a child reached it: independently, after several attempts or with a hint. Our design challenge was to make communication, emotion and shape practice clear and hands-on for autistic learners, while giving educators a way to understand the support behind each answer. We framed this challenge through secondary research.'),
        points([
          {title: 'For the learner', body: 'Show a clear prompt, offer physical answer choices and give predictable feedback, allowing for different response speeds and support needs.'},
          {title: 'For the educator', body: 'Understand attempts, time and support without having to write down every response while helping with the activity.'},
          {title: 'Our direction', body: 'Connect physical play to a simple phone interface, with a proposed record of how each answer was reached.'},
        ]),
        paragraph('We treated communication, emotion recognition and shape interaction as practice activities. The game is not a diagnostic or therapeutic assessment. Its intended learning value still needs evaluation beyond one visit.'),
        paragraph('The questions and answer cards pair pictures with short English text. We therefore selected participants who could read independently for the field trial. Use by learners who cannot yet read remains untested.'),
        sourceNote('Final documentation: background and problem framing, pages 5–10; scope, page 26; participant selection, page 33.'),
      ]),
      chapter('alternatives', 'Ideation', [
        paragraph('We explored three ways to answer physically: place an emotion token, arrange routine cards, or connect a situation with an emotion and response. We used SCAMPER, a set of prompts for changing an existing idea, to question the board, answer objects, feedback and progression while refining Giggles.'),
        ...photoBlocks(planningPhotos),
        heading('1 · An emotion-token station'),
        paragraph('Present a short situation, then place the corresponding emotion token on a base. This direction explored a star light, a celebration after five stars and progression towards more complex emotions and responses.'),
        gallery([
          finalVisual('ideation-emotion-reference-01.webp', 'Reference shown in the emotion-token exploration; not evidence of the implemented Giggles prototype.'),
          finalVisual('ideation-emotion-reference-02.webp', 'A second reference for tangible emotion selection and light feedback, reproduced from the final documentation.'),
        ], 'photos'),
        heading('2 · Arrange an everyday routine'),
        paragraph('Place task cards in a sequence, receive feedback and rearrange them. The concept could grow from short routines to longer sequences and decisions about what should happen next.'),
        picture(finalVisual('ideation-sequencing.webp', 'Routine-sequencing concept presentation. It explores an alternative interaction; it is not evidence of a built or tested product.')),
        heading('3 · Connect a situation, emotion and response'),
        paragraph('Read the Room explored scenario cards, emotion tokens and possible responses. Its proposed stars and levels belong to that alternative, rather than to the implemented Giggles firmware.'),
        picture(finalVisual('ideation-read-the-room.webp', 'Read the Room concept presentation: situation → emotion → response, with proposed progression.')),
        table('SCAMPER explorations', ['Prompt', 'What we explored'], [
          ['Substitute', 'Emotion tokens or physical shapes alongside RFID cards.'],
          ['Combine', 'Board movement and category-based learning activities.'],
          ['Adapt', 'Everyday situations: help, sharing, apologies and boundaries.'],
          ['Modify', 'Progress from recognition to more complex situation-based questions.'],
          ['Put to another use', 'Focused practice in one learning category.'],
          ['Eliminate', 'Unnecessary digital controls in the learner’s interaction.'],
          ['Reverse', 'Start from an emotion or response, then identify the situation.'],
        ]),
        paragraph('The alternatives separated three kinds of practice: recognising an emotion, ordering a routine and choosing a response to a situation. Giggles brought communication, emotion and shape activities into one board. That meant the questions could change while players kept the same turn sequence and physical-answer rule.'),
      ]),
      chapter('interaction', 'How to play', [
        paragraph('The phone presents the question, but the answer happens on the board. For Communication and Emotion, the player chooses a card and taps it on the reader. For Shapes, the player presses a matching physical shape. This keeps the same question-and-answer sequence across the three activities.'),
        picture(finalVisual('communication-cards.webp', 'Communication answers · Four RFID-enabled phrase cards, reused across six situations.')),
        picture(finalVisual('emotion-cards.webp', 'Emotion answers · Happy, Sad, Angry and Scared are the expected responses within the activity.')),
        picture(finalVisual('shape-controls.webp', 'Shape-control design · The full set includes Triangle, Square, Circle and Star. Circle and Square are implemented in the final firmware.')),
        points([
          {title: 'Tap a card', body: 'For Communication and Emotion questions, the reader identifies the card and the controller checks it against the expected answer.'},
          {title: 'Press a shape', body: 'A Shape question enables the physical buttons and ignores unrelated RFID answers.'},
          {title: 'Read or hear the prompt', body: 'The landscape phone displays the question, active turn and feedback; answers belong on the reader or shape controls.'},
        ]),
        gallery([
          childScreen('logo', 'Giggles multicoloured wordmark with explore, play, connect tagline.', 'Game identity · Colour and illustrations connect board and screen.'),
          childScreen('correct', 'Communication question about someone taking a pencil, with positive correct-answer feedback.', 'Physical answer, digital feedback · A Communication question state.'),
        ]),
        paragraph('Testing showed that this split was not always clear: participants tried to answer on the phone screen. We proposed reader lights, an arrow and spoken guidance to make the answer location easier to find.'),
      ]),
      chapter('questions', 'Activities and questions', [
        paragraph('The documented bank contains six prompts per category. Four Communication cards and four Emotion cards can answer several situations; each question also has a stored hint. These are the defined activity responses, not recorded participant results.'),
        table('Communication · Six prompts', ['Prompt', 'Expected card', 'Hint after the second wrong answer'], GIGGLES_QUESTION_BANK.communication),
        table('Emotion · Six prompts', ['Prompt', 'Expected card', 'Hint after the second wrong answer'], GIGGLES_QUESTION_BANK.emotion),
        paragraph('Emotion matches are simplified expectations inside the game. They are not universal rules about how someone must feel, and matching a card does not demonstrate real-world emotional understanding.'),
        table('Shapes · Six documented prompts', ['Displayed object', 'Expected shape', 'Stored hint'], GIGGLES_QUESTION_BANK.shape),
        paragraph('The full question bank contains Triangle and Star prompts, while the final firmware implements Circle and Square answer controls. The documentation does not identify whether those unsupported prompts were excluded from the active build. The tables show the intended content, not proof that all six Shape prompts were playable. Before another session, the active question list must be matched to its physical answers; completing the physical shape set remains future development.'),
      ]),
      chapter('feedback', 'Feedback', [
        paragraph('I programmed three levels of support: Try Again, a question-specific hint, then the answer. The same question stays active until the player gives the correct physical response, even after the answer is shown. This lets the player finish the action instead of being moved on immediately after a mistake.'),
        table('Feedback and turn progression', ['Event', 'What happens'], [
          ['First wrong answer', 'Red feedback and Try Again; keep the question active.'],
          ['Second wrong answer', 'Give the stored question-specific hint.'],
          ['Third and later wrong answers', 'Reveal the answer; still wait for the correct physical response.'],
          ['Correct before reveal', 'Green feedback, positive speech and a score increment, then advance the turn.'],
          ['Correct after reveal', 'Give positive feedback and advance, without the same pre-reveal point.'],
        ]),
        gallery([
          childScreen('retry', 'Emotion question with a Try Again feedback state.', 'Try Again · Invite another response.'),
          childScreen('hint', 'Ball shape question showing the hint that the shape has no corners.', 'Hint · Add question-specific support.'),
        ]),
        paragraph('The third wrong response does not force a new question. The child still supplies the correct card or implemented shape press before the next turn. A pre-reveal score can follow a hint, so it is not a measure of first-attempt correctness.'),
        gallery([
          childScreen('finish', 'Individual finish screen with a trophy and the message that the player has finished.', 'Player finish · Shown for five seconds.'),
          childScreen('completed', 'Final game-completed screen with two illustrated children.', 'Game completed · The replay card becomes available.'),
        ]),
      ]),
      chapter('architecture', 'Electronics and logic', [
        paragraph('I used an ESP32, a small programmable controller, to connect the card reader, sensors, shape buttons, feedback lights and phone interface. The RC522 reader identifies each RFID card. The phone connects over local Wi-Fi, so the working game does not need a separate computer or cloud server.'),
        heading('Physical event → game state → feedback'),
        points([
          {title: 'Read the input', body: 'A category sensor, RFID card or shape control supplies the physical event.'},
          {title: 'Apply the rules', body: 'The ESP32 chooses the question, checks the answer and coordinates feedback and turns.'},
          {title: 'Present the state', body: 'The phone reads the current game data from /state, updates the screen and speaks the prompt or feedback.'},
        ]),
        paragraph('This split gives each part one job: the controller decides which answers and inputs are valid, while the phone presents the current state. For example, a Shape question accepts a physical shape press and ignores an RFID answer; the replay card is accepted only after the whole game ends.'),
        heading('Build and integrate'),
        paragraph('We tested controller inputs separately, verified RFID identifiers and LED responses, then connected the interaction logic to the phone. This helped separate electrical, firmware and browser faults. The main loop keeps input handling, delayed advance, finish handling and web requests in separate functions.'),
        ...photoBlocks(assemblyPhotos),
        ...(components.length ? [heading('The components and their roles'), paragraph('Reference photographs identify component families; the original build photographs document our assembly.'), gallery(components, 'components')] : []),
        table('Prototype components', ['Component', 'Role'], [
          ['ESP32 development board', 'Runs the game rules, reads inputs and serves the phone interface over local Wi-Fi.'],
          ['MFRC522 / RC522', 'Reads START, answer and replay cards over SPI.'],
          ['Touch-sensor inputs', 'Three category inputs and a Finish input.'],
          ['Circle and Square controls', 'Implemented physical Shape answers.'],
          ['Red and green LEDs', 'Main feedback and dedicated shape feedback.'],
          ['RFID cards', 'Physical answers plus start/replay controls.'],
          ['Landscape phone/browser', 'Displays the active question and feedback, with speech output.'],
          ['LittleFS', 'Stores images served locally by the ESP32.'],
        ]),
        paragraph('I wrote the controller program in Arduino C++, using WiFi, WebServer, SPI, MFRC522 and LittleFS. SPI is the connection to the card reader; LittleFS stores the images on the controller. The phone reads JSON game data from /state and images from /img/. The controller checks answers and turns; the browser displays and speaks the result.'),
        table('Five states keep inputs in context', ['State', 'Purpose'], [
          ['GAME_NOT_STARTED', 'Wait for the START card.'],
          ['WAITING_FOR_MOVE', 'Wait for the active player’s category or finish input.'],
          ['QUESTION_ACTIVE', 'Enable the appropriate physical answer input.'],
          ['PLAYER_FINISH_SCREEN', 'Show individual completion for five seconds.'],
          ['GAME_FINISHED', 'Show final completion and accept the replay card.'],
        ]),
        paragraph('The report describes six questions per category with separate used-question tracking: select from the available pool and reset after all six are used. It does not provide a versioned active question list to reconcile the six Shape prompts with the two implemented controls. The firmware cycles through three players. It does not establish automated dice reading or separate pawn detection on all 18 learning blocks.'),
        ...photoBlocks(wiringPhotos),
        table('Recorded final GPIO map', ['Subsystem', 'Signal', 'GPIO'], [
          ['Board input','Communication','2'], ['Board input','Emotion','27'], ['Board input','Shape','33'], ['Board input','Finish','12'],
          ['RC522','SDA / SS','5'], ['RC522','RST','22'], ['RC522 SPI','SCK','18'], ['RC522 SPI','MISO','19'], ['RC522 SPI','MOSI','23'],
          ['Main feedback','Green LED','13'], ['Main feedback','Red LED','14'], ['Shape input','Square','25'], ['Shape input','Circle','21'],
          ['Square feedback','Green LED','15'], ['Square feedback','Red LED','26'], ['Circle feedback','Green LED','4'], ['Circle feedback','Red LED','32'],
        ]),
        paragraph('Shape buttons use internal pull-ups and read LOW when pressed; category and finish inputs are active HIGH. The circuit shares a common ground. Debounce timers reduce repeated input counts, although the field trial exposed a different problem: intentional finger-counting could trigger a category before the pawn arrived.'),
        paragraph('Replay is accepted only at final completion. The card clears in-session data and returns to Start; it is ignored during normal play so a stray tap cannot restart the session.'),
        sourceNote('Final documentation, pages 26–32. Its functional checklist has blank result cells; the checklist is not a completed pass report.'),
      ]),
      chapter('teacher-experience', 'Teacher app concept', [
        paragraph('The proposed Teacher App would let an educator set up a session and review a child’s attempts, support needs and history. Teammates designed these interfaces; I helped review and direct them. The app was not connected during the trial, and the names, percentages, times and trends shown here are sample data.'),
        heading('Set up a session'),
        gallery([
          teacherScreen('welcome', 'Teacher-app welcome screen introducing games, progress tracking and an AI-insight concept.', 'Welcome'),
          teacherScreen('add', 'Add student concept with child name, age, grade and learning-path choices.', 'Create a child profile'),
          teacherScreen('setup', 'Session setup concept with three selected players and the learning-category setup.', 'Choose one to three players'),
        ]),
        heading('Review a child and their sessions'),
        gallery([
          teacherScreen('children', 'Designed child-profile list with search, profile cards and Add Child.', 'Children profiles'),
          teacherScreen('profile', 'Designed individual profile with sample session, accuracy, response-time and category metrics.', 'Individual profile'),
          teacherScreen('session', 'Designed session detail with sample task results, response times, hints and support breakdown.', 'Review a session'),
          teacherScreen('history', 'Designed session history showing sample dates, accuracy, first-attempt results, time and hints.', 'Return to earlier sessions'),
          teacherScreen('progress', 'Designed progress screen with sample accuracy, response-time and attempt-support charts.', 'Look across sessions'),
        ]),
        table('Proposed session data', ['Record', 'What it would explain'], [
          ['Final result', 'Correct response or answer revealed.'],
          ['First-attempt correctness', 'Whether the initial response was correct.'],
          ['Attempts', 'Responses made before completion.'],
          ['Hint usage', 'Whether additional support was needed.'],
          ['Response time', 'Timing in context, rather than a stand-alone ability score.'],
          ['Category', 'The area practised.'],
          ['Timestamp and question ID', 'When and which question was answered.'],
          ['Session history', 'How a child’s own sessions relate over time.'],
        ]),
        heading('Summarise and share'),
        gallery([
          teacherScreen('settings', 'Designed settings screen with app preferences, notifications, game settings and support.', 'Teacher settings'),
          teacherScreen('ai', 'Designed AI progress-summary screen with sample trends, tips, sharing and PDF actions.', 'Proposed summary and report'),
        ]),
        paragraph('The proposed AI layer would turn recorded gameplay into a plain-language, non-clinical summary for educators, parents or therapists. It depends on saving real session records first. The current screens use sample data; the prototype does not generate these reports.'),
        table('Working prototype and wider design', ['Area', 'Working electronics', 'Further development'], [
          ['Board and turns', 'Three category inputs, Finish and a three-player cycle.', 'Refined construction and complete embedded sensing.'],
          ['Answers', 'RFID answers; Circle and Square controls.', 'Complete Triangle and Star interactions and editable content.'],
          ['Child display', 'Locally hosted browser interface.', 'Connect the interface to a complete session system.'],
          ['Records', 'Current state and scores in ESP32 memory.', 'Persistent individual records across sessions.'],
          ['Teacher app', 'Not connected to the final electronics.', 'Setup, live monitoring, history and reports.'],
          ['Analytics and AI', 'Not persisted or implemented end to end.', 'Contextual progress views, summaries and reports from real records.'],
        ]),
        paragraph('Compare each child primarily with their own history. Response speed, retries and hints need an educator’s context; they should not diagnose, rank or define a child’s ability.'),
      ]),
      chapter('testing', 'Field testing', [
        paragraph('We tested Giggles with four participants at Vishwansh Foundation, Pune: one adult aged 24 individually, and three children aged 8–10 in a group game. We first explained the board, cards, shape buttons and a complete turn to the teachers. They then introduced and supported play using their familiar classroom approach.'),
        table('Four participants, two session formats', ['Format', 'Participants', 'Age', 'Support'], GIGGLES_TESTING_SESSIONS),
        paragraph('Participants were selected because they could read independently. Each participant played one session during a single visit, with teachers introducing and supporting both formats.'),
        ...(fieldVisit ? [picture({...fieldVisit, alt: 'The Giggles team with a Foundation representative during the documented testing visit.', caption: 'The team at Vishwansh Foundation, Pune, during the Giggles testing visit.'})] : []),
        heading('Use the classroom’s existing routines'),
        paragraph('Before play, the teacher wrote each player’s pawn colour on the whiteboard. This reused the class’s familiar place for instructions and reminders, giving players a visible reference for their pawn. Teachers supported the first one or two attempts as participants learned where to tap, press and choose.'),
        table('What happened during play', ['Documented situation', 'Support or system response', 'What it means for the next build'], [
          ['Children read questions and options aloud, chose a card and tapped the reader.', 'Teachers guided reading and the first one or two attempts. LEDs, audio and the phone responded to physical answers.', 'Preserve the physical answer and feedback loop; add a practice turn and reader cues so instructions arrive before the action.'],
          ['Three players needed to see a screen facing one side.', 'The board had to be rotated each turn so the next child could see it.', 'Try a shared-screen arrangement. Check visibility from each seat without moving the board.'],
          ['Children forgot their pawn or counted from Start; counting fingers also activated questions early.', 'The whiteboard kept pawn colours visible, but did not resolve turn and counting confusion. Touch sensors could respond before the pawn arrived.', 'Repeat player colour at the point of play and distinguish counting from arrival before recording question timing.'],
        ]),
        paragraph('These are summaries from the final report, not reconstructed individual session logs. Matching and pressing the shapes was reported as particularly engaging. Teacher guidance is part of this evidence: a completed answer does not establish that it was independent.'),
        sourceNote('Final documentation: session setup and observations, pages 33–35; evidence limits, page 41. No structured task-success rate or longitudinal learning measure is reported.'),
      ]),
      chapter('findings', 'Pain points and proposals', [
        paragraph('The sessions revealed eight pain points, from learning the rules to seeing the shared screen and triggering questions too early. Each observation below is paired with a proposed change for the next version. These changes have not been implemented and retested in the documented work.'),
        ...GIGGLES_TESTING_FINDINGS.map(item => ({type: 'comparison', beforeTitle: item.title, before: item.observed, afterTitle: 'Proposed next change', after: item.proposed})),
        sourceNote('Final documentation: eight pain-point cards on pages 37–38, introduced as proposed next-round fixes on page 36.'),
      ]),
      chapter('strengths', 'What worked', [
        paragraph('The documentation identifies ten strengths to retain. These combine observed reactions with useful design qualities; they are not ten measured learning outcomes.'),
        points(GIGGLES_TESTING_STRENGTHS),
        paragraph('The useful pattern was engagement after teacher guidance, especially around physical responses, with requests to play again. We would preserve those parts while making the first turns clearer. These observations do not establish gains in reading, motor skills, real-world transfer or retention.'),
        sourceNote('Final documentation: six strengths on page 40 and four continuing at the top of page 41.'),
      ]),
      chapter('next', 'Next steps', [
        paragraph('I would fix the instructions, shared-screen visibility and premature sensor activation before adding more metrics. If a question starts while a child is still counting, its timing and attempts would be hard to interpret. The next build should make the intended turn reliable, then be retested over several sessions before connecting saved records and the Teacher App.'),
        table('A proposed build order for the eight findings', ['Priority and findings', 'Next design or build decision', 'What to observe after the change'], [
          ['1 · Counting fingers trigger questions early.', 'Compare pawn-only detection with an explicit arrival action. First reconcile active Shape prompts with the controls actually available; neither fix is complete.', 'Count and move a pawn without starting a question early; then finish the intended answer and next turn. Check every active Shape prompt has a valid physical response.'],
          ['2 · First-use guidance, missing practice round, mixed card decks and touchscreen expectations.', 'Build one practice turn, consistent category symbols and a visible reader cue. Keep the answer on the board while making that location clear on screen.', 'Where does the learner try to answer? Record the teacher’s prompt, the learner’s action and the game response, including help still needed.'],
          ['3 · Shared-screen visibility and pawn/counting confusion.', 'Compare a central rotating stand with mirrored displays; repeat pawn colour and current position near the turn. These remain alternatives to try, not a selected tested solution.', 'Can each player see the prompt and start counting from the current position without rotating the whole board?'],
          ['4 · English-only text and audio.', 'Review the prompts and hints with educators before adding Hindi and Marathi. Define text, speech and support needs together, then test the chosen language flow.', 'Can the intended learner understand the instruction and answer options with their usual support? Keep outside help distinct from software hints.'],
        ]),
        points([
          {title: 'Test the next build over time', body: 'Run another round with more participants and several sessions. Record support, attempts, response time, hint use and sensor behaviour, while keeping teacher facilitation visible in the evidence.'},
          {title: 'Then connect the educator system', body: 'Persist a real session record before extending the dashboard or AI summaries. Review with educators whether attempts, hints and separately recorded teacher help explain the answer; do not treat a pre-reveal score as independent success.'},
        ]),
        heading('What this visit can support'),
        paragraph('Four participants and one visit give us issues to investigate, rather than evidence of a lasting learning benefit. Teachers helped participants, and early hardware caused some breakdowns. We have not measured learning, retention, changes in engagement over time or the effect of the proposed fixes.'),
        paragraph('The next version should keep one question at a time, a consistent layout, supportive feedback, audio and tangible shape interaction. The aim is to reduce avoidable setup and turn friction without removing the teacher’s role.'),
      ]),
      chapter('reflection', 'Meraki and reflection', [
        paragraph('Giggles received Best Project at Meraki, our pre-grad show. My main contribution was connecting the physical inputs, game rules and phone feedback into a working prototype. The classroom trial then showed what that working system still needed: clearer instructions and better support for shared play.'),
        ...(meraki ? [picture(meraki)] : []),
        points([
          {title: 'An input needs the right meaning', body: 'Debouncing filters repeated electrical signals. It does not distinguish a counting finger from a pawn. That requires a different sensing decision, not just another timer.'},
          {title: 'Physical controls still need guidance', body: 'A functioning reader or button is not enough if a player expects a touchscreen or mixes the card decks. The next action needs to be clear where the player is looking.'},
          {title: 'Shared play changes the requirements', body: 'A phone that is readable from one seat is not equally visible to three players. Screen position, pawn colour and counting cues need to work around the whole board.'},
        ]),
        paragraph('Team: Anarghya YS, Mayuri Bhide, Payal Sajnani, Ruchi Tongaonkar and Lakshya Chopkar. Mentor: Asst. Prof. Aryan Halkude.'),
      ]),
    ],
  };
}
