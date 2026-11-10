/** Convert the sourced chapter into small, ordered units without rewriting it. */
export function journalAtoms(chapter,index=0,total=1){
  const atoms=[{type:'chapter',title:chapter.openingTitle||chapter.title,body:chapter.lead,label:chapter.label,index,total,logicalPage:0,key:'chapter',keepWithNext:true}];
  const add=(atom,page)=>atoms.push({...atom,logicalPage:page,key:`${page}:${atoms.length}`});
  chapter.pages.forEach((page,pageIndex)=>{
    if(page.title&&!(pageIndex===0&&(page.title===chapter.openingTitle||chapter.suppressOpeningLabel)))add({type:'heading',title:page.title,keepWithNext:true},pageIndex);
    for(const block of page.blocks||[]){
      if(block.type==='timeline')for(const entry of block.entries)add({type:'entry',...entry},pageIndex);
      else if(block.type==='toolkit')for(const group of block.groups){
        add({type:'text',title:group.title,body:group.body,keepWithNext:Boolean(group.tools?.length)},pageIndex);
        if(group.tools?.length)add({type:'tools',tools:[...group.tools],groupLabel:group.title},pageIndex);
      }
      else if(block.type==='decision'){
        if(block.title)add({type:'heading',title:block.title,keepWithNext:true},pageIndex);
        for(const [field,title]of [['friction','What happened'],['decision','The decision'],['next','What comes next']])if(block[field])add({type:'text',title,body:block[field]},pageIndex);
        if(block.projectId)add({type:'project-link',projectId:block.projectId},pageIndex);
      }
      else if(block.type==='links')for(const item of block.items)add({type:'links',items:[item]},pageIndex);
      else add({...block},pageIndex);
    }
  });
  return atoms;
}

/** Compose complete facing pairs, minimizing empty paper and lopsided spreads. */
export function balanceJournalPages(atoms,measure,capacity,{splitSentences=false}={}){
  const units=[];
  for(const atom of atoms){
    const sentences=splitSentences&&atom.type!=='chapter'&&typeof atom.body==='string'?atom.body.match(/[\s\S]+?(?:[.!?]["”']?(?=\s|$)|$)/g):null;
    if(sentences?.length>1)sentences.forEach((body,index)=>units.push({...atom,title:index===0?atom.title:undefined,date:index===0?atom.date:undefined,body:body.trim(),continued:index>0,keepWithNext:index<sentences.length-1?false:atom.keepWithNext}));
    else units.push({...atom});
  }
  // Only unusually long units need word splitting. Ordinary paragraphs remain
  // intact; every eventual page is remeasured with its actual neighbors.
  const normalized=units.flatMap(atom=>measure([atom])<=capacity+1?[atom]:paginateJournal([atom],candidate=>measure(candidate)<=capacity+1).flat());
  const length=normalized.length,rangeCache=new Map(),memo=new Map();
  const substantive=page=>page.some(atom=>!['chapter','heading'].includes(atom.type));
  function ranges(start){
    if(rangeCache.has(start))return rangeCache.get(start);
    const result=[];
    for(let end=start+1;end<=length;end++){
      const page=normalized.slice(start,end),height=measure(page);if(height>capacity+1)break;
      const fullCompactIntroduction=page.length===1&&page[0].type==='chapter'&&page[0].body&&height/capacity>=.55;
      if(!fullCompactIntroduction&&(page.at(-1).keepWithNext||!substantive(page)))continue;
      // A chapter opener needs a story/photo/tool unit beyond its front matter.
      const photographs=page.filter(atom=>atom.type==='photo').length;
      result.push({end,height,page,effectiveHeight:photographs?Math.max(height,capacity*.92):height});
    }
    rangeCache.set(start,result);return result;
  }
  const pageCost=height=>{const used=height/capacity;return Math.pow(1-used,2)*150+(used<.6?(0.6-used)*1800:0);};
  function solve(start,pairs){
    if(!pairs)return start===length?{cost:0,pages:[]}:null;
    const key=start+':'+pairs;if(memo.has(key))return memo.get(key);
    let best=null;
    for(const left of ranges(start))for(const right of ranges(left.end)){
      if(pairs===1&&right.end!==length)continue;
      const rest=solve(right.end,pairs-1);if(!rest)continue;
      const cost=pageCost(left.effectiveHeight)+pageCost(right.effectiveHeight)+Math.abs(left.effectiveHeight-right.effectiveHeight)/capacity*65+rest.cost;
      if(!best||cost<best.cost)best={cost,pages:[left.page,right.page,...rest.pages]};
    }
    memo.set(key,best);return best;
  }
  for(let pairs=1;pairs<=Math.ceil(length/2);pairs++){
    const result=solve(0,pairs);if(result)return result.pages;
  }
  if(!splitSentences)return balanceJournalPages(atoms,measure,capacity,{splitSentences:true});
  throw new Error('The notebook needs more room for a complete, readable spread.');
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
