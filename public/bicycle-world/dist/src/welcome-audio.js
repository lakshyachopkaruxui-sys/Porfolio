import {WOODY_TOUR_CLIPS} from './woody-tour-data.js';

/** Only verified supplied recordings. Null entries never request a placeholder. */
const welcomeIds=['welcome','departure','controls','controls-offer','controls-yes','controls-no','controls-takeover','arrival-guide','free-explore'];
export const WELCOME_AUDIO = Object.freeze(Object.fromEntries(welcomeIds.map(id=>[id,
  WOODY_TOUR_CLIPS[id]?.src?WOODY_TOUR_CLIPS[id]:null
])));

/** Suggested recording script; final text will match the supplied audio. */
export const WELCOME_TRANSCRIPTS = Object.freeze(Object.fromEntries(welcomeIds.map(id=>[id,WOODY_TOUR_CLIPS[id].text])));
