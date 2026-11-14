const origin = 'https://lakshyachopkar.com';
const fields = 'id,name,stars,feedback,linkedin,created_ms';
const schema = `CREATE TABLE IF NOT EXISTS visitor_reviews (
 id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, stars INTEGER NOT NULL CHECK(stars BETWEEN 1 AND 5),
 feedback TEXT NOT NULL, linkedin TEXT NOT NULL, created_ms INTEGER NOT NULL,
 submission_hash TEXT NOT NULL UNIQUE, sender_hash TEXT NOT NULL, consent INTEGER NOT NULL CHECK(consent=1))`;
const reply = (status, body) => Response.json(body, {status, headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
const digest = async value => [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(n=>n.toString(16).padStart(2,'0')).join('');
function clean(value,min,max,multiline=false) {
 if(typeof value!=='string')return null;
 const text=value.normalize('NFC').trim();
 const invalid=multiline?/[\p{Cf}\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/u:/[\p{Cc}\p{Cf}]/u;
 return Array.from(text).length>=min&&Array.from(text).length<=max&&!invalid.test(text)?text:null;
}
export function validate(value) {
 if(!value||Array.isArray(value)||typeof value!=='object'||Object.keys(value).some(k=>!['name','stars','feedback','linkedin','consent'].includes(k)))return null;
 const name=clean(value.name,1,60),feedback=clean(value.feedback,10,600,true);
 if(!name||!feedback||!Number.isInteger(value.stars)||value.stars<1||value.stars>5||value.consent!==true)return null;
 let linkedin='';
 if(value.linkedin!==undefined&&value.linkedin!=='') {
  if(!clean(value.linkedin,1,250))return null;
  try {const u=new URL(value.linkedin.trim());if(u.protocol!=='https:'||!['linkedin.com','www.linkedin.com'].includes(u.hostname)||u.username||u.password||u.port||u.search||u.hash||!/^\/in\/[a-zA-Z0-9_-]+\/?$/.test(u.pathname))return null;linkedin='https://www.linkedin.com'+u.pathname.replace(/\/$/,'');}catch{return null;}
 }
 return {name,stars:value.stars,feedback,linkedin};
}
const present = row => ({id:String(row.id),name:row.name,stars:row.stars,feedback:row.feedback,linkedin:row.linkedin,createdAt:new Date(row.created_ms).toISOString()});
async function limitedJSON(request) {
 if(Number(request.headers.get('Content-Length'))>4096)throw Error('large');
 const reader=request.body?.getReader();if(!reader)throw Error('invalid');
 let size=0;const chunks=[];
 try {for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>4096){await reader.cancel();throw Error('large');}chunks.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
 return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
}
export async function onRequest({request,env}) {
 if(!['GET','POST'].includes(request.method))return reply(405,{error:'Use GET or POST.'});
 if(new URL(request.url).origin!==origin||request.headers.get('Sec-Fetch-Site')==='cross-site')return reply(403,{error:'Please use the portfolio visitor board.'});
 if(request.method==='POST'&&request.headers.get('Origin')!==origin)return reply(403,{error:'Please use the portfolio visitor board.'});
 if(!env.VISIT_DB)return reply(503,{error:'Visitor notes are temporarily unavailable. Please try again.'});
 try {
  const db=env.VISIT_DB.withSession?env.VISIT_DB.withSession('first-primary'):env.VISIT_DB;
  await db.prepare(schema).run();
  if(request.method==='GET') {const rows=await db.prepare(`SELECT ${fields} FROM visitor_reviews ORDER BY created_ms DESC,id DESC LIMIT 12`).all();return reply(200,{reviews:rows.results.map(present)});}
  if(!/^application\/json(?:;|$)/i.test(request.headers.get('Content-Type')||''))return reply(415,{error:'Please send the review form as JSON.'});
  let value;try{value=validate(await limitedJSON(request));}catch(error){return reply(error.message==='large'?413:400,{error:'Please check the review fields and try again.'});}
  if(!value)return reply(400,{error:'Add your name, 1–5 stars, 10–600 characters of feedback and public-display consent. LinkedIn is optional.'});
  const now=Date.now(),day=Math.floor(now/86400000);
  // A daily one-way network digest limits abuse without storing raw addresses.
  const sender=await digest(day+'|'+(request.headers.get('CF-Connecting-IP')||'unknown'));
  const hash=await digest(JSON.stringify(value));
  const duplicate=await db.prepare(`SELECT ${fields} FROM visitor_reviews WHERE submission_hash=?`).bind(hash).first();
  if(duplicate)return reply(200,{review:present(duplicate)});
  // The conditional INSERT applies the limit atomically, including concurrent requests.
  const results=await db.batch([
   db.prepare(`INSERT OR IGNORE INTO visitor_reviews(name,stars,feedback,linkedin,created_ms,submission_hash,sender_hash,consent)
    SELECT ?,?,?,?,?,?,?,1 WHERE (SELECT COUNT(*) FROM visitor_reviews WHERE sender_hash=? AND created_ms>?)<3`).bind(value.name,value.stars,value.feedback,value.linkedin,now,hash,sender,sender,now-3600000),
   db.prepare(`SELECT ${fields} FROM visitor_reviews WHERE submission_hash=?`).bind(hash)
  ]);
  const row=results[1]?.results?.[0];if(!row)return reply(429,{error:'Please wait before leaving another review.'});
  return reply(201,{review:present(row)});
 } catch {return reply(503,{error:'Visitor notes are temporarily unavailable. Your writing is still here; please try again.'});}
}
