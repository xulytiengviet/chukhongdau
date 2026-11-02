/* Chữ không dấu. No storage, analytics, or automatic network requests. */
function cleanASCII(text) {
 return text.replace(/\r\n?/g,'\n').replace(/[đĐ]/g,c=>c==='đ'?'d':'D').normalize('NFKD').replace(/\p{M}/gu,'').replace(/[“”„]/g,'"').replace(/[‘’]/g,"'").replace(/[–—]/g,'-').replace(/…/g,'...').replace(/[^\x20-\x7e\n\t]/g,'');
}
const phrases=['tiếng Việt','Việt Nam','học sinh','sinh viên','công nghệ','thông tin','dữ liệu','không dấu','có dấu','trường học','thành phố','Hà Nội','Vĩnh Long','Bến Tre','hôm nay','ngày mai','buổi sáng','buổi chiều','yêu thương'];
function matchCase(source,target){return [...target].map((c,i)=>source[i]&&source[i]===source[i].toUpperCase()?c.toUpperCase():c.toLowerCase()).join('')}
function restoreLocal(text){
 const pattern=phrases.map(cleanASCII).sort((a,b)=>b.length-a.length).join('|');
 const lookup=Object.fromEntries(phrases.map(p=>[cleanASCII(p).toLowerCase(),p]));
 return text.replace(new RegExp('\\b(?:'+pattern+')\\b|[a-zA-Z]+','gi'),w=>matchCase(w,lookup[w.toLowerCase()]||DICTIONARY[w.toLowerCase()]||w));
}
if(typeof document!=='undefined'){
 const $=id=>document.getElementById(id),a=$('ascii'),u=$('unicode');let revision=0,controller=null;
 const say=s=>$('status').textContent=s;
 function counts(){ $('count-a').textContent=a.value.length+' ký tự';$('count-u').textContent=u.value.length+' ký tự'; }
 function invalidate(){revision++;controller?.abort();controller=null;$('restore').disabled=false;}
 function normalizeInput(){const before=a.value,pos=a.selectionStart,end=a.selectionEnd;const cleaned=cleanASCII(before).slice(0,20000);if(before!==cleaned){a.value=cleaned;a.setSelectionRange(cleanASCII(before.slice(0,pos)).length,cleanASCII(before.slice(0,end)).length);say('Đã chuẩn hóa ASCII; ký tự ngoài bảng cho phép đã bị loại.');}}
 function fromASCII(e){if(e?.isComposing)return;invalidate();normalizeInput();if($('live').checked){u.value=restoreLocal(a.value);say('Gợi ý bằng từ điển cục bộ. Hãy kiểm tra dấu theo ngữ cảnh.');}else{u.value='';say('Bấm Thêm dấu để chuyển đổi.');}counts();}
 a.addEventListener('input',fromASCII);a.addEventListener('compositionend',fromASCII);
 u.addEventListener('input',e=>{if(e.isComposing)return;invalidate();if($('live').checked)a.value=cleanASCII(u.value);counts();say('Đã chỉnh sửa bản có dấu.');});
 u.addEventListener('compositionend',()=>{invalidate();if($('live').checked)a.value=cleanASCII(u.value);counts();});
 $('strip').onclick=()=>{invalidate();a.value=cleanASCII(u.value);counts();say('Đã tạo bản ASCII sạch.');};
 $('restore').onclick=async()=>{
 invalidate();normalizeInput();const text=a.value,version=revision;if(!text.trim()){u.value='';counts();return;}
 if($('engine').value==='local'){u.value=restoreLocal(text);counts();say('Gợi ý từ điển; kiểm tra lại từ nhiều nghĩa và tên riêng.');return;}
 let url;try{url=new URL($('endpoint').value);if(!['https:','http:'].includes(url.protocol)||url.username||url.password||url.search||url.hash)throw Error();}catch{say('Nhập URL API hợp lệ, không chứa thông tin đăng nhập.');return;}
 controller=new AbortController();const signal=controller.signal;const timeout=setTimeout(()=>controller?.abort(),60000);$('restore').disabled=true;say('Đang khôi phục dấu qua API…');
 try{const response=await fetch(url.href.replace(/\/$/,'')+'/api/tools/diacritic/restore',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,backend:'hf'}),signal,cache:'no-store',credentials:'omit'});if(!response.ok)throw Error('API trả lỗi '+response.status);const result=await response.json();if(typeof result.restored!=='string')throw Error('API trả dữ liệu không hợp lệ');if(cleanASCII(result.restored)!==text)throw Error('Kết quả AI làm thay đổi chữ hoặc khoảng trắng; không áp dụng');if(version===revision){u.value=result.restored;counts();say('Đã khôi phục bằng AI. Hãy đọc lại kết quả.');}}
 catch(e){if(version===revision)say(e.name==='AbortError'?'Đã dừng hoặc hết thời gian chờ API.':e.message+'. Kiểm tra máy chủ/CORS hoặc chọn từ điển cục bộ.');}
 finally{clearTimeout(timeout);if(version===revision){controller=null;$('restore').disabled=false;}}
 };
 $('clear').onclick=()=>{invalidate();a.value='';u.value='';$('endpoint').value='';$('engine').value='local';$('api-options').hidden=true;$('live').checked=true;counts();say('Đã xóa toàn bộ nội dung và cấu hình phiên này.');a.focus();};
 $('engine').onchange=()=>{invalidate();$('api-options').hidden=$('engine').value==='local';};$('endpoint').oninput=invalidate;
 for(const b of document.querySelectorAll('[data-sample]'))b.onclick=()=>{a.value=b.dataset.sample;fromASCII();a.focus();};
 for(const b of document.querySelectorAll('[data-copy]'))b.onclick=async()=>{const field=$(b.dataset.copy);if(!field.value){say('Chưa có nội dung để sao chép.');return;}try{await navigator.clipboard.writeText(field.value);say('Đã sao chép '+(field===a?'bản ASCII.':'bản có dấu.'));}catch{field.focus();field.select();say('Trình duyệt chặn clipboard. Nhấn Ctrl+C hoặc ⌘C để sao chép.');}};
 window.addEventListener('pagehide',()=>{invalidate();a.value='';u.value='';$('endpoint').value='';});
 document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();$('restore').click();}});
}
