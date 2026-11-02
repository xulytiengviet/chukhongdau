/* Chữ không dấu. No storage, analytics, or automatic network requests. */
function cleanASCII(text) {
 return text.replace(/\r\n?/g,'\n').replace(/[đĐ]/g,c=>c==='đ'?'d':'D').normalize('NFKD').replace(/\p{M}/gu,'').replace(/[“”„]/g,'"').replace(/[‘’]/g,"'").replace(/[–—]/g,'-').replace(/…/g,'...').replace(/[^\x20-\x7e\n\t]/g,'');
}
const phrases=["giày dép","đôi dép","tiếng Việt","Việt Nam","học sinh","sinh viên","công nghệ","thông tin","dữ liệu","không dấu","có dấu","trường học","thành phố","Hà Nội","Vĩnh Long","Bến Tre","hôm nay","hôm qua","ngày mai","buổi sáng","buổi chiều","yêu thương","đẹp quá","tốt quá","vui quá","buồn quá","nóng quá","lạnh quá","hay quá","khó quá","dễ quá","nhiều quá","ít quá","chậm quá","nhanh quá","quá đẹp","quá tốt","quá nóng","quá lạnh","đi qua","đã qua","vừa qua","đi học","đi làm","bạn bè","có thể","có lẽ","cô giáo","cô ấy","cô gái","công việc","công nghệ thông tin","máy tính","điện thoại","gia đình","sức khỏe","cảm ơn","xin chào","hẹn gặp lại","thời tiết","trời mưa","trời nắng","cơn mưa","ngày hôm nay","học tập","nghiên cứu","khoa học","kỹ thuật","xây dựng","môi trường","tài nguyên","chất lượng","phát triển","kinh tế","xã hội","văn hóa","lịch sử","địa lý","xử lý","tự động","chính xác","kết quả","chức năng","sao chép","chuyển đổi","làm việc","văn bản","hợp đồng","thanh toán","giám đốc","giá trị","số lượng","bây giờ","bao giờ","bao nhiêu","bao lâu","mấy giờ","năm nay","năm sau","lần sau","đằng sau","phía sau","buổi tối","buổi trưa"];
function matchCase(source,target){return [...target].map((c,i)=>source[i]&&source[i]===source[i].toUpperCase()?c.toUpperCase():c.toLowerCase()).join('')}
// Compile once. Horizontal whitespace is preserved exactly; never merge paragraphs.
const phraseLookup=new Map(phrases.map(p=>[cleanASCII(p).toLowerCase(),p]));
const phrasePattern=[...phraseLookup.keys()].sort((a,b)=>b.length-a.length).map(p=>p.split(' ').join('[ \\t]+')).join('|');
// Preserve URLs, emails, code-like identifiers and alphanumeric tokens.
const restorePattern=new RegExp('https?:\\/\\/[^\\s]+|www\\.[^\\s]+|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}|\\b[a-zA-Z0-9_]*[0-9_][a-zA-Z0-9_]*\\b|\\b(?:'+phrasePattern+')\\b|[a-zA-Z]+','gi');
function restoreDetailed(text){
 const unknown=new Set();
 const restored=text.replace(restorePattern,w=>{
  if(/[:@._0-9]/.test(w))return w;
  const key=w.toLowerCase().replace(/[ \t]+/g,' ');
  const target=phraseLookup.get(key)||DICTIONARY[key];
  if(!target){unknown.add(w.toLowerCase());return w;}
  const words=target.split(' ');let i=0;
  return w.replace(/[a-zA-Z]+/g,part=>matchCase(part,words[i++]));
 });
 return {restored,unknown:[...unknown]};
}
function restoreLocal(text){return restoreDetailed(text).restored;}
if(typeof document!=='undefined'){
 const $=id=>document.getElementById(id),a=$('ascii'),u=$('unicode');let revision=0,controller=null;
 const say=s=>$('status').textContent=s;
 function localSuggestion(){const r=restoreDetailed(a.value);u.value=r.restored;say(r.unknown.length?'Gợi ý cục bộ · '+r.unknown.length+' từ chưa có trong từ điển (giữ nguyên). Kiểm tra lại dấu và nghĩa.':'Gợi ý cục bộ theo từ/cụm từ; chưa dùng AI. Hãy kiểm tra lại nghĩa.');}
 function counts(){ $('count-a').textContent=a.value.length+' ký tự';$('count-u').textContent=u.value.length+' ký tự'; }
 function invalidate(){revision++;controller?.abort();controller=null;$('restore').disabled=false;}
 function normalizeInput(){const before=a.value,pos=a.selectionStart,end=a.selectionEnd;const cleaned=cleanASCII(before).slice(0,20000);if(before!==cleaned){a.value=cleaned;a.setSelectionRange(cleanASCII(before.slice(0,pos)).length,cleanASCII(before.slice(0,end)).length);say('Đã chuẩn hóa ASCII; ký tự ngoài bảng cho phép đã bị loại.');}}
 function fromASCII(e){if(e?.isComposing)return;invalidate();normalizeInput();if($('live').checked){localSuggestion();}else{u.value='';say('Bấm Thêm dấu để chuyển đổi.');}counts();}
 a.addEventListener('input',fromASCII);a.addEventListener('compositionend',fromASCII);
 u.addEventListener('input',e=>{if(e.isComposing)return;invalidate();if($('live').checked)a.value=cleanASCII(u.value);counts();say('Đã chỉnh sửa bản có dấu.');});
 u.addEventListener('compositionend',()=>{invalidate();if($('live').checked)a.value=cleanASCII(u.value);counts();});
 $('strip').onclick=()=>{invalidate();a.value=cleanASCII(u.value);counts();say('Đã tạo bản ASCII sạch.');};
 $('restore').onclick=async()=>{
 invalidate();normalizeInput();const text=a.value,version=revision;if(!text.trim()){u.value='';counts();return;}
 if($('engine').value==='local'){localSuggestion();counts();return;}
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
