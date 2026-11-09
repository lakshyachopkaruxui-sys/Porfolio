/** Presentation names are independent of the approved route geometry. */
export function destinationName(id, fallback=''){
  return id==='cloud'?'The Viewfinder':fallback;
}
