/* Chữ không dấu. No storage, analytics, or automatic network requests. */
function cleanASCII(text) {
 return text.replace(/\r\n?/g,'\n').replace(/[đĐ]/g,c=>c==='đ'?'d':'D').normalize('NFKD').replace(/\p{M}/gu,'').replace(/[“”„]/g,'"').replace(/[‘’]/g,"'").replace(/[–—]/g,'-').replace(/…/g,'...').replace(/[^\x20-\x7e\n\t]/g,'');
}
if(typeof document!=='undefined'){
 const scriptURL=document.currentScript.src;
 const {RevisionGate}=RestorationCore,{LocalRestorer,AIRestorer}=RestorationAdapters;
 const $=id=>document.getElementById(id),a=$('ascii'),u=$('unicode'),gate=new RevisionGate();
 const local=new LocalRestorer(new URL('restorer-worker.js?v=ngram1',scriptURL));
 let localAbort=null,aiAbort=null,localTimer=null,aiTimer=null,composing=false;
 const say=text=>$('status').textContent=text;
 function counts(){ $('count-a').textContent=a.value.length+' ký tự';$('count-u').textContent=u.value.length+' ký tự'; }
 function invalidate(){clearTimeout(localTimer);clearTimeout(aiTimer);localAbort?.abort();aiAbort?.abort();localAbort=aiAbort=null;$('restore').disabled=false;return gate.begin(a.value);}
 function normalizeInput(){const before=a.value,start=a.selectionStart,end=a.selectionEnd,cleaned=cleanASCII(before).slice(0,20000);if(before!==cleaned){a.value=cleaned;a.setSelectionRange(cleanASCII(before.slice(0,start)).length,cleanASCII(before.slice(0,end)).length);}}
 const valid=t=>gate.current(t)&&a.value===t.raw&&!composing;
 async function runLocal(ticket){
  const control=new AbortController();localAbort=control;say('Đang khôi phục cục bộ… Lần đầu cần tải mô hình khoảng 0,96 MB.');
  try{const result=await local.restore(ticket.raw,{signal:control.signal});if(!valid(ticket))return;
   u.value=result.restored;counts();say('Cục bộ · dictionary + bigram/Viterbi · '+result.elapsedMs.toFixed(1)+' ms'+(result.unknown.length?' · '+result.unknown.length+' từ ngoài từ điển, giữ nguyên.':'.')+' Kiểm tra lại tên riêng và từ nhiều nghĩa.');
  }catch(e){if(valid(ticket)&&e.name!=='AbortError')say(e.message+' Bản ASCII vẫn được giữ nguyên.');}
 }
 async function runAI(ticket){
  if(!ticket.raw.trim()||!valid(ticket))return;
  let ai;try{ai=new AIRestorer($('endpoint').value);}catch{say('Nhập URL máy chủ nom-vn hợp lệ để dùng AI.');return;}
  localAbort?.abort();clearTimeout(localTimer);aiAbort?.abort();const control=new AbortController();aiAbort=control;
  const timeout=setTimeout(()=>control.abort(),60000);$('restore').disabled=true;say('Đang gửi bản ASCII đến máy chủ AI đã chọn…');
  try{const result=await ai.restore(ticket.raw,{signal:control.signal});if(valid(ticket)){u.value=result.restored;counts();say('Đã khôi phục bằng AI; đã kiểm tra bảo toàn chữ gốc và các phần được bảo vệ.');}}
  catch(e){if(valid(ticket))say(e.name==='AbortError'?'Đã dừng hoặc hết thời gian chờ AI.':e.message+'. Bản cục bộ hiện có vẫn được giữ.');}
  finally{clearTimeout(timeout);if(valid(ticket))$('restore').disabled=false;}
 }
 function changed(){if(composing)return;normalizeInput();const ticket=invalidate();u.value='';counts();
  if(!a.value.trim()){say('Sẵn sàng. Không lưu văn bản.');return;}
  if($('live').checked){localTimer=setTimeout(()=>runLocal(ticket),100);if($('engine').value==='hf'&&$('auto-ai').checked)aiTimer=setTimeout(()=>runAI(ticket),1200);}
  else say('Bấm Thêm dấu để khôi phục văn bản.');
 }
 a.addEventListener('compositionstart',()=>{composing=true;invalidate();});
 a.addEventListener('compositionend',()=>{composing=false;changed();});
 a.addEventListener('input',e=>{if(!e.isComposing)changed();});
 function editUnicode(){if(composing)return;invalidate();if($('live').checked)a.value=cleanASCII(u.value).slice(0,20000);gate.begin(a.value);counts();say('Đã chỉnh sửa bản có dấu; kết quả tự động cũ sẽ không ghi đè.');}
 u.addEventListener('compositionstart',()=>{composing=true;invalidate();});
 u.addEventListener('compositionend',()=>{composing=false;editUnicode();});
 u.addEventListener('input',e=>{if(!e.isComposing)editUnicode();});
 $('strip').onclick=()=>{invalidate();a.value=cleanASCII(u.value).slice(0,20000);gate.begin(a.value);counts();say('Đã tạo bản ASCII sạch.');};
 $('restore').onclick=()=>{if(composing)return;normalizeInput();const ticket=invalidate();if(!a.value.trim()){u.value='';counts();return;}$('engine').value==='hf'?runAI(ticket):runLocal(ticket);};
 $('clear').onclick=()=>{invalidate();composing=false;a.value='';u.value='';gate.begin('');$('endpoint').value='';$('engine').value='local';$('auto-ai').checked=false;$('api-options').hidden=true;$('live').checked=true;counts();say('Đã xóa toàn bộ nội dung và cấu hình phiên này.');a.focus();};
 $('engine').onchange=()=>{invalidate();$('api-options').hidden=$('engine').value==='local';say('Khi gõ: xử lý cục bộ. AI chỉ chạy bằng nút hoặc khi bật tự động sau 1,2 giây.');};
 $('endpoint').oninput=invalidate;$('auto-ai').onchange=invalidate;$('live').onchange=()=>{invalidate();if($('live').checked)changed();};
 for(const b of document.querySelectorAll('[data-sample]'))b.onclick=()=>{a.value=b.dataset.sample;changed();a.focus();};
 for(const b of document.querySelectorAll('[data-copy]'))b.onclick=async()=>{const field=$(b.dataset.copy);if(!field.value){say('Chưa có nội dung để sao chép.');return;}try{await navigator.clipboard.writeText(field.value);say('Đã sao chép '+(field===a?'bản ASCII.':'bản có dấu.'));}catch{field.focus();field.select();say('Trình duyệt chặn clipboard. Nhấn Ctrl+C hoặc ⌘C để sao chép.');}};
 window.addEventListener('pagehide',()=>{invalidate();a.value='';u.value='';gate.begin('');$('endpoint').value='';});
 document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();$('restore').click();}});
}
