const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
class FakeWorker{constructor(){FakeWorker.instance=this;this.messages=[];}postMessage(m){this.messages.push(m);}}
const ctx=vm.createContext({Worker:FakeWorker,URL,DOMException,AbortController,performance});
vm.runInContext(fs.readFileSync(__dirname+'/restorer-core.js','utf8')+fs.readFileSync(__dirname+'/restorers.js','utf8'),ctx);
(async()=>{
 const {LocalRestorer,AIRestorer}=ctx.RestorationAdapters;
 const local=new LocalRestorer('https://test/worker.js');
 const old=local.restore('old').catch(e=>e.name),oldId=FakeWorker.instance.messages.at(-1).id;
 const latest=local.restore('new'),newId=FakeWorker.instance.messages.at(-1).id;
 FakeWorker.instance.onmessage({data:{id:oldId,result:{restored:'STALE'}}});
 FakeWorker.instance.onmessage({data:{id:newId,result:{restored:'NEW'}}});
 assert.equal(await old,'AbortError');assert.equal((await latest).restored,'NEW');
 const control=new AbortController();const pending=local.restore('clear',{signal:control.signal}).catch(e=>e.name);const clearId=FakeWorker.instance.messages.at(-1).id;control.abort();
 FakeWorker.instance.onmessage({data:{id:clearId,result:{restored:'MUST NOT RETURN'}}});assert.equal(await pending,'AbortError');
 let request;ctx.fetch=async(url,opts)=>{request={url,opts};return {ok:true,json:async()=>({restored:'Hôm nay'})};};
 const ai=new AIRestorer('https://example.com');assert.equal((await ai.restore('Hom nay')).restored,'Hôm nay');
 assert.equal(request.url,'https://example.com/api/tools/diacritic/restore');assert.equal(JSON.parse(request.opts.body).backend,'hf');
 const gate=new ctx.RestorationCore.RevisionGate(),ticket=gate.begin('Hom nay');let release;
 ctx.fetch=()=>new Promise(resolve=>{release=()=>resolve({ok:true,json:async()=>({restored:'Hôm nay'})});});
 const delayed=ai.restore('Hom nay');gate.begin('user edit');release();await delayed;assert.equal(gate.current(ticket),false);
 for(const url of ['javascript:alert(1)','https://user:pass@example.com','https://example.com/?key=secret'])assert.throws(()=>new AIRestorer(url));
 console.log('PASS: superseded worker result, abort/clear, AI protocol, stale AI revision and unsafe URL rejection.');
})().catch(e=>{console.error(e);process.exitCode=1;});
