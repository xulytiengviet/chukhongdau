/* One model load per worker. No text persistence or external inference. */
importScripts('restorer-core.js?v=ngram1');
let enginePromise;
function load(){
 if(!enginePromise)enginePromise=(async()=>{
  const response=await fetch('models/underthesea-bigram-v1.json.gz');
  if(!response.ok)throw Error('Không tải được mô hình cục bộ ('+response.status+')');
  if(typeof DecompressionStream==='undefined')throw Error('Trình duyệt chưa hỗ trợ giải nén mô hình. Hãy dùng Chrome/Edge/Firefox bản mới.');
  if(!crypto.subtle)throw Error('Cần mở trang bằng HTTPS hoặc localhost để xác minh mô hình');
  const bytes=await response.arrayBuffer();
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
  if(digest!=='c00688e86f93c9db54db55e209c51f5318543f0692d4e46b73ec9a0e5898eecc')throw Error('Mô hình sai checksum');
  const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  const model=await new Response(stream).json();return new RestorationCore.BigramRestorer(model);
 })().catch(e=>{enginePromise=null;throw e;});
 return enginePromise;
}
let newest=0;
onmessage=async({data})=>{
 if(data.type==='cancel'){newest=data.id;return;}
 newest=data.id;
 try{const engine=await load();if(data.id!==newest)return;
  postMessage({id:data.id,result:engine.restore(data.text)});
 }catch(e){if(data.id===newest)postMessage({id:data.id,error:e.message});}
};
