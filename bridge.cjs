const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process'),readline=require('node:readline');
const PORT=43128,HOST='127.0.0.1',origin=`http://${HOST}:${PORT}`;
const candidates=[path.join(process.env.APPDATA||'','npm/node_modules/@openai/codex/node_modules/@openai/codex-win32-x64/vendor/x86_64-pc-windows-msvc/bin/codex.exe')];
const exe=candidates.find(p=>fs.existsSync(p));
let child,seq=0,threadId,pending=new Map(),remote,clients=new Set(),lastPulse=Date.now(),idleSince=Date.now();
function event(m){if(m.method?.startsWith('thread/realtime/'))for(const res of clients)res.write('data: '+JSON.stringify(m)+'\n\n');}
function stop(){remote?.reject(new Error('음성 연결 종료'));remote=null;if(child){child.stdin.end();child.kill();child=null;}for(const p of pending.values()){clearTimeout(p.timer);p.reject(new Error('연결 종료'));}pending.clear();threadId=null;}
function rpc(method,params){return new Promise((resolve,reject)=>{if(!child)return reject(new Error('음성 연결 프로그램이 종료되었습니다.'));const id=++seq;const timer=setTimeout(()=>{pending.delete(id);reject(new Error('음성 연결 응답 시간 초과: '+method));},25000);pending.set(id,{resolve,reject,timer});child.stdin.write(JSON.stringify({id,method,params})+'\n');});}
async function connect(sdp){
 stop();if(!exe)throw Error('설치된 Codex 실행 파일을 찾지 못했습니다.');
 child=spawn(exe,['app-server','--listen','stdio://'],{cwd:__dirname,windowsHide:true,stdio:['pipe','pipe','pipe']});lastPulse=Date.now();child.stderr.on('data',()=>{});
 child.on('error',e=>{remote?.reject(e);});
 readline.createInterface({input:child.stdout}).on('line',line=>{try{const m=JSON.parse(line);if(pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result);}else if(m.method==='thread/realtime/sdp'){remote?.resolve(m.params.sdp);}else if(m.method==='thread/realtime/error'){remote?.reject(new Error(m.params.message));event(m);}else event(m);}catch{}});
 await rpc('initialize',{clientInfo:{name:'presentation_voice_bridge',version:'0.1'},capabilities:{experimentalApi:true}});child.stdin.write(JSON.stringify({method:'initialized'})+'\n');
 const account=await rpc('account/read',{refreshToken:false});if(account.account?.type!=='chatgpt')throw Error('Codex에 ChatGPT 계정으로 로그인해 주세요. API 키 로그인은 사용하지 않습니다.');
 const t=await rpc('thread/start',{ephemeral:true,cwd:__dirname,approvalPolicy:'never',sandbox:'read-only',environments:[],baseInstructions:'You are a silent presentation transcription bridge. Never execute tools, modify files, or delegate tasks.'});threadId=t.thread.id;
 let timer;const answer=new Promise((resolve,reject)=>{timer=setTimeout(()=>reject(Error('원격 음성 연결 응답 없음')),30000);remote={resolve,reject};});
 try{const start=rpc('thread/realtime/start',{threadId,version:'v3',outputModality:'audio',transport:{type:'webrtc',sdp},includeStartupContext:false,clientManagedHandoffs:true,delegationAckFiller:false,prompt:'The user is recording a presentation. Your only job is to listen and transcribe their Korean speech. Stay silent. Never reply, interrupt, use tools, delegate to Codex, or end the session unless explicitly asked. Continue listening throughout the presentation.'});const [,result]=await Promise.all([start,answer]);return result;}finally{clearTimeout(timer);remote=null;}
}
const allowed=new Map([['/','index.html'],['/index.html','index.html'],['/script-data.js','script-data.js'],['/matcher.js','matcher.js'],['/app.js','app.js'],['/test-voice.wav','test-voice.wav']]);
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,origin),isSameOrigin=!req.headers.origin||req.headers.origin===origin;
 if(req.headers.host!==`${HOST}:${PORT}`&&req.headers.host!==`localhost:${PORT}`){res.writeHead(403);return res.end();}
 if(req.method==='GET'&&url.pathname==='/events'){res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-store','Connection':'keep-alive'});res.write(': connected\n\n');clients.add(res);req.on('close',()=>{clients.delete(res);idleSince=Date.now();});return;}
 if(req.method==='GET'&&allowed.has(url.pathname)){const name=allowed.get(url.pathname),file=name==='test-voice.wav'?path.resolve(__dirname,'../../work/test-voice.wav'):path.join(__dirname,name);if(!fs.existsSync(file)){res.writeHead(404);return res.end();}const type=name.endsWith('.js')?'application/javascript;charset=utf-8':name.endsWith('.wav')?'audio/wav':'text/html;charset=utf-8';res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);return;}
 if(req.method==='POST'&&isSameOrigin&&(req.headers['x-voice-bridge']==='1'||url.pathname==='/close')){
  if(url.pathname==='/stop'||url.pathname==='/close'){stop();res.end('{}');return;}
  if(url.pathname==='/heartbeat'){lastPulse=Date.now();res.end('{}');return;}
  if(url.pathname==='/connect'){try{let body='';for await(const part of req){body+=part;if(body.length>200000)throw Error('잘못된 연결 요청입니다.');}const {sdp}=JSON.parse(body);if(typeof sdp!=='string'||!sdp.startsWith('v=0'))throw Error('음성 연결 정보가 올바르지 않습니다.');const answer=await connect(sdp);res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({sdp:answer}));}catch(e){stop();res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:e.message}));}return;}
 }res.writeHead(404);res.end();
});
server.listen(PORT,HOST,()=>console.log('Local: '+origin));
server.on('error',e=>{console.error(e.code==='EADDRINUSE'?'발표 보조 화면이 이미 실행 중입니다.':e.message);process.exit(1)});
setInterval(()=>{for(const res of clients)res.write(': keepalive\n\n');if(child&&Date.now()-lastPulse>40000){event({method:'thread/realtime/error',params:{message:'보조 화면의 연결이 끊겨 마이크 세션을 종료했습니다.'}});stop();}if(!clients.size&&!child&&Date.now()-idleSince>120000){server.close();process.exit(0);}},10000).unref();
for(const sig of ['SIGINT','SIGTERM'])process.on(sig,()=>{stop();server.close();process.exit(0)});
