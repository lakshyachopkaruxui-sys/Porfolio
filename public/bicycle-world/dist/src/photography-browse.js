export const CONTACT_SHEET_SIZE=24;
export const PHOTO_SUBJECTS=Object.freeze({clouds:'Clouds',nature:'Nature',places:'Places',details:'Details'});

export function photographySubjects(photos){
  return Object.entries(PHOTO_SUBJECTS).filter(([id])=>photos.some(photo=>photo.category===id));
}

export function photographySelection(photos,subject='all'){
  return subject==='all'?photos:photos.filter(photo=>photo.category===subject);
}

export function contactSheetPage(photos,page=0,size=CONTACT_SHEET_SIZE){
  const pages=Math.max(1,Math.ceil(photos.length/size));
  const current=Math.max(0,Math.min(pages-1,Math.trunc(Number(page)||0)));
  const start=current*size;
  return {page:current,pages,start,end:Math.min(start+size,photos.length),photos:photos.slice(start,start+size)};
}
