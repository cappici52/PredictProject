import http from 'node:http';
import { readFile, writeFile, rename } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname, sep } from 'node:path';
import { validDraw } from './src/engine.mjs';

const root = fileURLToPath(new URL('.', import.meta.url));
const seed = JSON.parse(await readFile(resolve(root,'data/history.json'),'utf8'));
let state = { draws:seed.draws, lastSuccess:seed.fetchedAt, lastAttempt:null, error:null, syncing:false };
try { const saved=JSON.parse(await readFile(resolve(root,'data/cache.json'),'utf8')); if(saved.draws?.every(validDraw)) state={...state,...saved,syncing:false}; } catch { /* Seed is the offline fallback. */ }
let inFlight;
const HOST = '127.0.0.1';
const PORT = Number(process.env.PORT || 5173);
async function glo(path,body={}) {
  const response=await fetch(`https://www.glo.or.th${path}`,{method:'POST',headers:{'content-type':'application/json','accept':'application/json','user-agent':'Mozilla/5.0 LuckyPixel/1.0'},body:JSON.stringify(body),signal:AbortSignal.timeout(12000)});
  if(!response.ok) throw new Error(`GLO HTTP ${response.status}`);
  const payload=await response.json();
  if(!payload.status || payload.statusCode!==200 || !payload.response) throw new Error('GLO ไม่ส่งผลรางวัลที่สมบูรณ์');
  return payload.response;
}
async function save() {
  const path=resolve(root,'data/cache.json');
  await writeFile(path+'.tmp',JSON.stringify({...state,syncing:false}));
  await rename(path+'.tmp',path);
}
function normalize(row,full=false) {
  const number = key => full ? row.data?.[key]?.number?.[0]?.value : row.data?.[key]?.[0];
  const draw={date:row.date,first:number('first'),last2:number('last2'),source:'glo',sourceUrl:'https://www.glo.or.th'};
  if(!validDraw(draw) || draw.date>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())) throw new Error('รูปแบบผลรางวัล GLO ไม่ครบหรือยังไม่ยืนยัน');
  return draw;
}
async function refresh() {
  if(inFlight) return inFlight;
  inFlight=(async()=>{
    state.syncing=true; state.lastAttempt=new Date().toISOString();
    try {
      const latest=normalize(await glo('/api/lottery/getLatestLottery'),true);
      const existingNewest=state.draws.at(-1)?.date;
      const merged=new Map(state.draws.map(d=>[d.date,d]));
      // Backfill missed draws after extended downtime. Bounded and throttled.
      if(latest.date!==existingNewest) {
        for(let page=1;page<=50;page++) {
          const archive=await glo('/api/lottery/getLotteryResultByPage',{page});
          const rows=archive.lottery || [];
          for(const row of rows) { const draw=normalize(row); merged.set(draw.date,draw); }
          if(!rows.length || rows.some(d=>d.date<=existingNewest) || page*12>=archive.total) break;
          await new Promise(done=>setTimeout(done,350));
        }
      }
      merged.set(latest.date,latest);
      state.draws=[...merged.values()].sort((a,b)=>a.date.localeCompare(b.date));
      state.lastSuccess=new Date().toISOString(); state.error=null;
      await save();
    } catch(error) { state.error=`เชื่อมต่อ GLO ไม่สำเร็จ — ใช้ข้อมูลที่บันทึกไว้ (${error.message})`; }
    finally { state.syncing=false; inFlight=null; }
  })();
  return inFlight;
}
const production=process.argv.includes('--production');
const vite = production ? null : await (await import('vite')).createServer({root,server:{middlewareMode:true},appType:'spa'});
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'};
const server=http.createServer(async(req,res)=>{
  try {
    const url=new URL(req.url,`http://${HOST}:${PORT}`);
    if(url.pathname==='/api/data' && req.method==='GET') {
      res.writeHead(200,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}); res.end(JSON.stringify(state)); return;
    }
    if(url.pathname==='/api/refresh' && req.method==='POST') {
      if(req.headers.origin && req.headers.origin!==`http://${HOST}:${PORT}` && req.headers.origin!==`http://localhost:${PORT}`) {res.writeHead(403);res.end();return;}
      // Shared cooldown applies to both manual and periodic checks.
      if(!state.lastAttempt || Date.now()-Date.parse(state.lastAttempt)>=60000) await refresh();
      else if(inFlight) await inFlight;
      res.writeHead(200,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(state));return;
    }
    if(url.pathname.startsWith('/api/')) {res.writeHead(404);res.end('Not found');return;}
    if(vite) {vite.middlewares(req,res);return;}
    const base=resolve(root,'dist');
    let path=resolve(base,'.'+decodeURIComponent(url.pathname));
    if(path!==base && !path.startsWith(base+sep)) {res.writeHead(403);res.end();return;}
    if(url.pathname==='/' || !extname(path)) path=resolve(base,'index.html');
    try {const content=await readFile(path);res.writeHead(200,{'content-type':types[extname(path)] || 'application/octet-stream'});res.end(content);} catch {res.writeHead(404);res.end('Not found');}
  } catch {res.writeHead(500,{'content-type':'application/json'});res.end(JSON.stringify({error:'ไม่สามารถประมวลผลคำขอได้'}));}
});
server.listen(PORT,HOST,()=>{console.log(`Lucky Pixel ready at http://${HOST}:${PORT}`);void refresh();});
const timer=setInterval(()=>void refresh(),120000);
for(const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>{clearInterval(timer);server.close();void vite?.close();process.exit(0);});
