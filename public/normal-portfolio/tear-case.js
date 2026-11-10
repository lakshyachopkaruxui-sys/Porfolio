// Tear case: source-grounded design narrative. Evidence provenance is recorded in docs/tear-integration-20261110.md.
export const TEAR_PROJECT = {
  "id": "tear",
  "title": "TEAR",
  "status": "Immersive experience · Working prototype",
  "summary": "A dream journey opened by hand: curiosity becomes wonder, fear and uncertain relief.",
  "role": "I designed the concept, spatial interaction, emotional journey and art direction, and directed AI-assisted prototyping and narrative iteration.",
  "available": true,
  "sections": [
    {
      "id": "premise",
      "title": "A doorway you choose to open",
      "body": [
        "Pinch a seam, pull reality apart and decide whether to cross. A familiar room leads through Ocean, Shadow and Forest before returning with an unanswered question."
      ]
    }
  ]
};
export const TEAR_CONTEXT = {
  "type": "Immersive interaction and storytelling",
  "team": "Independent Immersive Media Design project",
  "role": "I designed the concept, spatial interaction, emotional journey and art direction, and directed AI-assisted prototyping and narrative iteration.",
  "methods": [
    "Gesture exploration",
    "Emotional journey design",
    "Environment and sound direction",
    "Informal feedback and iterative reviews",
    "Desktop prototype checks"
  ],
  "question": "What if leaving a dream began with your hands?",
  "overviewSections": [
    {
      "id": "concept",
      "title": "Pull reality apart",
      "body": [
        "A dream journey opened by hand: curiosity becomes wonder, fear and uncertain relief."
      ]
    },
    {
      "id": "iteration",
      "title": "Designing for presence",
      "body": [
        "Feedback reshaped the forest floor, volcanic atmosphere and first-person dream narration."
      ],
      "limitation": "Informal feedback and prototype checks; latest Quest 3S validation remains pending."
    }
  ]
};
export const TEAR_PROCESS = {
  "steps": [
    [
      "Make crossing a choice",
      "Reveal the next world through a hand-opened seam."
    ],
    [
      "Shape an emotional route",
      "Move from familiarity to wonder, fear and uncertain relief."
    ],
    [
      "Follow breaks in immersion",
      "Rework ground detail, atmosphere and narration in response to reviews."
    ],
    [
      "Review the complete journey",
      "Check entry, walking, captions and crossings; distinguish desktop checks from headset evidence."
    ],
    [
      "Validate the latest headset build",
      "Evaluate comfort, legibility, emotional delivery and sustained performance on Quest 3S.",
      true
    ]
  ],
  "tools": [
    [
      "Spatial interaction and art direction",
      "Gesture, scene composition, environmental detail and emotional pacing."
    ],
    [
      "Narrative and sound direction",
      "One dreamer’s voice, authored pauses, captions and explicit replay."
    ],
    [
      "AI-assisted prototyping and selected assets",
      "Three.js/WebXR and offline generated voice; external asset creators retain credit."
    ]
  ]
};
export const TEAR_COVER = {
  "src": "./assets/project-covers/approved-20261110/tear.webp",
  "width": 1734,
  "height": 907,
  "alt": "AI-generated TEAR presentation cover: hands pull a glowing seam between a room, ocean and sunlit forest beside Pull reality apart.",
  "caption": "Owner-selected AI-generated presentation artwork; actual prototype captures and iteration evidence appear below."
};
export const TEAR_STORY = {
  "intro": "A familiar room. A cut in the air. A world waiting on the other side. TEAR turns crossing into a deliberate gesture: pinch a seam, pull it open, then choose whether to enter. I designed the journey so wonder becomes fear, and relief arrives with a question still unanswered.",
  "readingTime": 7,
  "outcome": {
    "title": "Current prototype",
    "text": "A complete desktop and headset-oriented dream journey with hand-opened crossings, distinct environments, a first-person voice and synchronized captions. Informal feedback drove revisions; latest headset comfort and performance remain to be validated.",
    "target": "evaluation"
  },
  "sections": [
    {
      "id": "doorway",
      "title": "A doorway you could choose to open",
      "body": [
        "I wanted the transition to become part of the story. Instead of selecting a destination, the visitor holds the edge of one reality and reveals another. The next place is visible before committing to it.",
        "The interaction gives that decision a physical form. Pinch with both hands to grip. Move them apart to open the tear. Before crossing begins, releasing both grips lets it heal; holding it open takes the visitor through. A fresh grip begins the next transition.",
        "I placed the seam below eye level and amplified its response so the opening would ask for less reach. These were comfort-oriented design decisions, rather than evidence of a proven ergonomic benefit. Desktop controls provide another way to explore the same sequence."
      ],
      "figures": [
        {
          "src": "assets/cases/tear/earlier-shadow-room-tear.png",
          "width": 1919,
          "height": 1079,
          "alt": "An earlier prototype shows a tear between the shadow world and room.",
          "caption": "Earlier prototype: the doorway reveals a destination before crossing."
        }
      ]
    },
    {
      "id": "journey",
      "title": "Building an emotional route",
      "body": [
        "The route stays simple: familiar room → Ocean → Shadow → Forest → familiar room. What changes is the visitor’s relationship with being there.",
        "These are intended emotional beats, not measured audience responses. Titles now read as the dreamer’s thoughts rather than a list of destinations."
      ],
      "flow": {
        "label": "The dream in five moments",
        "steps": [
          {
            "title": "Did I Wake Up?",
            "body": "A familiar room becomes impossible when a seam opens in the air."
          },
          {
            "title": "How Am I Breathing?",
            "body": "Underwater disbelief gives way to wonder and a wish to stay."
          },
          {
            "title": "Something Knows I’m Here",
            "body": "A nightmare reverses that wish. The character expects to wake, but cannot."
          },
          {
            "title": "Is This Finally Real?",
            "body": "A living forest offers relief without certainty."
          },
          {
            "title": "Did I Wake Up?",
            "body": "The same room returns, but the tear keeps the dream unresolved."
          }
        ]
      },
      "figures": [
        {
          "src": "assets/cases/tear/current-desktop-ocean.png",
          "width": 1280,
          "height": 900,
          "alt": "Marine life in an earlier desktop Ocean build.",
          "caption": "Earlier desktop Ocean capture. Marine life and scale support the intended sense of wonder."
        }
      ]
    },
    {
      "id": "forest",
      "title": "When a convincing background was not enough",
      "body": [
        "In later informal headset feedback reported to me, friends appreciated Ocean’s detail but found Forest less immersive. The distant woodland suggested a forest; the ground around their feet did not support that impression. Awkward deer movement was another interruption.",
        "I treated the near ground as part of the experience, rather than decoration beneath it. A five-by-five-metre sample let me work on grass, soil, rocks and smaller natural details before extending the treatment across the world. A temporary arrow made the sample easy to locate during review, then was removed after rollout.",
        "The first changes were too subtle. Further review led to denser grass with varied heights, more continuous coverage and fewer exposed road-like gaps. Later feedback distinguished density from naturalness: more grass alone did not make the scene believable. The direction shifted toward a brighter, healthier forest, with a pond that belonged to its surroundings.",
        "The lesson was specific: immersion depends on what surrounds the visitor at their scale, not only on a distant panorama."
      ],
      "figures": [
        {
          "src": "assets/cases/tear/forest-before.jpg",
          "width": 1100,
          "height": 760,
          "alt": "Sparse ground coverage in an earlier Forest iteration.",
          "caption": "Earlier Forest ground review: a convincing background was not enough."
        },
        {
          "src": "assets/cases/tear/forest-after.jpg",
          "width": 1100,
          "height": 760,
          "alt": "Denser varied grass in a later Forest review.",
          "caption": "Later desktop grass review. Density and naturalness were reviewed separately."
        }
      ]
    },
    {
      "id": "shadow",
      "title": "Giving fear its own environment",
      "body": [
        "Shadow initially overlapped too closely with Forest. I developed a distinct direction around volcanic terrain, flowing lava, dark red skies and unfamiliar creatures. Subsequent reviews asked for less artificial mountains, less straight lava, more coherent planets, flying creatures and a stronger relationship between image and sound.",
        "The iterations were attempts to make the elements belong to one place. Adding more objects could not substitute for a consistent atmosphere. I used the existing fear-oriented environment as a contrast to Ocean’s openness and Forest’s relief, while keeping the visitor’s route understandable."
      ],
      "figures": [
        {
          "src": "assets/cases/tear/shadow-current.png",
          "width": 969,
          "height": 884,
          "alt": "Volcanic mountains and lava under the red Shadow sky.",
          "caption": "Desktop Shadow review: volcanic terrain replaced the overlapping woodland direction."
        }
      ]
    },
    {
      "id": "voice",
      "title": "Rewriting the voice as a person inside the dream",
      "body": [
        "Earlier narration explained the worlds from outside. Its archive premise and robotic delivery were rejected during review. Echo and repeated speech also weakened the intended mood.",
        "The revised story starts with a smaller uncertainty: “I thought I’d woken up.” The voice becomes the visitor’s immediate inner speech. Ocean offers an impossible discovery: “But I can breathe.” Shadow reverses that desire to stay: “Why haven’t I woken up?” Forest offers relief without settling whether the dream has ended.",
        "I compared fearful performance directions and selected the quieter one: someone trying not to be heard. Shadow and return use more strained, frightened delivery; Ocean retains wonder and Forest relief. Breaths belong to the performed recordings. Dry delivery avoids adding an echo merely to signal atmosphere, and pauses give the final questions room to land.",
        "Captions follow the final spoken phrases. Voice can be muted without removing captions, and replay remains an explicit choice. Crossing stops the previous narration rather than carrying competing voices into the next place."
      ],
      "figures": [
        {
          "src": "assets/cases/tear/dream-forest.png",
          "width": 1280,
          "height": 720,
          "alt": "Dream narration caption displayed over the Forest prototype.",
          "caption": "Desktop functional check of the new dream narration. This is not a headset listening study."
        }
      ]
    },
    {
      "id": "evaluation",
      "title": "What testing changed—and what it has not proved",
      "body": [
        "The original assignment records an original participant session. The feedback described pinching and pulling as easy after getting started, and the whale overhead stood out. It also recorded entry-room visibility and an unreliable two-palm help gesture. These are paraphrased observations from that original session, not quotations or evidence about the latest build.",
        "Revisions introduced a visible help target, narration controls and revised entry handling. Later reviews focused on environment coherence, ground detail, the dream voice and legibility. Desktop checks confirm that the current route completes and captions follow the recordings. They do not establish emotional impact, accessibility conformance or physical headset comfort.",
        "Frame-time spikes remain in some desktop checks. The latest Quest 3S experience still needs a physical-device evaluation for readable text while moving, clear audio, tracking interruptions and transition smoothness. I would not present preparation checks as a completed headset retest."
      ]
    },
    {
      "id": "reflection",
      "title": "What I would take forward",
      "body": [
        "The strongest design shift was moving from separate scenes toward a connected experience. The hand gesture makes each transition a choice; contrasting environments give that choice a changing emotional context; the dream voice connects them without explaining everything away.",
        "The next evaluation should ask whether visitors understand how to begin, recover from an interrupted gesture, follow the story without being hurried, and return with curiosity rather than confusion."
      ]
    },
    {
      "id": "implementation",
      "title": "Making the experience work",
      "body": [
        "TEAR runs in a desktop browser and is prepared for Meta Quest 3S through WebXR and Three.js. Narration is locally generated with Qwen3-TTS and delivered as lightweight prerecorded audio, with timed captions. AI assisted implementation and iteration; concept, selection, review and creative direction remained authored design decisions.",
        "The environments combine procedural work with externally created models, textures, panoramas and sound. Source and licence records are retained in the project. Asset sources and licence records remain documented with the standalone prototype."
      ]
    }
  ]
};
