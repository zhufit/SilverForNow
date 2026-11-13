const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const publicRoot=path.join(root,'public');
const password=process.env.APP_PASSWORD;
const storage=path.resolve(process.env.DATA_DIR||path.join(root,'data'));
fs.mkdirSync(storage,{recursive:true});
const journals=new Map(['/api/journal','/api/moving-journal'].map((endpoint,index)=>{
  const file=path.join(storage,index===0?'journal.json':'moving-journal.json');
  const stored=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{data:null};
  const state={data:stored.data,updatedAt:stored.updatedAt||null};
  return [endpoint,{file,state}];
}));
const sessions=new Map(),attempts=new Map();
function valid(data){return data&&['food','place'].every(k=>Array.isArray(data[k])&&data[k].length<=1000&&data[k].every(x=>x&&typeof x.title==='string'&&x.title.length<=200&&typeof x.done==='boolean'&&(x.date===undefined||typeof x.date==='string'&&(!x.date||/^\d{4}-\d{2}-\d{2}$/.test(x.date)))&&(x.details===undefined||typeof x.details==='string'&&x.details.length<=4000)))}
for(const {state} of journals.values())if(state.data!==null&&!valid(state.data))throw Error('Invalid journal file; restore a backup before starting.');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};
const pages={'/':'pages/home/index.html','/index.html':'pages/home/index.html','/moving/':'pages/moving/index.html','/beijing/':'pages/beijing/index.html'};
const publicTypes=new Set(['.css','.js','.svg','.png','.webp']);
function json(res,status,value){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value))}
function read(req){return new Promise((resolve,reject)=>{let bytes=0,chunks=[];req.on('data',chunk=>{bytes+=chunk.length;if(bytes>12000000){reject(Error('too large'));req.destroy()}else chunks.push(chunk)});req.on('end',()=>{try{resolve(JSON.parse(Buffer.concat(chunks).toString()))}catch{reject(Error('invalid JSON'))}});req.on('error',reject)})}
function samePassword(input){const hash=v=>crypto.createHash('sha256').update(v).digest();return typeof input==='string'&&crypto.timingSafeEqual(hash(input),hash(password))}
const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');
  try{
    const url=new URL(req.url,'http://localhost');
    // Support the Docker deployment prefix and direct local hosting.
    const prefix=url.pathname==='/livenow'||url.pathname.startsWith('/livenow/')?'/livenow':'';
    if(url.pathname===prefix&&prefix){res.writeHead(308,{Location:prefix+'/'});return res.end()}
    if(prefix)url.pathname=url.pathname.slice(prefix.length);
    const chapter=url.pathname.match(/^\/(beijing|moving)(?:\/|$|\.html$)/)?.[1];
    if(chapter&&(url.pathname==='/'+chapter||url.pathname==='/'+chapter+'.html')){res.writeHead(308,{Location:prefix+'/'+chapter+'/'});return res.end()}
    // Preserve chapter-scoped API URLs and previously registered service workers.
    if(chapter&&(url.pathname.startsWith('/'+chapter+'/api/')||url.pathname==='/'+chapter+'/sw.js'))url.pathname=url.pathname.slice(chapter.length+1);
    // Keep the chapter's relative asset base canonical.
    if(url.pathname.startsWith('/api/')){
      // All mutation requests come from our same-origin JSON client.
      if(req.method!=='GET'&&(!/^application\/json\b/.test(req.headers['content-type']||'')||(req.headers.origin&&req.headers.origin!==`${req.headers['x-forwarded-proto']==='https'?'https':'http'}://${req.headers.host}`)))return json(res,403,{error:'origin'});
      if(url.pathname==='/api/login'&&req.method==='POST'){
        const ip=req.socket.remoteAddress;const now=Date.now();const rate=attempts.get(ip)||{count:0,until:now+600000};
        if(rate.until<now){rate.count=0;rate.until=now+600000}attempts.set(ip,rate);
        if(rate.count>=10)return json(res,429,{error:'too many attempts'});
        const body=await read(req);
        if(!samePassword(body.password)){rate.count++;return json(res,401,{error:'password'})}
        attempts.delete(ip);const token=crypto.randomBytes(32).toString('hex');sessions.set(token,now+7*86400000);
        res.setHeader('Set-Cookie',`journal_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800${req.headers['x-forwarded-proto']==='https'||req.socket.encrypted?'; Secure':''}`);
        return json(res,200,{ok:true});
      }
      const token=(req.headers.cookie||'').match(/(?:^|;\s*)journal_session=([a-f0-9]{64})(?:;|$)/)?.[1];
      if(password&&(!token||!(sessions.get(token)>Date.now())))return json(res,401,{error:'login required'});
      const journal=journals.get(url.pathname);
      if(journal&&req.method==='GET')return json(res,200,journal.state);
      if(journal&&req.method==='PUT'){
        const {file}=journal;
        const body=await read(req);if(!valid(body.data))return json(res,400,{error:'invalid data'});
        const next={data:body.data,updatedAt:new Date().toISOString()};
        if(fs.existsSync(file))fs.copyFileSync(file,file+'.bak');
        fs.writeFileSync(file+'.tmp',JSON.stringify(next,null,2));fs.renameSync(file+'.tmp',file);journal.state=next;
        return json(res,200,{updatedAt:next.updatedAt});
      }
      return json(res,404,{error:'not found'});
    }
    if(!['GET','HEAD'].includes(req.method))return json(res,405,{error:'method'});
    const requested=decodeURIComponent(url.pathname);
    const name=pages[requested]||requested.replace(/^\//,'');
    const fingerprinted=/^pages\/home\/assets\/home-cover(?:-mobile)?\.[a-f0-9]{10}\.webp$/.test(name);
    // Serve only the public tree. Server, tests, sources and data stay private.
    if(!pages[requested]&&!publicTypes.has(path.extname(name)))return json(res,404,{error:'not found'});
    const target=path.resolve(publicRoot,name);
    if(name.includes('\0')||!target.startsWith(publicRoot+path.sep)||!fs.existsSync(target)||!fs.statSync(target).isFile())return json(res,404,{error:'not found'});
    const stat=fs.statSync(target),etag=`W/"${stat.size}-${stat.mtimeMs}"`;
    const headers={'Content-Type':mime[path.extname(name)]||'application/octet-stream','Cache-Control':fingerprinted?'public, max-age=31536000, immutable':'no-cache','ETag':etag};
    if(req.headers['if-none-match']===etag){res.writeHead(304,headers);return res.end()}
    res.writeHead(200,{...headers,'Content-Length':stat.size});
    if(req.method==='HEAD')res.end();else fs.createReadStream(target).pipe(res);
  }catch(error){if(!res.headersSent)json(res,500,{error:'request failed'});else res.end();console.error(error.message)}
});
setInterval(()=>{const now=Date.now();for(const [key,until] of sessions)if(until<now)sessions.delete(key);for(const [key,value] of attempts)if(value.until<now)attempts.delete(key)},600000).unref();
server.listen(Number(process.env.PORT||3000),process.env.HOST||'127.0.0.1',()=>console.log('Journal server listening on '+(process.env.HOST||'127.0.0.1')+':'+(process.env.PORT||3000)));
