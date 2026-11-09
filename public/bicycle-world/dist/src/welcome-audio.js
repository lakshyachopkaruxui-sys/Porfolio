/** Supplied recordings only. Null entries never request a placeholder file. */
export const WELCOME_AUDIO = Object.freeze({
  welcome: null,
  departure: null,
  controls: null,
});

/** Suggested recording script; final text will match the supplied audio. */
export const WELCOME_TRANSCRIPTS = Object.freeze({
  welcome: 'Hi, I’m Woody. Welcome to Lakshya’s portfolio. He’s a UX designer. This world brings his work, hobbies and childhood memories together. I’ll guide you through his projects, his design process and the story behind this place. Ready to explore?',
  departure: 'Come on, I’ll show you around.',
  controls: 'Use W to pedal, A and D to steer, and S to reverse. Or click clear ground and I’ll ride there. Space brakes.',
});
