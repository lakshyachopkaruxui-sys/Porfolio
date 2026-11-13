const ORIGIN = 'https://lakshyachopkar.com';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PROJECTS = ['connectaid','giggles','pixel-mania','syringe','workplace-mode','jan-aushadhi','tear'];
const ITEMS = {project_open:PROJECTS,resume_download:['resume'],contact_click:['email','phone','linkedin','behance']};
const MAX_BYTES = 512;
const prepared = new WeakMap();

// Only daily totals survive deduplication expiry. No visitor/session/IP field.
export const EVENT_SCHEMA = [
  'CREATE TABLE IF NOT EXISTS portfolio_event_totals (day TEXT NOT NULL, kind TEXT NOT NULL, item TEXT NOT NULL, total INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(day,kind,item))',
  'CREATE TABLE IF NOT EXISTS portfolio_event_receipts (id TEXT PRIMARY KEY, day TEXT NOT NULL, kind TEXT NOT NULL, item TEXT NOT NULL, expires INTEGER NOT NULL)',
  'CREATE INDEX IF NOT EXISTS portfolio_event_expiry ON portfolio_event_receipts(expires)',
  `CREATE TRIGGER IF NOT EXISTS portfolio_event_count AFTER INSERT ON portfolio_event_receipts BEGIN
    INSERT INTO portfolio_event_totals(day,kind,item,total) VALUES(NEW.day,NEW.kind,NEW.item,1)
    ON CONFLICT(day,kind,item) DO UPDATE SET total=total+1;
  END`,
];

function response(status) {
  return new Response(null,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
}

async function readEvent(request) {
  const length=request.headers.get('Content-Length');
  if(length !== null && (!/^\d+$/.test(length)||Number(length)>MAX_BYTES)) throw Error('body');
  const reader=request.body?.getReader();
  if(!reader) throw Error('body');
  const chunks=[];let bytes=0,complete=false;
  try {
    for(;;){const {done,value}=await reader.read();if(done){complete=true;break;}bytes+=value.byteLength;if(bytes>MAX_BYTES)throw Error('body');chunks.push(value);}
  } finally {if(!complete)try{await reader.cancel();}catch{}reader.releaseLock();}
  const joined=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){joined.set(chunk,offset);offset+=chunk.length;}
  const event=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(joined));
  if(!event||Array.isArray(event)||Object.keys(event).sort().join(',')!=='id,item,kind'||
    !UUID.test(event.id||'')||!Object.hasOwn(ITEMS,event.kind)||!ITEMS[event.kind].includes(event.item))throw Error('event');
  return event;
}

async function initialize(db) {
  if(!prepared.has(db)){
    const pending=db.batch(EVENT_SCHEMA.map(sql=>db.prepare(sql))).catch(error=>{prepared.delete(db);throw error;});
    prepared.set(db,pending);
  }
  await prepared.get(db);
}

/** Public, anonymous action counter. Not an identity or fraud-proof metric. */
export function createEventHandler({now=()=>Date.now(),maxPerMinute=300}={}) {
  let minute=-1,requests=0;
  return async function onRequest({request,env}) {
    if(request.method!=='POST')return response(405);
    if(new URL(request.url).origin!==ORIGIN||request.headers.get('Origin')!==ORIGIN||request.headers.get('Sec-Fetch-Site')==='cross-site')return response(403);
    if(request.cf?.botManagement?.verifiedBot||/bot\b|crawler|spider|facebookexternalhit|lighthouse/i.test(request.headers.get('User-Agent')||''))return response(204);
    if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('Content-Type')||''))return response(415);
    const time=now(),window=Math.floor(time/60000);
    if(window!==minute){minute=window;requests=0;}
    if(++requests>maxPerMinute)return response(429);
    let event;try{event=await readEvent(request);}catch{return response(400);}
    const db=env.VISIT_DB;if(!db)return response(503);
    try {
      await initialize(db);
      const seconds=Math.floor(time/1000),day=new Date(time).toISOString().slice(0,10);
      // Trigger counts only a genuinely new receipt. D1 batches the insert and
      // bounded expiry cleanup atomically; retrying the same id cannot add twice.
      await db.batch([
        db.prepare('INSERT OR IGNORE INTO portfolio_event_receipts(id,day,kind,item,expires) VALUES(?,?,?,?,?)').bind(event.id.toLowerCase(),day,event.kind,event.item,seconds+86400),
        db.prepare('DELETE FROM portfolio_event_receipts WHERE id IN (SELECT id FROM portfolio_event_receipts WHERE expires <= ? ORDER BY expires LIMIT 200)').bind(seconds),
      ]);
      return response(204);
    } catch {return response(503);}
  };
}

export const onRequest = createEventHandler();
