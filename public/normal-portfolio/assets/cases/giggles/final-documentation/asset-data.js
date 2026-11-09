// Original source images from Giggles final documentation; complete provenance in manifest.json.
export const GIGGLES_FINAL_ASSET_LIST = [
  {
    "file": "ideation-emotion-reference-01.webp",
    "src": "assets/cases/giggles/final-documentation/ideation-emotion-reference-01.webp",
    "width": 567,
    "height": 403,
    "alt": "A small tangible emotion device with a smiling face and emotion symbol.",
    "caption": "Ideation 1 source reference, reproduced from final documentation. A reference image, not evidence of the final working Giggles prototype.",
    "evidenceRole": "concept reference",
    "pdfPages": [
      11
    ]
  },
  {
    "file": "ideation-emotion-reference-02.webp",
    "src": "assets/cases/giggles/final-documentation/ideation-emotion-reference-02.webp",
    "width": 610,
    "height": 391,
    "alt": "A simple panel with three emotion faces, push buttons and indicator lights.",
    "caption": "Second source reference for Ideation 1: tangible emotion identification.",
    "evidenceRole": "concept reference",
    "pdfPages": [
      11
    ]
  },
  {
    "file": "ideation-sequencing.webp",
    "src": "assets/cases/giggles/final-documentation/ideation-sequencing.webp",
    "width": 1201,
    "height": 1097,
    "alt": "Original To-Do List Sequencing Game concept presentation showing physical routine cards and progression.",
    "caption": "Ideation 2: a sequencing concept from the final documentation. A concept presentation, not the implemented prototype.",
    "evidenceRole": "concept presentation",
    "pdfPages": [
      12
    ]
  },
  {
    "file": "ideation-read-the-room.webp",
    "src": "assets/cases/giggles/final-documentation/ideation-read-the-room.webp",
    "width": 1201,
    "height": 1098,
    "alt": "Original Read the Room concept presentation connecting scenario cards, emotion tokens and responses.",
    "caption": "Ideation 3: Read the Room, from the final documentation. A concept presentation, not the implemented prototype.",
    "evidenceRole": "concept presentation",
    "pdfPages": [
      13
    ]
  },
  {
    "file": "board-layout.webp",
    "src": "assets/cases/giggles/final-documentation/board-layout.webp",
    "width": 1055,
    "height": 1055,
    "alt": "Giggles board layout with category blocks, start and finish, shape controls, phone area and RFID reader area.",
    "caption": "Original board-layout artifact from final documentation, PDF page15.",
    "evidenceRole": "design artifact",
    "pdfPages": [
      15
    ]
  },
  {
    "file": "category-cards.webp",
    "src": "assets/cases/giggles/final-documentation/category-cards.webp",
    "width": 842,
    "height": 305,
    "alt": "Communication, emotion and press category-card artwork.",
    "caption": "Original category-card artwork from final documentation, PDF page15.",
    "evidenceRole": "design artifact",
    "pdfPages": [
      15
    ]
  },
  {
    "file": "communication-cards.webp",
    "src": "assets/cases/giggles/final-documentation/communication-cards.webp",
    "width": 1324,
    "height": 491,
    "alt": "Four original communication cards: I am sorry, Thank you, Can you help me, and Please stop.",
    "caption": "Original communication answer-card artwork from final documentation, PDF page16.",
    "evidenceRole": "design artifact",
    "pdfPages": [
      16
    ]
  },
  {
    "file": "emotion-cards.webp",
    "src": "assets/cases/giggles/final-documentation/emotion-cards.webp",
    "width": 1324,
    "height": 491,
    "alt": "Four original emotion cards labelled Angry, Happy, Sad and Scared.",
    "caption": "Original emotion answer-card artwork from final documentation, PDF page17.",
    "evidenceRole": "design artifact",
    "pdfPages": [
      17
    ]
  },
  {
    "file": "shape-controls.webp",
    "src": "assets/cases/giggles/final-documentation/shape-controls.webp",
    "width": 1323,
    "height": 441,
    "alt": "Blue triangle, square, circle and star physical-control presentation with red and green lights.",
    "caption": "Original four-shape control presentation from final documentation. The final electronics implemented the square and circle only.",
    "evidenceRole": "concept hardware presentation",
    "pdfPages": [
      19
    ]
  },
  {
    "file": "child-flow.webp",
    "src": "assets/cases/giggles/final-documentation/child-flow.webp",
    "width": 900,
    "height": 993,
    "alt": "Original child-interface screen sequence: start, turn prompt, communication, emotion, shape, success and completion.",
    "caption": "Original child-interface screen spread from final documentation, PDF page20.",
    "evidenceRole": "interface design artifact",
    "pdfPages": [
      20
    ]
  }
];
export const GIGGLES_FINAL_ASSETS = Object.freeze(Object.fromEntries(GIGGLES_FINAL_ASSET_LIST.map(asset => [asset.file, Object.freeze(asset)])));
