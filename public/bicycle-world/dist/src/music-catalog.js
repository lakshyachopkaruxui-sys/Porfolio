// Sources and redistribution credits are shipped beside the local audio files.
export const DEFAULT_MUSIC_TRACK_ID = 'clear-air';
export const MUSIC_TRACKS = Object.freeze([
  Object.freeze({id:'clear-air',title:'Clear Air',creator:'Kevin MacLeod',source:new URL('../assets/ambient-music/clear-air.ogg',import.meta.url).href}),
  Object.freeze({id:'porch-swing-days',title:'Porch Swing Days',creator:'Kevin MacLeod',source:new URL('../assets/ambient-music/porch-swing-days.ogg',import.meta.url).href})
]);

export function getMusicTrack(id) {
  return MUSIC_TRACKS.find(track => track.id === id) || MUSIC_TRACKS[0];
}
