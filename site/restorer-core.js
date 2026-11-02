/* Apache-2.0. JavaScript adaptation of Underthesea DiacriticsRestorer.
 * Copyright 2017 UndertheseaNLP. Changes (2026): indexed model, browser worker,
 * lossless spans, English guard, newline boundaries and cancellation interface.
 * See vendor/UNDER THESEA-LICENSE.txt (filename without spaces) and SOURCES.md.
 */
(function(root){
'use strict';
const strip=s=>s.normalize('NFD').replace(/\p{M}/gu,'').replace(/đ/g,'d').replace(/Đ/g,'D');
const caseLike=(s,t)=>[...t].map((c,i)=>s[i]&&s[i]!==s[i].toLowerCase()?c.toUpperCase():c).join('');
class WordTrie{
 constructor(words){this.root=new Map();for(const w of words){let n=this.root;for(const c of w){if(!n.has(c))n.set(c,new Map());n=n.get(c);}n.set('',true);}}
 has(w){let n=this.root;for(const c of w.toLowerCase()){n=n.get(c);if(!n)return false;}return n.get('')===true;}
}
// Curated here, not copied from IME repositories. Do not globally lock can/the/in/on.
const anchors='search format test testing hello please thanks thank download upload browser javascript python rust github google windows linux server client function return const import export default async await console document query database software hardware keyboard clipboard unicode ascii email file folder button click update delete insert select source code build debug error warning success api http https json html css react typescript transformer model token network web worker'.split(' ');
const english=new WordTrie([...anchors,...'a an the and or for to from with without in on at by of is are was were be been can could will would should do does did not no yes you your we our i my it its this that these those as if then else new old all some any more less than very good bad how what when where why use using open close save copy paste reset run stop start find text data page window system program computer'.split(' ')]);
const strong=new WordTrie(anchors);
const chunks=/https?:\/\/[^\s<>]+|www\.[^\s<>]+|[\p{L}\p{M}\d._%+-]+@[\p{L}\p{M}\d.-]+\.[\p{L}]{2,}|[\p{L}\p{M}\d_]+(?:[.,:/@+\-][\p{L}\p{M}\d_]+)*|\s+|[^\s]/gu;
function tokenize(text){
 const parts=[...text.matchAll(chunks)].map(m=>({raw:m[0],start:m.index,kind:'boundary'}));
 for(const p of parts){if(/^[\p{L}\p{M}]+$/u.test(p.raw)){p.kind='word';p.lower=p.raw.normalize('NFC').toLowerCase();p.accented=strip(p.lower)!==p.lower;}
 else if(/^\d+(?:[.,:]\d+)*$/.test(p.raw))p.kind='number';
 else if(/^[ \t]+$/.test(p.raw))p.kind='gap';else if(/\S/.test(p.raw))p.kind='protected';}
 // English runs require an unambiguous anchor; isolated Vietnamese homographs remain eligible.
 for(let i=0;i<parts.length;){if(parts[i].kind!=='word'||!english.has(parts[i].lower)){i++;continue;}
 const run=[i];let j=i;while(parts[j+1]?.kind==='gap'&&parts[j+2]?.kind==='word'&&english.has(parts[j+2].lower)){j+=2;run.push(j);}
 const mixedLeft=parts[i-1]?.kind==='gap'&&parts[i-2]?.kind==='word';
 const mixedRight=parts[j+1]?.kind==='gap'&&parts[j+2]?.kind==='word';
 if(run.some(k=>strong.has(parts[k].lower)))for(const k of run){if(!(mixedLeft||mixedRight)||strong.has(parts[k].lower))parts[k].english=true;}i=j+1;}
 return parts;
}
class BigramRestorer{
 constructor(model){
  if(model.format!==1||model.words.length!==model.counts.length)throw Error('Định dạng mô hình không hợp lệ');
  this.words=model.words;this.counts=model.counts;this.size=this.words.length;this.total=this.counts.reduce((a,b)=>a+b,0);
  this.ids=new Map(this.words.map((w,i)=>[w,i]));this.variants=new Map();this.bigram=new Map();
  this.words.forEach((w,i)=>{const k=strip(w);if(!this.variants.has(k))this.variants.set(k,[]);this.variants.get(k).push(i);});
  for(const [a,b,n] of model.bigrams)this.bigram.set(a*this.size+b,n);
  this.unigram=this.counts.map(n=>(n+1)/(this.total+this.size));
 }
 candidates(part){if(part.kind==='number')return [this.ids.get('<num>')??-1];if(part.accented)return [this.ids.get(part.lower)??-1];return this.variants.get(part.lower)||[-1];}
 probability(id){return id<0?1/(this.total+this.size):this.unigram[id];}
 transition(a,b){const n=a<0||b<0?0:this.bigram.get(a*this.size+b)||0;return Math.log(.8*(n/(this.counts[a]||1))+.2*this.probability(b));}
 decode(options){
  let scores=options[0].map(id=>Math.log(this.probability(id)));const back=[];
  for(let i=1;i<options.length;i++){
   const layer=[],parents=[];for(const cur of options[i]){let best=-Infinity,parent=0;for(let j=0;j<options[i-1].length;j++){const s=scores[j]+this.transition(options[i-1][j],cur);if(s>best){best=s;parent=j;}}layer.push(best);parents.push(parent);}back.push(parents);scores=layer;
  }
  let k=scores.indexOf(Math.max(...scores));const path=[options.at(-1)[k]];
  for(let i=options.length-2;i>=0;i--){k=back[i][k];path.push(options[i][k]);}return path.reverse();
 }
 restore(text){
  const begin=performance.now(),parts=tokenize(text),unknown=new Set(),ambiguous=new Set();let chain=[];
  const flush=()=>{if(!chain.length)return;const choices=chain.map(p=>this.candidates(p));const path=this.decode(choices);
   chain.forEach((p,i)=>{if(p.kind==='word'&&!p.accented&&path[i]>=0)p.output=caseLike(p.raw,this.words[path[i]]);});chain=[];};
  for(const p of parts){
   if(p.kind==='gap')continue;
   if((p.kind!=='word'&&p.kind!=='number')||p.english){flush();continue;}
   const options=this.candidates(p);if(p.kind==='word'&&options[0]===-1&&!p.accented){unknown.add(p.raw);flush();continue;}
   if(options.length>1)ambiguous.add(p.raw);chain.push(p);
  }flush();
  const restored=parts.map(p=>p.output??p.raw).join('');
  if(strip(restored)!==strip(text))throw Error('Bộ giải mã đã thay đổi chữ gốc');
  return {restored,backend:'local-ngram',unknown:[...unknown],ambiguous:[...ambiguous],elapsedMs:performance.now()-begin};
 }
}
function validateAI(input,output){
 if(typeof output!=='string'||strip(output)!==strip(input))throw Error('AI đã thay đổi chữ, số hoặc khoảng trắng; không áp dụng');
 const a=tokenize(input),b=tokenize(output);if(a.length!==b.length)throw Error('AI đã thay đổi cấu trúc văn bản');
 for(let i=0;i<a.length;i++)if((a[i].kind!=='word'||a[i].accented||a[i].english)&&a[i].raw!==b[i].raw)throw Error('AI đã sửa phần văn bản được bảo vệ');
 return output;
}
// A result is committable only while both the revision and the raw snapshot match.
class RevisionGate{constructor(){this.revision=0;this.raw='';}begin(raw){this.raw=raw;return {revision:++this.revision,raw};}current(ticket){return ticket.revision===this.revision&&ticket.raw===this.raw;}}
const api={strip,tokenize,BigramRestorer,WordTrie,validateAI,RevisionGate};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.RestorationCore=api;
})(globalThis);
