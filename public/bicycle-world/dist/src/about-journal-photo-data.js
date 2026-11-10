// Actual owner-supplied photographs for Meet Lakshya. Source records stay private.
// Literal paths are required by the publishing dependency scanner.
export const ABOUT_JOURNAL_PHOTOS=Object.freeze([
  {
    "id": "lakshya-by-the-water",
    "role": "hero",
    "type": "image",
    "caption": "A moment by the water.",
    "alt": "Lakshya in a cream and gold kurta, smiling beside a calm stretch of water.",
    "src": "./assets/personal/about-journal/lakshya-by-the-water.webp",
    "thumb": "./assets/personal/about-journal/thumbs/lakshya-by-the-water.webp",
    "width": 1400,
    "height": 1400
  },
  {
    "id": "lakshya-a-quieter-moment",
    "role": "personal",
    "type": "image",
    "caption": "A quieter moment.",
    "alt": "Lakshya wearing a black polo and glasses, seated beside the water and looking to his right.",
    "src": "./assets/personal/about-journal/lakshya-a-quieter-moment.webp",
    "thumb": "./assets/personal/about-journal/thumbs/lakshya-a-quieter-moment.webp",
    "width": 1000,
    "height": 563
  },
  {
    "id": "lakshya-a-little-colour",
    "role": "personal",
    "type": "image",
    "caption": "A little colour.",
    "alt": "A smiling portrait of Lakshya with yellow, purple and blue colour powder on his face.",
    "src": "./assets/personal/about-journal/lakshya-a-little-colour.webp",
    "thumb": "./assets/personal/about-journal/thumbs/lakshya-a-little-colour.webp",
    "width": 563,
    "height": 1000
  },
  {
    "id": "listening-at-the-table",
    "role": "approach",
    "type": "image",
    "caption": "Comparing options, listening to people.",
    "alt": "Lakshya and two other people look over printed options and handwritten notes spread across a classroom table.",
    "src": "./assets/personal/about-journal/listening-at-the-table.webp",
    "thumb": "./assets/personal/about-journal/thumbs/listening-at-the-table.webp",
    "width": 1000,
    "height": 750
  },
  {
    "id": "observing-a-comparison",
    "role": "approach",
    "type": "image",
    "caption": "Listening during a preference comparison.",
    "alt": "Lakshya holds an open notebook while a participant compares printed design options on a table.",
    "src": "./assets/personal/about-journal/observing-a-comparison.webp",
    "thumb": "./assets/personal/about-journal/thumbs/observing-a-comparison.webp",
    "width": 1000,
    "height": 750
  },
  {
    "id": "presenting-the-syringe-redesign",
    "role": "journey",
    "type": "image",
    "caption": "Our syringe redesign at Meraki.",
    "alt": "Lakshya smiling in front of the Ergonomic Redesign of Syringe display at Meraki.",
    "src": "./assets/personal/about-journal/presenting-the-syringe-redesign.webp",
    "thumb": "./assets/personal/about-journal/thumbs/presenting-the-syringe-redesign.webp",
    "width": 1000,
    "height": 750
  },
  {
    "id": "giggles-recognition-at-meraki",
    "role": "recognition",
    "type": "image",
    "caption": "Giggles received Best Project at Meraki.",
    "alt": "Lakshya holds a certificate and wooden award in front of the Giggles project display at Meraki.",
    "src": "./assets/personal/about-journal/giggles-recognition-at-meraki.webp",
    "thumb": "./assets/personal/about-journal/thumbs/giggles-recognition-at-meraki.webp",
    "width": 1000,
    "height": 750
  }
].map(photo=>Object.freeze(photo)));
export const ABOUT_JOURNAL_HERO=ABOUT_JOURNAL_PHOTOS.find(photo=>photo.role==='hero');
