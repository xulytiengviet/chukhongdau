/* Common async protocol: restore(text, {signal}) -> Promise<RestorationResult>. */
(function(root){
const abortError=()=>new DOMException('Đã hủy','AbortError');
class LocalRestorer{
 constructor(workerURL){this.worker=new Worker(workerURL);this.sequence=0;this.pending=new Map();
 this.worker.onmessage=({data})=>{const task=this.pending.get(data.id);if(!task)return;task.cleanup();this.pending.delete(data.id);data.error?task.reject(Error(data.error)):task.resolve(data.result);};
 this.worker.onerror=()=>{for(const task of this.pending.values()){task.cleanup();task.reject(Error('Không khởi động được bộ xử lý cục bộ.'));}this.pending.clear();};}
 restore(text,{signal}={}){if(signal?.aborted)return Promise.reject(abortError());
 // Superseding a request settles its promise; stale worker messages have no recipient.
 for(const task of this.pending.values()){task.cleanup();task.reject(abortError());}this.pending.clear();
 const id=++this.sequence;return new Promise((resolve,reject)=>{
  const abort=()=>{this.pending.delete(id);this.worker.postMessage({type:'cancel',id:++this.sequence});cleanup();reject(abortError());};
  const cleanup=()=>signal?.removeEventListener('abort',abort);
  signal?.addEventListener('abort',abort,{once:true});this.pending.set(id,{resolve,reject,cleanup});this.worker.postMessage({id,text});
 });}
}
class AIRestorer{
 constructor(endpoint){const url=new URL(endpoint);if(!['https:','http:'].includes(url.protocol)||url.username||url.password||url.search||url.hash)throw Error('URL API không hợp lệ');this.url=url.href.replace(/\/$/,'')+'/api/tools/diacritic/restore';}
 async restore(text,{signal}={}){const response=await fetch(this.url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,backend:'hf'}),signal,cache:'no-store',credentials:'omit'});if(!response.ok)throw Error('API trả lỗi '+response.status);const payload=await response.json();return {restored:RestorationCore.validateAI(text,payload.restored),backend:'ai-hf'};}
}
root.RestorationAdapters={LocalRestorer,AIRestorer};
})(globalThis);
