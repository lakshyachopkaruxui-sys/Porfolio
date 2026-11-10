/** Convert the sourced chapter into small, ordered units without rewriting it. */
export function journalAtoms(chapter,index=0,total=1){
  const atoms=[{type:'chapter',title:chapter.title,body:chapter.lead,label:chapter.label,index,total,logicalPage:0,key:'chapter'}];
  const add=(atom,page)=>atoms.push({...atom,logicalPage:page,key:`${page}:${atoms.length}`});
  chapter.pages.forEach((page,pageIndex)=>{
    if(page.title)add({type:'heading',title:page.title,keepWithNext:true},pageIndex);
    for(const block of page.blocks||[]){
      if(block.type==='timeline')for(const entry of block.entries)add({type:'entry',...entry},pageIndex);
      else if(block.type==='toolkit')for(const group of block.groups){
        add({type:'text',title:group.title,body:group.body},pageIndex);
        if(group.tools?.length)add({type:'tools',tools:[...group.tools]},pageIndex);
      }
      else if(block.type==='decision'){
        add({type:'heading',title:block.title,keepWithNext:true},pageIndex);
        for(const [field,title]of [['friction','What happened'],['decision','The decision'],['next','What comes next']])if(block[field])add({type:'text',title,body:block[field]},pageIndex);
        if(block.projectId)add({type:'project-link',projectId:block.projectId},pageIndex);
      }
      else if(block.type==='links')for(const item of block.items)add({type:'links',items:[item]},pageIndex);
      else add({...block},pageIndex);
    }
  });
  return atoms;
}

/** Fit actual pages. Overflow becomes another page, never smaller type or clipping. */
export function paginateJournal(atoms,fits){
  const pages=[],queue=atoms.map(atom=>({...atom}));let page=[],guard=0;
  const flush=()=>{if(page.length){pages.push(page);page=[];}};
  while(queue.length){
    if(++guard>10000)throw new Error('Notebook pagination did not settle.');
    const atom=queue.shift();
    if(fits([...page,atom])){page.push(atom);continue;}
    if(page.length){
      // Move a stranded heading to the page containing its first content.
      const heading=page.at(-1)?.keepWithNext&&page.length>1?page.pop():null;
      flush();if(heading)queue.unshift(heading,atom);else queue.unshift(atom);continue;
    }
    const words=typeof atom.body==='string'?atom.body.trim().split(/\s+/):[];
    const tools=atom.type==='tools'?atom.tools:null;
    const items=tools||words;
    if(items.length>1){
      let low=1,high=items.length-1,best=0;
      const fragment=count=>tools?{...atom,tools:items.slice(0,count)}:{...atom,body:items.slice(0,count).join(' ')};
      while(low<=high){const count=Math.floor((low+high)/2);if(fits([fragment(count)])){best=count;low=count+1;}else high=count-1;}
      if(best){
        page.push(fragment(best));flush();
        queue.unshift(tools?{...atom,tools:items.slice(best)}:{...atom,title:undefined,date:undefined,body:items.slice(best).join(' '),continued:true});continue;
      }
    }
    // An oversized heading can stand on its own; its paragraph continues next.
    if(atom.title&&atom.body&&fits([{...atom,body:undefined}])){
      page.push({...atom,body:undefined});flush();queue.unshift({...atom,type:'text',title:undefined,date:undefined,continued:true});continue;
    }
    throw new Error(`The notebook page is too small for ${atom.type}.`);
  }
  flush();return pages.length?pages:[[]];
}
