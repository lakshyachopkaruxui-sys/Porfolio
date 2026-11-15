/** Approved personal narration; only locally verified recordings. */
const lines = [
  [
    "room:visitor",
    "Welcome to the visitor board. How did the ride feel? What did you think of Lakshya’s work and the world he’s built around it? You can read shared reviews and see the visitors’ names here. Leave your own thoughts if you’d like—what stayed with you, and what could be better? Your feedback helps Lakshya improve this place.",
    null,
    false
  ],
  [
    "welcome",
    "Hi, I’m Woody! Welcome to Lakshya’s world. He’s brought his design projects, music, photographs and childhood favourites into this garden. I’ll show you around. Pick a path, and let’s get to know him.",
    null,
    false
  ],
  [
    "controls-offer",
    "Before we ride, want a quick look at the guide? The Lakshya’s Garden board has the controls and shortcuts. You can open it anytime, or press the question mark key.",
    null,
    false
  ],
  [
    "controls-yes",
    "You got it. The shortcuts are here. Open Read the tour lines for the full transcript. I’ll wait here.",
    null,
    false
  ],
  [
    "controls-no",
    "All right, let’s explore. Need a hand later? Select Guide, or press the question mark key.",
    null,
    false
  ],
  [
    "departure",
    "Here we go! A little of Lakshya, around every bend.",
    null,
    false
  ],
  [
    "controls",
    "W pedals. A and D steer. Space is your brake. Or click clear ground and I’ll ride us there. Select Guide, or press the question mark key, for every shortcut.",
    null,
    false
  ],
  [
    "controls-takeover",
    "Want the handlebars back? Steer or brake to take over.",
    null,
    false
  ],
  [
    "arrival-guide",
    "That board is our garden guide. Click it, or press Enter nearby, for controls, the map, and the tour transcript.",
    null,
    false
  ],
  [
    "approach:about",
    "That’s Meet Lakshya. Step inside for his journey from engineering to UX, and a little about the person behind the work.",
    "about",
    false
  ],
  [
    "approach:projects",
    "Here’s Works—Lakshya’s design projects. Come see the questions he explored, what he made and the decisions along the way.",
    "projects",
    false
  ],
  [
    "approach:work",
    "Hear that? This is Hobbies. Lakshya’s singing and Garba live here—a little of the energy he brings beyond his design work.",
    "work",
    false
  ],
  [
    "approach:music",
    "Oak’s lab is ahead. There’s a piece of Lakshya’s childhood in there—and a clue to how this garden began.",
    "music",
    false
  ],
  [
    "approach:cloud",
    "That’s The Viewfinder. Lakshya loves photographing clouds, and the everyday moments that catch his eye. Come see what makes him stop for a picture.",
    "cloud",
    false
  ],
  [
    "arrive:about",
    "That’s Meet Lakshya. Step inside for his journey from engineering to UX, and a little about the person behind the work.",
    "about",
    false
  ],
  [
    "arrive:projects",
    "Here’s Works—Lakshya’s design projects. Come see the questions he explored, what he made and the decisions along the way.",
    "projects",
    false
  ],
  [
    "arrive:work",
    "Hear that? This is Hobbies. Lakshya’s singing and Garba live here—a little of the energy he brings beyond his design work.",
    "work",
    false
  ],
  [
    "arrive:music",
    "Lakshya grew up imagining a world with Pokémon, and Toy Story stayed close to his heart, too. Here, his Pokémon GO collection sits alongside the story of turning those memories into a portfolio you can explore. Dr. Oak will take it from here.",
    "music",
    false
  ],
  [
    "arrive:cloud",
    "That’s The Viewfinder. Lakshya loves photographing clouds, and the everyday moments that catch his eye. Come see what makes him stop for a picture.",
    "cloud",
    false
  ],
  [
    "works-skipped",
    "We haven’t stopped at Works yet. Want to see Lakshya’s design projects, or keep exploring this side of him first? Your call.",
    "projects",
    false
  ],
  [
    "ramp-airborne",
    "Woo-hoo!",
    null,
    false
  ],
  [
    "ramp-landed",
    "Woo-hoo! Back on the path. Where shall we go next?",
    null,
    false
  ],
  [
    "room:about",
    "Lakshya loves starting conversations. Listening matters to him, too—it’s part of what drew him to design. His notebook brings together his background, the way he works and the things he makes time for. Choose a chapter that catches your eye.",
    "about",
    false
  ],
  [
    "room:projects",
    "Pick a project to see Lakshya’s contribution and how the idea developed. The full case studies bring together his research, design decisions and original project material, including what still needs testing. Follow whichever story interests you.",
    "projects",
    false
  ],
  [
    "room:work",
    "Lakshya enjoys sharing a song, and Garba brings together his love of music, movement and people. Visit the Listening Room for his recordings, or the courtyard for his Garba photographs. Take your time; I’ll let him do the performing.",
    "work",
    false
  ],
  [
    "room:music",
    "Dr. Oak can take it from here.",
    "music",
    true
  ],
  [
    "room:cloud",
    "These are Lakshya’s own photographs. Clouds give him a reason to pause and look up; his mobile photographs capture other things he notices along the way. Choose a collection and have a look through his lens.",
    "cloud",
    false
  ],
  [
    "return:about",
    "Back together! You’ve met Lakshya; his projects are in Works whenever you’re curious.",
    "about",
    false
  ],
  [
    "return:projects",
    "Back on the bicycle. A song, a childhood memory, or a quieter view next? The map is yours.",
    "projects",
    false
  ],
  [
    "return:work",
    "And we’re back. Oak has a story to tell, and The Viewfinder has a few quieter moments. No rush.",
    "work",
    false
  ],
  [
    "return:music",
    "Back on the bicycle. Choose a place on the map, or follow the path a little further.",
    "music",
    false
  ],
  [
    "return:cloud",
    "Back in the garden. How has Lakshya’s world felt so far? If you’d like to share a thought, the visitor board is here for your review. Or we can keep exploring. Your call.",
    "cloud",
    false
  ],
  [
    "route-unavailable",
    "I can’t find a clear ride from here. Choose Explore on the map; we can still visit.",
    null,
    false
  ],
  [
    "route-cancelled",
    "You’ve got the handlebars. I’m right here if you need the map.",
    null,
    false
  ],
  [
    "restart",
    "Back at arrival. Choose a stop, or set off in your own direction.",
    null,
    false
  ],
  [
    "free-explore",
    "There’s no required route here. Ride wherever catches your eye, or open a story straight from the map.",
    null,
    false
  ],
  [
    "mute",
    "Tour narration off. Guide text stays available.",
    null,
    true
  ],
  [
    "feedback-nearby",
    "How’s the ride been? That’s the visitor board. If you’d like, leave a few words about Lakshya’s portfolio world. You can share your review there and read what other visitors have shared, too.",
    null,
    false
  ]
];

const verifiedAudio=Object.freeze({
  "controls-offer": {
    "durationSeconds": 9.68,
    "sha256": "f009bcf5c63d4f3f2768f53b6511df35195be8f91a5c41bad1713e53c26747ae"
  },
  "controls-yes": {
    "durationSeconds": 7.04,
    "sha256": "c85571623bd9bd4f19b635307a9bd401c9ddb43b97c0bf527f8026237002938c"
  },
  "controls-no": {
    "durationSeconds": 5.28,
    "sha256": "59025a25024c1d2350500e6fe702d78944bb22eb8d809c4536b4ffe54e11b0f9"
  },
  "welcome": {
    "durationSeconds": 11.36,
    "sha256": "b104e81ae30f1ca0f1da78b38fda16451dcaf8c62d67c099f4eb7eba4a8e43b1"
  },
  "departure": {
    "durationSeconds": 3.68,
    "sha256": "d1a5ad76d44e386f82ac46921102a11fd257c4e8f8fece3f2e300ae49a24f757"
  },
  "controls": {
    "durationSeconds": 10.4,
    "sha256": "dd89066779949e6e51ca11acbdd543a952b3b4ae8f60cd61c8824b2530453a3b"
  },
  "controls-takeover": {
    "durationSeconds": 3.84,
    "sha256": "34b6184070f1ae20481e3178db8526de7fa69a1420a13ea8aa618f60d8fc4ef0"
  },
  "arrival-guide": {
    "durationSeconds": 7.68,
    "sha256": "24e9e18f0992c4910ad07c5ea3a906673e303238153de6288781d8c5835bb52a"
  },
  "approach:about": {
    "durationSeconds": 7.2,
    "sha256": "5a4e376afdb97b36d7562f9d587fa3a2714d2d1cc9d4992dfd5e9a95560dd220"
  },
  "approach:projects": {
    "durationSeconds": 8.24,
    "sha256": "fb4bd008d2fbb256e594fce7ad84c0217fd35688403d436cebbb252706952fd1"
  },
  "approach:work": {
    "durationSeconds": 8.64,
    "sha256": "d5de1b13f54fe4e012dbd0a6a1d5af7fa89f7f2ccc4d5b7ecaff76613910c1dc"
  },
  "approach:music": {
    "durationSeconds": 5.76,
    "sha256": "36307a95f3811c8bbf74be24827e6ed7a45cf9fb97374c2795645e067273ecb6"
  },
  "approach:cloud": {
    "durationSeconds": 10.56,
    "sha256": "6ba3c9ee5a180672a4109a419f5c6c504bb42f65c4cda35cca173f6bfb5abd11"
  },
  "arrive:about": {
    "durationSeconds": 7.2,
    "sha256": "5a4e376afdb97b36d7562f9d587fa3a2714d2d1cc9d4992dfd5e9a95560dd220"
  },
  "arrive:projects": {
    "durationSeconds": 8.24,
    "sha256": "fb4bd008d2fbb256e594fce7ad84c0217fd35688403d436cebbb252706952fd1"
  },
  "arrive:work": {
    "durationSeconds": 8.64,
    "sha256": "d5de1b13f54fe4e012dbd0a6a1d5af7fa89f7f2ccc4d5b7ecaff76613910c1dc"
  },
  "arrive:music": {
    "durationSeconds": 16.48,
    "sha256": "5c324ea27104b3230338a6c9c6f404ff26054c5bd76ce9e9e255608efddf6370"
  },
  "arrive:cloud": {
    "durationSeconds": 10.56,
    "sha256": "6ba3c9ee5a180672a4109a419f5c6c504bb42f65c4cda35cca173f6bfb5abd11"
  },
  "works-skipped": {
    "durationSeconds": 7.28,
    "sha256": "5b6c005002262f6eb7641583e140e38667d11f34ab2c58243ca8d2941802abe9"
  },
  "ramp-landed": {
    "durationSeconds": 4.32,
    "sha256": "bb1beed54dceec8459371ef12e8295a34135f08d0977da4dbba8eb3e51c1cabb"
  },
  "room:about": {
    "durationSeconds": 14.4,
    "sha256": "e7bb0bebf835be342636ea01cde2aeecd2b1953e8c7134dcd09a316ff585daf1"
  },
  "room:projects": {
    "durationSeconds": 15.68,
    "sha256": "b3838f3d16b6856eee9cd0bb0a5777348aab5cb5395a1d600e5268ac694ae446"
  },
  "room:work": {
    "durationSeconds": 15.92,
    "sha256": "b369374198a7bd1cccdcae7934bdbc80658bb6bf72ca8acba2ab5e3dc3f1050e"
  },
  "room:cloud": {
    "durationSeconds": 12.0,
    "sha256": "07bd6cd3c42ce1145d11928153249a2ec259a78a597a99002900a04b1f14cb48"
  },
  "return:about": {
    "durationSeconds": 6.08,
    "sha256": "d48ba722783d0d032f9bb1e3e1a410aa03f54a572f9ca377cda536b848ecf2b6"
  },
  "return:projects": {
    "durationSeconds": 6.72,
    "sha256": "bcda1c13797374835fbb0563d01109af78e31ca7632a58eb0d0ec7c0bd5ea2e9"
  },
  "return:work": {
    "durationSeconds": 6.16,
    "sha256": "a528105b0df2adb776d306df9b372fe7446a5ba5335bcfa52bfba3bc2e044e0b"
  },
  "return:music": {
    "durationSeconds": 4.16,
    "sha256": "f219f9ae1d4709394e3f1faaef0ba78676bd7a2f2e24fe7e6af25c6f803bf21c"
  },
  "return:cloud": {
    "durationSeconds": 10.8,
    "sha256": "6a21ed116a0c99d9a535b46dad7c0965fec123ff06ceabbfcb0fca3c7603350e"
  },
  "route-unavailable": {
    "durationSeconds": 5.36,
    "sha256": "80ba0e6796dfc28c9b6f978d836a6175fe0e7badaaae11e2e857917d8d6a2055"
  },
  "route-cancelled": {
    "durationSeconds": 3.04,
    "sha256": "fd48bf51a67678d4e3c9b9416e445c6b506167edf3a6d3cdccdff82bdc8a0457"
  },
  "restart": {
    "durationSeconds": 3.36,
    "sha256": "8da6e24dfd90483baf089d5207fcaeb7ecae26a1dfcd8059385b35d9e1cdd63b"
  },
  "free-explore": {
    "durationSeconds": 5.92,
    "sha256": "5f12da542f08c51dbbd0ba6c34ae83f1a84f641a76b152878f901518fa62ac09"
  },
  "ramp-airborne": {
    "durationSeconds": 0.915,
    "sha256": "6d110ce5a78cd3fa5648da2ce1bbce104a137d0310655cb7e44854306b9cbd29"
  },
  "room:visitor": {
    "durationSeconds": 18.08,
    "sha256": "b278ba86892ec5a2edf57d4d79bcfed8c8d4771422adcd48f95b2c30d116fe5d"
  },
  "feedback-nearby": {
    "durationSeconds": 11.12,
    "sha256": "7d86cfc62166594fa8538f7d38a6e14d816ac353fbad3590b44ca608ff3782f2"
  }
});
export const WOODY_TOUR_CLIPS = Object.freeze(Object.fromEntries(lines.map(([id, text, stopId, captionOnly = false]) => [id, Object.freeze({
  id,
  text,
  src: !captionOnly&&verifiedAudio[id]?new URL('../assets/woody-tour/'+id.replaceAll(':','-')+'.mp3?v='+verifiedAudio[id].sha256.slice(0,12),import.meta.url).href:null,
  ...(verifiedAudio[id]?{durationSeconds:verifiedAudio[id].durationSeconds}:{}),
  ...(stopId ? {stopId} : {}),
  ...(captionOnly ? {captionOnly: true} : {}),
})])));
