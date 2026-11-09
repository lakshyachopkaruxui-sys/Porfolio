// Editorial synthesis of verified Pixel Mania sources; the mixed PPT page is excluded.
// Native node/page provenance lives beside the assets; research limits live in the copy.
import {FIGMA_ASSETS} from './assets/cases/pixel-mania/figma-exports/asset-data.js';
import {PIXEL_ORIGINAL_ASSETS} from './pixel-mania-original-data.js';
import {PIXEL_COLOR_TOKENS, PIXEL_SPACING_TOKENS} from './pixel-mania-source-data.js';

const paragraph = text => ({type: 'paragraph', text});
const specimen = (kind, title, items, extra = {}) => ({type: 'pixel-specimen', kind, title, items, ...extra});
const asset = (file, label, alt, extra = {}) => {
  const source = FIGMA_ASSETS[file] || PIXEL_ORIGINAL_ASSETS[file];
  if (!source) throw new Error(`Missing original Pixel Mania asset: ${file}`);
  return {...source, label, alt, ...extra};
};
const visual = (file, width, height, alt, caption, extra = {}) => ({
  src: `assets/cases/pixel-mania/${file}`, width, height, alt, caption, ...extra,
});
const figure = (...args) => ({type: 'figure', visual: visual(...args)});
const film = (file, width, height, alt, caption) => ({
  type: 'video', src: `assets/cases/pixel-mania/evidence/${file}-demo.mp4`,
  poster: `assets/cases/pixel-mania/evidence/${file}-demo-poster.webp`, width, height, alt, caption,
});
const buttonGroups = [['small', 'light'], ['small', 'dark'], ['large', 'light'], ['large', 'dark']]
  .map(([size, tone]) => ({
    label: `${size === 'small' ? 'Small' : 'Large'} button · ${tone} tone`,
    items: ['default', 'hover', 'pressed', 'disabled'].map(state => asset(
      `button-${size}-${tone}-${state}.svg`, state[0].toUpperCase() + state.slice(1),
      `Original ${size} ${tone}-tone Pixel Mania button in its ${state} state.`,
    )),
  }));

export const PIXEL_MANIA_STORY = {
  playable: {label: 'Play the game', url: 'https://pixel-mania-game.vercel.app/'},
  intro: 'Pixel Mania is a drawing board for general visitors and casual creative play. Each click changes a square’s colour. There is no score or assigned image: players make a picture, a name or an activity of their own. I designed the visual system, assets and complete Figma prototype, then used AI-assisted coding to explore a browser version. Visitors tried it on an iPad at an exhibition.',
  outcome: {
    title: 'Current outcome',
    text: 'A complete visual system, five-scene Figma prototype and live browser exploration. Exhibition visitors used the board for patterns and lettering. A separate November 2026 input comparison is now prepared for testing. Exhibition feedback remains informal; the new comparison has no participant results yet.',
    target: 'exhibition',
  },
  readingTime: 11,
  sections: [
    {
      id: 'challenge', title: 'Design challenge',
      blocks: [
        paragraph('I wanted to make a drawing board that was easy to start but did not tell people what to draw. Games such as Mario and Contra inspired the starting point: build recognisable images from small squares, then let each square become a reusable part of the interface and interaction.'),
        specimen('origin', '', [
          asset('mario-pixels-app.svg', 'Recognisable image', 'Original pixel Mario illustration from the Pixel Mania companion-app design.', {caption: 'A character assembled from visible squares.'}),
          asset('cell-default-default.svg', 'One reusable unit', 'Original cream square component with a gray dashed outline.', {caption: 'Extract the square as a component with a clear boundary.'}),
          asset('game-board.webp', 'An open canvas', 'Original Pixel Mania game screen with a large gridded drawing board.', {caption: 'Repeat the unit, then let the player decide what it becomes.', enlarge: true}),
        ], {label: 'Concept: pixel character, reusable square, open board', caption: 'Character → square → drawing surface. The unit becomes both a visual rule and an interaction.'}),
        paragraph('I combined pixel art with neo-brutalism: flat colour, hard borders, blocky shapes and solid shadows offset from the controls. The square became more than decoration. It shaped both the drawing surface and the controls around it.'),
        paragraph('I chose a board without a score, timer or assigned drawing. The square changing colour is the immediate response to an action; the player decides what counts as a finished result. That made the first-click explanation more important than instructions for a particular game.'),
      ],
    },
    {
      id: 'ideation', title: 'Sketches',
      blocks: [
        paragraph('I sketched the drawing board, its controls and the entry screen on paper. I kept the board as the main activity and explored where the title, name field, start button and illustrations should sit around it.'),
        {type: 'gallery', layout: 'components', visuals: [
          asset('sketch-board.webp', 'Board and controls', 'Original paper sketch of the Pixel Mania board, cell area and surrounding controls.', {caption: 'Board exploration: keep the drawing surface central and controls around its edge.'}),
          asset('sketch-entry.webp', 'Entry hierarchy', 'Original paper sketch arranging the Pixel Mania title, name field, start action and decorative forms.', {caption: 'Entry exploration: establish the title, name field and start action.'}),
          asset('sketch-layout.webp', 'An alternate arrangement', 'A second original paper layout sketch for the Pixel Mania entry screen.', {caption: 'Alternate layout: explore the balance between the central action and surrounding illustration.'}),
        ]},
        paragraph('I then carried the layout into Figma and built shared components. That let me reuse the same controls and states across the screens.'),
      ],
    },
    {
      id: 'interaction', title: 'Interaction',
      blocks: [
        paragraph('In the browser exploration, 28 columns and 18 rows create a 504-cell board. Each click advances a cell through cream, blue, orange, lime and magenta, then back to cream. The colour chips above the board explain the sequence.'),
        specimen('components', 'The cell states', [
          {label: 'Board cells', items: [
            asset('cell-hover-default.svg', 'Hover', 'Original gray hover cell component.'),
            asset('cell-black-default.svg', 'Blue', 'Original blue painted cell component.'),
            asset('cell-red-default.svg', 'Orange', 'Original orange painted cell component.'),
            asset('cell-green-default.svg', 'Lime', 'Original lime painted cell component.'),
            asset('cell-blue-default.svg', 'Magenta', 'Original magenta painted cell component.'),
          ]},
        ], {caption: 'The cream starting cell appears in the concept above. Hover is feedback; the five-colour cycle is the drawing rule.'}),
        paragraph('I kept colour selection inside the cell, so the same action chooses a colour and paints the square. There is no separate colour-picker step to learn. The trade-off is repeated clicking: reaching a particular colour can take several clicks, and a larger drawing repeats that effort across many cells. Reset clears the whole board; Exit leaves the experience.'),
        film('board', 1440, 1024, 'Recorded browser demonstration of the tutorial, cell colour changes, drawing a heart and clearing the board.', 'Original interaction recording: tutorial, repeated cell clicks, a painted heart and Reset. The activity suggestions use the same board.'),
        specimen('components', 'Teach the same rule with a smaller example', [
          {label: 'Before a click', items: [1, 2, 3, 4, 5].map(number => asset(`tutorial-${number}.svg`, `Cell ${number}`, `Original tutorial input cell, variant ${number}.`))},
          {label: 'After a click', items: ['Blue', 'Orange', 'Lime', 'Magenta', 'White'].map((colour, index) => asset(`tutorial-output-${index + 1}.svg`, colour, `Original tutorial output cell, ${colour.toLowerCase()} colour state.`))},
        ], {caption: 'The tutorial reuses the outlined cell to explain the colour change before the full board.'}),
      ],
    },
    {
      id: 'system', title: 'Design system',
      blocks: [
        paragraph('I built a shared colour palette, type styles, spacing scale and component library in Figma. The values below are the original design tokens: named colours and measurements reused across the screens. The controls show how the same system handles typing, hover, pressing and disabled states.'),
        specimen('palette', 'Colour', PIXEL_COLOR_TOKENS.map(token => ({label: token.name, color: token.hex, value: token.hex, sourceId: token.sourceId, sourceGroup: token.group})), {
          caption: 'Seventeen colour variables cover the bright game palette, neutral surfaces and disabled states. Original Figma names and values are preserved.',
        }),
        paragraph('One rule runs from the palette to the board: YellowishWhite (#FFFAEE) is the unpainted cell, and NeonLime (#C2EF34) is its third-click fill. The cell keeps its outlined square boundary as the fill changes. The board repeats that boundary and shows the same colour sequence in its legend.'),
        specimen('origin', 'Token → state → screen', [
          asset('cell-default-default.svg', 'YellowishWhite · starting state', 'Original cream cell component using the YellowishWhite fill.', {caption: '#FFFAEE · The empty state makes an untouched square visible.', reuseReason: 'The concept introduces the square; this trace identifies the exact token used by its starting state.'}),
          asset('cell-green-default.svg', 'NeonLime · third-click state', 'Original lime cell component using the NeonLime fill.', {caption: '#C2EF34 · Fill changes while the component boundary stays the same.', reuseReason: 'The interaction gallery shows the cycle; this trace connects its lime state to the named original colour variable.'}),
          asset('game-board.webp', 'The rule on the original screen', 'Original board screen with a cream grid and a legend identifying lime as the third click.', {enlarge: true, caption: 'The cream grid and “Click 3x” lime legend put the component rule into the full screen.', reuseReason: 'This view connects named fills and cell states to the original board; the flow chapter separately explains where that screen sits in the journey.'}),
        ], {variant: 'state-trace', caption: 'Original Figma tokens, cell variants and screen. Cell states are shown at the same scale. This traces a visual/interaction rule; it does not establish that every browser state or mobile component uses the same instance.'}),
        specimen('type', 'Typography', [
          asset('logo-state-1-node-239-1024.svg', 'Poxast', 'Original Pixel Mania title lettering in Poxast.', {role: 'Display title'}),
          {label: 'Press Start 2P', sample: 'PLAY\n012345', font: '"Pixel Mania Press Start", monospace', role: 'Headings and buttons'},
          asset('tagline-state-1.svg', 'Karmatic Arcade', 'Original Click Color Create tagline lettering in Karmatic Arcade.', {role: 'Expressive tagline'}),
          {label: 'JetBrains Mono', sample: 'Click. Color. Create.\nYour next pixel starts here.', font: '"Pixel Mania JetBrains", monospace', role: 'Supporting copy and captions'},
        ], {caption: 'Pixel lettering carries the display hierarchy; monospaced supporting text has a separate reading role. Pixel Pedia also explores DM Mono for mobile interface copy.'}),
        specimen('components', 'Controls that communicate their state', [
          {label: 'Name input', items: [
            asset('input-unfilled.svg', 'Unfilled', 'Original empty name-input component.'),
            asset('input-typing.svg', 'Typing', 'Original name-input component while text is being entered.'),
            asset('input-filled.svg', 'Filled', 'Original completed name-input component.'),
          ]},
          ...buttonGroups,
        ], {caption: 'Original Figma variants, separated into their input and button families. The library includes disabled variants; this does not mean every variant was implemented in the browser.'}),
        paragraph('The buttons use a solid six-pixel shadow; the name field uses a four-pixel shadow. Their raised appearance carries through the interaction states. In the browser, submitting an empty name shows a correction and returns focus to the field.'),
        film('form', 1000, 440, 'Recorded name-input sequence from empty field through typing, completed name and button interaction.', 'Original focused recording: the name field changes as text is entered, followed by the start-button interaction.'),
        specimen('rules', 'Spacing', PIXEL_SPACING_TOKENS.map(token => ({kind: 'space', label: token.name, value: `${token.value} px`, size: token.value, sourceId: token.sourceId})), {
          caption: 'The original 4–200 px scale. Each bar shows its value relative to the largest token; source names are preserved.',
        }),
      ],
    },
    {
      id: 'motion', title: 'Motion',
      blocks: [
        paragraph('I animated the title, tagline, geometric illustrations, dinosaur and birds using a small set of original shapes and poses. Reusing these parts keeps the entry and loading screens visually connected to the drawing board.'),
        specimen('motion', 'The illustration vocabulary', [
          ['shape-bolt-yellow.svg', 'Bolt'], ['shape-circles-red.svg', 'Circles'],
          ['shape-disc-blue.svg', 'Disc'], ['shape-ellipse-blue.svg', 'Cyan ring'],
          ['shape-ellipse-pink.svg', 'Pink ring'], ['shape-pipe-gold.svg', 'Bent pipe'],
          ['shape-ring-blue-shadow.svg', 'Outlined ring'], ['shape-squarering-blue-2.svg', 'Square loop'],
          ['shape-squarering-blue.svg', 'Turned square loop'], ['shape-star-purple.svg', 'Star'],
          ['shape-triangle-orange.svg', 'Triangular form'], ['shape-triangle-yellow.svg', 'Corner'],
          ['shape-zigzag-purple.svg', 'Purple zigzag'], ['shape-zigzag-yellow.svg', 'Yellow zigzag'],
        ].map(([file, label]) => asset(file, label, PIXEL_ORIGINAL_ASSETS[file].alt)), {
          caption: 'Original standalone illustration assets. Hard outlines, flat colour and visible extrusion connect them to the controls.',
        }),
        specimen('motion', 'Lettering as a sequence', [
          ...[2, 4, 6, 8].map(state => asset(`logo-state-${state}-node-${({2: '239-1016', 4: '239-1020', 6: '239-1017', 8: '239-1064'})[state]}.svg`, `Title frame ${state}`, `Original Pixel Mania title animation variant ${state}.`)),
          asset('tagline-state-2.svg', 'Tagline · frame 2', 'Original second tagline colour variant.'),
          asset('tagline-state-3.svg', 'Tagline · frame 3', 'Original third tagline colour variant.'),
        ], {caption: 'Selected title keyframes and the remaining tagline variants. Their first frames appear in the type specimens above.'}),
        film('intro', 1440, 1024, 'Original Pixel Mania entry recording with animated decorative shapes, title and colour-changing tagline.', 'Original entry animation: illustration and typography working together.'),
        specimen('motion', 'A few poses create the loading scene', [
          asset('dino-left.svg', 'Dinosaur · pose 1', 'Original yellow dinosaur with its first leg position.', {surface: 'ink'}),
          asset('dino-right.svg', 'Dinosaur · pose 2', 'Original yellow dinosaur with its alternate leg position.', {surface: 'ink'}),
          asset('bird-1.svg', 'Bird · wings up', 'Original pink bird with raised wings.', {surface: 'ink'}),
          asset('bird-2.svg', 'Bird · wings down', 'Original pink bird with lowered wings.', {surface: 'ink'}),
          ...[1, 2, 3].map(dots => asset(`loading-${dots}-dots.svg`, `Loading · ${dots} ${dots === 1 ? 'dot' : 'dots'}`, `Original loading word component with ${dots} ${dots === 1 ? 'dot' : 'dots'}.`, {surface: 'ink'})),
        ], {caption: 'Separate sprite poses and loading-word variants. Alternation creates movement without changing the pixel construction.'}),
        film('loading', 1440, 1024, 'Recorded blue loading scene with a yellow dinosaur, pink birds and changing loading dots.', 'Original loading recording. The browser uses a 4.5-second interval; the iteration chapter explains the timing change.'),
        paragraph('The dinosaur and birds move by alternating poses. Controls use eased transitions, and the board dissolves on exit. Each motion has a role in the flow while using the same pixel style.'),
      ],
    },
    {
      id: 'flow', title: 'Screen flow',
      blocks: [
        paragraph('The Figma prototype connects five scenes: enter a name, pass through loading, learn the colour rule, draw on the board, then leave or begin again. I placed a small tutorial before the full board to explain the colour cycle through a simpler example. The closing screen gives the open-ended activity a clear exit and return.'),
        specimen('flow', '', [
          asset('game-intro.webp', 'Entry', 'Original Pixel Mania introduction screen with name input and start button.', {enlarge: true, caption: 'Give the player one clear starting action.'}),
          asset('game-loading.webp', 'Loading', 'Original blue loading screen with dinosaur, birds and loading text.', {enlarge: true, caption: 'Carry the visual language into the transition.'}),
          asset('game-tutorial.webp', 'How to Play', 'Original Pixel Mania tutorial screen showing the click and colour rule.', {enlarge: true, caption: 'Explain the rule before the blank board.'}),
          asset('game-board.webp', 'Board', 'Original Pixel Mania drawing-board screen.', {enlarge: true, caption: 'Leave the result open to the player.', reuseReason: 'The origin chapter shows what the repeated unit becomes; this sequence locates the full board within the five-scene journey.'}),
          asset('game-thanks.webp', 'Thank you', 'Original closing screen with a way to restart Pixel Mania.', {enlarge: true, caption: 'Make returning part of the experience.'}),
        ], {label: 'Five-scene Figma prototype', caption: 'Original Figma screens, individually presented. Open a screen to inspect it at full size.'}),
        paragraph('Free Draw, Name Builder and Right–Wrong are suggestions for using the same board. They do not switch the underlying interaction or introduce separate scoring systems.'),
        film('exit', 1440, 1024, 'Recorded browser flow leaving the board, dissolving to the thank-you screen and restarting with R.', 'Original exit and restart recording: the end of one creation leads back into the experience.'),
      ],
    },
    {
      id: 'translation', title: 'Figma to browser',
      blocks: [
        paragraph('I completed the components and flow in Figma before exploring a browser build. I used vibe coding, working with AI to write and revise the code, to see how the same interaction would behave outside the prototype.'),
        paragraph('I owned the concept, visual system, original assets, Figma design and interaction decisions. The browser code was co-created with AI assistance. I directed its review, checking timing, states and feedback against my design.'),
        paragraph('The browser had to track painted cells, show Reset when there was something to clear, and handle exit and restart. A background of 409 animated squares uses a difference blend mode to extend the pixel style beyond the board.'),
        paragraph('The browser scales a fixed-size stage to fit the window. Cell size, text readability, keyboard operation and touch targets still need a review across devices.'),
      ],
    },
    {
      id: 'exhibition', title: 'Exhibition feedback',
      blocks: [
        paragraph('At the foyer exhibition, visitors from different design departments tried the board on an iPad and left written feedback. The photographs show people making a symmetrical pattern and lettering, with the system posters behind the device.'),
        {type: 'gallery', layout: 'photos', visuals: [
          visual('evidence/exhibition-drawing.webp', 720, 1280, 'Two exhibition visitors look at the iPad while one creates a symmetrical coloured pattern.', 'Making a pattern on the iPad.', {kind: 'photo'}),
          visual('evidence/exhibition-playing.webp', 720, 1280, 'An exhibition visitor touches the iPad board with the Pixel Mania posters behind it.', 'Exploring lettering on the same board.', {kind: 'photo'}),
        ]},
        figure('evidence/visitor-artwork.webp', 1280, 959, 'An exhibition creation spells Payal in blue and magenta pixels on the board.', 'A visitor’s pixel lettering: the board supplied the rule; the visitor supplied the purpose.'),
        paragraph('Visitors used the same board for names, shapes, patterns and improvised shared activities. Their different uses supported keeping the board open-ended. The written comment about time, however, made repeated effort a priority to investigate rather than treating a simple rule as an easy interaction.'),
        {type: 'points', items: [
          {title: 'Pace · faithful paraphrase', body: 'On the first retained feedback sheet, a visitor liked trying the board but found it time-consuming, with an added note that it was engaging. This identifies friction without telling us whether waiting, colour selection or drawing caused it.'},
          {title: 'Consistency · exact excerpt', body: '“Design system works as it should.” — anonymous written feedback, sheet 1. This is a visitor’s opinion of the system, rather than a measured usability result.'},
          {title: 'Concept link · exact excerpt', body: '“Style is good but try and relate it with concept” — anonymous written feedback, sheet 2. The opening now explains how the square shapes controls, layout and motion, so the style has a visible connection to the activity.'},
          {title: 'Refinement · faithful paraphrase', body: 'Separate comments on the second sheet asked for more refinement and a clearer explanation of neo-brutalism. Other comments praised nostalgia, colour and interaction. These are separate observations, not one combined visitor quote.'},
        ]},
        paragraph('These excerpts come from two retained handwritten feedback sheets. The sheets do not establish a verified participant total or task record and remain private. This was an exhibition trial, not a structured usability study; no task-success rate or learning benefit was measured.'),
        figure('evidence/exhibition-display.webp', 720, 1280, 'Lakshya stands beside the Pixel Mania system posters while holding the iPad board.', 'The original foyer display, with the playable board and visual-system artifacts.', {kind: 'photo'}),
      ],
    },
    {
      id: 'iteration', title: 'Iterations',
      blocks: [
        paragraph('The documented timing change is from an eight-second loading scene in Figma to a 4.5-second browser interval. The animated scene carries the project’s character, but it also delays access to the board. Shortening it keeps that transition while reducing the fixed wait.'),
        {type: 'comparison', beforeTitle: 'Prototype timing', afterTitle: 'Browser timing', before: 'An eight-second loading scene.', after: 'A 4.5-second loading interval.', note: 'A documented timing revision. Its effect on waiting tolerance or task performance was not measured.'},
        paragraph('Reset already has visible and hidden states in the Figma design. The browser shows it after a cell is painted and hides it when the board is clear. This is a state-based control: it appears when there is something to reset, rather than suggesting an action on an empty board.'),
        paragraph('Exhibition use made touch a clearer priority for the next pass. I would review the rendered board, target sizes and repeated-tap effort directly on touch devices.'),
        paragraph('In November 2026, I prepared a separate interaction comparison for the intended audience of general visitors and casual creative play. It keeps the same board and colours while separating cell cycling, choosing a colour, and continuous strokes. This new exploration is ready for a small moderated check; no participant sessions have been run.'),
        {type: 'points', items: [
          {title: 'Original experience · entry and waiting', body: 'Observe the live game from name entry through tutorial, the fixed loading interval, drawing and exit. This would show where someone hesitates, waits, needs help or leaves on an actual device.'},
          {title: 'New comparison · painting effort', body: 'The A/B/C lab removes the original entry, loading and animation. Its matched drawing tasks can examine colour selection and strokes, but cannot explain tolerance for the original wait.'},
        ]},
        {type: 'sources', items: [{title: 'Try the new painting comparison', href: './design/pixel-interaction-lab-20261108/', note: 'New November 2026 exploration · Untested. A simplified local lab, separate from the original live game and exhibition evidence.'}]},
      ],
    },
    {
      id: 'pedia', title: 'Pixel Pedia concept',
      blocks: [
        paragraph('Pixel Pedia is a companion mobile concept for discovering pixel games. I used it to explore how the same colours, typography and controls would work in search, lists, game cards and navigation. The drawing board tests the system around one repeated action; this concept explores it around finding and reading information.'),
        specimen('pedia', '', [
          asset('pedia-introduction.svg', 'Introduction', 'Original Pixel Pedia introduction screen with pixel Mario and a get-started action.', {enlarge: true, caption: 'Introduce the pixel-game world.'}),
          asset('pedia-login.svg', 'Sign in', 'Original Pixel Pedia sign-in screen.', {enlarge: true, caption: 'Carry the input and button language into mobile.'}),
          asset('pedia-home.svg', 'Home', 'Original Pixel Pedia home screen with game-discovery cards.', {enlarge: true, caption: 'Use cards to organise discovery.'}),
          asset('pedia-search.svg', 'Search', 'Original Pixel Pedia game search screen.', {enlarge: true, caption: 'Find a game by its name.'}),
          asset('pedia-categories.svg', 'Categories', 'Original Pixel Pedia category-browsing screen.', {enlarge: true, caption: 'Explore games by category.'}),
          asset('pedia-detail.svg', 'Game detail', 'Original Pixel Pedia Mario game-detail screen.', {enlarge: true, caption: 'Move from discovery to a focused reading view.'}),
          asset('pedia-profile.svg', 'Profile', 'Original Pixel Pedia profile screen.', {enlarge: true, caption: 'Extend the system to account-related content.'}),
        ], {label: 'Pixel Pedia companion mobile concept', caption: 'Original mobile screens, presented individually. This is a design exploration, not a launched or fully built second product.'}),
        paragraph('The extension introduces DM Mono for mobile interface copy while retaining the colour, outlined controls and pixel imagery. It was not evaluated as a separate product; its information hierarchy and reading experience remain questions for testing.'),
      ],
    },
    {
      id: 'reflection', title: 'Results and next steps',
      blocks: [
        paragraph('I made a reusable visual system, original illustration and animation assets, a five-scene Figma prototype and a playable browser exploration. Exhibition visitors gave the board different purposes. My main lesson was that an interaction can be easy to describe and still take effort to use: cycling one cell is simple, but drawing many cells makes repetition matter.'),
        paragraph('The next evaluation has two parts: observe first use of the original complete game, then use the existing comparison for the same small-symbol, larger-block and recovery tasks in counterbalanced conditions. I would keep original-flow observations separate from the simplified lab results, make a justified change and check the affected task again. No such participant round or follow-up has run. Fill and saving remain future possibilities outside this exploration.'),
        paragraph('I would use task completion, help, accidental changes and comments to decide what to retain, alongside action counts and time. Faster input alone would not establish a better creative experience; the choice also needs to preserve the board’s clarity and openness.'),
      ],
    },
  ],
};
