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
    "durationSeconds": 10.08,
    "sha256": "66e78066a0c7d41aed7619ff71c9697198529276602fa620a35609952a1526e0"
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
    "durationSeconds": 12.72,
    "sha256": "aa380677c1a84fed6c1e8124938ebca5bbf17306581f4fadbb9349ebe5300031"
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
    "durationSeconds": 7.12,
    "sha256": "1f99a8cd1ad02861780bf75de03dd01638e8670e479dee441905113e8845d88b"
  },
  "approach:projects": {
    "durationSeconds": 7.52,
    "sha256": "8dd130fdadc119a2470ec77d72576c1546109a232cb641a94274ec779b1c0c96"
  },
  "approach:work": {
    "durationSeconds": 7.84,
    "sha256": "0b1fa0a262cee4067a33c236695273d0f3426e2a782161ec19450a07ff9081fc"
  },
  "approach:music": {
    "durationSeconds": 5.44,
    "sha256": "861d3d91f4fde175503e48a0d990d1123094cd8969dd2b9ee4548b463848d5a4"
  },
  "approach:cloud": {
    "durationSeconds": 9.28,
    "sha256": "59770e9dcdd840975b1992bdee5dcd87d20a100ba3e019883abc63d74dd1cc5f"
  },
  "arrive:about": {
    "durationSeconds": 7.12,
    "sha256": "1f99a8cd1ad02861780bf75de03dd01638e8670e479dee441905113e8845d88b"
  },
  "arrive:projects": {
    "durationSeconds": 7.52,
    "sha256": "8dd130fdadc119a2470ec77d72576c1546109a232cb641a94274ec779b1c0c96"
  },
  "arrive:work": {
    "durationSeconds": 7.84,
    "sha256": "0b1fa0a262cee4067a33c236695273d0f3426e2a782161ec19450a07ff9081fc"
  },
  "arrive:music": {
    "durationSeconds": 16.64,
    "sha256": "2287c5814b4b8cd1e09aff291d66f707aa91d6c4bff3584b94fcf8343523ce8e"
  },
  "arrive:cloud": {
    "durationSeconds": 9.28,
    "sha256": "59770e9dcdd840975b1992bdee5dcd87d20a100ba3e019883abc63d74dd1cc5f"
  },
  "works-skipped": {
    "durationSeconds": 7.44,
    "sha256": "9ce73e761e18b48e5c1a8872a199b157827fb382f386b9af06b11d0ddee3a3c4"
  },
  "ramp-landed": {
    "durationSeconds": 4.32,
    "sha256": "bb1beed54dceec8459371ef12e8295a34135f08d0977da4dbba8eb3e51c1cabb"
  },
  "room:about": {
    "durationSeconds": 14.24,
    "sha256": "478150a6db191b27d8c99393df7572eaa040954ea25c44106eebc2b91a3b91ac"
  },
  "room:projects": {
    "durationSeconds": 15.52,
    "sha256": "c84215abf9e1ec1b9211bb657fce92a408f5061cd64c53ea1d975dc9559f260d"
  },
  "room:work": {
    "durationSeconds": 13.44,
    "sha256": "18ee48da54d2f9cd62a9882aa806d9842b66213a2db85911a1388e960c4882c8"
  },
  "room:cloud": {
    "durationSeconds": 12.0,
    "sha256": "5a64a95424c6a556aa67dfecf6ffbe27252ae4d49ac079c95716110d23dc9796"
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
    "durationSeconds": 10.24,
    "sha256": "b5f55a519c0417de405482841108e0018492df49c8c15caa817f0571e338de11"
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
    "durationSeconds": 18.8,
    "sha256": "3950852eca8c007c66f9f4532e4db9abe8956c5755aa11cdf5b6ddd9dc08a630"
  },
  "feedback-nearby": {
    "durationSeconds": 10.16,
    "sha256": "34d8ee1a7a075151b39de03a3de19261a8d060ce7c151cdf1f22507e0c014f8d"
  }
});
// Arrival and approach keep their own cue IDs and captions but share these recordings.
const sharedRecordings = Object.freeze({
  'arrive:about':'approach:about', 'arrive:projects':'approach:projects',
  'arrive:work':'approach:work', 'arrive:cloud':'approach:cloud',
});
export const WOODY_TOUR_CLIPS = Object.freeze(Object.fromEntries(lines.map(([id, text, stopId, captionOnly = false]) => [id, Object.freeze({
  id,
  text,
  src: !captionOnly&&verifiedAudio[id]?new URL('../assets/woody-tour/'+(sharedRecordings[id]??id).replaceAll(':','-')+'.mp3?v='+verifiedAudio[id].sha256.slice(0,12),import.meta.url).href:null,
  ...(verifiedAudio[id]?{durationSeconds:verifiedAudio[id].durationSeconds}:{}),
  ...(stopId ? {stopId} : {}),
  ...(captionOnly ? {captionOnly: true} : {}),
})])));
